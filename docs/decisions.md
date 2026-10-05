# Decision record

This record distinguishes the user's requirements from engineering choices. Evidence applies only to the tested capability/profile; a local alpha does not close full release gates.

| ID | Status | Decision and reason | Validation |
| --- | --- | --- | --- |
| D01 | User requirement | LAM remains pluggable and can be removed if circumstances require it | Plugin-absent/removal cases in T06 and T09 |
| D02 | User requirement | Launch with several attractive free features; installation polish alone is insufficient | Demonstrate conversation, model/voice picker, and tutor canvas in T13 |
| D03 | User requirement | Move quickly while keeping the experience responsive and contributions easy | Ordered vertical slices, independent ownership, and browser-perceived latency evidence |
| D04 | User requirement | Use reviewed open/self-hostable models with accurate licenses; build a distinct project | Artifact manifests and launch proof in T01/T13 |
| D05 | Engineering baseline | A modular monolith for the first app: Python runtime/API, React browser, external local LLM server; GPU engines isolated when necessary | T03/T10 show whether a process boundary is necessary; expand only for measured conflicts |
| D06 | Engineering baseline | Three required launch experiences: responsive stock-avatar conversation, configured model/voice selection, shared tutor canvas | All three are release gates; a voice-only spike is an intermediate result |
| D07 | Engineering baseline | One reviewed stock GLB supports the base; LAM animation/photo creation and a GPU portrait adapter are separately eligible plugins | T05/T06/T10 provide compatibility and quality evidence |
| D08 | Engineering baseline | Select output audio route by a bounded spike; preserve one playout clock and generation cancellation for all renderers | T04 chooses and records track-based vs scheduled PCM playback with browser evidence |
| D09 | Engineering baseline | Start with a measured native Apple Silicon profile, an explicitly tested CPU fallback, and a separate GPU profile | T01 selects exact checkpoints/versions; T12 publishes only measured targets |
| D10 | Engineering baseline | Tools for the launch canvas are a fixed, schema-validated allowlist; general MCP/file/network actions follow later | T08 cancellation, scope, and rendering checks |
| D11 | Engineering baseline | The three local launch experiences form the critical path; portrait and remote/network infrastructure require separate evidence only when advertised | T13 cannot advertise T10/T11 paths without their live checks; their absence does not block the local release |
| D12 | Implemented core prototype | Metadata and factory entry points are separate; metadata names a top-level package so discovery reads its manifest without importing model code | Fresh-process fixture discovery and base-absent checks in T02 |
| D13 | Implemented core prototype | Pydantic boundary schemas generate JSON Schema and TypeScript contracts; Python protocols/dataclasses remain separate domain interfaces | Generated-contract consistency, strict typing, and PCM/event behavior checks in T02 |
| D14 | Verified development baseline | Python 3.12 and Node.js 22+ with committed uv/npm lockfiles; CI installs the tested uv 0.7.1 | Local core checks on Python 3.12.11/Node.js 26.8.2 and successful GitHub Ubuntu/Python 3.12/Node 22 [CI run](https://github.com/asb108/opentavus/actions/runs/37003812605); this establishes core tooling support, not live conversation support |
| D15 | Local alpha implementation | Publish an earlier community trial with all three feature areas: an original animated companion, independent local model/voice settings, and a teaching board. Keep the full GLB, natural-turn, performance, and lifecycle requirements open. | T18 records bounded alpha proof; T01/T03-T09 retain their unexecuted full acceptance. The user asked for a usable first product and community contribution workflow. |
| D16 | Alpha media choice | Use Pipecat SmallWebRTC for microphone/VAD/segmentation, and scheduled PCM on one AudioWorklet clock for output/captions/mouth energy. | Real browser playout/stop and synthetic microphone checks in alpha evidence. Track-based output, speaker echo, jitter, and full lip-sync comparison remain T04 work; this choice is provisional. |
| D17 | Alpha artifact set | Start with CPU Whisper tiny, Kokoro ONNX English presets, and pinned Qwen2.5 0.5B/1.5B local Ollama manifests; list 7B without a live performance claim. | Exact metadata and primary terms in models.md; actual downloads/hash checks and live calls. Smaller models fit the trial but can make factual mistakes. |
| D18 | Alpha storage and lesson timing | Keep call context in memory, drawings/settings in versioned browser storage, and lesson cards in page state. Apply/acknowledge validated board data before spoken claims. | Ownership/cancellation tests and browser lesson proof. Persistent card/persona/asset storage and faster synchronized lesson generation remain open. |
| D19 | Verified browser dependency repair | Pin/deduplicate React and React DOM at 18.3.1 for the current Excalidraw integration. | Initial browser run failed with React error 525 due to mixed React major versions; aligned versions render the real canvas. Lockfiles and frontend checks preserve this boundary. |
| D20 | Measured speech tuning | Limit Kokoro CPU intra-op threads to four, inter-op to one, disable idle spinning, and bound the first spoken phrase. Warm speech engines before ready and reuse a bounded per-server pool. | The uncontrolled speech path delayed actual playout. A four-thread float model outperformed a one-thread variant in the named trial; an int8 experiment was slower and was rejected. Broader hardware tuning remains measured-profile work. |
| D21 | Live teaching correction before publication | Quiz answers contain the exact text of a distinct choice, validated in Python and the browser. Applied lesson data enters the initial system context; the latest user question remains the last dialogue turn. | A real Qwen trial treated an answer index as one-based and spoke about an earlier question after a trailing system message. Exact-choice validation removes that representation ambiguity; it does not establish general factual correctness. Explicit requests get compact single-tool schemas to prevent formula/quiz substitution. Ollama receives the schema in its format and prompt, following [primary guidance](https://docs.ollama.com/capabilities/structured-outputs). Disposable interruption notes separate unplayed turns without entering heard history. The generated alpha schema, regressions and live lesson check change together. |
| D22 | Measured board repair | Explicit requests activate board tools independently of teaching mode. Bounded prior dialogue resolves split topics; only positively acknowledged tool data enters later explanation context. Compile a process title, inputs and outputs into Mermaid instead of asking this small model for arbitrary edge syntax. | Real typed and synthetic microphone photosynthesis checks passed with Teach off, visible labels, separate glucose/oxygen outputs, ACK before speech and a remembered follow-up. Invalid Mermaid, blank sanitized labels, reversed arrows and omitted products were rejected during development. Mermaid 11.17 requires root htmlLabels=false to preserve SVG text through the sanitizer. Detailed evidence is in board-repair-evidence.json; general graph/factual quality remains open. |
| D23 | User preference and measured experiment | Target realistic human portrait/video, try Mac graphics first, and keep the working cartoon honestly labeled. Native MLX portrait work is isolated rather than a base requirement. | M3 Pro Metal executed the pinned MuseTalk MLX weights and produced real frames. Two complete 32-frame trials measured about 5.3 FPS, missing the fixed 25 FPS target. This remains a feasibility result rather than live-avatar support; exact lip-sync, browser stop and multiple-face quality are unverified. Component notice/conversion gaps retain unresolved default eligibility. See benchmarks/portrait/mac/README.md and mac-portrait-experiment.json. |

| D24 | No-NVIDIA option | Bundle only the explicitly CC0 MPFB stock human, shrink unused morph/texture data, and lazily render it through a small Three.js adapter to the existing PCM clock. Keep a static poster fallback. | The existing audio implementation already supplies playout energy and interruption. Adding a separate TTS/phoneme library would duplicate media ownership for this bounded preview. The native browser check passed 30 FPS and real speech/Stop/failure cases on M3 Pro. Arbitrary custom GLB/VRM compatibility and PC performance remain unverified. |
| D25 | User rejected 3D appearance | Use a fictional photographic adult with offline MIT LivePortrait motion preparation, without InsightFace/landmark models. Retain a pinned Apache-2.0 FLUX.2 Klein 4B source and recipe. Play the finite frames through the existing audio clock. | Earlier live neural generation missed the Mac cadence gate. Prepared frames let the browser render actual photographic facial/head motion without live avatar inference. Seven-second browser checks passed about 30 FPS with normal and GPU-disabled Canvas 2D on M3 Pro; the real call reached all four presentation cues and Stop closed speech movement. Full natural behavior, precise phonemes, weak-PC and long-call evidence remain open. |
| D26 | Explicit owner asset request | Use the built-in OpenAI image tool once to polish the fictional FLUX source, retain its source bytes/exact prompt and disclose the proprietary source-creation exception. No OpenAI service enters the installed application. | The owner specifically suggested ChatGPT image creation after requesting realistic assets. The tool exposed no verified selectable Image 2.5 version. The open FLUX source remains available, while the selected bytes have separate provenance. Live speech/language use open local models; animation preparation uses the reviewed open core, and live playback uses the bundled frames. |

No user-authored feature exclusions were supplied. Later-release assignments schedule work; they do not erase features from the original vision. English is the first proposed validated speech language. Add a language only after its STT, TTS, and lip-sync cases pass.

Unknown hardware performance, avatar quality, component licenses, and exact runtime versions are settled by the named tasks, not by assuming upstream results apply to this application. A material change to the launch experiences should be brought back to the user with the observed evidence; routine implementation choices remain with the task owner.


## D27: Use the speech model's durations for photographic articulation (T23)

The user rejected T22's portrait appearance and absence of convincing lip-sync.
Its loudness-only four-level mouth bank could not distinguish a closed M/B/P from
an open vowel, and whole-face mouth crossfades could double facial edges. Browser
frame cadence established playback speed but did not establish realistic speech.

The installed Apache-2.0 Kokoro export (SHA-256
`beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a`)
was inspected on CPU: its outputs include waveform and duration. Pinned
`kokoro-onnx==0.6.1` already implements `create_timed`; `create` delegates to it and
had discarded its marks in our adapter. Use that existing data rather than adding
another alignment model or a second playback clock. A real phrase produced bounded
sample-derived cues without new downloads. Stress marks anticipate their vowel;
length marks hold it. The simple IPA-to-viseme policy remains a small contribution
point, with explicit rest for unknown symbols and energy fallback for no timings.

Core dataclasses remain framework independent. The wire validates at most 64
ordered packet-relative spans inside attached PCM. They travel and reset together
in the existing bounded Worklet queue. A coordinated browser/server rebuild is
required because older strict clients reject an unfamiliar optional field.

Retain native 512-pixel prepared frames with four gentle poses and eight broad
speech shapes, independent mouth/eye masks and idempotent resource cleanup. This
raises sheet data from 81 to 144 MiB and assets from 3 to 5.5 MB; keep static mode
available and measure software Canvas separately. Live calls still load no avatar
inference model or extra audio context. Preparation uses the same pinned MIT core
and excluded face-detection dependencies as T22.

The [evidence](releases/phoneme-portrait-evidence.json) separates cue scheduling,
actual voice/capture, visual limitations and publication. No independent acoustic
alignment, unrestricted emotional behavior or Tavus-equivalence result is inferred
from those measurements. T10/T13's larger quality gates remain open.

## D28: Curated historical photograph with a shared prepared renderer

2026-10-04 / T24. The user requested a realistic famous scientist instead of Mira.
Select Albert Einstein from Ferdinand Schmutzer's public-domain 1921 photograph;
preserve the exact original and source rights reasoning. Keep the historical
monochrome look and use the existing pinned open LivePortrait core for offline
motion. Reviewed expression/viseme/blink probes show a recognizable photographic
face. The full bank prepared 145 native frames in 194.2 seconds on M3 Pro/MPS
with CPU fallback and no InsightFace; this is offline creation time, not call latency.

A second face needs its own mouth/eye geometry. Move the already-used Mira masks
into reviewed manifest metadata and use one validated bank/renderer boundary.
Trusted local roots, fixed file IDs and existing played-audio timing preserve the
cancellation/resource behavior. Static/failure modes show the selected scientist.
New settings prefer Einstein; valid existing voice/model/character preferences
remain unchanged. Historical identity is explicitly an educational AI portrayal
with preset synthetic voice, no invented memories/quotations or endorsement.
Full natural behavior/perceptual alignment/live-video quality remains separate.

## D29: Evaluate LiveKit transport early while keeping one conversation owner

2026-10-05 / T25. The user suggested LiveKit to simplify the architecture and
invited a better alternative. The current app uses Pipecat SmallWebRTC for input
and a separate acknowledged PCM/Worklet output path. Pipecat 1.12.0 already
provides a LiveKit adapter; the optional LiveKit packages are absent. Primary
documentation confirms self-hosting and distinguishes the Server from Agents.
The [transport review](transport-review.md) compares SmallWebRTC, Pipecat/LiveKit,
LiveKit Agents and mediasoup against this checkout.

Select self-hosted LiveKit with the existing Pipecat adapter as the preferred
deployed-call candidate. Keep the local profile simple and run T26 before room
scaling. Move the transport trial out of T17; keep worker/capacity work separate.
Adoption must simplify actual maintained connection code and setup while passing
the same played-audio, interruption, lip-sync, board ACK and cleanup checks.
Clearing a server audio source and reliable room delivery do not establish
browser playout or applied-state recovery. Preserve D08/T04's media comparison.

Pipecat and `Conversation` retain their present responsibilities during this trial.
A future Agents migration would transfer orchestration to one owner with ported
behavior cases. No LiveKit implementation or latency gain is claimed by T25;
T26 and the broader quality/network tasks retain their unexecuted acceptance.
