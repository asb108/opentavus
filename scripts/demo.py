"""Exercise installed fixture discovery and ordered chunks; this does not generate speech."""

import asyncio
from pathlib import Path
from typing import cast

from opentavus_core.contracts import AdapterContext, CancellationSignal, Generation, TextToSpeech
from opentavus_core.registry import Hardware, PluginRegistry, discover_installed
from opentavus_core.schema import EngineSelection


async def phrases():
    yield "Synthetic phrase one"
    yield "Synthetic phrase two"


async def main() -> None:
    registry = PluginRegistry(discover_installed())
    print(
        "Installed plugin metadata:", ", ".join(item.id for item in registry.manifests()) or "none"
    )
    adapter = cast(
        TextToSpeech,
        registry.activate(
            EngineSelection(plugin_id="fixture.demo", capability="stream", execution="in_process"),
            kind="tts",
            language="en",
            hardware=Hardware(1024),
            available_artifacts=frozenset({"fixture.demo/code"}),
        ),
    )
    context = AdapterContext(
        Generation("demo", 1),
        CancellationSignal(),
        lambda artifact: Path(artifact),
        lambda name, value: None,
    )
    try:
        await adapter.prepare()
        async for chunk in adapter.speak(phrases(), context):
            print(
                f"Synthetic chunk {chunk.sequence}: "
                f"sample={chunk.presentation_sample}, bytes={len(chunk.pcm)}"
            )
    finally:
        await adapter.close()
    print("Fixture contract completed. No speech model, avatar, or latency benchmark ran.")


if __name__ == "__main__":
    asyncio.run(main())
