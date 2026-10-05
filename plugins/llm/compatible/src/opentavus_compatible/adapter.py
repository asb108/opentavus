"""Bounded compatible SSE replies and schema-directed teaching; no agent loop."""

import asyncio
import codecs
import json
import re
from collections.abc import AsyncIterator, Sequence
from typing import Any

import httpx
from opentavus_core.contracts import (
    AdapterConfiguration,
    AdapterContext,
    Generation,
    Message,
    TextDelta,
)
from opentavus_core.errors import CoreError
from opentavus_core.providers import ProviderConfiguration
from pydantic import SecretStr


def invalid_response() -> CoreError:
    return CoreError(
        "provider_invalid_response", "The model returned an invalid or incomplete response."
    )


def check_status(response: httpx.Response) -> None:
    status = response.status_code
    if status in {401, 403}:
        raise CoreError("provider_auth", "The provider rejected its key. Replace it in settings.")
    if status == 402:
        raise CoreError("provider_auth", "Check the provider account's credits or spending limit.")
    if status == 429:
        raise CoreError(
            "provider_rate_limited", "The provider is busy or rate limited. Retry later."
        )
    if status in {400, 404, 422}:
        raise CoreError(
            "provider_invalid_response",
            "Check this provider's model name and support for the requested response format.",
        )
    if not 200 <= status < 300:
        raise CoreError(
            "provider_unavailable", "The configured provider is unavailable. Retry later."
        )


async def sse_events(response: httpx.Response, context: AdapterContext) -> AsyncIterator[str]:
    """Frame SSE with bounded chunks, lines and events, including CRLF and comments."""
    decoder = codecs.getincrementaldecoder("utf-8")("strict")
    pending = ""
    data: list[str] = []
    event_size = total = 0
    # Preserve transport chunks: a chunk_size buffers small token events until it fills.
    async for chunk in response.aiter_bytes():
        context.cancellation.check()
        total += len(chunk)
        if total > 262144:
            raise invalid_response()
        try:
            pending += decoder.decode(chunk)
        except UnicodeDecodeError:
            raise invalid_response() from None
        while "\n" in pending:
            line, pending = pending.split("\n", 1)
            line = line.removesuffix("\r")
            if len(line.encode()) > 65536:
                raise invalid_response()
            if not line:
                if data:
                    yield "\n".join(data)
                data = []
                event_size = 0
            elif line.startswith("data:"):
                value = line[5:].removeprefix(" ")
                event_size += len(value.encode())
                if event_size > 65536:
                    raise invalid_response()
                data.append(value)
            # Comments, event names and IDs carry no model text.
        if len(pending.encode()) > 65536:
            raise invalid_response()
    try:
        decoder.decode(b"", final=True)
    except UnicodeDecodeError:
        raise invalid_response() from None
    if pending or data:
        raise invalid_response()


