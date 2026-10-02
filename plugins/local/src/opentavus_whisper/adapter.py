"""A CPU Whisper adapter; Pipecat owns microphone segmentation."""

import asyncio
import threading
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from opentavus_core.contracts import (
    AdapterConfiguration,
    AdapterContext,
    AudioInput,
    Generation,
    Transcript,
)


class WhisperAdapter:
    def __init__(self, model_path: Path) -> None:
        self.model_path = model_path
        self._model: Any = None
        self._lock = threading.Lock()

    async def prepare(self) -> None:
        from faster_whisper import WhisperModel

        self._model = await asyncio.to_thread(
            WhisperModel,
            str(self.model_path),
            device="cpu",
            compute_type="int8",
            cpu_threads=4,
            num_workers=1,
            local_files_only=True,
        )

    def _transcribe(self, pcm: bytes) -> str:
        import numpy as np

        with self._lock:
            samples = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0
            segments, _ = self._model.transcribe(
                samples,
                language="en",
                beam_size=1,
                condition_on_previous_text=False,
                vad_filter=False,
                no_speech_threshold=0.6,
            )
            return " ".join(s.text.strip() for s in segments).strip()

    async def transcribe(
        self, audio: AsyncIterator[AudioInput], context: AdapterContext
    ) -> AsyncIterator[Transcript]:
        buffer = bytearray()
        async for chunk in audio:
            context.cancellation.check()
            if chunk.sample_rate != 16000 or chunk.channels != 1:
                raise ValueError("Whisper requires 16 kHz mono PCM")
            buffer.extend(chunk.pcm)
            if len(buffer) > 16000 * 2 * 30:
                raise ValueError("Speech segment exceeds 30 seconds")
        text = await asyncio.to_thread(self._transcribe, bytes(buffer))
        context.cancellation.check()
        if text:
            yield Transcript(text, True, 0, len(buffer) // 2)

    async def interrupt(self, generation: Generation) -> None:
        # CTranslate2 is not preemptible; the caller discards late results.
        pass

    async def close(self) -> None:
        self._model = None


def create(configuration: AdapterConfiguration) -> WhisperAdapter:
    return WhisperAdapter(Path(str(configuration.options["model_path"])))
