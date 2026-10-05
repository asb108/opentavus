"""Construct selected adapters only after a complete local readiness check."""

import asyncio
import os
from typing import cast

from opentavus_core.contracts import (
    Adapter,
    BoardPlanner,
    EngineKind,
    LanguageModel,
    SpeechToText,
    TextToSpeech,
)
from opentavus_core.errors import CoreError
from opentavus_core.registry import Hardware
from opentavus_core.schema import EngineSelection

from .conversation import Conversation, one, public_failure
from .installation import CATALOG, OLLAMA_URL, Installation


async def prepare_conversation(
    installation: Installation,
    conversation_id: str,
    model: str,
    voice: str,
    provider_id: str = "local",
) -> Conversation:
    catalog = await installation.catalog()
    if provider_id == "local":
        if not any(m["name"] == model and m["ready"] for m in catalog["models"]):
            raise CoreError(
                "model_unavailable", "Install the selected models with make models first."
            )
        model_index = next(i for i, m in enumerate(CATALOG["llms"]) if m["name"] == model)
        llm_selection = EngineSelection(
            plugin_id="local.ollama",
            capability=f"qwen{model_index}",
            execution="endpoint",
            config={"model": model, "endpoint": OLLAMA_URL},
        )
    else:
        entry = installation.providers.get(provider_id, model)
        if not catalog["speech_ready"]:
            raise CoreError(
                "model_unavailable", "Install the local speech models with make models first."
            )
        options = entry.configuration.model_dump(mode="json")
        if entry.api_key is not None:
            options["api_key"] = entry.api_key.get_secret_value()
        llm_selection = EngineSelection(
            plugin_id="provider.compatible",
            capability="default",
            execution="endpoint",
            config=options,
        )
    available = installation.available_artifacts(model)
    # This is physical system memory, not a benchmark or a free-memory guarantee.
    try:
        ram_mb = os.sysconf("SC_PHYS_PAGES") * os.sysconf("SC_PAGE_SIZE") // (1024 * 1024)
    except (ValueError, OSError, AttributeError):
        raise CoreError(
            "model_unavailable", "Memory detection is unavailable on this platform."
        ) from None
    hardware = Hardware(ram_mb=ram_mb, accelerators=frozenset({"cpu"}))
    selections: dict[EngineKind, EngineSelection] = {
        "stt": EngineSelection(
            plugin_id="local.whisper",
            capability="default",
            execution="in_process",
            config={"model_path": str(installation.directory / "whisper-tiny")},
        ),
        "tts": EngineSelection(
            plugin_id="local.kokoro",
            capability="default",
            execution="in_process",
            config={
                "model_path": str(installation.directory / "kokoro-v1.0.onnx"),
                "voices_path": str(installation.directory / "voices-v1.0.bin"),
                "voice": voice,
            },
        ),
        "llm": llm_selection,
    }
    # Resolve all choices before importing any inference factory.
    for kind, selection in selections.items():
        installation.registry.resolve(
            selection, kind=kind, language="en", hardware=hardware, available_artifacts=available
        )
    adapters: list[Adapter] = []
    new_speech: list[tuple[str, Adapter]] = []
    try:
        for kind, selection in selections.items():
            cache_key = f"{kind}:{voice if kind == 'tts' else 'default'}"
            cached = installation.speech_cache.get(cache_key) if kind in {"stt", "tts"} else None
            adapter = cached or installation.registry.activate(
                selection,
                kind=kind,
                language="en",
                hardware=hardware,
                available_artifacts=available,
            )
            adapters.append(adapter)
            if cached is None and kind in {"stt", "tts"}:
                new_speech.append((cache_key, adapter))
        stt = cast(SpeechToText, adapters[0])
        tts = cast(TextToSpeech, adapters[1])
        llm = cast(LanguageModel, adapters[2])
        async with asyncio.TaskGroup() as group:
            for adapter in adapters:
                if adapter not in installation.speech_cache.values():
                    group.create_task(adapter.prepare())
        conversation = Conversation(
            conversation_id,
            llm,
            tts,
            stt,
            cast(BoardPlanner, llm) if cast(BoardPlanner, llm).teaching_available else None,
            installation.directory,
            release_speech_on_close=False,
        )
        # Run the expensive first synthesis before the call is marked ready.
        async for _ in tts.speak(one("Ready when you are."), conversation.context()):
            pass
        for key, adapter in new_speech:
            installation.speech_cache[key] = adapter
        # Keep one recognizer and at most two warm voices on this single-user host.
        while len(installation.speech_cache) > 3:
            key = next(k for k, a in installation.speech_cache.items() if a not in adapters)
            await installation.speech_cache.pop(key).close()
        return conversation
    except BaseException as error:
        await asyncio.gather(
            *(
                adapter.close()
                for adapter in adapters
                if adapter not in installation.speech_cache.values()
            ),
            return_exceptions=True,
        )
        if (failure := public_failure(error)) is not None:
            raise failure from None
        raise
