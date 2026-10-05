from types import SimpleNamespace

import pytest
from opentavus_core.errors import CoreError
from opentavus_core.providers import ProviderConfiguration
from opentavus_runtime.bootstrap import prepare_conversation
from opentavus_runtime.providers import ProviderStore
from pydantic import SecretStr


class Engine:
    teaching_available = False

    def __init__(self, *, fail=False):
        self.fail = fail
        self.closed = False

    async def prepare(self):
        if self.fail:
            raise CoreError("provider_auth", "Replace the configured key.")

    async def close(self):
        self.closed = True

    async def speak(self, text, context):
        if False:
            yield


class Registry:
    def __init__(self, engines):
        self.engines = engines
        self.resolved = []
        self.selected = []

    def resolve(self, selection, **_):
        self.resolved.append(selection)

    def activate(self, selection, **options):
        assert len(self.resolved) == 3
        self.selected.append(selection)
        return self.engines[options["kind"]]


def installation(tmp_path, *, fail=False):
    store = ProviderStore(None)
    store.save(
        ProviderConfiguration(
            id="fixture",
            name="Fixture",
            endpoint="http://127.0.0.1:11434/v1",
            model="fixture-model",
            requires_key=True,
        ),
        SecretStr("fixture-key"),
        remove_key=False,
    )
    engines = {kind: Engine(fail=fail and kind == "llm") for kind in ("stt", "tts", "llm")}

    async def catalog():
        return {"speech_ready": True, "models": []}

    return SimpleNamespace(
        providers=store,
        directory=tmp_path,
        registry=Registry(engines),
        speech_cache={},
        catalog=catalog,
        available_artifacts=lambda _: frozenset(),
    ), engines


async def test_compatible_snapshot_resolves_before_import_and_reuses_speech(tmp_path):
    installed, engines = installation(tmp_path)
    call = await prepare_conversation(
        installed, "fixture-call", "fixture-model", "bf_emma", "fixture"
    )
    assert call.planner is None
    llm = installed.registry.selected[-1]
    assert llm.plugin_id == "provider.compatible"
    assert llm.config["model"] == "fixture-model"
    assert llm.config["api_key"] == "fixture-key"
    assert installed.registry.selected[1].config["voice"] == "bf_emma"
    assert len(installed.speech_cache) == 2
    await call.close()
    assert engines["llm"].closed
    assert not engines["tts"].closed
    assert not engines["stt"].closed
    for engine in installed.speech_cache.values():
        await engine.close()


async def test_partial_prepare_closes_new_adapters_and_preserves_public_error(tmp_path):
    installed, engines = installation(tmp_path, fail=True)
    with pytest.raises(CoreError) as failure:
        await prepare_conversation(installed, "fixture-call", "fixture-model", "bf_emma", "fixture")
    assert failure.value.code == "provider_auth"
    assert all(engine.closed for engine in engines.values())
    assert not installed.speech_cache
