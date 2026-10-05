"""Closed request boundaries and safe local settings."""

import re
from typing import Annotated, Literal, Self

from opentavus_core.providers import ProviderConfiguration
from opentavus_core.schema import Boundary, Identifier
from pydantic import Field, SecretStr, field_validator, model_validator


class CallSettings(Boundary):
    provider_id: Identifier = "local"
    model: Annotated[str, Field(min_length=1, max_length=160, pattern=r"^[a-zA-Z0-9_.:/-]+$")] = (
        "qwen2.5:1.5b"
    )
    voice: Literal["af_heart", "af_bella", "am_michael", "bf_emma"] = "am_michael"
    avatar: Literal[
        "einstein", "einstein-portrait", "mira-photo", "mira", "portrait", "orbit", "lumen"
    ] = "einstein"

    @model_validator(mode="after")
    def reviewed_local_model(self) -> Self:
        if self.provider_id == "local" and self.model not in {
            "qwen2.5:0.5b",
            "qwen2.5:1.5b",
            "qwen2.5:7b",
        }:
            raise ValueError("Choose a reviewed local model or a configured provider")
        return self


class ProviderWrite(Boundary):
    configuration: ProviderConfiguration
    api_key: SecretStr | None = None
    remove_key: bool = False

    @field_validator("api_key")
    @classmethod
    def valid_key(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None and not re.fullmatch(r"[!-~]{1,512}", value.get_secret_value()):
            raise ValueError("Use a non-empty API key without whitespace")
        return value

    @model_validator(mode="after")
    def one_key_action(self) -> Self:
        if self.remove_key and self.api_key is not None:
            raise ValueError("Choose either replacement or removal of the key")
        return self


class CallCreated(Boundary):
    schema_version: Literal[1] = 1
    conversation_id: Identifier
    token: Annotated[str, Field(min_length=32, max_length=128)]
    settings: CallSettings
    teaching_available: bool = True


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
