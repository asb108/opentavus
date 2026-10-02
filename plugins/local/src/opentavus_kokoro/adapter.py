"""Kokoro ONNX with bounded phrase synthesis and generation cancellation."""

import asyncio
import math
import threading
from collections.abc import AsyncIterator, Sequence
from pathlib import Path
from typing import Any, Protocol

from opentavus_core.contracts import (
    AdapterConfiguration,
    AdapterContext,
    AudioOutput,
    Generation,
    VisemeCue,
    VisemeShape,
)


class PhonemeTiming(Protocol):
    phoneme: str
    start: float
    end: float


def phoneme_shape(phoneme: str) -> VisemeShape:
    """Map Kokoro IPA to a small, replaceable set of prepared mouth shapes.

    Contribution point: refine these groups for a reviewed language/face. Unknown
    symbols rest; this is visual articulation, not a claim of anatomical accuracy.
    """
    groups: tuple[tuple[str, VisemeShape], ...] = (
        ("mbp", "closed"),
        ("fv", "teeth"),
        ("tdnlθðɾ", "tongue"),
        ("uwʊ", "pucker"),
        ("oɔɒ", "round"),
        ("ieɪɛæj", "wide"),
        ("aɑʌəɜɐɚɝ", "open"),
        ("szʃʒʧʤkɡgɹrŋh", "teeth"),
    )
    return next((shape for symbols, shape in groups if phoneme in symbols and phoneme), "rest")


def sample_cues(timings: Sequence[PhonemeTiming], frames: int) -> tuple[VisemeCue, ...]:
    """Validate model timings, filling silence on the actual returned waveform clock."""
    cues: list[VisemeCue] = []
    previous = 0
    for index, timing in enumerate(timings):
        if not math.isfinite(timing.start) or not math.isfinite(timing.end):
            raise ValueError("Speech phoneme timings must be finite")
        start, end = round(timing.start * 24000), round(timing.end * 24000)
        if start < 0 or end < start or start < previous or end > frames:
            raise ValueError("Speech phoneme timings must fit the returned waveform")
        if start > previous:
            cues.append(VisemeCue("rest", previous, start))
        if end > start:
            shape = phoneme_shape(timing.phoneme)
            # Kokoro assigns time to IPA stress/length marks. They carry the vowel,
            # not silence: stress anticipates it, length holds the preceding shape.
            if timing.phoneme in {"ˈ", "ˌ"} and index + 1 < len(timings):
                shape = phoneme_shape(timings[index + 1].phoneme)
            elif timing.phoneme == "ː" and cues:
                shape = cues[-1].shape
            if cues and cues[-1].shape == shape and cues[-1].end_sample == start:
                cues[-1] = VisemeCue(shape, cues[-1].start_sample, end)
            else:
                cues.append(VisemeCue(shape, start, end))
        previous = end
    if timings and previous < frames:
        cues.append(VisemeCue("rest", previous, frames))
    return tuple(cues)


def packet_cues(cues: tuple[VisemeCue, ...], start: int, end: int) -> tuple[VisemeCue, ...]:
    return tuple(
        VisemeCue(cue.shape, max(start, cue.start_sample) - start, min(end, cue.end_sample) - start)
        for cue in cues
        if cue.start_sample < end and cue.end_sample > start
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

    def _synthesize(self, text: str) -> tuple[bytes, tuple[VisemeCue, ...]]:
        import numpy as np

        with self._lock:
            samples, rate, timings = self._model.create_timed(
                text,
                voice=self.voice,
                speed=1.05,
                lang="en-gb" if self.voice.startswith("b") else "en-us",
            )
            if rate != 24000:
                raise ValueError("Kokoro returned an unsupported sample rate")
            pcm = bytes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())
            return pcm, sample_cues(timings, len(pcm) // 2)

    async def speak(
        self, text: AsyncIterator[str], context: AdapterContext
    ) -> AsyncIterator[AudioOutput]:
        sample = 0
        sequence = 0
        async for phrase in text:
            context.cancellation.check()
            if len(phrase) > 500:
                raise ValueError("Synthesis phrase exceeds 500 characters")
            pcm, cues = await asyncio.to_thread(self._synthesize, phrase)
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
                    packet_cues(cues, start // 2, (start + len(block)) // 2),
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
