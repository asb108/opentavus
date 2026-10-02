"""Domain values and per-kind interfaces; no model or transport dependencies."""

import asyncio
from collections.abc import AsyncIterator, Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol, TypeAlias

EngineKind: TypeAlias = Literal["stt", "llm", "tts", "turn", "avatar", "image"]
Execution: TypeAlias = Literal["in_process", "local_worker", "remote_worker", "endpoint", "browser"]
SessionState: TypeAlias = Literal[
    "created", "preparing", "ready", "active", "ending", "ended", "failed"
]
Eligibility: TypeAlias = Literal["reviewed_permissive", "restricted", "unresolved"]
PayloadFormat: TypeAlias = Literal[
    "pcm_s16le",
    "transcript.v1",
    "text.delta.v1",
    "tool.call.v1",
    "turn.decision.v1",
    "arkit52.v1",
    "video.rgb24",
    "canvas.operation.v1",
    "image.png",
]


@dataclass(frozen=True)
class Generation:
    conversation_id: str
    generation_id: int


class Cancellation(Protocol):
    def check(self) -> None: ...


class CancellationSignal:
    def __init__(self) -> None:
        self.cancelled = False

    def cancel(self) -> None:
        self.cancelled = True

    def check(self) -> None:
        if self.cancelled:
            raise asyncio.CancelledError


@dataclass(frozen=True)
class AdapterContext:
    generation: Generation
    cancellation: Cancellation
    artifact_path: Callable[[str], Path]
    emit_metric: Callable[[str, float], None]


@dataclass(frozen=True)
class AudioInput:
    pcm: bytes
    sample_rate: int
    channels: int
    input_sample: int


@dataclass(frozen=True)
class Transcript:
    text: str
    final: bool
    input_start_sample: int
    input_end_sample: int


@dataclass(frozen=True)
class Message:
    role: Literal["system", "user", "assistant", "tool"]
    content: str


@dataclass(frozen=True)
class TextDelta:
    text: str


@dataclass(frozen=True)
class ToolCall:
    call_id: str
    name: str
    arguments_json: str


VisemeShape: TypeAlias = Literal[
    "rest", "closed", "open", "wide", "round", "pucker", "teeth", "tongue"
]


@dataclass(frozen=True)
class VisemeCue:
    """A mouth shape on the PCM sample clock, relative to its audio packet."""

    shape: VisemeShape
    start_sample: int
    end_sample: int


@dataclass(frozen=True)
class AudioOutput:
    generation: Generation
    utterance_id: str
    sequence: int
    presentation_sample: int
    pcm: bytes
    sample_rate: int
    channels: int
    visemes: tuple[VisemeCue, ...] = ()


@dataclass(frozen=True)
class TurnActivity:
    audio: AudioInput
    speech_active: bool
    silence_ms: int


@dataclass(frozen=True)
class TurnDecision:
    complete: bool
    interrupt: bool


@dataclass(frozen=True)
class AvatarAsset:
    asset_id: str
    plugin_id: str
    format_version: str
    path: Path


@dataclass(frozen=True)
class AvatarOutput:
    generation: Generation
    utterance_id: str
    sequence: int
    presentation_sample: int
    format: Literal["arkit52.v1", "video.rgb24"]
    data: bytes | tuple[float, ...]


@dataclass(frozen=True)
class ImageRequest:
    prompt: str
    width: int
    height: int


@dataclass(frozen=True)
class JobUpdate:
    job_id: str
    state: Literal["running", "completed", "cancelled", "failed"]
    progress: float
    artifact_path: Path | None


class Lifecycle(Protocol):
    async def prepare(self) -> None: ...
    async def interrupt(self, generation: Generation) -> None: ...
    async def close(self) -> None: ...


class SpeechToText(Lifecycle, Protocol):
    def transcribe(
        self, audio: AsyncIterator[AudioInput], context: AdapterContext
    ) -> AsyncIterator[Transcript]: ...


class LanguageModel(Lifecycle, Protocol):
    def reply(
        self, messages: Sequence[Message], context: AdapterContext
    ) -> AsyncIterator[TextDelta | ToolCall]: ...


class TextToSpeech(Lifecycle, Protocol):
    def speak(
        self, text: AsyncIterator[str], context: AdapterContext
    ) -> AsyncIterator[AudioOutput]: ...


class TurnDetector(Lifecycle, Protocol):
    async def decide(self, activity: TurnActivity, context: AdapterContext) -> TurnDecision: ...


class Avatar(Lifecycle, Protocol):
    def animate(
        self, audio: AsyncIterator[AudioOutput], asset: AvatarAsset, context: AdapterContext
    ) -> AsyncIterator[AvatarOutput]: ...


class ImageCreator(Lifecycle, Protocol):
    def create(
        self, request: ImageRequest, context: AdapterContext
    ) -> AsyncIterator[JobUpdate]: ...


Adapter: TypeAlias = (
    SpeechToText | LanguageModel | TextToSpeech | TurnDetector | Avatar | ImageCreator
)


@dataclass(frozen=True)
class AdapterConfiguration:
    capability: str
    execution: Execution
    options: Mapping[str, object]


AdapterFactory: TypeAlias = Callable[[AdapterConfiguration], Adapter]
