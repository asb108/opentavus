# Repository instructions

## Start here

Read `README.md`, `docs/design.md`, and your assigned task in `docs/tasks.json`. Read `docs/plugin-contract.md` for engine/asset work and `docs/quality.md` for runtime/media work. `docs/plan-review.md` is historical research; the current design governs implementation scope.

This repository contains a local alpha: typed core, runtime, FastAPI control server, React/Vite call/settings/teaching UI, optional Whisper/Kokoro/Ollama adapters, a synthetic fixture, and prepared photographic Mira with static, 3D and cartoon alternatives. Photographic motion is finite; Kokoro supplies validated packet-relative phoneme cues on the played-audio clock, with an explicit energy fallback for untimed engines. Perceptual phoneme accuracy and full natural emotional behavior remain open. Its selected source image is an explicitly authorized one-time OpenAI creation; an open-model source/recipe is also retained. Live inference and animation use local/open components. LAM, custom GLB/VRM import, remote workers, and full v0.1 quality proof remain open. Inspect the checkout and task evidence before claiming support.

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

`make setup` installs locked development, API/runtime, and fixture dependencies plus npm packages, without inference libraries or models. `make check` verifies core/runtime/API fixtures, types/styles, generated contracts, the frontend build, board and AudioWorklet behavior, and the plan. `make base-check` uses `.cache/base-env` to verify the core with no plugins; it preserves the app environment. Use `uv run --no-sync` for independent checks after setup so checks do not change the environment.

`make models` installs optional inference packages and explicitly downloads the pinned default models. `make doctor` reports local readiness; `make run` builds and serves the app on loopback. Opt-in browser checks use `npm run test:browser` with a running server; `-- --live` invokes real models. Read `docs/quickstarts/local.md` and `docs/quickstarts/browser-checks.md`. The plan check verifies documents/task dependencies only. Fixture tests and compilation do not establish audible latency, speaker echo, phoneme lip-sync, or GPU support.

Ruff/Prettier/ESLint and strict type settings are the formatting source of truth. Follow `docs/style-guide.md`, `CONTRIBUTING.md`, and the PR template. New contributor issues can own a small portion of a roadmap task; report that scope explicitly. Never include private media or transcripts in default diagnostics or test artifacts.

For meaningful runtime policy choices, a user contribution can shape 5–10 lines after the surrounding function, types, examples, and fallback behavior are prepared. Do not turn boilerplate into a user exercise or leave a required contribution slot unresolved without clearly recording its effect.
