"""Streaming Ollama speech plus schema-constrained teaching tool output."""

import json
from collections.abc import AsyncIterator, Sequence
from typing import Any

import httpx
from opentavus_core.contracts import (
    AdapterConfiguration,
    AdapterContext,
    Generation,
    Message,
    TextDelta,
    ToolCall,
)


class OllamaAdapter:
    teaching_available = True

    def __init__(self, model: str, endpoint: str) -> None:
        self.model = model
        self.endpoint = endpoint.rstrip("/")
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(90, connect=3), trust_env=False)

    async def prepare(self) -> None:
        response = await self._client.post(
            self.endpoint + "/api/generate",
            json={
                "model": self.model,
                "prompt": "",
                "keep_alive": "10m",
                "stream": False,
                "options": {"num_ctx": 4096},
            },
        )
        response.raise_for_status()

    async def reply(
        self, messages: Sequence[Message], context: AdapterContext
    ) -> AsyncIterator[TextDelta | ToolCall]:
        request = {
            "model": self.model,
            "stream": True,
            "keep_alive": "10m",
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "options": {"temperature": 0.5, "num_predict": 350, "num_ctx": 4096},
        }
        async with self._client.stream("POST", self.endpoint + "/api/chat", json=request) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                context.cancellation.check()
                if len(line) > 65536:
                    raise ValueError("Provider event exceeds its limit")
                if not line:
                    continue
                value = json.loads(line)
                if value.get("error"):
                    raise ValueError("Local model inference failed")
                text = value.get("message", {}).get("content", "")
                if not isinstance(text, str):
                    raise ValueError("Invalid provider text")
                if text:
                    yield TextDelta(text)

    async def board(self, prompt: str, schema: dict[str, Any], context: AdapterContext) -> str:
        """Constrain JSON with the actual provider; runtime validates the result again."""
        response = await self._client.post(
            self.endpoint + "/api/chat",
            json={
                "model": self.model,
                "stream": False,
                "format": schema,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt + "\nRequired JSON schema: " + json.dumps(schema),
                    }
                ],
                "options": {"temperature": 0, "num_predict": 700, "num_ctx": 4096},
            },
        )
        response.raise_for_status()
        context.cancellation.check()
        value = response.json()["message"]["content"]
        if not isinstance(value, str) or len(value) > 12000:
            raise ValueError("Teaching output exceeds its limit")
        return value

    async def interrupt(self, generation: Generation) -> None:
        # Closing the streaming response cooperatively cancels Ollama generation.
        pass

    async def close(self) -> None:
        await self._client.aclose()


def create(configuration: AdapterConfiguration) -> OllamaAdapter:
    return OllamaAdapter(
        str(configuration.options["model"]), str(configuration.options["endpoint"])
    )
