# OpenTavus design

Updated 2 October 2026. This is the implementation baseline for a feature-rich first release. The typed core/contracts and synthetic fixture are implemented; the live application is not. [Tasks](tasks.json) record work and evidence. The user's requirements are recorded in [decisions](decisions.md).

## Outcome and product promise

A person can start a self-hosted avatar call, speak naturally, interrupt the reply, choose configured models/voices, and learn from a shared canvas while the agent talks. Humans and coding agents can add an engine or improve a feature through documented boundaries without changing unrelated modules.

The application will use Apache-2.0 code and provide a complete profile using reviewed permissive, downloadable model weights. Optional adapters expose their own component/asset terms. Software features are free; rented hardware is a separate expense. “Open-source application” does not imply that all upstream training data is published or that every hosted endpoint's model can be independently verified.

The user explicitly requested removable LAM support, several compelling launch features, fast progress, responsive interaction, accurate licensing, and easy contributions. The exact launch implementations below are engineering choices to validate. Later milestones retain the broader original vision.

## Launch experiences

### 1. Responsive avatar conversation

One call page provides a character, streamed speech, live transcript, microphone controls, connection/readiness state, and clear AI disclosure. The agent responds to pauses and interruptions without talking over a correction or replaying an abandoned answer. Mic access is required; camera access is requested only when a future vision feature is enabled.

The base uses a redistributable, compatible stock GLB. A prepared-avatar importer accepts the supported GLB contract and reports missing rig/shapes; arbitrary VRM conversion follows its own validation work. A GPU portrait plugin adds higher-fidelity lip-sync on measured hardware. LAM adds separately eligible animation and photo-creation capabilities.

The conversation works when an optional avatar fails. Show the failed capability and let the user continue with another installed avatar or audio. Apply the user's choice explicitly; preserve persona, model, voice, and conversation history. Publish screenshots and real captured calls for the completed paths.

### 2. Model, voice, and character picker

A small settings panel lists **installed/configured** STT, LLM, TTS, voice, and avatar choices. Each choice shows its language/capabilities, license eligibility, hardware requirement, and ready/unavailable reason. The user can select a local profile or a reviewed GPU/split profile without editing the other components.

v0.1 implements a curated working set, not every model in the research catalog. Candidate base: Whisper adapter, quantized Gemma 4 E4B through Ollama, Kokoro, Silero VAD, and Smart Turn. The LLM adapter accepts other configured permissive models through the same endpoint interface. Extra adapters enter the catalog only with manifests and contract evidence. The initial English profile and additional languages have separate quality results. Exact revisions and runtime versions are selected in T01.

Settings take effect on the next call. Resolve the entire profile, licenses, capabilities, and available memory before starting; return actionable errors instead of starting a half-configured session. Keep server secrets outside browser payloads. Source findings: [research review](plan-review.md).

### 3. Tutor canvas during the call

Bring the teaching experience into v0.1. Embed Excalidraw for user strokes and agent-authored elements. The agent can add a note, render a formula, draw a diagram, and show a practice question using a fixed tool set. It can refer to those results while speaking. Users can edit/draw and export the board; their changes survive agent updates and interruptions.

