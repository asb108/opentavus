"""Metadata-first discovery and explicit selection; factories load only after checks."""

import re
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from importlib.machinery import PathFinder
from importlib.metadata import entry_points
from pathlib import Path
from typing import cast

from jsonschema import Draft202012Validator
from pydantic import ValidationError

from .contracts import Adapter, AdapterConfiguration, AdapterFactory, EngineKind, PayloadFormat
from .errors import CoreError
from .schema import Capability, EngineSelection, Manifest, Profile

MANIFEST_GROUP = "opentavus.manifests"
FACTORY_GROUP = "opentavus.engines"
MAX_MANIFEST_BYTES = 1048576


@dataclass(frozen=True)
class InstalledPlugin:
    manifest: Manifest
    load_factory: Callable[[], AdapterFactory]


@dataclass(frozen=True)
class Hardware:
    ram_mb: int
    vram_mb: int = 0
    accelerators: frozenset[str] = frozenset({"cpu"})


@dataclass(frozen=True)
class ResolvedSelection:
    selection: EngineSelection
    manifest: Manifest
    capability: Capability


def discover_installed() -> list[InstalledPlugin]:
    factories = {}
    for entry in entry_points(group=FACTORY_GROUP):
        if entry.name in factories:
            raise CoreError("duplicate_plugin", "A factory ID is registered more than once.")
        factories[entry.name] = entry
    installed: list[InstalledPlugin] = []
    for descriptor in entry_points(group=MANIFEST_GROUP):
        # A top-level package lookup avoids executing parent-package imports during discovery.
        if not re.fullmatch(r"[a-zA-Z_]\w*", descriptor.value):
            raise CoreError(
                "invalid_manifest", "Manifest entry point must name a top-level package."
            )
        specification = PathFinder.find_spec(descriptor.value)
        if specification is None or not specification.submodule_search_locations:
            raise CoreError(
                "invalid_manifest", "Installed plugin manifest package cannot be located."
            )
        path = Path(specification.submodule_search_locations[0]) / "opentavus-plugin.json"
        try:
            with path.open("rb") as handle:
                raw = handle.read(MAX_MANIFEST_BYTES + 1)
            if len(raw) > MAX_MANIFEST_BYTES:
                raise CoreError("invalid_manifest", "Plugin manifest exceeds 1 MiB.")
            manifest = Manifest.model_validate_json(raw)
        except (OSError, ValidationError):
            raise CoreError(
                "invalid_manifest", "Installed plugin manifest is missing or invalid."
            ) from None
        factory = factories.get(descriptor.name)
        if (
            manifest.id != descriptor.name
            or factory is None
            or factory.value != manifest.entry_point
        ):
            raise CoreError(
                "invalid_manifest", "Plugin manifest and factory registration disagree."
            )
        installed.append(
            InstalledPlugin(manifest, cast(Callable[[], AdapterFactory], factory.load))
        )
    return installed


