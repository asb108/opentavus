# Implementation roadmap

Generated from [tasks.json](tasks.json) by `make plan-render`. Edit the task source, not this file.

A free self-hosted release with an interruptible avatar call, independent model/voice selection, and a shared tutor canvas; optional portrait plugins have separate eligibility and quality evidence.

Only T00 is the planning foundation. Application paths below are proposed until their tasks create them. Task status and recorded evidence do not automatically establish real-model performance or publication.

## Execution order

Complete T00, then start T01 (measured feasibility) and T02 (typed scaffold). T09 supplies the early fixture harness after T02. T03 establishes the complete voice slice; T04 makes its timing and cancellation reliable. T05 adds the stock avatar. T07 and T08 implement the picker and canvas through the shared contracts. T06 isolates LAM; T10 separately evaluates the GPU portrait candidate.

After dependencies are met, distinct owners can work on separate responsibilities. Coordinate shared contracts rather than editing the same paths concurrently. T12 packages the working profiles, and T13 proves all three launch experiences. T10/T11 are optional portrait/network work, not prerequisites to the local base release; advertising those paths requires their own evidence. T14-T17 retain the studio, broader tools/vision, video exports, and scale work for later.

Keep spikes bounded: choose the named candidate, measure a complete slice, and compare an alternative only when a concrete failure justifies it. Do not grow the framework or model catalog before the launch behavior works.

## Task summary

