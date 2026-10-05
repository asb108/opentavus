import asyncio
import importlib.util
import json
from pathlib import Path

import httpx
import pytest
from opentavus_core.contracts import AdapterContext, CancellationSignal, Generation, Message
from opentavus_core.errors import CoreError
from opentavus_core.providers import ProviderConfiguration
from pydantic import SecretStr

# CI exercises optional source without installing this plugin or inference packages.
source = Path(__file__).resolve().parents[1] / "src/opentavus_compatible/adapter.py"
spec = importlib.util.spec_from_file_location("compatible_unit", source)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
CompatibleAdapter = module.CompatibleAdapter


def context():
    return AdapterContext(
        Generation("fixture", 1), CancellationSignal(), lambda name: Path(name), lambda *_: None
    )


def config(**changes):
    return ProviderConfiguration(
        id="fixture",
        name="Fixture",
        endpoint="http://127.0.0.1:11434/v1",
        model="fixture-model",
        **changes,
    )


def frame(content=None, *, finish=None, **changes):
    return (
        "data: "
        + json.dumps(
            {
                "id": "fixture-response",
                "model": "fixture-model",
                "choices": [
                    {
                        "index": 0,
                        "delta": {"content": content, "reasoning": "Do not speak this"},
                        "finish_reason": finish,
                    }
                ],
                **changes,
            },
            ensure_ascii=False,
        )
        + "\r\n\r\n"
    )


class Chunks(httpx.AsyncByteStream):
    def __init__(self, chunks, gate=None):
        self.chunks = chunks
        self.gate = gate
        self.closed = False

    async def __aiter__(self):
        for index, chunk in enumerate(self.chunks):
            if index and self.gate:
                await self.gate.wait()
            yield chunk

    async def aclose(self):
        self.closed = True


def adapter(stream, requests=None, **options):
    def handler(request):
        if requests is not None:
            requests.append(request)
        return httpx.Response(200, headers={"content-type": "text/event-stream"}, stream=stream)

    return CompatibleAdapter(config(**options), None, transport=httpx.MockTransport(handler))


async def test_fragmented_utf8_comments_and_accounting_never_become_spoken_text():
    wire = (
        ": processing\r\n\r\n"
        + frame("Café. ")
        + frame("Hello.")
        + frame(finish="stop")
        + frame(finish="stop", usage={"total_tokens": 12})
        + "data: [DONE]\r\n\r\n"
    ).encode()
    client = adapter(Chunks([wire[index : index + 1] for index in range(len(wire))]))
    try:
        assert (
            "".join([item.text async for item in client.reply([Message("user", "Hi")], context())])
            == "Café. Hello."
        )
    finally:
        await client.close()


async def test_first_small_token_arrives_before_terminal_and_cancel_closes_stream():
    stream = Chunks([frame("Hello. ").encode(), frame(finish="stop").encode()], asyncio.Event())
    client = adapter(stream)
    reply = client.reply([Message("user", "Hi")], context())
    assert (await asyncio.wait_for(anext(reply), 0.2)).text == "Hello. "
    pending = asyncio.create_task(anext(reply))
    await asyncio.sleep(0)
    pending.cancel()
    with pytest.raises(asyncio.CancelledError):
        await pending
    assert stream.closed
    await client.close()


@pytest.mark.parametrize(
    "wire",
    [
        frame("Hello."),
        frame("Hello.") + "data: [DONE]\n\n",
        frame("Hello.", finish="length") + "data: [DONE]\n\n",
        frame("Hello.", model="wrong-model"),
        frame("Hello.") + frame("Late", id="other-response"),
        frame("Hello.", finish="stop") + frame("Obsolete"),
        'data: {"error": {"message": "private-provider-error"}}\n\n',
        "data: " + "x" * 65537,
        frame("x" * 6001),
        "data: "
        + json.dumps(
            {"choices": [{"delta": {"tool_calls": [{"function": {"arguments": '{"shell":'}}]}}]}
        )
        + "\n\n",
    ],
)
async def test_invalid_streams_are_bounded_and_sanitized(wire):
    client = adapter(Chunks([wire.encode()]))
    try:
        with pytest.raises(CoreError) as failure:
            _ = [item async for item in client.reply([Message("user", "fixture")], context())]
        assert failure.value.code == "provider_invalid_response"
        assert "private-provider-error" not in str(failure.value)
    finally:
        await client.close()