class CompatibleAdapter:
    def __init__(
        self,
        configuration: ProviderConfiguration,
        api_key: SecretStr | None,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.configuration = configuration
        self.teaching_available = configuration.teaching
        self._models = {configuration.model}
        headers = {}
        if api_key is not None:
            key = api_key.get_secret_value()
            if not re.fullmatch(r"[!-~]{1,512}", key):
                raise CoreError("invalid_config", "The provider credential has an invalid format.")
            headers["Authorization"] = "Bearer " + key
        elif configuration.requires_key:
            raise CoreError("provider_auth", "Add the provider's API key in companion settings.")
        self._client = httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(configuration.timeout_seconds, connect=3),
            follow_redirects=False,
            trust_env=False,
            transport=transport,
        )

    async def prepare(self) -> None:
        try:
            async with asyncio.timeout(self.configuration.timeout_seconds):
                async with self._client.stream("GET", self.configuration.endpoint + "/models") as r:
                    check_status(r)
                    content = bytearray()
                    async for chunk in r.aiter_bytes(chunk_size=4096):
                        content.extend(chunk)
                        if len(content) > 4 * 1024 * 1024:
                            raise invalid_response()
                    value = json.loads(content)
                    if not isinstance(value, dict) or not isinstance(value.get("data"), list):
                        raise invalid_response()
                    model = next(
                        (
                            item
                            for item in value["data"]
                            if isinstance(item, dict) and item.get("id") == self.configuration.model
                        ),
                        None,
                    )
                    if model is None:
                        raise CoreError(
                            "model_unavailable",
                            "This model is not listed by the configured endpoint.",
                        )
                    canonical = model.get("canonical_slug")
                    if isinstance(canonical, str) and len(canonical) <= 160:
                        self._models.add(canonical)
                    if self.configuration.kind == "openrouter" and self.configuration.teaching:
                        parameters = model.get("supported_parameters")
                        self.teaching_available = (
                            isinstance(parameters, list)
                            and len(parameters) <= 128
                            and all(isinstance(parameter, str) for parameter in parameters)
                            and "response_format" in parameters
                        )
        except (httpx.HTTPError, TimeoutError):
            raise CoreError(
                "provider_unavailable", "Could not reach the configured model endpoint."
            ) from None
        except (ValueError, TypeError):
            raise invalid_response() from None

    def _request(self, messages: Sequence[Message], *, teaching: bool) -> dict[str, Any]:
        if sum(len(message.content) for message in messages) > 32000:
            raise CoreError("invalid_config", "The provider context exceeds this profile's limit.")
        request: dict[str, Any] = {
            "model": self.configuration.model,
            "messages": [
                {"role": message.role, "content": message.content} for message in messages
            ],
            "stream": True,
            "max_tokens": self.configuration.max_output_tokens
            if teaching
            else min(350, self.configuration.max_output_tokens),
            "temperature": 0 if teaching else 0.5,
        }
        if self.configuration.kind == "openrouter":
            request["provider"] = {"allow_fallbacks": False, "require_parameters": True}
        return request

    async def _text(
        self, request: dict[str, Any], context: AdapterContext, *, limit: int
    ) -> AsyncIterator[str]:
        context.cancellation.check()
        response_id: str | None = None
        finished = False
        size = 0
        try:
            async with asyncio.timeout(self.configuration.timeout_seconds):
                async with self._client.stream(
                    "POST", self.configuration.endpoint + "/chat/completions", json=request
                ) as response:
                    check_status(response)
                    if "text/event-stream" not in response.headers.get("content-type", ""):
                        raise invalid_response()
                    async for event in sse_events(response, context):
                        context.cancellation.check()
                        if event == "[DONE]":
                            if not finished or size == 0:
                                raise invalid_response()
                            return
                        value = json.loads(event)
                        if not isinstance(value, dict) or value.get("error"):
                            raise invalid_response()
                        model = value.get("model")
                        if model is not None and model not in self._models:
                            raise invalid_response()
                        event_id = value.get("id")
                        if event_id is not None:
                            if not isinstance(event_id, str) or len(event_id) > 160:
                                raise invalid_response()
                            if response_id is not None and response_id != event_id:
                                raise invalid_response()
                            response_id = event_id
                        choices = value.get("choices")
                        if not isinstance(choices, list) or len(choices) > 1:
                            raise invalid_response()
                        if not choices and isinstance(value.get("usage"), dict):
                            continue
                        if not choices or not isinstance(choices[0], dict):
                            raise invalid_response()
                        choice = choices[0]
                        if choice.get("index", 0) != 0:
                            raise invalid_response()
                        delta = choice.get("delta")
                        if not isinstance(delta, dict) or delta.get("tool_calls"):
                            raise invalid_response()
                        reason = choice.get("finish_reason")
                        if reason not in {None, "stop"}:
                            raise invalid_response()
                        text = delta.get("content")
                        if text is not None and not isinstance(text, str):
                            raise invalid_response()
                        if text:
                            if finished:
                                raise invalid_response()
                            size += len(text)
                            if size > limit:
                                raise invalid_response()
                            yield text
                        finished = finished or reason == "stop"
                    raise invalid_response()
        except (httpx.HTTPError, TimeoutError):
            raise CoreError(
                "provider_unavailable", "The provider connection timed out or disconnected."
            ) from None
        except (ValueError, TypeError):
            raise invalid_response() from None

    async def reply(
        self, messages: Sequence[Message], context: AdapterContext
    ) -> AsyncIterator[TextDelta]:
        async for text in self._text(self._request(messages, teaching=False), context, limit=6000):
            yield TextDelta(text)

    async def board(self, prompt: str, schema: dict[str, object], context: AdapterContext) -> str:
        if not self.teaching_available:
            raise CoreError(
                "capability_missing",
                "Teaching is unavailable on this model. Conversation still works.",
            )
        request = self._request(
            [Message("user", prompt + "\nRequired JSON schema: " + json.dumps(schema))],
            teaching=True,
        )
        request["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": "teaching", "strict": True, "schema": schema},
        }
        parts = [part async for part in self._text(request, context, limit=12000)]
        context.cancellation.check()
        return "".join(parts)

    async def interrupt(self, generation: Generation) -> None:
        # The conversation cancels its request task; stream contexts close cooperatively.
        pass

    async def close(self) -> None:
        await self._client.aclose()


def create(configuration: AdapterConfiguration) -> CompatibleAdapter:
    options = dict(configuration.options)
    key = options.pop("api_key", "")
    if not isinstance(key, str):
        raise CoreError("invalid_config", "Provider credential configuration is invalid.")
    return CompatibleAdapter(
        ProviderConfiguration.model_validate(options), SecretStr(key) if key else None
    )
