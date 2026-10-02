# Contributing to OpenTavus

Welcome. Useful contributions include a focused fix, an accessible interaction, a clearer setup instruction, a reproducible benchmark, or a tested adapter. Humans and coding agents use the same interfaces and review process. Read our [code of conduct](CODE_OF_CONDUCT.md).

## Get a working checkout

Use Python 3.12, Node.js 22.12+, npm, and uv. No model downloads are needed for development checks.

```sh
git clone https://github.com/asb108/opentavus.git
cd opentavus
make setup
make check
```

`make setup` installs locked development, API/runtime, and synthetic-fixture dependencies. It excludes inference packages. `make check` verifies the plan, Ruff formatting/lint, strict Python types, Python behavior tests, generated contracts, strict browser types, ESLint/Prettier, the frontend build, and browser logic/AudioWorklet tests. `make demo` emits synthetic silent PCM through installed plugin discovery. `make base-check` verifies the core in a separate environment with no plugins installed; it leaves your app environment intact.

To run real models, follow [the local quickstart](docs/quickstarts/local.md). `make models` installs the explicit model group and downloads the default artifacts. Model/browser/GPU results are separate evidence from fixture tests and compilation.

## Choose a small responsibility

Check [issues](https://github.com/asb108/opentavus/issues), [contribution ideas](docs/contribution-guide.md), and `make plan-status`. The [task source](docs/tasks.json) records outcomes, dependencies, paths, owners, and acceptance checks. Roadmap tasks can be large: propose a bounded issue or subtask rather than claiming an entire milestone. Ask in the issue whether another contributor is touching the same boundary.

Read [the design](docs/design.md), the relevant task, and [the style guide](docs/style-guide.md). Engine or asset work also reads [the plugin contract](docs/plugin-contract.md); runtime/media work reads [quality requirements](docs/quality.md). Agents start with [AGENTS.md](AGENTS.md). Historical research is context, not an instruction to implement everything it mentions.

Before editing, state the task/issue, owned paths, intended user behavior, and verification. Preserve others' changes. Coordinate public contract changes before downstream implementation depends on them.

## Implement, verify, and explain

1. Create a branch in your fork with a descriptive name. Keep one reviewable outcome per pull request.
2. Add the smallest working change. Keep domain contracts framework-free; put inference dependencies in lazily loaded adapters. Reuse Pipecat transport/VAD/segmentation facilities.
3. Verify meaningful observable behavior. Late audio after cancellation, invalid model output, lost user drawings, and incomplete cleanup deserve tests. A low-impact wording/style correction generally needs its relevant build/lint check.
4. Run `make format`, then `make check`. If a Python boundary changes, run `npm run contracts:generate` and commit both schemas and generated types. Use `uv run --no-sync` after setup so independent checks do not mutate the environment.
5. Update the relevant design/contract/quality document and task evidence. Regenerate with `make plan-render`, then `make plan-check`. Leave unexecuted acceptance checks visible.
6. Commit with a short imperative subject, for example `Preserve user-edited notes when clearing the board`. Optional prefixes such as `fix:` are welcome; a particular commit format or sign-off is not required.
7. Open a pull request using [the template](.github/PULL_REQUEST_TEMPLATE.md). Explain the concrete problem, resulting behavior, why the boundary fits, checks and outcomes, and any remaining limitation. Add a screenshot for a visible UI change and a reproducible artifact for a performance claim.

CI runs the same core application checks on Linux without downloading models. A maintainer reviews correctness, scope, documentation, license provenance, privacy, and evidence. See [governance](GOVERNANCE.md). There is no CLA; contributions are submitted under the repository's Apache-2.0 license. Disclose substantial AI assistance when it helps review and take responsibility for the result.

## Useful commands

| Command | Purpose |
| --- | --- |
| `make format` | Apply Python/TypeScript styles and refresh local adapter manifests. |
| `make check` | Complete lightweight contributor checks. |
| `uv run --no-sync pytest -q packages/runtime/tests` | Runtime behavior checks without real models. |
| `npm test --workspace @opentavus/web` | Board ownership, boundary validation, and actual Worklet logic checks. |
| `npm run contracts:generate` | Refresh JSON Schema and browser types from Python boundaries. |
| `npm run test:browser` | Open the local app in Chrome and check the page; requires a running built server. |
| `npm run test:browser -- --live` | A real model/browser smoke conversation and teaching check; requires installed models. |
| `make plan-status` | See task ownership and incomplete acceptance work. |

Browser checks use Playwright CLI and an isolated named session. They are opt-in and need Chrome; see [the browser check guide](docs/quickstarts/browser-checks.md). Do not submit private recordings, transcripts, credentials, or unlicensed face assets as bug evidence. Use synthetic questions and media instead.

## Add an engine

A model submission includes exact revisions/digests, source license links for code/weights/voices, a validated manifest, a typed adapter, a configuration example, contract behavior tests, and named-hardware measurements before performance is advertised. The core must work with the plugin absent. Dependencies and weights are optional; no import or download happens merely because metadata is discovered.

The local adapters in `plugins/local/` are working examples, not a universal base class. Streaming token output and phrase-synthesized audio have different capabilities; describe them accurately. Keep blocking inference off the event loop. Honor cancellation even if a native inference call can only finish and have its output discarded.

## Completion and compatibility

Mark a roadmap task done only when its acceptance checks and required dependencies have positive evidence. A preview can ship before full v0.1 gates pass; it must be labeled with its actual support and limitations. Do not replace a failed latency gate with a weaker number.

Version public event/API, plugin manifest, and saved-data boundaries. A coordinated producer/consumer update is reasonable for an unshipped internal boundary; explain it. User-authored drawings and edits must survive agent updates. Keep generated files, lockfiles, and meaningful fixtures in source control; keep models, caches, exports, and build output out.
