# OpenTavus product plan

Updated 2026-10-05 / T27. This is the product reading guide. The
[design](design.md) defines architecture, and [tasks.json](tasks.json) is the
source for assignments, dependencies and acceptance evidence. The
[roadmap](roadmap.md) is generated from that source.

## Product direction

OpenTavus is an open-source human-like AI companion. Its first product is a
**natural human–AI interaction experience**: a realistic presence that can listen,
talk, respond and help through independently selected capabilities. Teaching with
a shared board is the first useful capability. Later, computer assistance adds
approved work on the user's computer to the same interaction experience.

The owner wants the first experience to feel like talking to another human:
convincing appearance, natural speech, appropriate listening and expressions,
good turn-taking, coherent conversation and useful help. This is a quality ambition
to evaluate
with actual calls and people, rather than a promise that every user will mistake
the system for a human. Keep the visible AI identity and synthetic-voice label.

The application remains Apache-2.0. Keep a complete reviewed open-model,
self-hosted profile. Add explicitly selected hosted LLMs and gateways using the
user's credentials. Provider/model terms, data routing and usage charges belong
to that selection; they are separate from the application's open-source license.

## Product structure: interaction and capabilities

| Part | Responsibility | First-release scope |
| --- | --- | --- |
| Human interaction | Realistic appearance, voice, listening, expressions, turn-taking, interruptions and conversational continuity | The product's core; works without opening a teaching board |
| Reasoning and presentation choices | Local/hosted model, voice and character selection, readiness and failure recovery | Independent choices; each advertised profile has its own evidence |
| Teaching capability | Explanations, notes, formulas, diagrams, practice and a shared board | First functional extension, available when selected/requested; separate teaching capability and correctness checks |
| Computer assistance | Inspect approved context and execute permitted tasks with verified results | Later optional capability with a separate task/permission lifecycle |

The primary screen is a conversation with the AI human. Open the board when
teaching helps; an ordinary conversation does not require a lesson or a diagram.
Future capabilities attach through validated tool boundaries. Build the existing
teaching slice first; introduce shared capability machinery when a second working
implementation needs it. The interaction owner does not depend on a tutor role.

## First product: the human-like companion

| Experience | What the user should be able to do | Acceptance owner |
| --- | --- | --- |
| Talk naturally | Speak or type, pause mid-sentence, interrupt, correct a question and continue without stale speech | T03/T04 |
| Meet a realistic character | Choose a photographic human with coherent lip movement, gaze, blinking and its own appropriate expression; retain identity during speech and interruptions | T05, evaluated with T29 |
| Use teaching when helpful | Ask for notes, equations, diagrams, explanations and practice; edit the optional board and ask about applied results | T08 |
| Choose the brain | Use reviewed local models, a configured self-hosted endpoint, or an explicit hosted provider such as OpenRouter | T28/T07 |
| Choose the presentation | Keep language model, voice and character independently selectable; a provider change does not replace the face or drawings | T07 |
| Recover and stay in control | See readiness/missing-provider errors, stop speech, end the call, retain drawings, and continue with a disclosed alternate when a component fails | T04/T05/T07/T09 |

“Any backend” means an extensible adapter contract. A provider/model route is
advertised for conversation only after streamed answers, cancellation and actual
browser behavior are verified. Teaching additionally requires verified structured
output and rendered results. A conversation-only model remains a usable core
profile with its narrower capabilities shown. Unsupported diagram/tool behavior
must be visible before that capability is requested.

The first teaching capability includes notes, formulas, labeled process/relationship
diagrams, questions, feedback and follow-up explanations. Current process-only
diagrams are a baseline; more general diagrams need explicit provider capability
and rendered correctness checks. Preserve the learner's edits. Explain a board
result after the browser has applied it. Structured board context is separate
from interpreting arbitrary handwriting or screenshots.

Human-like behavior describes the companion's presentation. It does not require
inferring the learner's emotions, impersonating a real person's memories or
inventing capabilities. Long written material belongs on the board; spoken
explanations use natural short phrases and adapt to follow-up questions.

## Two first-release execution profiles

| Profile | Reasoning | Speech and character | What must be shown |
| --- | --- | --- | --- |
| Open-model local | Reviewed downloadable model through the current local adapter | Local speech and measured photographic rendering | Named hardware, actual installation/quality results, offline-after-download behavior |
| Configured endpoint/hosted | Compatible self-hosted server or selected provider/gateway with a server-held credential | The same independently selected speech and character | Destination/model identity, supported teaching functions, connectivity/credential state and cost/data-routing choice |

The current app implements only the curated local profile. Hosted selection is
planned T28 work. Keep locally rendered portraits available without an NVIDIA
avatar server. Higher-fidelity live video can use an optional isolated worker;
its advertised quality and hardware need separate evidence. Never transfer one
machine's results to every low-spec PC.