class PluginRegistry:
    def __init__(self, installed: Iterable[InstalledPlugin]) -> None:
        self._plugins: dict[str, InstalledPlugin] = {}
        for plugin in installed:
            plugin_id = plugin.manifest.id
            if plugin_id in self._plugins:
                raise CoreError(
                    "duplicate_plugin",
                    "Plugin ID is registered more than once.",
                    plugin_id=plugin_id,
                )
            self._plugins[plugin_id] = plugin

    def manifests(self) -> tuple[Manifest, ...]:
        return tuple(plugin.manifest for plugin in self._plugins.values())

    def resolve(
        self,
        selection: EngineSelection,
        *,
        kind: EngineKind,
        language: str,
        hardware: Hardware,
        available_artifacts: frozenset[str],
        accepted_output_formats: frozenset[PayloadFormat] | None = None,
    ) -> ResolvedSelection:
        plugin = self._plugins.get(selection.plugin_id)
        if plugin is None:
            raise CoreError(
                "plugin_missing",
                "Install the selected plugin or choose an installed engine.",
                plugin_id=selection.plugin_id,
            )
        manifest = plugin.manifest
        if manifest.kind != kind:
            raise CoreError(
                "kind_mismatch",
                "The selected plugin has a different engine kind.",
                plugin_id=manifest.id,
            )
        capability = manifest.capabilities.get(selection.capability)
        if capability is None:
            raise CoreError(
                "capability_missing",
                "Choose a capability supported by this plugin.",
                plugin_id=manifest.id,
            )
        artifacts = {artifact.id: artifact for artifact in manifest.artifacts}
        for artifact_id in capability.required_artifacts:
            if artifacts[artifact_id].eligibility != "reviewed_permissive":
                raise CoreError(
                    "license_ineligible",
                    "A required artifact is restricted or unresolved in the default profile.",
                    plugin_id=manifest.id,
                )
            if f"{manifest.id}/{artifact_id}" not in available_artifacts:
                raise CoreError(
                    "artifact_missing",
                    "Prepare and verify the selected plugin's required artifacts.",
                    plugin_id=manifest.id,
                )
        if language not in manifest.languages:
            raise CoreError(
                "unsupported_language",
                "Choose a language supported by the selected plugin.",
                plugin_id=manifest.id,
            )
        if selection.execution not in manifest.execution:
            raise CoreError(
                "unsupported_hardware",
                "The plugin does not support the selected execution mode.",
                plugin_id=manifest.id,
            )
        requirement = manifest.hardware[selection.execution]
        if (
            requirement.accelerator != "none"
            and requirement.accelerator not in hardware.accelerators
        ):
            raise CoreError(
                "unsupported_hardware",
                "The selected execution mode needs an unavailable accelerator.",
                plugin_id=manifest.id,
            )
        if hardware.ram_mb < requirement.min_ram_mb or hardware.vram_mb < requirement.min_vram_mb:
            raise CoreError(
                "unsupported_hardware",
                "Available memory is below the declared engine requirement.",
                plugin_id=manifest.id,
            )
        if accepted_output_formats is not None and not accepted_output_formats.intersection(
            capability.output_formats
        ):
            raise CoreError(
                "format_mismatch",
                "The selected capability cannot produce the required output format.",
                plugin_id=manifest.id,
            )
        if next(Draft202012Validator(manifest.config_schema).iter_errors(selection.config), None):
            raise CoreError(
                "invalid_config",
                "Configuration does not match the selected plugin's schema.",
                plugin_id=manifest.id,
            )
        return ResolvedSelection(selection, manifest, capability)

    def activate(
        self,
        selection: EngineSelection,
        *,
        kind: EngineKind,
        language: str,
        hardware: Hardware,
        available_artifacts: frozenset[str],
    ) -> Adapter:
        resolved = self.resolve(
            selection,
            kind=kind,
            language=language,
            hardware=hardware,
            available_artifacts=available_artifacts,
        )
        try:
            factory = self._plugins[resolved.manifest.id].load_factory()
            return factory(
                AdapterConfiguration(
                    capability=selection.capability,
                    execution=selection.execution,
                    options=cast(Mapping[str, object], selection.config),
                )
            )
        except Exception:
            raise CoreError(
                "plugin_load_failed",
                "The selected adapter failed to initialize; check its installation.",
                plugin_id=selection.plugin_id,
            ) from None


def resolve_profile(
    profile: Profile,
    registry: PluginRegistry,
    *,
    hardware: Hardware,
    available_artifacts: frozenset[str],
) -> dict[EngineKind, ResolvedSelection]:
    selections: list[tuple[EngineKind, EngineSelection, frozenset[PayloadFormat]]] = [
        ("stt", profile.stt, frozenset({"transcript.v1"})),
        ("llm", profile.llm, frozenset({"text.delta.v1"})),
        ("tts", profile.tts, frozenset({"pcm_s16le"})),
        ("turn", profile.turn, frozenset({"turn.decision.v1"})),
    ]
    if profile.avatar is not None:
        selections.append(("avatar", profile.avatar, frozenset({"arkit52.v1", "video.rgb24"})))
    resolved = {
        kind: registry.resolve(
            selection,
            kind=kind,
            language=profile.language,
            hardware=hardware,
            available_artifacts=available_artifacts,
            accepted_output_formats=output,
        )
        for kind, selection, output in selections
    }
    local_requirements = [
        item.manifest.hardware[item.selection.execution]
        for item in resolved.values()
        if item.selection.execution in {"in_process", "local_worker"}
    ]
    if (
        sum(item.min_ram_mb for item in local_requirements) > hardware.ram_mb
        or sum(item.min_vram_mb for item in local_requirements) > hardware.vram_mb
    ):
        raise CoreError(
            "unsupported_hardware",
            "Combined local engine memory requirements exceed the profile budget.",
        )
    return resolved
