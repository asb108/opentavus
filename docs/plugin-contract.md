# Engine and avatar plugin contract

This document specifies the launch plugin boundary. T02 supplies the typed core and synthetic fixture. T18 adds working local speech/language adapters and an original browser character; the broader renderer/GPU contracts remain launch work. T06 will implement removable LAM support. See the [core interfaces](../packages/core/README.md) and current [alpha notes](releases/0.1.0-alpha.1.md).

Installed Python plugins register metadata through `opentavus.manifests` and a factory through `opentavus.engines`, using the same stable plugin ID. The metadata entry names a top-level package containing `opentavus-plugin.json`; discovery locates that file without importing the package. The factory entry must match the manifest. Browser renderer discovery will be implemented independently. A LAM family can contain separate avatar and image-creation packages under its isolated boundary; each descriptor/factory has one engine kind.

The alpha's working examples are `plugins/local`: separate Whisper, Kokoro, and Ollama factories distributed in one optional workspace package. Base/core and API fixture tests work with this package absent. `scripts/plugin_manifests.py` records exact adapter source and artifact digests; run it after changing a local adapter. The model group adds only explicit inference dependencies. A code/weight manifest's permissive label does not override a transitive runtime dependency's own license; see [third-party notices](../THIRD_PARTY_NOTICES.md).

The alpha teaching quiz carries `answer` as the exact text of one distinct choice.
Both producer and browser reject unmatched or duplicated choices. Applied lesson data
is acknowledged before it enters spoken-reply context. This is the initial published
teaching schema; future incompatible changes require a coordinated version update.

The base browser contains a small trusted `AvatarRenderer` interface and two original companion variants. A later LAM renderer has its own package/lazy import and is not registered by arbitrary metadata-provided JavaScript. LAM is currently absent, so the shipped alpha starts without it. Its install/disable/remove/restart matrix still requires T06 live integration and is not proved merely by this absence.

## Descriptor and discovery

Each installed plugin supplies a lightweight manifest inspected before importing its adapter. Required fields:

| Field | Contract |
| --- | --- |
| `schema_version`, `api_version` | Declared manifest schema and supported core protocol version |
| `id`, `kind`, `display_name` | Stable plugin ID and STT/LLM/TTS/turn/avatar/image kind |
| `entry_point` | Installed factory; selected/eligible adapters are imported lazily |
| `capabilities` | Named functions with required artifact IDs and typed input/output formats |
| `execution` | Supported in-process, local-worker, remote-worker, endpoint, or browser-renderer arrangements |
| `languages`, `streaming`, `cancellation` | Explicit supported behavior; distinguish native streaming from a chunk adapter |
| `hardware` | Accelerator requirements and measured resource profiles with run references |
| `artifacts` | Source URL, exact revision/file digest, code/weight/asset purpose, license identifier/text link, attribution and review state |
| `config_schema`, `asset_schema` | Validated plugin settings and accepted asset format/version |
| `renderer` | Trusted renderer package ID for browser animation; absent for worker-published video |

Eligibility states are `reviewed_permissive`, `restricted`, and `unresolved`. Runtime availability states are separate: `not_installed`, `missing_artifacts`, `unsupported_hardware`, `preparing`, `ready`, and `failed`. A label such as “unavailable” must include a specific reason and action.

The default profile selects only capabilities whose complete required artifact set is reviewed permissive. Restricted/unresolved capability support can remain documented or implemented, but the default downloader/runtime cannot fetch or enable it as an unrestricted choice. The user can supply an independently licensed asset; its provenance is validated separately. Accepting a configuration flag does not change license terms.

Treat plugins as trusted installed code. Discovery is not a sandbox for arbitrary third-party code; do not install packages from model output or user-supplied URLs. Remote endpoints require authentication and a declared model identity; record when that identity is operator-declared rather than independently verified.

## Typed adapter behavior

Construct adapters using a validated descriptor/profile and injected artifact store, telemetry, and cancellation context. Keep interfaces appropriate to their kind:

- STT emits partial/final transcripts with audio time ranges and provides finalization behavior.
- LLM emits text/tool-call deltas and supports cancellation/deadlines.
- TTS emits PCM chunks with exact sample rate/channels and timing metadata when available.
- Turn detection emits completion/interruption decisions over validated audio/activity context.
- Avatar prepares a supported asset, consumes generated audio, emits video/visemes/blendshapes with a timebase, and stops obsolete generations.
- Image/asset creation runs a separate job lifecycle; its long-running creation work never blocks a live audio path.

