# Typed core

This package owns typed engine interfaces, configuration/wire schemas, installed-plugin discovery, profile validation, and pure session/generation policies. It imports no FastAPI, Pipecat, ML backend, or optional avatar implementation. Pydantic/jsonschema are boundary validators.

## Entry points and selection

Each installed plugin registers its stable ID in two entry-point groups:

```toml
[project.entry-points."opentavus.manifests"]
"fixture.demo" = "opentavus_fixture_demo"

[project.entry-points."opentavus.engines"]
"fixture.demo" = "opentavus_fixture_demo.adapter:create_adapter"
```

The top-level package includes `opentavus-plugin.json`. `discover_installed()` locates and validates metadata before importing adapter code. `PluginRegistry.resolve()` validates the selected kind, capability, artifact eligibility/presence, language, execution requirements, configuration, and requested output formats. `activate()` repeats selection checks, loads only that factory, and passes an `AdapterConfiguration` containing the selected capability, execution mode, and options.

The artifact inventory is supplied by the caller after artifact verification; this package does not download models or verify a third party's legal assertions. The alpha runtime supplies readiness, artifact verification, local adapter preparation, and physical-memory probing. Remote-worker placement and asset consent remain future work. Declared resource requirements are not a live performance measurement.

## Contracts and policies

- `contracts.py`: separate STT, LLM, TTS, turn, avatar, and image-job protocols; injected per-generation cancellation/artifact/metric context; domain PCM/transcript values.
- `schema.py`: closed versioned manifests/profiles and discriminated wire events; bounded PCM/canvas data and validated sample timing.
- `registry.py`: metadata-first selection and lazy activation with safe structured errors.
- `session.py`: allowed lifecycle transitions and rejection of foreign/obsolete generations. The runtime remains the single state owner.

The canonical event schema is exported to `packages/contracts/schema.json`; API/teaching boundaries generate `api.schema.json`. TypeScript types are generated from both. The current browser validates those schemas at runtime, checks generation/sample ordering before playback, and validates lesson semantics before rendering. The core canvas envelope bounds JSON; the runtime and browser own the tool-specific checks. See [the plugin contract](../../docs/plugin-contract.md).

## Verification

From the repository root, run `make setup`, `make check`, and `make demo`. Tests cover missing plugins, lazy discovery, independent artifact eligibility, invalid settings/versions/formats, aggregate memory, cancelled/late generations, PCM framing, synthetic chunk ordering, and cleanup.

`make base-check` uses a separate environment without any plugins and runs the base tests/discovery check, leaving the application environment intact. This does not exercise live models, microphone/WebRTC, LAM rendering, or latency targets.

Architecture references: [Python package metadata](https://docs.python.org/3/library/importlib.metadata.html), [Pydantic strict validation](https://docs.pydantic.dev/latest/concepts/strict_mode/), [uv workspaces](https://docs.astral.sh/uv/concepts/projects/workspaces/), [schema-to-TypeScript generator](https://github.com/bcherny/json-schema-to-typescript).
