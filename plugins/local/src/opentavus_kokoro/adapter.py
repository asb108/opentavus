"""Kokoro ONNX with bounded phrase synthesis and generation cancellation."""

import asyncio
import threading
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from opentavus_core.contracts import (
    AdapterConfiguration,
    AdapterContext,
    AudioOutput,
    Generation,
)


class KokoroAdapter:
    def __init__(self, model_path: Path, voices_path: Path, voice: str) -> None:
        self.model_path = model_path
        self.voices_path = voices_path
        self.voice = voice
        self._model: Any = None
        self._lock = threading.Lock()

    async def prepare(self) -> None:
        def load() -> Any:
            import onnxruntime as rt
            from kokoro_onnx import Kokoro

            options = rt.SessionOptions()
            # A bounded CPU pool leaves room for VAD/STT and browser/control work.
            options.intra_op_num_threads = 4
            options.inter_op_num_threads = 1
            options.add_session_config_entry("session.intra_op.allow_spinning", "0")
            session = rt.InferenceSession(
                str(self.model_path), sess_options=options, providers=["CPUExecutionProvider"]
            )
            return Kokoro.from_session(session, str(self.voices_path))

        self._model = await asyncio.to_thread(load)

    def _synthesize(self, text: str) -> bytes:
        import numpy as np

        with self._lock:
            samples, rate = self._model.create(
                text,
                voice=self.voice,
                speed=1.05,
                lang="en-gb" if self.voice.startswith("b") else "en-us",
            )
            if rate != 24000:
                raise ValueError("Kokoro returned an unsupported sample rate")
            return bytes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())

    async def speak(
        self, text: AsyncIterator[str], context: AdapterContext
    ) -> AsyncIterator[AudioOutput]:
        sample = 0
        sequence = 0
        async for phrase in text:
            context.cancellation.check()
            if len(phrase) > 500:
                raise ValueError("Synthesis phrase exceeds 500 characters")
            pcm = await asyncio.to_thread(self._synthesize, phrase)
            context.cancellation.check()
            # 80 ms packets: a large phrase never enters the network as one huge frame.
            for start in range(0, len(pcm), 3840):
                context.cancellation.check()
                block = pcm[start : start + 3840]
                yield AudioOutput(
                    context.generation,
                    f"g{context.generation.generation_id}",
                    sequence,
                    sample,
                    block,
                    24000,
                    1,
                )
                sample += len(block) // 2
                sequence += 1

    async def interrupt(self, generation: Generation) -> None:
        # ONNX completes its current bounded phrase; late packets are discarded.
        pass

    async def close(self) -> None:
        self._model = None


def create(configuration: AdapterConfiguration) -> KokoroAdapter:
    return KokoroAdapter(
        Path(str(configuration.options["model_path"])),
        Path(str(configuration.options["voices_path"])),
        str(configuration.options["voice"]),
    )