@pytest.mark.parametrize(
    ("status", "code"),
    [
        (401, "provider_auth"),
        (403, "provider_auth"),
        (402, "provider_auth"),
        (429, "provider_rate_limited"),
        (503, "provider_unavailable"),
        (302, "provider_unavailable"),
        (400, "provider_invalid_response"),
    ],
)
async def test_http_errors_never_echo_body_or_follow_redirects(status, code):
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(
            status, text="credential=private-key", headers={"location": "https://different.example"}
        )

    client = CompatibleAdapter(
        config(), SecretStr("fixture-key"), transport=httpx.MockTransport(handler)
    )
    with pytest.raises(CoreError) as failure:
        await client.prepare()
    assert failure.value.code == code
    assert "private-key" not in str(failure.value)
    assert len(requests) == 1
    await client.close()


async def test_cancelled_generation_makes_no_request_and_timeout_is_public():
    requests = []
    client = adapter(Chunks([]), requests)
    cancelled = context()
    cancelled.cancellation.cancel()
    with pytest.raises(asyncio.CancelledError):
        await anext(client.reply([], cancelled))
    assert not requests
    await client.close()

    def handler(_):
        raise httpx.ReadTimeout("private request text")

    client = CompatibleAdapter(config(), None, transport=httpx.MockTransport(handler))
    with pytest.raises(CoreError) as failure:
        await client.prepare()
    assert failure.value.code == "provider_unavailable"
    assert "private request" not in str(failure.value)
    await client.close()


@pytest.mark.parametrize(
    ("parameters", "supported"),
    [
        ([], False),
        (None, False),
        ("response_format", False),
        ({}, False),
        ([None], False),
        (["response_format"], True),
    ],
)
async def test_openrouter_probe_checks_teaching_and_has_explicit_no_fallback_policy(
    parameters, supported
):
    calls = []

    def handler(request):
        calls.append(request)
        if request.method == "GET":
            return httpx.Response(
                200, json={"data": [{"id": "fixture-model", "supported_parameters": parameters}]}
            )
        return httpx.Response(
            200,
            headers={"content-type": "text/event-stream"},
            content=(frame("Hi.", finish="stop") + "data: [DONE]\n\n").encode(),
        )

    settings = ProviderConfiguration(
        id="route",
        name="Route",
        kind="openrouter",
        endpoint="https://openrouter.ai/api/v1",
        requires_key=True,
        model="fixture-model",
        teaching=True,
    )
    client = CompatibleAdapter(
        settings, SecretStr("fixture-key"), transport=httpx.MockTransport(handler)
    )
    await client.prepare()
    assert client.teaching_available is supported
    assert [item.text async for item in client.reply([Message("user", "Hi")], context())] == ["Hi."]
    assert json.loads(calls[1].content)["provider"] == {
        "allow_fallbacks": False,
        "require_parameters": True,
    }
    if not supported:
        with pytest.raises(CoreError, match="Teaching is unavailable"):
            await client.board("Question", {}, context())
    await client.close()


async def test_schema_directed_board_uses_same_bounded_stream():
    requests = []
    result = '{"tools":[{"kind":"note","title":"Force","text":"Mass times acceleration."}]}'
    client = adapter(
        Chunks([(frame(result, finish="stop") + "data: [DONE]\n\n").encode()]),
        requests,
        teaching=True,
    )
    assert await client.board("Create a note", {"type": "object"}, context()) == result
    body = json.loads(requests[0].content)
    assert body["response_format"]["json_schema"]["strict"] is True
    assert "tools" not in body
    await client.close()