Generated outputs carry `conversation_id`, `generation_id`, `utterance_id`, `sequence`, and payload format/version. Timed audio, avatar, and canvas cues additionally declare `presentation_sample`, relative to the declared output-audio stream origin, not a wall clock. STT ranges use their declared input-audio origin; an unfinished LLM delta does not invent an audio playback timestamp. A sample-rate change requires an explicit conversion/timebase event. The receiver rejects an old generation regardless of its arrival time.

Adapters expose prepare/ready, structured failure, metrics, cancellation acknowledgement, and close behavior. Close is safe after partial initialization and repeated calls. Preserve audio continuity; obsolete visual frames can be dropped under bounded backpressure. GPU workers isolate conflicting libraries and expose the same logical contract; wire protocol details are finalized by T11 using real adapters.

## Browser renderer

The common UI knows a renderer ID and asset metadata, not LAM classes or TalkingHead internals. A renderer prepares an asset, schedules visemes/blendshapes/video against shared playout timing, presents idle animation where supported, flushes a generation, and disposes resources. Timed speech playback is owned by the common media implementation; plugins cannot create competing audio queues.

Dynamic imports come from the trusted installed renderer registry. A removed package is omitted from that registry/build. No LAM mesh/shader dependency belongs to the base browser bundle. A renderer failure yields a structured capability error and the alternate-avatar/audio choice without ending the conversation.

## LAM isolation and removal

Planned boundary: `plugins/avatar/lam/`, with independent Python dependencies, renderer subpackage, manifest, fixtures, and documentation. Separate these capabilities:

1. `animate_existing`: reviewed audio-to-expression artifacts and the renderer animate a compatible, independently eligible prepared asset.
2. `create_from_photo`: a separate offline preparation job requiring reconstruction weights and any Blender/CUDA dependencies.
3. `render_prepared`: browser renderer capability; it does not imply permission to create or redistribute the asset.

The reconstruction repository's dedicated weight license is CC BY-NC while its model card also advertises Apache-2.0. Keep creation `unresolved` until clarified for the selected checkpoint; do not automatically transfer that status to separately reviewed animation artifacts. Sources: [LAM weight terms](https://github.com/aigc3d/LAM/blob/339573649dd93df4cba8093a964e85a80d1b61f3/LICENSE_WEIGHT), [LAM-20K card](https://huggingface.co/3DAIGC/LAM-20K).

LAM dependencies and artifacts are never installed/downloaded by the base. Removing the plugin does not require a core/API migration. Saved assets retain `plugin_id`, format, provenance, and storage references; a missing plugin makes those assets unavailable without deleting user data. Keep consent and asset files until the user explicitly deletes them.

Removal acceptance:

- Install the permissive base with no LAM Python/npm package or weights. Start a stock-avatar call, use the picker/canvas, interrupt, and end normally.
- Install the plugin. Verify compatible eligible animation assets, and verify that unresolved reconstruction cannot activate through the default profile.
- End active LAM sessions, disable/remove the plugin package and renderer registration, and restart. Repeat the base scenario.
- Open a saved persona/asset referencing LAM. Show a recoverable missing-plugin state and let the user select another avatar while retaining its voice/prompt/history.
- Simulate an unavailable LAM worker/failed renderer during a call. Offer recovery; reject stale output; release tasks/connections/resources.
- Confirm by dependency/build inspection that core and the base web bundle have no direct LAM implementation imports or mandatory dependencies.

A model-artifact cleanup is a separate explicit action from removing the plugin. The removal flow must name the files it will delete and preserve unrelated assets.

## Contributing an adapter

An adapter contribution supplies the manifest, implementation, configuration/asset examples, exact license sources, contract fixtures, and real timing evidence for any advertised hardware claim. Reuse one common contract suite for ready/stream/interrupt/late-output/close/failure behavior; add backend-specific cases only where they reveal actual behavior. Most contract checks must run without downloading large models or contacting a paid API.

Run the plugin-absent base checks and the plugin-selected tests. Record fixture proof separately from real model/browser proof. Missing exact licenses or hardware evidence restricts advertisement/eligibility, not the ability to contribute a clearly labeled adapter draft.
