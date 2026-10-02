"""Closed request boundaries and safe local settings."""

from typing import Annotated, Literal

from opentavus_core.schema import Boundary, Identifier
from pydantic import Field


class CallSettings(Boundary):
    model: Literal["qwen2.5:0.5b", "qwen2.5:1.5b", "qwen2.5:7b"] = "qwen2.5:1.5b"
    voice: Literal["af_heart", "af_bella", "am_michael", "bf_emma"] = "af_heart"
    avatar: Literal["mira-photo", "mira", "portrait", "orbit", "lumen"] = "mira-photo"


class CallCreated(Boundary):
    schema_version: Literal[1] = 1
    conversation_id: Identifier
    token: Annotated[str, Field(min_length=32, max_length=128)]
    settings: CallSettings


class Offer(Boundary):
    sdp: Annotated[str, Field(min_length=1, max_length=65536)]
    type: Literal["offer"]


class Question(Boundary):
    type: Literal["ask"]
    text: Annotated[str, Field(min_length=1, max_length=2000)]
    teach: bool = False


class Hello(Boundary):
    type: Literal["hello"]
    conversation_id: Identifier
    token: Annotated[str, Field(min_length=32, max_length=128)]


class TeachMode(Boundary):
    type: Literal["teach_mode"]
    enabled: bool
