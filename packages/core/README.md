# Core prototype

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

The artifact inventory is supplied by the caller after artifact verification; this package does not download models or verify a third party's legal assertions. Runtime preparation/readiness, hardware probing, remote-worker placement, asset consent, and browser renderer execution are subsequent tasks. Declared resource requirements are not a live performance measurement.

## Contracts and policies

- `contracts.py`: separate STT, LLM, TTS, turn, avatar, and image-job protocols; injected per-generation cancellation/artifact/metric context; domain PCM/transcript values.
- `schema.py`: closed versioned manifests/profiles and discriminated wire events; bounded PCM/canvas data and validated sample timing.
- `registry.py`: metadata-first selection and lazy activation with safe structured errors.
- `session.py`: allowed lifecycle transitions and rejection of foreign/obsolete generations. The runtime remains the single state owner.

The canonical schema is exported to `packages/contracts/schema.json`; TypeScript types are generated from it. These types are compile-time guarantees for validated data, not a browser runtime parser. The future media client must validate received data, sequence ordering, timebase conversion, and payload semantics before playback. Canvas tool-specific validation belongs to T08; the current envelope bounds the JSON payload.

## Verification

From the repository root, run `make setup`, `make check`, and `make demo`. Tests cover missing plugins, lazy discovery, independent artifact eligibility, invalid settings/versions/formats, aggregate memory, cancelled/late generations, PCM framing, synthetic chunk ordering, and cleanup.

`make base-check` synchronizes the environment without the fixture and runs the base tests/discovery check. This does not exercise live models, microphone/WebRTC, LAM rendering, or latency targets. `make setup` restores the optional fixture group.

Architecture references: [Python package metadata](https://docs.python.org/3/library/importlib.metadata.html), [Pydantic strict validation](https://docs.pydantic.dev/latest/concepts/strict_mode/), [uv workspaces](https://docs.astral.sh/uv/concepts/projects/workspaces/), [schema-to-TypeScript generator](https://github.com/bcherny/json-schema-to-typescript).
