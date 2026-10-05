"""Public operator-selected model routes, independent of SDKs and credentials."""

import ipaddress
import re
from typing import Annotated, Literal, Self
from urllib.parse import urlsplit, urlunsplit

from pydantic import Field, field_validator, model_validator

from .schema import Boundary, Identifier


def endpoint_url(value: str) -> str:
    parsed = urlsplit(value)
    try:
        _port = parsed.port
        host = parsed.hostname
    except ValueError:
        raise ValueError("Use a valid model API base URL") from None
    if (
        not host
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or re.search(r"[\s\\\x00-\x1f\x7f]", value)
        or not re.fullmatch(r"/[a-zA-Z0-9._~/-]*|", parsed.path)
        or any(part in {".", ".."} for part in parsed.path.split("/"))
    ):
        raise ValueError("Endpoint URLs must exclude credentials, queries and fragments")
    try:
        loopback = ipaddress.ip_address(host).is_loopback
    except ValueError:
        loopback = host == "localhost"
    if parsed.scheme != "https" and not (parsed.scheme == "http" and loopback):
        raise ValueError("Remote endpoints require HTTPS; HTTP is allowed on loopback")
    return urlunsplit((parsed.scheme, parsed.netloc.lower(), parsed.path.rstrip("/"), "", ""))


class ProviderConfiguration(Boundary):
    id: Identifier
    name: Annotated[str, Field(min_length=1, max_length=80)]
    kind: Literal["compatible", "openrouter"] = "compatible"
    endpoint: Annotated[str, Field(min_length=1, max_length=300)]
    model: Annotated[str, Field(min_length=1, max_length=160, pattern=r"^[a-zA-Z0-9_.:/-]+$")]
    teaching: bool = False
    requires_key: bool = False
    max_output_tokens: Annotated[int, Field(ge=64, le=1024)] = 700
    timeout_seconds: Annotated[int, Field(ge=5, le=90)] = 60
    terms_url: Annotated[str, Field(max_length=300)] | None = None
    model_identity: Literal["provider_declared"] = "provider_declared"

    @field_validator("endpoint")
    @classmethod
    def valid_endpoint(cls, value: str) -> str:
        return endpoint_url(value)

    @field_validator("terms_url")
    @classmethod
    def valid_terms(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("https://"):
            raise ValueError("Use an HTTPS terms reference")
        return endpoint_url(value) if value is not None else None

    @model_validator(mode="after")
    def explicit_route(self) -> Self:
        if self.id == "local":
            raise ValueError("The reviewed local profile is reserved")
        if self.kind == "openrouter" and (
            self.endpoint != "https://openrouter.ai/api/v1" or not self.requires_key
        ):
            raise ValueError("OpenRouter uses its fixed endpoint and a server-held API key")
        if self.model in {"auto", "openrouter/auto"}:
            raise ValueError("Choose an explicit model instead of automatic model routing")
        return self


class ProviderView(Boundary):
    configuration: ProviderConfiguration
    credential_configured: bool
    ready: bool
    reason: str
    evidence: Literal["experimental"] = "experimental"


class ProviderList(Boundary):
    schema_version: Literal[1] = 1
    providers: list[ProviderView]
