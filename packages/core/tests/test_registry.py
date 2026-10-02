import json
from copy import deepcopy

import pytest
from conftest import manifest_for, selection_for, unused_loader
from opentavus_core.errors import CoreError
from opentavus_core.registry import Hardware, InstalledPlugin, PluginRegistry, resolve_profile
from opentavus_core.schema import Manifest, Profile
from pydantic import ValidationError


def test_listing_and_resolution_leave_factory_unloaded(registry, resolve):
    assert [manifest.id for manifest in registry.manifests()] == ["fixture.tts"]
    assert resolve().manifest.id == "fixture.tts"


def test_empty_registry_does_not_require_optional_plugins():
    assert PluginRegistry([]).manifests() == ()
    with pytest.raises(CoreError) as result:
        PluginRegistry([]).resolve(
            selection_for(),
            kind="tts",
            language="en",
            hardware=Hardware(1024),
            available_artifacts=frozenset(),
        )
    assert result.value.code == "plugin_missing"


@pytest.mark.parametrize(
    ("change", "expected"),
    [
        ({"kind": "llm"}, "kind_mismatch"),
        ({"language": "hi"}, "unsupported_language"),
        ({"hardware": Hardware(64)}, "unsupported_hardware"),
        ({"available_artifacts": frozenset()}, "artifact_missing"),
        ({"accepted_output_formats": frozenset({"video.rgb24"})}, "format_mismatch"),
    ],
)
def test_resolution_failures_are_structured_without_loading(resolve, change, expected):
    with pytest.raises(CoreError) as result:
        resolve(**change)
    assert result.value.code == expected


def test_unknown_capability_fails_before_loading(resolve):
    with pytest.raises(CoreError) as result:
        resolve(selection_for().model_copy(update={"capability": "unknown"}))
    assert result.value.code == "capability_missing"


def test_invalid_config_does_not_expose_secret(resolve):
    secret = "a-private-endpoint-credential"
    with pytest.raises(CoreError) as result:
        resolve(selection_for().model_copy(update={"config": {"secret": secret}}))
    assert result.value.code == "invalid_config"
    assert secret not in json.dumps(result.value.public_details())
    assert result.value.__cause__ is None


def test_duplicate_registration_fails(manifest):
    with pytest.raises(CoreError) as result:
        PluginRegistry([InstalledPlugin(manifest, unused_loader)] * 2)
    assert result.value.code == "duplicate_plugin"


def test_capability_license_states_are_independent(manifest):
    data = manifest.model_dump(mode="json")
    extra = deepcopy(data["artifacts"][0])
    extra.update(id="experimental-weights", purpose="weights", eligibility="unresolved")
    data["artifacts"].append(extra)
    data["capabilities"]["experimental"] = deepcopy(data["capabilities"]["stream"])
    data["capabilities"]["experimental"]["required_artifacts"].append("experimental-weights")
    plugin = Manifest.model_validate_json(json.dumps(data))
    registry = PluginRegistry([InstalledPlugin(plugin, unused_loader)])
    arguments = dict(
        kind="tts",
        language="en",
        hardware=Hardware(1024),
        available_artifacts=frozenset({"fixture.tts/code", "fixture.tts/experimental-weights"}),
    )
    assert registry.resolve(selection_for(), **arguments).capability.required_artifacts == ["code"]
    with pytest.raises(CoreError) as result:
        registry.activate(
            selection_for().model_copy(update={"capability": "experimental"}), **arguments
        )
    assert result.value.code == "license_ineligible"


@pytest.mark.parametrize(
    "change",
    [
        {"api_version": 2},
        {"schema_version": True},
        {"unknown": "field"},
        {
            "config_schema": {
                "type": "object",
                "additionalProperties": False,
                "$ref": "https://example.org/schema",
            }
        },
    ],
)
def test_malformed_manifest_is_rejected(manifest, change):
    data = manifest.model_dump(mode="json")
    data.update(change)
    with pytest.raises(ValidationError):
        Manifest.model_validate_json(json.dumps(data))


def test_undeclared_artifacts_are_rejected(manifest):
    data = manifest.model_dump(mode="json")
    data["capabilities"]["stream"]["required_artifacts"].append("missing")
    with pytest.raises(ValidationError):
        Manifest.model_validate_json(json.dumps(data))


def test_profile_resolves_without_avatar_and_checks_combined_memory():
    formats = {
        "stt": "transcript.v1",
        "llm": "text.delta.v1",
        "tts": "pcm_s16le",
        "turn": "turn.decision.v1",
    }
    manifests = [
        manifest_for(f"fixture.{kind}", kind=kind, output=output, ram_mb=128)
        for kind, output in formats.items()
    ]
    registry = PluginRegistry(InstalledPlugin(manifest, unused_loader) for manifest in manifests)
    profile = Profile.model_validate_json(
        json.dumps(
            {
                "schema_version": 1,
                "id": "fixture",
                "language": "en",
                **{kind: selection_for(f"fixture.{kind}").model_dump() for kind in formats},
            }
        )
    )
    artifacts = frozenset(f"fixture.{kind}/code" for kind in formats)
    assert set(
        resolve_profile(profile, registry, hardware=Hardware(1024), available_artifacts=artifacts)
    ) == set(formats)
    with pytest.raises(CoreError) as result:
        resolve_profile(profile, registry, hardware=Hardware(256), available_artifacts=artifacts)
    assert result.value.code == "unsupported_hardware"
