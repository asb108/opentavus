"""Emit deterministic silence to exercise a TTS contract, without generating speech."""

from collections.abc import AsyncIterator

from opentavus_core.contracts import (
    AdapterConfiguration,
    AdapterContext,
    AudioOutput,
    Generation,
    TextToSpeech,
)


class FixtureSpeech:
    def __init__(self) -> None:
        self.ready = False
        self._stopped: set[Generation] = set()

    async def prepare(self) -> None:
        self.ready = True

    async def interrupt(self, generation: Generation) -> None:
        self._stopped.add(generation)

    async def close(self) -> None:
        self.ready = False

    async def speak(
        self, text: AsyncIterator[str], context: AdapterContext
    ) -> AsyncIterator[AudioOutput]:
        if not self.ready:
            raise RuntimeError("Prepare the fixture adapter before streaming.")
        sequence = 0
        presentation_sample = 0
        async for _phrase in text:
            context.cancellation.check()
            if context.generation in self._stopped:
                return
            yield AudioOutput(
                generation=context.generation,
                utterance_id="fixture-utterance",
                sequence=sequence,
                presentation_sample=presentation_sample,
                pcm=b"\x00\x00" * 240,
                sample_rate=24000,
                channels=1,
            )
            sequence += 1
            presentation_sample += 240


def create_adapter(config: AdapterConfiguration) -> TextToSpeech:
    return FixtureSpeech()