OpenRouter is a model gateway. OpenCode is an agent application with its own
server/session/tools interface and configurable providers. Plan an optional
OpenCode bridge under later assistant work; the core conversation can call its
underlying configured model provider directly. See [provider boundaries](provider-contract.md).

## Delivery order

These are working slices of the first product, not independent product launches.

| Order | Result | Tasks |
| --- | --- | --- |
| 1 | Fix the first-product contract and pre-register the human-interaction evaluation; measure the existing baseline | T27/T29 |
| 2 | Add one hosted/compatible LLM adapter with real streamed speech and validated board output alongside the open local profile | T28 |
| 3 | Improve speech finalization, pauses, useful-answer latency, interruptions and actual playback | T03/T04/T01 |
| 4 | Meet photographic appearance, articulation, attentive behavior and ordinary-conversation criteria on the named profile | T05; optional T10 only when the selected renderer needs it |
| 5 | Complete independent provider/voice/character settings and the first optional teaching capability with board follow-ups | T07/T08 |
| 6 | Verify clean setup, sustained ordinary calls, naturalness review and the teaching capability separately; publish supported profiles | T09/T12/T13 |

LiveKit remains an optional transport comparison (T26). Select it when the measured
connection/deployment benefit supports this product. Room scaling, worker pools,
LAM integration, custom 3D imports, cloning and recording do not become first-release
prerequisites. A selected optional component still has to pass its own gates.

## Quality that determines release

Keep the existing [timing and reliability definitions](quality.md): at least 100
representative warm turns, useful latency P50 <= 800 ms / P95 <= 1.5 s, interruption
recognition and playback stop P95 <= 200 ms, lip-sync P95 <= 80 ms, 30 FPS browser
cadence on the advertised stock profile, and a 20-minute call plus 20 lifecycle
cycles. Test physical speaker echo separately from synthetic microphone input.

T29 adds a fixed human-review rubric before evaluation: appearance and facial
artifacts, articulation, attentive behavior, speech/prosody, turn-taking and
conversational coherence. Publish the cases, review method, numeric pass criteria,
sample counts and failures. Review actual audio/video at normal speed. A high
frame rate, a still portrait or an AI's self-rating cannot establish naturalness.
Keep latency, visual naturalness and lesson correctness as separate scores.
The proposed review uses at least five independent reviewers, twelve representative
clips, median >=4/5 in each category and no severe identity/media artifacts; the
rating anchors and pre-registration rule are in [quality.md](quality.md).

Use the same ordinary-conversation cases across local and hosted routes. Evaluate
teaching routes separately against reviewed factual answers, formulas, quiz
feedback and rendered diagram connections. A valid schema does not prove a correct
lesson. Core conversation remains usable when teaching is unavailable or not
selected. Keep unmet criteria open and name the support boundary rather than
lowering a threshold after seeing a result.

## Later product: the personal computer assistant

After the first interaction release, add a local companion executor that can inspect
approved context, propose steps and carry out permitted computer actions. Start
with one bounded browser/file workflow and one supported OS. Expand from evidence.
Use reviewed open-source libraries; the executor remains separate from the live
media loop and selected model provider. It uses the same companion interface;
teaching does not become its mandatory role or its source of authority.

The permission boundary covers app/window/site/folder scope, allowed actions,
duration and consequential final actions. Users can allow a bounded task without
approving every mouse movement. Sending, publishing, purchases or destructive
changes need the corresponding explicit authorization. A model output, document
or screen instruction cannot grant that authorization. Actions need verified
results and an honest partial/unknown outcome when interrupted.

Computer tasks use durable task/action IDs, while conversation generations control
speech. Interrupting a sentence does not undo an already executed action. Provide
clear pause/cancel controls for work. See [computer-use boundary](computer-use.md)
and T30. These capabilities are not active in the current interaction product.

Further extensions retain document-grounded lessons/vision (T15), consented avatar
creation (T14), compatible avatar imports (T31), recording/offline video (T16),
removable LAM (T06), and measured rooms/workers (T11/T17).

## How to contribute

Choose one observable result in [tasks.json](tasks.json), state owned paths and
verification, then follow [CONTRIBUTING.md](../CONTRIBUTING.md) and
[the style guide](style-guide.md). Use typed boundaries, optional dependencies,
bounded asynchronous work and one owner per resource/state transition. Introduce
an abstraction when a second working implementation needs it. Preserve existing
changes, user drawings, credentials and private media.

Keep source checks, fixtures, real models, browser playback, human review and
publication as separate evidence. Update the canonical contract and task source
when behavior changes; regenerate the roadmap. Planning completion means the
plan is ready to implement, not that these features already work.
