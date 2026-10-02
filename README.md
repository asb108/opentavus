# OpenTavus

OpenTavus is an open-source project building responsive avatar conversations and interactive learning with self-hostable models. The launch goal combines an interruptible video conversation, a model-and-voice picker, and a shared tutor canvas.

**Current status: pre-alpha core prototype.** Typed engine contracts, validated plugin metadata, profile selection, generation policies, shared browser types, and a synthetic adapter fixture are implemented. A live conversation application, real model adapters, LAM, and performance benchmarks remain unimplemented. The fixture demo emits silence; it does not start a video agent.

## Run the current prototype

Use Python 3.12, Node.js 22 or newer, npm, and uv. The development interpreter is selected by `.python-version`; tested dependencies are recorded in `uv.lock` and `package-lock.json`.

```sh
make setup
make check
make demo
```

`make setup` installs the core, developer tools, and optional synthetic fixture. `make check` runs formatting, strict typing, Python behavior tests, generated-contract consistency, TypeScript checks/build, browser generation-policy tests, and the plan verifier. `make demo` exercises actual installed entry-point discovery and ordered synthetic PCM chunks without model downloads or an inference service.

Run `make base-check` to synchronize the base without the fixture plugin and verify its checks. Run `make setup` again before the full fixture suite. Schema changes use `npm run contracts:generate`; generated files are checked into source control.

The [core package](packages/core/README.md) explains the current interfaces and their limits. Public API/signaling, browser microphone/playout, model loading, avatar rendering, and the teaching canvas are subsequent tasks.

## Launch experiences

| Experience | What the first release should do |
| --- | --- |
| Talk naturally | Stream a useful spoken response; handle pauses, corrections, and interruptions; animate a stock character in sync |
| Choose the brain, voice, and face | Select configured models and preset voices independently; explain hardware availability; apply changes to the next call |
| Learn with a shared canvas | Speak while adding notes, formulas, diagrams, and practice questions; preserve the user's drawings |
| Add a portrait avatar | Install a separate LAM or GPU avatar plugin when its required artifacts are eligible and its quality has been measured |
| Run on your hardware | Use a native Mac/CPU setup or a self-hosted GPU profile without a required proprietary inference service |

The software has no planned feature paywall. GPU rental and other externally purchased infrastructure are separate from the software. Published model, voice, and avatar licenses govern their own artifacts.

LAM remains in the design as a removable plugin. Its photo-creation weights have conflicting published license information; that capability will stay unavailable in the permissive default profile until the terms are resolved. Animation, rendering, and photo creation have separate eligibility checks. See [the plugin contract](docs/plugin-contract.md).

## Read and contribute

- [Design](docs/design.md): product behavior, architecture, and implementation choices.
- [Roadmap](docs/roadmap.md): ordered tasks, dependency gates, ownership, and acceptance evidence.
- [Plugin contract](docs/plugin-contract.md): adding an engine, isolating LAM, and proving removal.
- [Quality gates](docs/quality.md): latency, playback, browser, and release measurements.
- [Contributing](CONTRIBUTING.md): the workflow for humans and agents.
- [Agent instructions](AGENTS.md): concise repository rules and current verification commands.
- [Decision record](docs/decisions.md): agreed requirements and engineering choices still to validate.
- [Initial research review](docs/plan-review.md): source evidence and original assessment.

Python 3.11 or newer is sufficient to inspect and validate the planning files; model installation is not required.

```sh
python3 scripts/plan.py status
python3 scripts/plan.py check
python3 scripts/plan.py render
```

The equivalents are `make plan-status`, `make plan-check`, and `make plan-render`. Edit [docs/tasks.json](docs/tasks.json), then regenerate the roadmap. Its status is derived from those tasks and their evidence; it is not a runtime health report.

The project uses a Python/npm monorepo; the React application and runtime will be added by their tasks. The application license is [Apache-2.0](LICENSE); individual third-party artifacts retain their own licenses. OpenTavus is an independent project and is not affiliated with Tavus.
