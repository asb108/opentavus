import json
import os

import pytest
from opentavus_core.errors import CoreError
from opentavus_core.providers import ProviderConfiguration
from opentavus_runtime.providers import ProviderStore
from pydantic import SecretStr, ValidationError


def configuration(**changes):
    return ProviderConfiguration(
        id="fixture",
        name="Fixture",
        model="model",
        endpoint=changes.pop("endpoint", "http://127.0.0.1:11434/v1"),
        **changes,
    )


def test_private_key_replace_remove_and_destination_scope(tmp_path):
    path = tmp_path / "providers.json"
    store = ProviderStore(path)
    store.save(configuration(), SecretStr("fixture-old"), remove_key=False)
    if os.name == "posix":
        assert path.stat().st_mode & 0o777 == 0o600
    assert "fixture-old" not in json.dumps(
        [
            item.model_dump(mode="json")
            for item in store.views(plugin_installed=True, speech_ready=True)
        ]
    )
    store.save(configuration(), SecretStr("fixture-new"), remove_key=False)
    assert "fixture-old" not in path.read_text()
    assert ProviderStore(path).get("fixture", "model").api_key.get_secret_value() == "fixture-new"
    store.save(configuration(endpoint="https://other.example/v1"), None, remove_key=False)
    assert "fixture-new" not in path.read_text()
    assert store.get("fixture", "model").api_key is None
    store.save(configuration(), SecretStr("fixture-last"), remove_key=False)
    store.save(configuration(), None, remove_key=True)
    assert "fixture-last" not in path.read_text()
    store.delete("fixture")
    assert ProviderStore(path).views(plugin_installed=True, speech_ready=True) == []


def test_failed_atomic_write_preserves_previous_profile(tmp_path, monkeypatch):
    path = tmp_path / "providers.json"
    store = ProviderStore(path)
    store.save(configuration(), SecretStr("fixture-old"), remove_key=False)

    def fail(*_):
        raise OSError("private-value")

    monkeypatch.setattr(os, "replace", fail)
    with pytest.raises(CoreError) as failure:
        store.save(configuration(), SecretStr("fixture-new"), remove_key=False)
    assert "private-value" not in str(failure.value)
    assert store.get("fixture", "model").api_key.get_secret_value() == "fixture-old"
    assert "fixture-new" not in path.read_text()
    assert not list(tmp_path.glob(".providers-*"))


@pytest.mark.parametrize(
    "endpoint",
    [
        "http://remote.example/v1",
        "https://key@example.com/v1",
        "https://example.com/v1?key=x",
        "https://example.com/v1#key",
        "https://example.com/../v1",
        "https://example.com/\x00v1",
        "https://example.com/v1\\path",
    ],
)
def test_destinations_cannot_embed_keys_or_redirect_paths(endpoint):
    with pytest.raises(ValidationError):
        configuration(endpoint=endpoint)


def test_missing_credential_and_changed_model_fail_before_activation():
    store = ProviderStore(None)
    store.save(configuration(requires_key=True), None, remove_key=False)
    with pytest.raises(CoreError) as failure:
        store.get("fixture", "model")
    assert failure.value.code == "provider_auth"
    with pytest.raises(CoreError):
        store.get("fixture", "other")
    assert not store.views(plugin_installed=True, speech_ready=True)[0].ready
