"""Validated metadata/wire boundaries and the source for browser contract generation."""

import base64
import binascii
import json
from typing import Annotated, Literal, Self
from urllib.parse import urlsplit

from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    JsonValue,
    TypeAdapter,
    field_validator,
    model_validator,
)

from .contracts import Eligibility, EngineKind, Execution, PayloadFormat, SessionState
from .errors import ErrorCode

Identifier = Annotated[str, Field(min_length=1, max_length=96, pattern=r"^[a-zA-Z0-9_.-]+$")]
Nonnegative = Annotated[int, Field(ge=0)]
Positive = Annotated[int, Field(gt=0)]
JsonObject = dict[str, JsonValue]


class Boundary(BaseModel):
    model_config = ConfigDict(
        extra="forbid", strict=True, hide_input_in_errors=True, allow_inf_nan=False
    )

    @field_validator(
        "schema_version", "api_version", "payload_version", mode="before", check_fields=False
    )
    @classmethod
    def version_is_an_integer(cls, value: object) -> object:
        if type(value) is not int:
            raise ValueError("Protocol versions must be integer values")
        return value


class Artifact(Boundary):
    id: Identifier
    purpose: Literal["code", "weights", "voice", "asset"]
    source_url: str
    revision: Annotated[str, Field(min_length=1, max_length=160)]
    sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
    license_id: Annotated[str, Field(min_length=1, max_length=100)]
    license_url: str
    attribution: Annotated[str, Field(min_length=1, max_length=1000)]
    eligibility: Eligibility

    @field_validator("source_url", "license_url")
    @classmethod
    def source_has_no_credentials(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme not in {"https", "repo"} or not parsed.netloc:
            raise ValueError("Use an HTTPS source or repository reference")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("Artifact references must exclude credentials, queries, and fragments")
        return value


class Capability(Boundary):
    required_artifacts: Annotated[list[Identifier], Field(min_length=1)]
    input_formats: Annotated[list[PayloadFormat], Field(min_length=1)]
    output_formats: Annotated[list[PayloadFormat], Field(min_length=1)]


class HardwareRequirement(Boundary):
    min_ram_mb: Nonnegative = 0
    min_vram_mb: Nonnegative = 0
    accelerator: Literal["none", "cpu", "metal", "cuda"] = "none"
    measurement_run_ids: list[Identifier] = Field(default_factory=list)


class Manifest(Boundary):
    schema_version: Literal[1]
    api_version: Literal[1]
    id: Identifier
    kind: EngineKind
    display_name: Annotated[str, Field(min_length=1, max_length=160)]
    entry_point: Annotated[str, Field(pattern=r"^[a-zA-Z_][\w.]*:[a-zA-Z_]\w*$")]
    capabilities: dict[Identifier, Capability]
    execution: Annotated[list[Execution], Field(min_length=1)]
    languages: Annotated[list[str], Field(min_length=1)]
    streaming: Literal["native", "chunk_adapter", "none"]
    cancellation: Literal["cooperative", "discard_late_output"]
    hardware: dict[Execution, HardwareRequirement]
    artifacts: Annotated[list[Artifact], Field(min_length=1)]
    config_schema: JsonObject
    asset_schema: JsonObject | None = None
    renderer: Identifier | None = None

    @model_validator(mode="after")
    def references_are_consistent(self) -> Self:
        artifact_ids = {artifact.id for artifact in self.artifacts}
        if len(artifact_ids) != len(self.artifacts):
            raise ValueError("Artifact IDs must be unique")
        if not self.capabilities:
            raise ValueError("At least one capability is required")
        code_ids = {artifact.id for artifact in self.artifacts if artifact.purpose == "code"}
        if not code_ids:
            raise ValueError("The plugin's code license must be declared")
        for capability in self.capabilities.values():
            required = set(capability.required_artifacts)
            if len(required) != len(capability.required_artifacts) or not required <= artifact_ids:
                raise ValueError("Capabilities must name unique declared artifact IDs")
            if not code_ids <= required:
                raise ValueError("Each capability must include the plugin code artifacts")
        if set(self.execution) != set(self.hardware) or len(set(self.execution)) != len(
            self.execution
        ):
            raise ValueError("Each unique execution mode needs hardware requirements")
        for schema in (self.config_schema, self.asset_schema):
            if schema is not None:
                try:
                    Draft202012Validator.check_schema(schema)
                except SchemaError as error:
                    raise ValueError("Invalid JSON Schema") from error
                if (
                    schema.get("type") != "object"
                    or schema.get("additionalProperties") is not False
                ):
                    raise ValueError("Configuration/asset schemas must be closed objects")
                if _has_remote_reference(schema):
                    raise ValueError("Schemas cannot fetch external references")
        return self


def _has_remote_reference(value: JsonValue) -> bool:
    if isinstance(value, dict):
        for key, item in value.items():
            if (
                key in {"$ref", "$dynamicRef"}
                and isinstance(item, str)
                and not item.startswith("#")
            ):
                return True
            if _has_remote_reference(item):
                return True
    if isinstance(value, list):
        return any(_has_remote_reference(item) for item in value)
    return False


class EngineSelection(Boundary):
    plugin_id: Identifier
    capability: Identifier
    execution: Execution
    config: JsonObject = Field(default_factory=dict)


class Profile(Boundary):
    schema_version: Literal[1]
    id: Identifier
    language: Annotated[str, Field(min_length=2, max_length=32)]
    stt: EngineSelection
    llm: EngineSelection
    tts: EngineSelection
    turn: EngineSelection
    avatar: EngineSelection | None = None


class EventBase(Boundary):
    schema_version: Literal[1]
    conversation_id: Identifier
    generation_id: Nonnegative
    sequence: Nonnegative


class SessionEvent(EventBase):
    type: Literal["session"]
    state: SessionState


class TextEvent(EventBase):
    type: Literal["text"]
    text: Annotated[str, Field(max_length=8192)]


class AudioEvent(EventBase):
    type: Literal["audio"]
    utterance_id: Identifier
    presentation_sample: Nonnegative
    format: Literal["pcm_s16le"]
    sample_rate: Annotated[int, Field(ge=8000, le=192000)]
    channels: Annotated[int, Field(ge=1, le=2)]
    data_b64: Annotated[str, Field(min_length=4, max_length=1048576)]

    @model_validator(mode="after")
    def pcm_is_aligned(self) -> Self:
        try:
            pcm = base64.b64decode(self.data_b64, validate=True)
        except (ValueError, binascii.Error) as error:
            raise ValueError("PCM must use valid base64") from error
        if not pcm or len(pcm) % (2 * self.channels):
            raise ValueError("PCM must contain complete channel/sample frames")
        return self


class AvatarEvent(EventBase):
    type: Literal["avatar"]
    utterance_id: Identifier
    presentation_sample: Nonnegative
    renderer: Identifier
    format: Literal["arkit52.v1"]
    coefficients: Annotated[
        list[Annotated[float, Field(ge=0, le=1)]], Field(min_length=52, max_length=52)
    ]


class CanvasEvent(EventBase):
    type: Literal["canvas"]
    utterance_id: Identifier
    presentation_sample: Nonnegative
    operation_id: Identifier
    payload_version: Literal[1]
    tool_name: Identifier
    payload: JsonObject

    @field_validator("payload")
    @classmethod
    def payload_is_bounded(cls, value: JsonObject) -> JsonObject:
        if len(json.dumps(value).encode()) > 16384:
            raise ValueError("Canvas payload exceeds 16 KiB")
        return value


class InterruptEvent(EventBase):
    type: Literal["interrupt"]
    stopped_generation_id: Nonnegative


class PlaybackStoppedEvent(EventBase):
    type: Literal["playback_stopped"]
    stopped_generation_id: Nonnegative
    last_played_sample: Nonnegative


class ErrorEvent(EventBase):
    type: Literal["error"]
    code: ErrorCode
    message: Annotated[str, Field(min_length=1, max_length=500)]
    plugin_id: Identifier | None = None


WireEvent = Annotated[
    SessionEvent
    | TextEvent
    | AudioEvent
    | AvatarEvent
    | CanvasEvent
    | InterruptEvent
    | PlaybackStoppedEvent
    | ErrorEvent,
    Field(discriminator="type"),
]
EVENT_ADAPTER: TypeAdapter[WireEvent] = TypeAdapter(WireEvent)


class ContractBundle(Boundary):
    manifest: Manifest
    profile: Profile
    event: WireEvent
