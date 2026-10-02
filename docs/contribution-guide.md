# Your first contribution

You can improve this product without owning a GPU or replacing the whole pipeline. Start with [CONTRIBUTING.md](../CONTRIBUTING.md), run `make setup` and `make check`, then choose one observable improvement. Open an issue describing the behavior and intended paths before larger changes.

## Good small starting points

| Work | Start in | What a useful contribution proves |
| --- | --- | --- |
| Improve unavailable-model recovery | `packages/runtime/src/opentavus_runtime/installation.py`, `apps/web/src/features/settings/Settings.tsx` | Missing service, missing files, and a changed digest show distinct actionable messages; no private data appears. |
| Improve small-screen or keyboard use | `apps/web/src/styles.css`, `apps/web/src/features/settings/Settings.tsx` | Screenshot and keyboard walkthrough on a named viewport; preserve semantic controls and focus. |
| Save teaching cards across refresh | `apps/web/src/features/canvas/Board.tsx` | A versioned, bounded, validated format restores cards; malformed data recovers; user drawings remain independent. |
| Improve turn-taking policy | `packages/runtime/src/opentavus_runtime/policies.py` | Synthetic backchannel/correction cases explain the trade-off; real speech timing is reported separately. |
| Add a safe teaching example | `packages/runtime/tests/test_tools.py`, `apps/web/tests/board.test.ts` | A real valid or invalid model-output case checks the producer and browser boundary without copying implementation. |
| Report Linux live behavior | [local quickstart](quickstarts/local.md), [quality guide](quality.md) | Exact hardware, versions, model digests, warm/cold state, failures, and public synthetic questions; a build alone is not performance proof. |
| Add a reviewed local model | `downloads.json`, `scripts/plugin_manifests.py`, API enum, generated schemas | Exact component terms and digest, eligibility behavior, truthful memory guidance, and live quality/timing evidence. Coordinate this contract change first. |

These are contribution ideas, not assigned issues. Check current issues and task ownership before starting. A fix inside a roadmap task can cite that task without marking every acceptance criterion complete.

## Find the relevant layer

`packages/core` owns framework-free engine/event/profile contracts. `packages/runtime` owns call generations, streaming, playout acknowledgements, validated tools, and Pipecat microphone integration. `apps/api` owns local call admission, scoped tokens, origins, composition, and static serving. `apps/web` owns controls, the browser audio clock, animated companion, settings, and teaching UI. `plugins/local` contains working optional adapters; the fixture plugin provides a lightweight example.

An adapter imports core contracts and is activated only after validation. It must not import a browser, API, or global runtime object. Browser avatar code implements the small renderer interface; LAM-specific code stays in its own future plugin. See [the plugin contract](plugin-contract.md).

## Make review easy

State the concrete before/after behavior. Keep the diff focused, follow the checked styles, and include evidence at the boundary you changed. Do not add a configuration switch, framework, or abstraction unless a current requirement uses it. Explain limits: fixture proof, live model proof, browser playout proof, and publication are different results.

A performance report should include failed/slow turns, rather than only its best sample. A model/license contribution needs primary source links and exact artifacts. For security reports, follow [SECURITY.md](../SECURITY.md) rather than publishing an exploit with private data.