Use text elements for notes. Render KaTeX formulas and Mermaid diagrams as safe visual assets with an accessible text/source representation. Keep questions and answers as a structured panel beside the board. This avoids assuming formulas, arbitrary interactive widgets, and diagram source are native Excalidraw elements. Sources: [Excalidraw](https://github.com/excalidraw/excalidraw), [Excalidraw API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/).

Tools are `canvas_note`, `canvas_formula`, `canvas_diagram`, `canvas_quiz`, and `canvas_remove_agent_elements`. Validate bounded arguments and workspace ownership. Model output is data, not executable code. Keep Mermaid strict, disable HTML labels/remote links, and bound diagram size; keep KaTeX `trust: false` and limit expansion/size. Verify actual rendered output and sanitizer behavior against malicious fixtures. Sources: [Mermaid configuration](https://mermaid.js.org/config/schema-docs/config.html), [KaTeX security](https://katex.org/docs/security.html).

Every operation has an idempotency key, conversation ID, generation ID, and element IDs owned by the agent. Reject obsolete generation operations before applying them. A cancelled reply leaves an already displayed explanation available and marked partial; it does not erase user strokes. Clearing affects only agent-owned elements. Tool results enter the conversation context before the model claims success. Commit visual updates at the related speech segment's playback event; declare and test the chosen timing strategy in T08.

### 4. Optional portrait path

Keep LAM and one GPU portrait candidate inside the launch roadmap. Installation, artifact eligibility, supported assets, and quality are independently reported. The permissive base has no mandatory LAM dependency. A GPU preview becomes advertised only when its component licenses and actual first-frame/interruption behavior pass. A failed candidate stays visibly experimental/unavailable, with measured evidence; it cannot substitute for the three required launch experiences.

Candidate evaluation order: MuseTalk first; FlashHead Lite next if a complete review clears its bundled VAE and other artifacts. Compare visual identity, jitter, lip-sync, first playable frame, sustained performance, and memory. Do not infer whole-call capacity from avatar-only FPS. Source evidence: [review](plan-review.md). LAM behavior is specified in [the plugin contract](plugin-contract.md).

## Architecture and ownership

Start with a modular monolith. Use Pipecat for pipeline frames/streaming and interruption facilities, FastAPI for the control API, SQLite/local storage for session/persona/board metadata, and React/Vite/TypeScript for the browser. The LLM can run in an existing local server. Put a GPU adapter into an isolated process/container when its dependencies or compute would interfere with the app.

```mermaid
flowchart LR
    User[Browser: call, picker, canvas] -->|Signaling and control| API[FastAPI]
    User <-->|Audio/video and timed events| Runtime[Session runtime: Pipecat]
    API --> Runtime
    Runtime --> Contracts[Typed contracts and plugin catalog]
    Contracts --> Speech[STT, LLM, TTS and turn adapters]
    Contracts --> Avatar[Selected avatar adapter]
    Runtime --> Tools[Validated canvas tools]
    Tools --> User
    Avatar -. optional .-> LAM[LAM plugin]
    Avatar -. optional .-> GPU[GPU worker]
```

Planned code responsibility:

| Path | Owns | Dependency rule |
| --- | --- | --- |
| `packages/core/src/opentavus_core/` | Typed events, engine/asset specs, profile validation, pure policies | No app/framework/model imports |
| `packages/runtime/src/opentavus_runtime/` | Session lifecycle, Pipecat integration, generations, tool dispatch, timing | Imports core and constructed adapter interfaces |
| `apps/api/src/opentavus_api/` | HTTP/signaling, resource authorization, persistence, composition root | Constructs runtime and selected adapters |
| `apps/web/src/` | Call controls, settings, canvas, common playout integration | Uses API/event contracts and renderer interface |
| `plugins/<kind>/<name>/` | Adapter, manifest, model dependencies, examples, tests; renderer subpackage for browser avatars | Imports core; UI code depends on renderer contract |
| `workers/` | Isolated engine hosting and later worker protocol | Runs selected plugin; shares versioned core messages |
| `tests/` | Contract suites, deterministic replay, browser integration | Base tests use fixtures and need no paid service/GPU |
| `benchmarks/` | Real-model/browser timing harness and redistributable cases | Records complete run configuration and raw results |

Create these modules when their tasks start. Use Python protocols/dataclasses and typed TypeScript discriminated events at boundaries; use Pydantic at configuration/API boundaries. Keep separate STT, LLM, TTS, avatar, and image-job interfaces with one small common descriptor. Avoid a universal engine class containing every optional operation. Core controls lifecycle/cancellation, while plugins implement model behavior.

Python packaging uses a `uv` workspace; the browser uses an npm workspace and committed lockfile. Base installation includes only its selected lightweight dependencies. Plugin dependency groups/packages are explicit. Use Python entry points for installed adapter factories, but inspect manifests and eligibility before importing factories or heavyweight ML modules. Browser renderers use a trusted build-time registry with lazy imports; runtime metadata cannot cause downloads/execution of arbitrary JavaScript.

## Session and media behavior

Session states are `created`, `preparing`, `ready`, `active`, `ending`, `ended`, and `failed`. Only one transition owner mutates session state. Create a fresh generation ID for each answer. Attach it to tokens, audio, animation, canvas operations, and playout acknowledgements. Ignore stale output after an interruption, even if a backend finishes computation later.

Use bounded buffering, deadline-aware stages, off-event-loop inference, incremental STT/finalization, token/phrase TTS streaming, a non-thinking low-latency LLM configuration, and short spoken answers by default. Store the transcript of what was actually played, with an interrupted/partial marker. Keep longer material on the board rather than forcing a long spoken response.

T04 runs a bounded media-route comparison: WebRTC audio with animation aligned to playout versus scheduled PCM with animation on one AudioWorklet clock. Choose by echo behavior, interruption, jitter/underruns, sync, and observed browser latency. Once chosen, use one shared playout implementation through the renderer contract. This decision can change after measured evidence; it is not a second permanent playback mode to maintain.

Measure actual useful output, not canned acknowledgements or silence. A subtle listening/working indicator communicates state, but is not counted as a faster answer. Warm models and prebuilt avatar assets before marking the call ready. Surface long cold starts and missing downloads before connection.

SmallWebRTC handles the initial single-user transport. Any advertised cross-network profile includes signaling, HTTPS, and tested STUN/TURN, regardless of whether LiveKit is installed. Sources: [SmallWebRTC](https://docs.pipecat.ai/api-reference/server/services/transport/small-webrtc). Model clocks on different machines are not directly compared; use sample-index timebases and measured transport timing. Detailed targets: [quality gates](quality.md).

## API, persistence, and tools

The launch control API provides persona/configuration selection, avatar asset metadata, installed engine/capability catalog, conversation create/end/status, signaling, transcript/board snapshot retrieval, and session event delivery. Generate the TypeScript client from the API schema once stable. Bind the local profile to loopback and validate allowed browser origins; exposing it beyond the host uses the separately verified network profile. Return a conversation URL with short-lived session authorization for accessible deployments; browser code does not receive server API secrets.

Separate personas, voices, and avatar assets. Store an asset reference, format/version, plugin ID, consent/attribution record, and creation provenance. Keep plugin-specific data in its validated metadata namespace. SQLite is sufficient for the first single-host app. Version schema migrations and explicitly configured transcript retention/deletion; recordings are off until their dedicated task adds consent and provenance.

Resource and tool authorization is scoped to the active session. The launch canvas tools need no shell, arbitrary file, or external network access. Later general tools use an allowlist, bounded arguments, permissions, timeouts, and results recorded against the generation that invoked them. Future webhooks and remote URLs require destination validation as part of their own task.

## Delivery and release

Move quickly through working vertical slices: voice proof, reliable playback/cancellation, stock avatar, picker and canvas, optional portrait plugins, packaging, then public demonstration. After core contracts stabilize, picker, canvas, plugin integration, and quality work have distinct owners and can proceed independently.

The launch release requires all three primary experiences and their [quality gates](quality.md). A validated local profile is sufficient; remote-worker infrastructure does not block that release. Optional GPU/LAM capabilities and cross-network deployments are advertised according to their actual eligibility and results. Broad OS/model claims follow measured profiles; a build alone does not establish live support. Publish raw benchmark context and explicit hardware requirements.

Further milestones add consented voice/appearance creation, document-grounded tutoring, vision/screen input, general MCP tools, recordings/offline avatar-video jobs, and larger worker/LiveKit deployments. Keep the architecture open to them without implementing their scheduling, storage, and authentication infrastructure before those tasks need it.
