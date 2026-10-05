# Your first contribution

You can improve this product without owning a GPU or replacing the whole pipeline. Start with [CONTRIBUTING.md](../CONTRIBUTING.md), run `make setup` and `make check`, then choose one observable improvement. Open an issue describing the behavior and intended paths before larger changes.

Read [the product plan](product-plan.md) first: natural human–AI interaction and
selectable reasoning backends are the core. Teaching is the first optional
capability; computer control is later optional work.

## Good small starting points

| Work | Start in | What a useful contribution proves |
| --- | --- | --- |
| Improve unavailable-model recovery | `packages/runtime/src/opentavus_runtime/installation.py`, `apps/web/src/features/settings/Settings.tsx` | Missing service, missing files, and a changed digest show distinct actionable messages; no private data appears. |
| Improve small-screen or keyboard use | `apps/web/src/styles.css`, `apps/web/src/features/settings/Settings.tsx` | Screenshot and keyboard walkthrough on a named viewport; preserve semantic controls and focus. |
| Save teaching cards across refresh | `apps/web/src/features/canvas/Board.tsx` | A versioned, bounded, validated format restores cards; malformed data recovers; user drawings remain independent. |
| Improve turn-taking policy | `packages/runtime/src/opentavus_runtime/policies.py` | Synthetic backchannel/correction cases explain the trade-off; real speech timing is reported separately. |
| Improve Mira's delivery cues | `apps/web/src/features/avatar/behavior.ts`, `apps/web/tests/avatar.test.ts` | A small `deliveryFor()` rule chooses the companion's own neutral/warm/thoughtful presentation from played text. Show an ambiguous example and preserve the neutral fallback; never infer the user's emotions. |
| Improve phoneme-to-mouth mapping | `plugins/local/src/opentavus_kokoro/adapter.py`, `packages/runtime/tests/test_kokoro_timing.py` | Change the eight-line `phoneme_shape()` grouping for a reviewed voice/language. Preserve stress/length handling, unknown-symbol rest, packet bounds and the shared sample clock; show a real before/after clip separately from fake timings. |
| Improve a prepared expression | [photographic asset recipe](../assets/stock/photographic/README.md), [offline preparation](../benchmarks/portrait/prepared/README.md) | Reviewed source rights, exact model/asset hashes and a native-speed before/after capture. Preparation remains optional; the live renderer keeps its bounded sheets and shared audio clock. |
| Measure a computer without NVIDIA | [graphics guide](quickstarts/low-spec.md), [browser checks](quickstarts/browser-checks.md) | Named CPU/integrated graphics, memory, browser and complete speech profile; report dropped frames, slow turns and failure recovery rather than assuming this Mac's results transfer. |
| Add a safe teaching example | `packages/runtime/tests/test_tools.py`, `apps/web/tests/board.test.ts` | A real valid or invalid model-output case checks the producer and browser boundary without copying implementation. |
| Report Linux live behavior | [local quickstart](quickstarts/local.md), [quality guide](quality.md) | Exact hardware, versions, model digests, warm/cold state, failures, and public synthetic questions; a build alone is not performance proof. |
| Compare a call transport | [T26 transport trial](transport-review.md), existing microphone and playout boundaries | Claim one slice of T26: pinned optional setup, scoped joins, or a comparable receiver timing/cleanup case. Reuse Pipecat and local models; distinguish a room connection from actual synchronized speech. |
| Improve provider failure behavior | [T28 provider contract](provider-contract.md), API/runtime fixtures | One missing-key, malformed-stream, unsupported-schema or cancellation case with actionable errors and no leaked secrets; mocks are separate from a real hosted call. |
| Improve a teaching diagram | T08, `packages/runtime/src/opentavus_runtime/tools.py`, board checks | Reviewed labels/connections and a current-state follow-up; preserve user edits and applied-result ACKs. A rendered graph alone is not lesson correctness. |
| Prepare interaction evaluation cases | [T29 quality guide](quality.md), `benchmarks/interaction/` | A representative redistributable script/capture with fixed review criteria, observation boundaries and failed cases retained. |
| Add a reviewed local model | `downloads.json`, `scripts/plugin_manifests.py`, API enum, generated schemas | Exact component terms and digest, eligibility behavior, truthful memory guidance, and live quality/timing evidence. Coordinate this contract change first. |

These are contribution ideas, not assigned issues. Check current issues and task ownership before starting. A fix inside a roadmap task can cite that task without marking every acceptance criterion complete.

For a focused 5–10 line contribution, start with `deliveryFor(text): Delivery`.
The surrounding renderer, four expression assets, neutral fallback and observable
examples are already present. A greeting currently chooses warm; comparison or
uncertainty can choose thoughtful. Decide how mixed phrases should behave, then
add a representative example. Work on caption text actually reaching playout;
do not create a new audio queue or claim general emotional understanding.

## Find the relevant layer

`packages/core` owns framework-free engine/event/profile contracts. `packages/runtime` owns call generations, streaming, playout acknowledgements, validated tools, and Pipecat microphone integration. `apps/api` owns local call admission, scoped tokens, origins, composition, and static serving. `apps/web` owns controls, the browser audio clock, animated companion, settings, and teaching UI. `plugins/local` contains working optional adapters; the fixture plugin provides a lightweight example.

An adapter imports core contracts and is activated only after validation. It must not import a browser, API, or global runtime object. Browser avatar code implements the small renderer interface; LAM-specific code stays in its own future plugin. See [the plugin contract](plugin-contract.md).

## Make review easy

State the concrete before/after behavior. Keep the diff focused, follow the checked styles, and include evidence at the boundary you changed. Do not add a configuration switch, framework, or abstraction unless a current requirement uses it. Explain limits: fixture proof, live model proof, browser playout proof, and publication are different results.

A performance report should include failed/slow turns, rather than only its best sample. A model/license contribution needs primary source links and exact artifacts. For security reports, follow [SECURITY.md](../SECURITY.md) rather than publishing an exploit with private data.