| Task | Milestone | Status | Dependencies | Assigned owner |
| --- | --- | --- | --- | --- |
| [T00](#t00) | G0 | done | None | Codex in this chat |
| [T01](#t01) | G0 | in_progress | T00 | Codex / Atul |
| [T02](#t02) | G0 | done | T00 | Codex in this chat |
| [T03](#t03) | G1 | in_progress | T01, T02 | Codex / Atul |
| [T04](#t04) | G1 | in_progress | T03, T09 | Codex / Atul |
| [T05](#t05) | G1 | in_progress | T02, T03 | Codex / Atul |
| [T06](#t06) | G2 | todo | T02, T05 | Unassigned |
| [T07](#t07) | G2 | in_progress | T01, T02, T03 | Codex / Atul |
| [T08](#t08) | G2 | in_progress | T02, T03 | Codex / Atul |
| [T09](#t09) | G1 | in_progress | T02 | Codex / Atul |
| [T10](#t10) | G2 | todo | T01, T02, T04 | Unassigned |
| [T11](#t11) | G2 | todo | T02, T04, T09 | Unassigned |
| [T12](#t12) | G3 | todo | T01, T04, T05, T06, T07, T08, T09 | Unassigned |
| [T13](#t13) | G3 | todo | T04, T05, T06, T07, T08, T09, T12 | Unassigned |
| [T14](#t14) | G4 | todo | T13 | Unassigned |
| [T15](#t15) | G4 | todo | T13 | Unassigned |
| [T16](#t16) | G4 | todo | T13, T14 | Unassigned |
| [T17](#t17) | G4 | todo | T11, T13 | Unassigned |
| [T18](#t18) | G2 | done | T00, T02 | Codex / Atul |
| [T19](#t19) | G2 | done | T02, T18 | Codex / Atul |
| [T20](#t20) | G2 | done | T02, T18 | Codex / Atul |
| [T21](#t21) | G2 | done | T02, T18 | Codex / Atul |
| [T22](#t22) | G2 | done | T02, T18, T20 | Codex / Atul |
| [T23](#t23) | G2 | done | T02, T18, T22 | Codex / Atul |

**Ready to claim now:** None. Run `make plan-status` after changing task status.

## Task details

Read [the design](design.md), [plugin contract](plugin-contract.md), and [quality gates](quality.md) for the corresponding boundary. Acceptance criteria require human review of their evidence; the plan verifier checks structure and consistency.

### G0 - Contribution foundation and bounded feasibility

<a id="t00"></a>

#### T00: Publish the local design and contribution foundation

Status: **done**. Owner: Codex in this chat. Dependencies: None.

Humans and agents can understand the intended product, claim a bounded task, and validate the planning documents without installing models.

Owned paths (proposed responsibilities, not an existence check):

- `README.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `Makefile`
- `docs/`
- `scripts/plan.py`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.gitignore`

Acceptance:

- Design retains removable LAM, three compelling free launch experiences, measurable responsiveness, and future features from the original vision.
- Tasks declare dependencies, owned paths, behavior, and acceptance evidence; historical recommendations are distinguished from the current design.
- The standard-library plan commands validate the dependency graph, local links, and generated roadmap; invalid dependencies and cycles fail clearly.
- Contribution and PR instructions distinguish document checks, fixture proof, live model/browser proof, and publication.

Evidence:

- 2026-10-02: make plan-render generated docs/roadmap.md from the task source; make plan-check passed for 18 tasks, acyclic dependencies, completion consistency, generated content, and 31 local links.
- 2026-10-02: ten isolated Python/temporary-file exercises rejected unknown dependencies, cycles, completion without evidence, completion before dependencies, unassigned active tasks, missing blocker reasons, ownership outside the repo, duplicate IDs, broken links, and a stale-roadmap CLI result.
- 2026-10-02: make plan-status confirmed all 17 application tasks are todo. Design, plugin-removal cases, quality targets, contribution instructions, and PR template were reviewed against the user's requirements.
- LICENSE contains the official 11,358-character Apache-2.0 text retrieved from https://www.apache.org/licenses/LICENSE-2.0.txt. No application/model/browser/GPU performance or public repository/deployment is claimed.

<a id="t01"></a>

#### T01: Select reviewed models and measure the native feasibility spike

Status: **in_progress**. Owner: Codex / Atul. Dependencies: T00.

Choose a reproducible base stack from measured hardware and exact artifact terms, rather than upstream speed claims.

Owned paths (proposed responsibilities, not an existence check):

- `benchmarks/spikes/native/`
- `docs/models.md`
- `profiles/candidates/`

Acceptance:

- Record exact code/weight/voice/asset revisions, licenses, digests, download sizes, runtime versions, and review states for the candidate stack.
- Measure Whisper, two compatible permissive local LLM choices, Kokoro, Silero, and Smart Turn on the named native Apple Silicon machine; record complete-stack memory pressure and cold/warm costs.
- Verify the chosen LLM can produce validated canvas tool calls through its actual provider; document any structured-output adapter needed.
- Test an explicitly named CPU fallback. State unmet targets and unsupported languages without inferring whole-call latency from isolated model timings.
- Keep the comparison bounded to the candidate base; investigate another model only when a measured failure requires it.

Evidence:

- 2026-10-02: docs/models.md, pinned downloads.json, local manifests, uv.lock and package-lock.json record actual artifact digests, sizes, terms and runtime versions. Qwen 0.5B/1.5B, Whisper tiny CPU int8 and Kokoro float ONNX ran on M3 Pro/18 GB. Provider-schema lesson failures and factual errors are retained in alpha evidence.
- Open acceptance: Smart Turn spike, separate complete-stack CPU fallback, 100-turn statistics, and other hardware/language profiles. Initial slow measurements are not whole-call performance claims.

<a id="t02"></a>

#### T02: Scaffold typed core contracts and lazy plugin discovery

Status: **done**. Owner: Codex in this chat. Dependencies: T00.

Provide the smallest shared contracts needed by the real launch adapters and browser, with a base that works without optional plugins.

Owned paths (proposed responsibilities, not an existence check):

- `packages/core/`
- `packages/contracts/`
- `pyproject.toml`
- `uv.lock`
- `package.json`
- `package-lock.json`
- `plugins/fixtures/demo/`
- `scripts/contracts.py`
- `scripts/generate-types.mjs`
- `.python-version`
- `scripts/demo.py`
- `Makefile`
- `.github/workflows/core.yml`

Acceptance:

- Create the uv/npm workspace and committed lockfiles with working formatting, Python typing, TypeScript strict, and fixture-test commands.
- Define descriptors, per-kind protocols, session/generation events, structured errors, profile resolution, and capability-specific artifact eligibility from the plugin contract.
- Core imports no FastAPI, Pipecat, model, or optional avatar implementation; discover metadata before importing a selected eligible factory.
- Manifest/configuration/event validation rejects incompatible formats, missing capabilities, unresolved default artifacts, and malformed settings with actionable errors.
- Generate or share browser contracts from a single schema and demonstrate a fixture adapter plus missing-plugin behavior without model downloads.

Evidence:

- 2026-10-02: make check passed: Ruff lint/format, strict mypy on 8 source files, 34 Python behavior tests, canonical JSON Schema/TypeScript consistency, TypeScript strict check/build, and 3 browser generation-policy tests.
- 2026-10-02: make demo discovered the installed fixture without eager adapter imports and emitted ordered synthetic PCM at samples 0 and 240; cancellation, partial cleanup, and repeated close are covered by fixture tests.
- 2026-10-02: make base-check removed the optional fixture package, passed 29 base tests (5 fixture tests deselected), and confirmed empty installed-plugin discovery. make setup restored the locked development/fixture environment.
- 2026-10-02: uv build --package opentavus-fixture-demo --out-dir artifacts/wheels built a source distribution and wheel; archive inspection confirmed the packaged manifest, adapter, and entry-point metadata.
- Reference tooling: Python 3.12.11, uv 0.7.1, Node.js 26.8.2, npm 11.19.1. Dependency versions are committed in uv.lock and package-lock.json. GitHub CI uses Python 3.12 and Node 22; its actual remote result is recorded separately.
- No real STT/LLM/TTS model, microphone/WebRTC, LAM/browser avatar, teaching canvas, or latency target has been implemented or measured by this task.
- 2026-10-02: source published to https://github.com/asb108/opentavus on main. GitHub CI run 37003812605 succeeded on Ubuntu/Python 3.12/Node 22 for implementation commit b43cf4379c018568587d942064d963d67f0cde26: https://github.com/asb108/opentavus/actions/runs/37003812605. Local and remote implementation heads were verified equal.

### G1 - A responsive working conversation

<a id="t03"></a>

#### T03: Build the first complete local voice conversation

Status: **in_progress**. Owner: Codex / Atul. Dependencies: T01, T02.

A browser microphone reaches the selected local models and produces an actual streamed spoken response with visible state and transcript.

Owned paths (proposed responsibilities, not an existence check):

- `packages/runtime/src/opentavus_runtime/pipeline/`
- `plugins/stt/`
- `plugins/llm/`
- `plugins/tts/`
- `plugins/turn/`
- `apps/api/src/opentavus_api/bootstrap/`
- `apps/web/src/features/call/`
- `plugins/local/`
- `packages/runtime/src/opentavus_runtime/bootstrap.py`

Acceptance:

- Integrate Pipecat and SmallWebRTC with the reviewed base adapters, using prepare/ready/error/close states and bounded off-event-loop inference.
- Create/end/status/signaling routes and a minimal call page work; server endpoint credentials never appear in browser payloads.
- Stream partial/final transcription and useful spoken phrases; preserve partial/interrupted transcript semantics and disclose the AI character.
- A real browser/model call completes after local downloads without a required external inference service; record versions and the first full-call timing baseline.
- Preparation failure and call end release microphone, transport, and inference tasks. This voice slice remains an intermediate result toward the avatar launch.

Evidence:

- 2026-10-02: local alpha API/runtime/browser implement preparation, local scoped call admission, streamed PCM, on-page transcript, typed input, Pipecat SmallWebRTC/Silero/segmented Whisper microphone input and end cleanup. Opt-in Chrome synthetic MediaStream check reached real Whisper/Qwen/Kokoro playout and released its input track.
- Open acceptance: physical microphone/speaker echo, partial STT, natural-turn behavior, broader preparation/lifecycle cases, and full sustained quality targets. See alpha evidence for exact boundary.

<a id="t04"></a>

#### T04: Choose playout timing and make interruption reliable

Status: **in_progress**. Owner: Codex / Atul. Dependencies: T03, T09.

One media clock governs audible speech, avatar timing, and canvas cues; an interruption stops every obsolete output path.

Owned paths (proposed responsibilities, not an existence check):

- `packages/runtime/src/opentavus_runtime/session/`
- `packages/runtime/src/opentavus_runtime/media/`
- `apps/web/src/media/`
- `benchmarks/playout/`
- `docs/decisions.md`

Acceptance:

- Run a bounded comparison of track-based WebRTC playout and scheduled PCM/AudioWorklet against echo, jitter, sync, interruption, and browser-observed latency; choose one and record D08 evidence.
- Generation IDs cancel LLM/TTS/avatar/tool production, purge queues, reject late output, and receive browser stop acknowledgement under deadlines.
- Handle pauses, backchannels, corrections, bounded queue overflow, sample-rate conversion, and reconnect with the replay corpus.
- Measure useful reply latency, interruption recognition, playback stop, underruns, and timing uncertainty on a real browser/model profile using the quality definitions.
- Tune warm-up, STT finalization, non-thinking generation, and phrase aggregation without counting filler as useful output. Record any unmet launch target as open work.

Evidence:

- 2026-10-02: generation cancellation covers server streaming, browser Worklet queues, captions and pending board acknowledgements. Tests cover late output, backpressure, acknowledged phrase history and independent listening cancellation. Actual browser stop/reset events are in alpha evidence.
- Open acceptance: track/WebRTC-output comparison, physical speaker waveform and echo, interruption recognition percentiles, jitter/reconnect replay, and 100-turn useful-latency targets. AudioWorklet is a provisional alpha route.

<a id="t05"></a>

#### T05: Ship a synchronized stock avatar and compatible GLB import

Status: **in_progress**. Owner: Codex / Atul. Dependencies: T02, T03.

The base call has a lively, synchronized character and works without LAM or a server GPU avatar model.

Owned paths (proposed responsibilities, not an existence check):

- `plugins/avatar/talkinghead/`
- `apps/web/src/features/avatar/`
- `assets/stock/`

Acceptance:

- Use a reviewed redistributable stock rig and TalkingHead through the common renderer interface; document code and asset attribution separately.
- Animate mouth/idle behavior through the common playout contract, flush a generation, and dispose resources; the renderer never creates a competing speech queue.
- Validate the supported GLB rig/shapes on import and show actionable incompatibility errors; do not advertise arbitrary VRM support.
- Capture a real speaking/idle/interrupted character at normal speed and record browser frame cadence and lip-sync observations.
- The base browser bundle and Python dependency set contain no mandatory LAM implementation or reconstruction weights.

Evidence:

- 2026-10-02: original Orbit/Lumen browser canvas characters animate from actual played-audio energy through a small renderer interface. Alpha builds with no LAM, portrait weights or GPU avatar packages.
- Open acceptance: reviewed stock GLB/TalkingHead implementation, supported import/rig validation, real phoneme sync and sustained frame-cadence evidence. Original alpha characters do not satisfy those GLB requirements.

<a id="t09"></a>

#### T09: Establish shared contract and conversation replay checks early

Status: **in_progress**. Owner: Codex / Atul. Dependencies: T02.

Contributors can catch ordering, cleanup, and optional-plugin failures without paid APIs or large model downloads.

Owned paths (proposed responsibilities, not an existence check):

- `tests/contract/`
- `tests/replay/`
- `tests/fixtures/`
- `.github/workflows/base.yml`

Acceptance:

- Provide fake typed engines, a controllable clock, redistributable speech/event fixtures, and a common prepare/stream/cancel/late-output/close/error suite.
- Test core profile eligibility, lifecycle, generations, partial initialization cleanup, ordering, bounded queues, and missing optional plugins through observable behavior.
- Include natural pause/backchannel/interruption cases and extend consumers' integration checks when T03-T08 implement them; keep mocked timing distinct from real latency.
- CI runs installed base formatting, typing, fixture tests, contract consistency, and frontend build with optional avatar packages absent and no model/service downloads.
- Give adapter authors one reproducible command and actionable failures; do not impose a coverage percentage or duplicate implementation logic as tests.

Evidence:

- 2026-10-02: make check covers strict Python/browser types, generated API/media schemas, safe tools, fake API/runtime cases, actual Worklet reset/source-sample behavior, user edit ownership and production build without models. make base-check independently passed with zero installed plugins. Public synthetic speech fixture and opt-in real Chrome smoke driver are committed.
- Open acceptance: full controlled-clock shared adapter replay corpus, natural-pause and spoken interruption cases, long lifecycle/reconnect checks, and all v0.1 consumer integration scenarios. Local mock proof and live model proof remain distinct.

### G2 - Three launch experiences and optional portraits

<a id="t06"></a>

#### T06: Add LAM through a reversible plugin boundary

Status: **todo**. Owner: Unassigned. Dependencies: T02, T05.

LAM can be installed, disabled, and removed while the call, picker, canvas, and saved user data remain usable.

Owned paths (proposed responsibilities, not an existence check):

- `plugins/avatar/lam/`
- `tests/integration/plugin_removal/`

Acceptance:

- Separate animate_existing, render_prepared, and create_from_photo with independent manifests, required artifacts, optional dependencies, and renderer registration.
- Implement the prepared-asset animation integration with fixtures; report live model/asset evidence separately and enable only reviewed eligible capabilities.
- Keep unresolved reconstruction terms visible and blocked in the permissive default; no base install/download pulls Blender, LAM weights, or its renderer.
- Run absent/install/disable/remove/restart cases from the plugin contract; saved LAM references become a recoverable state without deleting assets, consent, persona, voice, or history.
- Use the common cancellation/media contract and simulate worker/renderer failure. T13 repeats removal with the final picker and canvas; this task does not claim unmeasured LAM performance.

Evidence:

- Not recorded; acceptance is unverified.

<a id="t07"></a>

#### T07: Build independent model, voice, and character settings

Status: **in_progress**. Owner: Codex / Atul. Dependencies: T01, T02, T03.

Users switch configured models and voices without editing unrelated components, and understand whether a selected profile can run.

Owned paths (proposed responsibilities, not an existence check):

- `apps/web/src/features/settings/`
- `apps/api/src/opentavus_api/catalog/`
- `apps/api/src/opentavus_api/personas/`
- `apps/api/src/opentavus_api/storage/`

Acceptance:

- Show installed/configured choices, capability/language information, artifact eligibility, memory requirement, and specific unavailable reasons with recovery actions.
- Demonstrate at least two reviewed local LLM configurations and multiple reviewed preset voices; STT, LLM, voice, and avatar settings remain independent.
- Validate the complete next-call profile before preparing; persist personas/assets/board metadata with schema versions, provenance, scoped authorization, and retention/deletion settings.
- Keep endpoint secrets on the server and generate the browser API client from the stable schema; invalid settings produce no half-started session.
- Test next-call application, missing optional plugin references, and schema validation with fixtures, then demonstrate real selection changes in browser calls.

Evidence:

- 2026-10-02: closed settings/profile validation, installed/digest-reviewed catalog, four English voices, two characters and independent next-call settings are implemented. Real browser selection checks use 1.5B/Heart/Orbit and 0.5B/Michael/Lumen. Per-conversation transcript IDs/names prevent merging earlier calls.
- Open acceptance: persona/asset metadata database, retention/deletion controls beyond local browser site data, more engine-family options and full missing-plugin UI matrix.

<a id="t08"></a>

#### T08: Build the shared tutor canvas as a launch feature

Status: **in_progress**. Owner: Codex / Atul. Dependencies: T02, T03.

An agent teaches with notes, formulas, diagrams, and practice questions while the user can keep drawing and editing.

Owned paths (proposed responsibilities, not an existence check):

- `apps/web/src/features/canvas/`
- `packages/runtime/src/opentavus_runtime/tools/tutor/`
- `tests/integration/tutor/`
- `packages/runtime/src/opentavus_runtime/tools.py`

Acceptance:

- Implement Excalidraw user/agent ownership plus the fixed note/formula/diagram/quiz/remove-agent-elements tool schemas and structured results.
- Render bounded KaTeX/Mermaid output with safe settings, sanitizer checks, accessible source/text, and a structured question panel; reject malicious inputs.
- Make operations session/generation scoped and idempotent; cancellation rejects pending operations while preserving already displayed partial explanations and all user strokes.
- Integrate the selected media cues so corresponding visuals appear before claims that they are shown; tool success reaches model context only after the result is applied.
- Demonstrate spoken teaching, user edits, export, a duplicate call, and interruption in a real browser. Measure canvas timing and preserve state through reconnect.

Evidence:

- 2026-10-02: safe note/formula/diagram/quiz/clear rendering, operation IDs, browser acknowledgements, edited-note promotion, user drawing retention, PNG and Markdown exports are implemented. Real small-model trials exposed ambiguous quiz indexing, omitted quiz tools and stale question context; schemas/context and regression checks were revised rather than accepting those outputs as success.
- Open acceptance: complete real duplicate-operation/reconnect/persistent-card matrix and canvas timing percentiles. Safe schema validation does not establish scientific correctness. Final bounded alpha browser evidence is recorded separately.

<a id="t10"></a>

#### T10: Evaluate and integrate an optional GPU portrait avatar

Status: **todo**. Owner: Unassigned. Dependencies: T01, T02, T04.

Offer a higher-fidelity portrait preview only on hardware and component terms supported by real evidence.

Owned paths (proposed responsibilities, not an existence check):

- `plugins/avatar/portrait/`
- `workers/portrait/`
- `benchmarks/portrait/`

Acceptance:

- Bound the experiment to MuseTalk first and FlashHead Lite if its complete component review clears; audit bundled VAE/weights/assets rather than trusting the top-level license.
- Isolate conflicting CUDA dependencies; document asset preparation separately from live generation and record exact container/model revisions and full-stack VRAM.
- Before evaluating a candidate, record numerical first-playable/cadence targets for the reference profile plus the common lip-sync/interruption gates; keep those fixed for its run.
- Capture actual synchronized output at normal speed across faces/utterances, including interruption, jitter/identity quality, first playable delay, sustained cadence, and queue pressure.
- A failing/unresolved candidate remains experimental or unavailable with evidence. An optional portrait experiment cannot block or replace the three mandatory launch experiences.

Evidence:

- Not recorded; acceptance is unverified.

<a id="t11"></a>

#### T11: Verify worker hosting and any advertised cross-network profile

Status: **todo**. Owner: Unassigned. Dependencies: T02, T04, T09.

Selected engines can run in an isolated worker, and any published network path has measured authentication, traversal, and cancellation behavior.

Owned paths (proposed responsibilities, not an existence check):

- `workers/protocol/`
- `workers/sdk/`
- `deploy/`
- `tests/integration/network/`

Acceptance:

- Use real adapter message shapes to finalize the minimal versioned worker transport; compare WebSocket/protobuf complexity with actual needs before adding another protocol.
- Implement authenticated capability/ready/control/media messages, bounded queues, deadlines, reconnect, remote clock/sample rules, and generation cancellation.
- Demonstrate local-worker and remote-worker behavior with fixtures; run real selected hardware before advertising a GPU remote profile.
- Verify HTTPS/signaling, scoped expiring session authorization, and STUN/TURN traversal on the cross-network browser profile, including jitter/slow-client cases.
- Document local-only and cross-network support separately. A network limitation stays visible; do not claim Internet support from a LAN call.

Evidence:

- Not recorded; acceptance is unverified.

<a id="t18"></a>

#### T18: Publish the first local product alpha for community trials

Status: **done**. Owner: Codex / Atul. Dependencies: T00, T02.

Users can try local animated conversation, independent model/voice settings, and a shared teaching board, and contribute through reproducible lightweight checks. Full v0.1 quality and optional portrait requirements remain open.

Owned paths (proposed responsibilities, not an existence check):

- `apps/api/`
- `apps/web/`
- `packages/runtime/`
- `plugins/local/`
- `docs/quickstarts/`
- `docs/releases/`
- `CONTRIBUTING.md`
- `AGENTS.md`
- `.github/ISSUE_TEMPLATE/`
- `docs/style-guide.md`
- `assets/font-notices/`
- `packages/core/README.md`
- `scripts/browser-smoke.mjs`
- `scripts/browser-instrument.js`
- `scripts/plugin_manifests.py`
- `Makefile`
- `package.json`
- `package-lock.json`
- `docs/contribution-guide.md`
- `GOVERNANCE.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `THIRD_PARTY_NOTICES.md`
- `.editorconfig`
- `.prettierrc.json`
- `eslint.config.mjs`
- `pyproject.toml`
- `.github/workflows/core.yml`
- `.gitattributes`
- `.gitignore`
- `scripts/plan.py`

Acceptance:

- Provide explicit pinned model setup, readiness/recovery, loopback serving, typed and microphone input, original animated characters, and no required hosted inference key.
- Validate settings/model output and safe lesson rendering; scope/cancel audio and board output by generation, acknowledge playback, and preserve user drawings and edits.
- Demonstrate real local model speech reaching browser playout, a rendered teaching lesson, Stop cleanup, at least two model/voice configurations, and a synthetic microphone route; report physical acoustics and full percentile/lifecycle targets as unverified.
- Pass make check, make demo, and isolated make base-check with optional avatars absent; provide an opt-in repeatable browser smoke command and record real evidence separately from fixtures.
- Publish accurate quickstart/model/privacy/support notes, human/agent contribution rules, style configs, issue/PR templates, conduct/governance/security reporting, and an honest alpha release record.
- Commit and push the reviewed source to the authorized public repository; record GitHub CI/publication evidence separately. Do not tag a stable v0.1 or claim full T13 acceptance.

Evidence:

- 2026-10-02: make check passed 60 Python behavior tests, strict mypy on 25 source files, Ruff, manifest digests, generated API/media schemas and TypeScript, ESLint/Prettier, production build, 3 contract tests and 6 web tests. make demo passed. Isolated make base-check passed 29 core tests (5 fixture tests deselected) and empty installed-plugin discovery.
- 2026-10-02: npm run test:browser -- --live passed on M3 Pro/18 GB/macOS 14.5/Chrome 154: actual local speech, applied formula/equation quiz with feedback, exports, Stop resets, next-call 1.5B/Heart/Orbit to 0.5B/Michael/Lumen, separate transcript IDs/names and user rectangle retention. --microphone passed synthetic WebRTC/Silero/Whisper/Qwen/Kokoro input/output and track release. These are bounded trials; physical acoustics and sustained lifecycle targets remain unverified.
- 2026-10-02: exact digests, runtime versions, screenshots, synthetic example, per-trial timings and slow/incorrect/rejected results are recorded in docs/releases/0.1.0-alpha.1-evidence.json and linked artifacts. Final warm arithmetic request-to-Worklet-caption 2543.8 ms; equation lesson 8456.4 ms. Local stop/reset samples 15.2-15.8 ms. No percentile/speaker-waveform claim.
- 2026-10-02: quickstarts, license/model notices, human/agent instructions, style configs, contribution ideas, conduct/governance/security, issue/PR templates and GitHub private vulnerability reporting are prepared. LAM and all optional avatar packages are absent from base checks. Full T01/T03-T09/T13 acceptance remains visible and incomplete.
- 2026-10-02: reviewed source 6fbe5a04bc68d9702b993c9aa28eeb274f5a499f committed and pushed to https://github.com/asb108/opentavus. GitHub CI https://github.com/asb108/opentavus/actions/runs/37032780671 passed on that exact source: locked model-free contributor checks, fixture demo and isolated no-plugin base check. A fresh local .cache/contributor-env also passed make check/make demo with Pipecat, loguru, Whisper, Kokoro and the local model plugin absent. The first CI caught an optional logging import in mypy; the corrected override preserves the model-free install. This completes only the bounded T18 alpha acceptance.
- 2026-10-02: post-release contributor walkthrough corrected the obsolete planning-only message in make plan-status. The tool now states that status does not execute checks and points to recorded evidence/unverified acceptance. Ruff check/format and make plan-status passed; this wording change does not change the tagged application behavior.

<a id="t19"></a>

#### T19: Repair automatic board creation across spoken follow-ups

Status: **done**. Owner: Codex / Atul. Dependencies: T02, T18.

Explicit typed and spoken diagram requests work with Teach on board off; recent dialogue resolves fragmented topic requests and applied results precede spoken claims.

Owned paths (proposed responsibilities, not an existence check):

- `packages/runtime/src/opentavus_runtime/tools.py`
- `packages/runtime/src/opentavus_runtime/conversation.py`
- `packages/runtime/tests/test_tools.py`
- `packages/runtime/tests/test_conversation.py`
- `scripts/browser-smoke.mjs`
- `docs/releases/board-repair-evidence.json`
- `docs/releases/board-repair-preview.png`
- `docs/quickstarts/browser-checks.md`
- `apps/web/src/App.tsx`
- `apps/web/src/features/settings/Settings.tsx`
- `apps/web/src/features/canvas/Board.tsx`
- `tests/fixtures/speech/`
- `README.md`
- `docs/design.md`
- `docs/decisions.md`
- `docs/releases/board-repair-typed-events.json`
- `docs/releases/board-repair-microphone-events.json`

Acceptance:

- Recognize plural diagram/flowchart and creation requests without requiring Teach mode; preserve ordinary chat and explicit refusal behavior.
- Resolve the topic from recent bounded conversation for a continuation such as diagrams on the board following a photosynthesis request; retain acknowledged board data for later explanations.
- Do not claim a diagram is shown before browser acknowledgement; reject obsolete or invalid tools and preserve user drawings.
- Pass behavior regression tests and a real model/browser photosynthesis flowchart check with teaching mode off, including a fragmented request and rendered output inspection.
- Document actual cartoon-preview status and the separately prioritized realistic human-video work; commit/push verified changes and record CI.

Evidence:

- 2026-10-03: make check passed 84 Python behavior tests, strict mypy on 25 sources, Ruff, manifests/generated contracts, TypeScript, ESLint/Prettier, frontend build, 3 contract tests and 6 web logic tests. make demo and isolated make base-check passed (29 core tests, 5 fixture tests deselected; no installed plugins).
- 2026-10-02/03: actual Chrome 154.0.8037.97 on M3 Pro/macOS 14.5 passed typed and two-fragment synthetic microphone photosynthesis requests with Teach mode off, visible labels and correct major inputs/output branches, positive ACK before Worklet speech, later explanation with no extra card/upload request, and input track release. Original --live formula/quiz/export/model selection/Stop/user drawing scenario passed on the final runtime source. Exact events, rejected model/render iterations and timing limits are in docs/releases/board-repair-evidence.json.
- Flowchart generator uses a bounded process-title/inputs/outputs schema and deterministic safe Mermaid compilation. Generic arbitrary graph generation remains unimplemented; small-model general factual accuracy and full T13 latency/acoustic targets remain open. Applied tool data is bounded historical context, not vision of user drawings.
- 2026-10-03: source commits 89cb1bcb8caa56a9aaf3ac3a069764fcf1cf57fe and 4f2d1409732c6e6dee169d064b887099493fe639 pushed to public asb108/opentavus main. GitHub CI https://github.com/asb108/opentavus/actions/runs/37049602650 completed successfully on exact 4f2d140 source, including 85 Python tests and the complete contributor checks. A real singular quiz request with Teach mode off produced choices and correct answer feedback; its initial harness selector failed because choice buttons include a letter prefix, then the corrected selector passed.

<a id="t20"></a>

#### T20: Measure a bounded realistic portrait experiment on Apple Silicon

Status: **done**. Owner: Codex / Atul. Dependencies: T02, T18.

Try the Mac graphics hardware first and establish concrete compatibility, licensing, visual and speed evidence before enabling a live human avatar.

Owned paths (proposed responsibilities, not an existence check):

- `benchmarks/portrait/mac/`
- `docs/releases/mac-portrait-experiment.json`

Acceptance:

- Pin candidate source, model revisions and component terms; isolate its dependencies from the model-free app and keep research-only faces out of distributed defaults.
- Before model timing, fix prepared first-playable target at <=2 seconds and sustained generation at >=25 FPS on the M3 Pro/18 GB/macOS 14.5 reference machine; retain the common <=80 ms lip-sync and <=200 ms stop gates.
- Attempt native Metal execution, record actual success or failure and resource use; generate and inspect a synchronized portrait clip if the native candidate can run within local constraints.
- Record unmet gates and an actionable next step; keep unavailable portrait support distinct from the working cartoon preview. Publish reproducible experiment instructions and small results with no private media.

Evidence:

- 2026-10-02: MLX 0.30.0 Metal probe executed on Apple M3 Pro/18 GB/macOS 14.5. Isolated native pipeline imported with torch absent. Exact source/model revisions, component gaps, verified SHA-256 and package versions are recorded in benchmarks/portrait/mac and docs/releases/mac-portrait-experiment.json. No base dependency, default model download or avatar selection changed.
- Numerical gates were fixed before timing: prepared first playable <=2 seconds, >=25 FPS cadence, <=80 ms lip-sync and <=200 ms stop. Two completed 32-frame/25 FPS clips generated at 5.326 and 5.331 FPS; first complete warm frame compute was 267.1 ms and peak MLX allocation 5,765,841,304 bytes. The earlier incomplete trial is retained separately. Encoding at 25 FPS does not establish real-time inference.
- Native frames and muxed local clip were produced and sampled visually: mouth motion is present, the feathered crop is visibly soft. Live browser first-playable, numeric lip-sync, stop, multiple faces and sustained quality remain unexecuted. The 25 FPS gate failed and live portrait remains unavailable under T10; this bounded experiment can close after source publication, without marking live-avatar integration done.
- Documented runner reproduced actual generation and output_complete=true. Downloader verified all existing pinned artifacts; Ruff checks and dependency-free --help passed. Research-only source/generated face media is excluded from Git and defaults. Reproduction source and small results pushed in 89cb1bcb8caa56a9aaf3ac3a069764fcf1cf57fe; subsequent exact-source GitHub CI https://github.com/asb108/opentavus/actions/runs/37049602650 passed. The experiment is complete; the failing/unexecuted live-avatar gates stay visible and T10 remains unfinished.

<a id="t21"></a>

#### T21: Offer a lightweight stock human avatar without NVIDIA

Status: **done**. Owner: Codex / Atul. Dependencies: T02, T18.

A reviewed stock 3D human reuses played-audio movement in the browser, with a static portrait fallback. No NVIDIA/CUDA avatar inference is required; photorealistic video and arbitrary model imports remain separate work.

Owned paths (proposed responsibilities, not an existence check):

- `apps/web/src/features/avatar/`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/features/settings/Settings.tsx`
- `apps/web/src/styles.css`
- `apps/web/tests/avatar.test.ts`
- `apps/api/src/opentavus_api/models.py`
- `apps/api/src/opentavus_api/app.py`
- `apps/api/tests/test_api.py`
- `packages/runtime/src/opentavus_runtime/installation.py`
- `packages/contracts/`
- `assets/stock/`
- `scripts/frontend-assets.mjs`
- `scripts/browser-smoke.mjs`
- `apps/web/package.json`
- `package-lock.json`
- `README.md`
- `docs/design.md`
- `docs/plugin-contract.md`
- `docs/quality.md`
- `docs/decisions.md`
- `docs/quickstarts/low-spec.md`
- `docs/quickstarts/browser-checks.md`
- `docs/releases/browser-human-evidence.json`
- `docs/releases/browser-human-preview.png`
- `THIRD_PARTY_NOTICES.md`
- `apps/web/src/features/call/useConversation.ts`
- `scripts/browser-avatar.mjs`
- `AGENTS.md`
- `.gitignore`
- `packages/runtime/src/opentavus_runtime/conversation.py`

Acceptance:

- Pin the source, license and hashes of a redistributable fictional stock human; prepare a smaller locally bundled GLB and include notices and reproducible preparation instructions.
- Load the trusted renderer lazily, bound its render resolution/frame cadence, reuse the shared audio signal, immediately close the mouth on Stop and dispose resources. Do not create another speech queue.
- Expose independent human and static-portrait choices; handle missing WebGL, asset/preparation failure and context loss without ending the call, with an honest recovery message.
- Validate GLB data before rendering, reject external dependencies and malformed assets, and verify cleanup/cancellation failure cases plus generated API contracts and plugin-absent base checks.
- Inspect a real browser human, idle/speaking/Stop behavior and measured frame cadence on the named Mac; publish commands/results and keep phoneme accuracy, low-spec PC measurements and full T05 import/T13 gates open.
- Document the CPU-oriented speech/small-model option and the distinction between browser 3D, prepared CPU portraits and higher-demand generative video; commit/push and record source CI.

Evidence:

- 2026-10-03: user inspected the 3D preview and rejected it as the realistic-human goal. Keep this as a separately labeled low-graphics option; T22 pursues photographic appearance/motion. Do not treat T21 as completion of the requested realism.
- Prepared only the explicitly CC0 MPFB asset at TalkingHead b3e277b3b46f88e557bf28a2c5612a5b04e075c3, from SHA-256 63c645a2a863b9972e9a9c2ed576a1de4c390b8475508e1473e69c87a3ee299c to 4,692,576-byte SHA-256 8bea3b080a5b56e9fff702b23bc7f208a6f33b2d7329a0baf0a21768f1f24799. Pin the native poster hash and require both assets at build. Other upstream demo faces are excluded.
- OPENTAVUS_TEST_URL=http://127.0.0.1:8766 npm run test:browser -- --avatar --live passed on M3 Pro/Chrome: 29.9986 FPS over five seconds, P95 gap 34.1 ms, no gap above 100 ms, 50 ms single Stop acknowledgement and no stale positive energy. Static cleanup, context loss, invalid asset with a continuing call, cancelled load and missing WebGL passed. The isolated server preserved the user preview call.
- Bounded preview checks and contributor/base checks passed; source publication and CI passed. Full T05/T13, PC hardware and precise phonemes remain unexecuted, and this 3D appearance does not fulfill the requested realism.
- make plan-render, make format, make check, make demo and make base-check passed: 85 Python tests, strict mypy/types/styles/generated contracts/build, 3 contract tests, 12 web behavior tests and 29 plugin-absent core tests. Offline recipe Ruff/format checks, asset-preparation Prettier, dependency-free CLI help and git diff --check passed. No heavy portrait dependency was added to the base install.
- Implementation committed and pushed as d275d3e685df5a8430049d6b34bb7951bbe54624. Exact source Linux CI https://github.com/asb108/opentavus/actions/runs/37063925858 passed make setup/check/demo/base-check. Completion covers this bounded stock/prepared preview only; T05 custom imports, T10 live neural portrait, T13 full quality, precise phonemes, general emotional behavior and weak-PC proof remain open.

<a id="t22"></a>

#### T22: Build a photographic human preview with prepared natural motion and expressions

Status: **done**. Owner: Codex / Atul. Dependencies: T02, T18, T20.

Offer a fictional photographic human with finite prepared head/facial motion, controlled presentation cues and shared-audio mouth movement, without live avatar inference. Keep precise lip-sync, general emotional behavior and weak-PC proof explicitly open.

Owned paths (proposed responsibilities, not an existence check):

- `benchmarks/portrait/prepared/`
- `assets/stock/photographic/`
- `apps/web/src/features/avatar/`
- `apps/web/src/features/call/useConversation.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/features/settings/Settings.tsx`
- `apps/web/tests/avatar.test.ts`
- `scripts/browser-avatar.mjs`
- `scripts/frontend-assets.mjs`
- `apps/api/src/opentavus_api/models.py`
- `apps/api/src/opentavus_api/app.py`
- `packages/runtime/src/opentavus_runtime/installation.py`
- `packages/contracts/`
- `README.md`
- `AGENTS.md`
- `docs/design.md`
- `docs/plugin-contract.md`
- `docs/quality.md`
- `docs/decisions.md`
- `docs/releases/photographic-human-evidence.json`
- `docs/quickstarts/low-spec.md`
- `THIRD_PARTY_NOTICES.md`
- `packages/runtime/src/opentavus_runtime/conversation.py`
- `scripts/browser-photo.mjs`
- `scripts/browser-smoke.mjs`
- `apps/web/src/styles.css`
- `docs/quickstarts/browser-checks.md`
- `docs/releases/photographic-human-preview.png`
- `docs/contribution-guide.md`
- `docs/releases/photographic-human-preview.webm`
- `.gitattributes`
- `docs/style-guide.md`

Acceptance:

- Pin and review open portrait-generation and animation source/models, including text encoder/VAE and face-analysis exclusions; retain a fully open fictional source/recipe and disclose the owner-authorized one-time OpenAI source image as a separate exception. Use no private/source actor media.
- Isolate preparation dependencies/models from the base app and record generation, resource use, exact assets/hashes, and reproducible commands. Research outputs do not become default assets until eligible and visually inspected.
- Create and inspect actual portrait motion and distinct controlled expressions with stable identity. Camera pans over a static image and 3D mesh previews do not satisfy the photographic-motion goal.
- If prepared playback is viable, integrate it through shared played-audio timing and generation cancellation, immediate Stop/closed mouth, idle/listening states and resource cleanup. Label the finite prepared motion and approximate speech mapping accurately.
- Run real browser/audio checks with captured native-speed output and compare appearance, transitions, lip behavior, responsiveness and resources. Keep precise phoneme sync, general emotional behavior, PC hardware proof and full T10/T13 gates open until measured.
- Publish verified code/evidence to GitHub; leave any failed or unexecuted criterion visible instead of declaring full realistic-human support.

Evidence:

- 2026-10-03: user explicitly rejected the stock 3D look and requested fully realistic looks, behavior and emotion, authorizing creation of needed assets. Original open-source model requirement persists. Selected first photographic spike: Apache-2.0 FLUX.2 Klein 4B MLX generation, MIT LivePortrait core without InsightFace, followed by prepared playback if quality permits. LiteAvatar model/face terms remain unresolved.
- User then explicitly suggested ChatGPT image creation. Created a polished photographic sibling using the built-in OpenAI image tool (no verified selectable Image 2.5 model), preserved its exact prompt/source in the repo, and retained the fully open FLUX source and recipe. This authorizes one-time external asset creation; live app speech/language/animation remain local/open and require no OpenAI key.
- Pinned FLUX.2 Klein 4B MLX conversion 860e87183ceb29e39627c0612ebd66d8ea66e68c, original 4B e7b7dc27f91deacad38e78976d1f2b499d76a294, LivePortrait source 9b294b3d0536135442ea73cb01e6cb3ca7029dd3 and human weights 82a4fa6735ca58432b6ce39301b4b9ee066dea47. The isolated 5,142,020,356-byte download was digest-verified; no InsightFace/landmark/animal/actor media is fetched or loaded.
- Open FLUX portrait generated on M3 Pro in 27.50 seconds with 9,708,239,568-byte MLX peak allocation. Selected OpenAI source SHA-256 ede67fb6bc7fb3b5effffac52d2b930254db93a0c85e76ad6d2eaf92050b1f13 was animated into 145 actual neural frames in 196.31 seconds with MPS/CPU fallback enabled. Four reviewed 2304px WebP sheets plus poster total 3,023,928 bytes; native playback tiles are 384px.
- OPENTAVUS_TEST_URL=http://127.0.0.1:8766 npm run test:browser -- --photo --live passed: 30.0003 FPS over seven seconds, P95 gap 34 ms, no gap over 100 ms, all four expression cues observed, 50.4 ms single Stop acknowledgement, closed mouth and zero later positive old-generation energy. Captured native-speed canvas and actual Worklet audio from a public synthetic question; expression/source/capture frames were visually inspected.
- Non-live --photo additionally proved renderer drawing stopped and all four ImageBitmaps closed on static switching. Damaged sheets, late cancelled loading and unavailable Canvas 2D recovered; the live damaged-asset case still returned a model reply. --avatar regression and --board automatic fragmented photosynthesis checks also passed with the photographic default.
- Contributor checks passed; source publication/CI passed. The prepared finite motion does not establish exact phonemes, general emotional intelligence/prosody, long-call cleanup, weak-PC performance, multiple-face validation or full T10/T13 acceptance.
- OPENTAVUS_TEST_URL=http://127.0.0.1:8766 npm run test:browser -- --photo --software passed with Chrome --disable-gpu and --disable-accelerated-2d-canvas: 29.9994 FPS over seven seconds, P95 gap 34.1 ms and no gap over 100 ms. Static cleanup closed all four bitmaps and failure recovery passed. This is a controlled Mac browser check, not weak-PC or CPU-only Ollama proof.
- make plan-render, make format, make check, make demo and make base-check passed: 85 Python tests, strict mypy/types/styles/generated contracts/build, 3 contract tests, 12 web behavior tests and 29 plugin-absent core tests. Offline recipe Ruff/format checks, asset-preparation Prettier, dependency-free CLI help and git diff --check passed. No heavy portrait dependency was added to the base install.
- Final --photo --live rerun with one-count-per-render instrumentation passed: 30.0016 FPS, 34.1 ms P95 gap, no gap over 100 ms, four expression cues, 54.3 ms single Stop acknowledgement, mouth zero, no stale positive energy, four ImageBitmaps released and all failure cases passed. Both successful live samples are retained in the published evidence; the latest native-speed clip is published. The restarted main server passed the actual page/settings/mobile check.
- Final --photo --software after preserving named live results passed at 29.9994 FPS, 34.2 ms P95 gap, zero >100 ms gaps, disabled_software graphics diagnostics and four closed images. Named latest live/software metric copies are retained locally; published evidence contains both initial and final successful samples. Private media/credentials were not collected.
- Retained the exact pinned LivePortrait license, including its InsightFace model restriction notice. Added a file-specific whitespace exemption like the existing font notices; excluded face-analysis models remain absent. Staged whitespace checking passes with notices intact.
- Implementation committed and pushed as d275d3e685df5a8430049d6b34bb7951bbe54624. Exact source Linux CI https://github.com/asb108/opentavus/actions/runs/37063925858 passed make setup/check/demo/base-check. Completion covers this bounded stock/prepared preview only; T05 custom imports, T10 live neural portrait, T13 full quality, precise phonemes, general emotional behavior and weak-PC proof remain open.

<a id="t23"></a>

#### T23: Improve photographic speech with phoneme timing and distinct mouth shapes

Status: **done**. Owner: Codex / Atul. Dependencies: T02, T18, T22.

Use model-reported phoneme spans on the actual PCM clock and visibly distinct prepared speech shapes. Reduce facial ghosting and preserve interruption, cleanup and CPU-friendly playback; retain honest video-realism limits.

Owned paths (proposed responsibilities, not an existence check):

- `packages/core/src/opentavus_core/contracts.py`
- `packages/core/src/opentavus_core/schema.py`
- `packages/core/tests/`
- `packages/runtime/src/opentavus_runtime/conversation.py`
- `packages/runtime/tests/`
- `plugins/local/src/opentavus_kokoro/`
- `packages/contracts/`
- `apps/web/src/media/playout.ts`
- `apps/web/public/playout-worklet.js`
- `apps/web/src/features/avatar/`
- `apps/web/src/features/call/useConversation.ts`
- `apps/web/tests/`
- `assets/stock/photographic/`
- `benchmarks/portrait/prepared/`
- `scripts/frontend-assets.mjs`
- `scripts/browser-photo.mjs`
- `README.md`
- `AGENTS.md`
- `docs/design.md`
- `docs/plugin-contract.md`
- `docs/quality.md`
- `docs/decisions.md`
- `docs/quickstarts/`
- `docs/releases/`
- `docs/contribution-guide.md`
- `docs/roadmap.md`
- `assets/stock/photographic/README.md`

Acceptance:

- Verify the pinned current Kokoro export reports durations, retain its exact model/voice terms, and expose timed speech without installing another alignment model. Unsupported timing falls back explicitly.
- Validate bounded, ordered packet-relative viseme spans within their PCM sample frames; propagate them without a competing clock or speech queue. Stop and obsolete generations clear both audio and mouth cues.
- Prepare and visually inspect closed, open, wide, rounded and consonant mouth shapes with the reviewed LivePortrait core/source. Keep source/provenance hashes and compare actual native-speed output against the previous amplitude-only preview.
- Separate mouth articulation from idle head/eye motion to reduce full-face crossfade artifacts; maintain static/failure cleanup and reduced motion.
- Test malformed/out-of-order spans, packet boundaries, sample-rate handling, reset/late output and resource disposal; run contributor/base checks and real local voice/browser captures with fixed numerical timing/cadence targets.
- Publish evidence and verified source CI. Do not describe approximate anatomical mouth shapes/model timing as Tavus equivalence or measured acoustic alignment without its own proof.

Evidence:

- 2026-10-03: user rejected T22 visual quality and absent apparent lip-sync. Existing model SHA-256 beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a reports waveform/duration outputs; installed kokoro-onnx 0.6.1 create_timed supports sample-derived phoneme spans. At task start the adapter used create and dropped marks; its asset had only four weak mouth-open levels. Targets remain 30 FPS browser cadence and <=80 ms cue-to-render scheduling, with separate acoustic/visual caveats.
- 2026-10-03: Kokoro pinned duration-enabled export SHA beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a / kokoro-onnx 0.6.1 create_timed produced bounded packet-relative spans with CPUExecutionProvider for af_heart (42 packets, 3.29 seconds PCM) and bf_emma (40 packets, 3.15 seconds). Both used existing models; no alignment downloads. See benchmarks/portrait/prepared/kokoro-timing-result.json.
- 2026-10-03: Pinned MIT LivePortrait core prepared 145 actual neural frames in 199.3 seconds on MPS with CPU fallback enabled, with no InsightFace imports. Native 512-pixel tiles / 4 poses x 8 speech states plus blink keys; 5,511,326 shipped asset bytes, 150,994,944 decoded sheet bytes. Source rights/revisions/weight hashes retained. Closed/open/wide/rounded probes and real capture frames reviewed; tongue/teeth geometry and full realism remain approximate.
- 2026-10-03: make check passed 103 Python, 3 contract and 14 frontend behavior tests, strict Python/TypeScript, style, generated-schema/build and plan checks. Failure cases reject bad timing ranges/ordering/shapes/limits; stress and vowel length preserve articulation; sample-rate changes, packet splitting and reset/late-generation rejection are covered. Separate fresh contributor env without optional plugins or inference libraries passed all 103 Python tests; make demo passed and make base-check passed 37 with no installed plugins (5 fixture tests deselected).
- 2026-10-03: Independent local check server and Playwright CLI --photo --live reached real Qwen/Kokoro speech and all eight timed speech states. Final seven-second native Canvas measurement: 30.001 FPS, 34.2 ms P95 gap, no gap above 100 ms. Worklet cue receipt to completed draw: 54 observed cues / 56 received transitions, P95 32.7 ms, max 33.7 ms (two coalesced/frame-window transitions). Stop ACK 51.3 ms; zero stale audio/cues and closed mouth. Earlier head crossfade artifacts were removed and capture repeated. This is scheduling proof, not independent acoustic/perceptual alignment.
- 2026-10-03: Repeated final --photo --software measured 29.999 FPS, 34.2 ms P95 gap and no gap above 100 ms, with Chrome confirming GPU compositing/2D acceleration disabled and WebGL/WebGPU unavailable. Static cleanup closed four ImageBitmaps; damaged sheets, cancelled loading, unavailable Canvas and a real reply after avatar failure passed. This Mac browser test does not establish weak-PC or CPU-only Ollama performance.
- Remaining larger-release boundary: natural emotional behavior, anatomical/perceptual phoneme precision, full T10/T13 quality gates, 20-minute reliability, Windows/weak-PC and custom faces remain unverified.
- 2026-10-03: Repeated final --photo --live explicitly measured live speech drawing: 30.007 FPS, 34.3 ms P95 gap, zero gaps above 100 ms. Cue scheduling P95 30.5 ms / max 32.9 ms; 64 rendered versus 69 received transitions (five coalesced/frame-window transitions). Stop ACK 48.3 ms; all eight states, zero stale cues/audio and failure recovery passed. Native encoded-frame timestamps are recorded independently in phoneme-portrait-evidence.json; earlier 24.28 encoded FPS is retained rather than hidden.
- 2026-10-03: Implementation committed/pushed as a8b1fda397f883a4c139a987d7726ea08c755fff. Exact source CI https://github.com/asb108/opentavus/actions/runs/37069529456 succeeded on Linux/Python 3.12/Node 22 for make setup/check/demo/base-check without inference models. Updated main loopback app served stock.mira.photographic.v2 / native 512 tiles and passed its own real-model --photo --live run: 29.999 live drawing FPS, 34.2 ms P95 gap, zero gaps above 100 ms; cue scheduling P95 31.5 ms / max 33.1 ms; Stop ACK 46.1 ms, zero stale audio/cues, static cleanup/failure recovery. Completion covers validated model-timed prepared articulation only; independent acoustic/visual precision, full T05/T10/T13, natural behavior, weak-PC/Windows and long-call gates remain open. See docs/releases/phoneme-portrait-evidence.json and native public capture.
- 2026-10-03 final review: found blink selection treated its .3/.7/1/.7 sequence as an amplitude lookup, reopening near the peak. Corrected to sequential 50 ms stages and added reduced-motion/full-pulse behavior and real rendered-stage checks; final verification/CI pending for this correction. Previous timing/live/CI measurements remain historical proof.
- 2026-10-03: Blink correction passed make check (103 Python / 3 contract / 15 web tests). Updated main-app --photo --live observed the complete [32,33,34,35] eye sequence, 29.997 live drawing FPS, cue P95 31.8 ms/max 32.8 ms, 64 received/rendered transitions with none coalesced in the measured window, all eight speech states, Stop ACK 51.2 ms and zero stale speech/cues. Public native capture replaced with this exact renderer output. Final source CI still pending.
- 2026-10-03: Final blink-corrected --photo --software rendered all four eye stages, passed about 30 FPS/34 ms P95/no >100 ms gaps, static cleanup and failure/cancellation checks, with GPU compositing and 2D acceleration disabled. Full natural/perceptual quality gates remain open.
- 2026-10-03 final completion: blink-corrected implementation a4b9650417f91356b5bc3b7d63439107fdedc569 pushed to main; exact Linux/Python 3.12/Node 22 source CI https://github.com/asb108/opentavus/actions/runs/37071871515 succeeded on setup/check/demo/base-check. All bounded T23 acceptance is evidenced, including complete eye stages, actual main-app speech, <=80 ms scheduling, normal/software drawing cadence, cancellation/resource recovery and contributor checks. Independent acoustic/perceptual precision and full natural/emotional/Tavus-quality video remain unverified under T10/T13; no weak-PC/Windows or 20-minute claim.

### G3 - Reproducible setup and demonstrated v0.1

<a id="t12"></a>

#### T12: Package the working profiles and write reproducible quickstarts

Status: **todo**. Owner: Unassigned. Dependencies: T01, T04, T05, T06, T07, T08, T09.

A new user can install a measured profile, diagnose missing dependencies, and reach all three launch experiences from a clean checkout.

Owned paths (proposed responsibilities, not an existence check):

- `packages/cli/`
- `profiles/validated/`
- `docs/quickstarts/`
- `docs/hardware.md`
- `scripts/setup/`
- `.github/ISSUE_TEMPLATE/`

Acceptance:

- Provide setup/start/doctor commands and safe configuration generation based on actual hardware/artifact checks; recommendation and validation remain separate.
- Verify clean native Apple Silicon installation plus the named CPU fallback; GPU and split guides are clearly conditional on T10/T11 live evidence.
- Pin and test selected dependencies/checkpoints, publish required RAM/VRAM/storage/context limits, and retain attribution for downloaded artifacts.
- Run the demo after downloads with external inference disabled; install/remove LAM separately; document recovery, supported GLB assets, and current browser/language support.
- Provide bug/adapter contribution templates and commands matching the actual packages; check project/repository naming and independent branding before public launch.

Evidence:

- Not recorded; acceptance is unverified.

<a id="t13"></a>

#### T13: Prove the complete v0.1 experience and prepare public release

Status: **todo**. Owner: Unassigned. Dependencies: T04, T05, T06, T07, T08, T09, T12.

Release claims are backed by reproducible calls, visual evidence, installation proof, and an honest support matrix.

Owned paths (proposed responsibilities, not an existence check):

- `benchmarks/release/`
- `tests/browser/`
- `docs/releases/`
- `.github/workflows/release.yml`

Acceptance:

- Demonstrate avatar conversation, independent model/voice selection, and shared teaching canvas as one complete free product; none can be replaced by a voice-only spike.
- Meet the named reference profile's quality gates over at least 100 representative warm turns; publish raw event summaries, failures, versions, uncertainty, and real normal-speed captures.
- Pass the 20-minute conversation and 20 lifecycle/reconnect cycles, speaker echo/permission cases, stale-output checks, and final LAM removal scenario with picker/canvas present.
- Verify clean local/offline-after-download setup, final T04/T05/T08 media integration, asset/model license matrix, AI disclosure, data deletion/retention, scoped access, and package/build checks. Any advertised GPU or cross-network path also requires T10/T11 evidence; otherwise label it unavailable or experimental.
- Prepare the demo, release notes, supported/experimental/unavailable feature matrix, and tagged source artifact. Record publication separately; publish only with explicit user authorization.

Evidence:

- Not recorded; acceptance is unverified.

### G4 - Extensions after the first release

<a id="t14"></a>

#### T14: Extend the avatar studio with consented voice and appearance creation

Status: **todo**. Owner: Unassigned. Dependencies: T13.

Users combine a prepared face/character with an independent preset or consented cloned voice and optional appearance editing.

Owned paths (proposed responsibilities, not an existence check):

- `apps/web/src/features/studio/`
- `plugins/asset_creator/`
- `plugins/voice_clone/`
- `tests/integration/consent/`

Acceptance:

- Keep face, voice, persona, and optional appearance editing independent; support only reviewed artifact/model capabilities with complete source terms. The image-job interface can also supply approved illustrations to the tutor canvas.
- Implement bounded offline creation jobs, progress, cancellation, provenance, storage limits, consent capture, withdrawal/deletion, and a visible AI label.
- Test prepared stock/compatible VRM/portrait paths; photo creation through LAM remains unavailable while its exact weight terms are unresolved.
- Evaluate streaming/cancellation and advertised languages for any new voice model on actual hardware; a consent phrase is an attestation, not identity proof or comprehensive compliance.
- Demonstrate editing/creation outside the live conversation path so preparation never causes call lag.

Evidence:

- Not recorded; acceptance is unverified.

<a id="t15"></a>

#### T15: Add document-grounded tutoring, scoped tools, and opt-in vision

Status: **todo**. Owner: Unassigned. Dependencies: T13.

The agent can use approved documents and tools, and optional visual context, while preserving user control and responsive speech.

Owned paths (proposed responsibilities, not an existence check):

- `packages/runtime/src/opentavus_runtime/tools/general/`
- `plugins/retrieval/`
- `plugins/perception/`
- `apps/web/src/features/context/`

Acceptance:

- Implement bounded local document ingestion/retrieval with citations, file ownership, deletion, and reproducible answer checks.
- Add general MCP/network/file actions only through scoped authorization, allowlists, argument validation, deadlines, and generation-linked results.
- Vision requests explicit camera/screen consent, has a visible indicator, validates model licenses, and keeps perception inference off the media event loop.
- Do not infer sensitive emotions or enable prohibited workplace/education emotion use through a generic perception switch; document the use-case boundary and evidence.
- Measure long-tool/vision behavior, prompt-injection resistance at tool boundaries, interrupted actions, and grounded spoken/canvas responses separately from the base benchmark.

Evidence:

- Not recorded; acceptance is unverified.

<a id="t16"></a>

#### T16: Add recording, offline video generation, and portable exports

Status: **todo**. Owner: Unassigned. Dependencies: T13, T14.

Users create consented recorded or asynchronous avatar videos without coupling long render jobs to live calls.

Owned paths (proposed responsibilities, not an existence check):

- `packages/runtime/src/opentavus_runtime/jobs/`
- `plugins/watermark/`
- `apps/web/src/features/exports/`
- `workers/video_jobs/`

Acceptance:

- Use a separate queued job lifecycle for script-to-video/render/export with cancellation, resource budgets, progress, and retained provenance.
- Recording is opt-in with visible state, scoped access, retention/deletion, consent, and export behavior tested across reconnect/end.
- Evaluate AudioSeal and relevant video/provenance tooling on streamed/encoded output; measure overhead and detection after compression without promising comprehensive compliance.
- Verify audio/video sync, final encoding, timestamps, and playable artifacts; distinguish live-call capabilities from offline model claims.
- Export the transcript/board/media only under the configured data policy and test cleanup without deleting unrelated artifacts.

Evidence:

- Not recorded; acceptance is unverified.

<a id="t17"></a>

#### T17: Scale to rooms and measured worker pools

Status: **todo**. Owner: Unassigned. Dependencies: T11, T13.

Support larger self-hosted deployments only after per-session capacity and failure behavior are understood.

Owned paths (proposed responsibilities, not an existence check):

- `workers/pool/`
- `plugins/transport/livekit/`
- `deploy/rooms/`
- `benchmarks/capacity/`

Acceptance:

- Add rooms/LiveKit only when the deployment needs them; separately audit code, infrastructure, and turn-detector model terms.
- Measure concurrent full-pipeline sessions, resource quotas, admission/backpressure, queue delay, and recovery; do not derive call capacity from avatar-only FPS.
- Keep session authorization, tenant/resource isolation, generation cancellation, and transcript/media retention correct during worker loss and reconnect.
- Run reproducible capacity and cross-network tests on named hardware, publish realistic costs/limits, and preserve the simpler local profile.
- Document deployment/security ownership and evidence before advertising production or multi-user support.

Evidence:

- Not recorded; acceptance is unverified.
