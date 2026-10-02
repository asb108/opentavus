# Repository instructions

## Start here

Read `README.md`, `docs/design.md`, and your assigned task in `docs/tasks.json`. Read `docs/plugin-contract.md` for engine/asset work and `docs/quality.md` for runtime/media work. `docs/plan-review.md` is historical research; the current design governs implementation scope.

This repository contains planning documents, a typed Python core, generated TypeScript contracts, and a synthetic fixture plugin. The live application, real model adapters, and optional avatar implementations do not exist yet. Inspect the checkout before choosing commands or claiming an implementation is present.

## Work within the task

- State the task ID, owned paths, required behavior, and verification before editing. Check dependencies and existing work. Preserve changes from other contributors.
- Use the smallest working change that meets the task's acceptance criteria. Implement typed boundaries and straightforward functions. Create an abstraction when a required second implementation needs it.
- Keep domain contracts independent of FastAPI, Pipecat, model packages, and UI libraries. Adapt existing Pipecat facilities rather than duplicating its pipeline.
- Load engines lazily. The permissive base installation and its tests must work with every optional avatar plugin absent. LAM imports, dependencies, renderer code, and weights belong to its plugin.
- Keep task/model output, uploaded assets, and profile configuration validated at their boundaries. Use structured errors and exclude credentials, transcripts, and media from default diagnostics.
- Cancel every generated output path using generation IDs and browser playback acknowledgement. Preserve the user's drawings when a canvas tool changes agent-authored content.
- Add tests for observable behavior and real failure modes; report live model/browser/GPU proof separately from mocked tests and compilation.
- Use positive completion evidence. Record the commands, outcomes, and any unverified boundary in the task before marking it done. Leave a failing or unexecuted acceptance criterion visible.

## Plan maintenance

`docs/tasks.json` is the task source. `docs/roadmap.md` is generated; edit the source and run `make plan-render`. Update the relevant canonical design/contract/quality document when behavior changes. Record substantial boundary or dependency changes in `docs/decisions.md`, with the reason and evidence.

Current checks:

```sh
make plan-check
make plan-status
make setup
make check
make demo
make base-check
```

`make setup` synchronizes locked Python dependencies with the fixture group and installs locked npm dependencies. `make check` verifies core/fixture behavior, Python types/formatting, generated contracts, TypeScript types/build/generation policy, and the plan. `make base-check` removes the fixture group and verifies the base with no installed plugins; run `make setup` to restore full fixture checks. Use `uv run --no-sync` for independent checks after setup so parallel checks do not change the environment.

The live frontend build, microphone/browser integration, actual model latency, and GPU benchmarks will be added by their tasks. The current TypeScript build compiles the contract package. The current plan check verifies documents and the task graph only.

For meaningful runtime policy choices, a user contribution can shape 5–10 lines after the surrounding function, types, examples, and fallback behavior are prepared. Do not turn boilerplate into a user exercise or leave a required contribution slot unresolved without clearly recording its effect.
