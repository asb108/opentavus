import asyncio
import hashlib
import subprocess
import sys
from pathlib import Path
from typing import cast

import pytest
from opentavus_core.contracts import AdapterContext, CancellationSignal, Generation, TextToSpeech
from opentavus_core.registry import Hardware, PluginRegistry, discover_installed
from opentavus_core.schema import EngineSelection

pytestmark = pytest.mark.installed_fixture


def test_fixture_source_matches_declared_digest():
    plugin = discover_installed()[0]
    source = (
        Path(__file__).resolve().parents[3]
        / "plugins/fixtures/demo/src/opentavus_fixture_demo/adapter.py"
    )
    assert hashlib.sha256(source.read_bytes()).hexdigest() == plugin.manifest.artifacts[0].sha256


def test_discovery_in_a_fresh_process_never_imports_the_fixture():
    code = (
        "import sys; from opentavus_core.registry import discover_installed; "
        "items = discover_installed(); "
        "assert [i.manifest.id for i in items] == ['fixture.demo']; "
        "assert 'opentavus_fixture_demo' not in sys.modules; "
        "assert 'opentavus_fixture_demo.adapter' not in sys.modules; "
        "assert not any(m.startswith(('torch', 'pipecat', 'fastapi', 'lam')) for m in sys.modules)"
    )
    subprocess.run([sys.executable, "-c", code], check=True)


async def phrases():
    yield "First phrase"
    yield "Second phrase"


def context(signal=None):
    return AdapterContext(
        Generation("fixture-conversation", 1),
        signal or CancellationSignal(),
        lambda artifact: Path(artifact),
        lambda name, value: None,
    )


def adapter():
    registry = PluginRegistry(discover_installed())
    return cast(
        TextToSpeech,
        registry.activate(
            EngineSelection(plugin_id="fixture.demo", capability="stream", execution="in_process"),
            kind="tts",
            language="en",
            hardware=Hardware(1024),
            available_artifacts=frozenset({"fixture.demo/code"}),
        ),
    )


async def test_fixture_streams_ordered_samples_and_stops_after_interrupt():
    engine = adapter()
    await engine.prepare()
    stream = engine.speak(phrases(), context())
    first = await anext(stream)
    assert first.sequence == 0 and first.presentation_sample == 0
    await engine.interrupt(first.generation)
    with pytest.raises(StopAsyncIteration):
        await anext(stream)
    await engine.close()
    await engine.close()


async def test_fixture_cancellation_and_partial_cleanup():
    engine = adapter()
    await engine.close()
    await engine.prepare()
    signal = CancellationSignal()
    signal.cancel()
    with pytest.raises(asyncio.CancelledError):
        await anext(engine.speak(phrases(), context(signal)))
    await engine.close()


async def test_fixture_complete_stream_has_no_sample_gap():
    engine = adapter()
    await engine.prepare()
    chunks = [chunk async for chunk in engine.speak(phrases(), context())]
    assert [chunk.sequence for chunk in chunks] == [0, 1]
    assert [chunk.presentation_sample for chunk in chunks] == [0, 240]
    assert all(len(chunk.pcm) == 480 for chunk in chunks)
    await engine.close()
