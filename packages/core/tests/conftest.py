import hashlib
import json
from collections.abc import Callable

import pytest
from opentavus_core.contracts import AdapterFactory, EngineKind, PayloadFormat
from opentavus_core.registry import Hardware, InstalledPlugin, PluginRegistry
from opentavus_core.schema import EngineSelection, Manifest


def manifest_for(
    plugin_id: str = "fixture.tts",
    *,
    kind: EngineKind = "tts",
    output: PayloadFormat = "pcm_s16le",
    ram_mb: int = 128,
) -> Manifest:
    return Manifest.model_validate_json(
        json.dumps(
            {
                "schema_version": 1,
                "api_version": 1,
                "id": plugin_id,
                "kind": kind,
                "display_name": "Synthetic fixture",
                "entry_point": "fixture_adapter:create",
                "capabilities": {
                    "stream": {
                        "required_artifacts": ["code"],
                        "input_formats": ["text.delta.v1"],
                        "output_formats": [output],
                    }
                },
                "execution": ["in_process"],
                "languages": ["en"],
                "streaming": "native",
                "cancellation": "cooperative",
                "hardware": {"in_process": {"min_ram_mb": ram_mb, "accelerator": "cpu"}},
                "artifacts": [
                    {
                        "id": "code",
                        "purpose": "code",
                        "source_url": "repo://tests/fixture.py",
                        "revision": "fixture-v1",
                        "sha256": hashlib.sha256(b"fixture-v1").hexdigest(),
                        "license_id": "Apache-2.0",
                        "license_url": "repo://LICENSE",
                        "attribution": "OpenTavus contributors",
                        "eligibility": "reviewed_permissive",
                    }
                ],
                "config_schema": {
                    "type": "object",
                    "properties": {"voice": {"type": "string", "enum": ["demo"]}},
                    "additionalProperties": False,
                },
            }
        )
    )


def selection_for(plugin_id: str = "fixture.tts") -> EngineSelection:
    return EngineSelection(plugin_id=plugin_id, capability="stream", execution="in_process")


def unused_loader() -> AdapterFactory:
    raise AssertionError("Metadata/profile resolution must not import a factory")


@pytest.fixture
def manifest() -> Manifest:
    return manifest_for()


@pytest.fixture
def registry(manifest: Manifest) -> PluginRegistry:
    return PluginRegistry([InstalledPlugin(manifest, unused_loader)])


@pytest.fixture
def resolve(registry: PluginRegistry) -> Callable[..., object]:
    def call(selection: EngineSelection | None = None, **overrides: object) -> object:
        arguments = {
            "kind": "tts",
            "language": "en",
            "hardware": Hardware(1024),
            "available_artifacts": frozenset({"fixture.tts/code"}),
        }
        arguments.update(overrides)
        return registry.resolve(selection or selection_for(), **arguments)

    return call
