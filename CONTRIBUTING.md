# Contributing to OpenTavus

Humans and coding agents use the same task descriptions, interfaces, tests, and evidence. The goal is to make a contribution understandable without requiring the full chat history.

## Choose a bounded task

Run `make plan-status` and read [the roadmap](docs/roadmap.md). Each task declares its dependencies, ownership paths, acceptance checks, and evidence. Claim one task through an issue or coordinated assignment once the repository is published. Before publication, record an assigned owner in `docs/tasks.json`. Check that another contributor is not editing the same responsibility.

The task's `owner` is a person or agent assignment; `owns` is its proposed code responsibility. These are distinct. Split a task when two independently verifiable outcomes need different owners. Coordinate changes to shared contracts before downstream work depends on them.

Read the smallest sufficient context: [design](docs/design.md), the assigned task, and the linked [plugin](docs/plugin-contract.md) or [quality](docs/quality.md) requirements. Proposed application paths become real during implementation; this planning foundation does not claim an existing SDK.

## Implement and verify

1. State the intended user-visible behavior and owned paths. Inspect callers and current tests.
2. Add the smallest implementation through existing interfaces. Keep model dependencies inside their adapters, import optional engines lazily, and inject constructed dependencies rather than using global service locators.
3. Verify meaningful behaviors at the changed boundary. Cancellation, removal, playback order, and resource cleanup are more valuable than tests of a getter or copied implementation logic.
4. Run the affected package's actual formatting/type/build/test commands. Run a real model or browser check when the acceptance criterion requires it.
5. Update the contract, configuration example, and task evidence when behavior changes. Run `make plan-render` and `make plan-check`.

Run `make setup`, then `make check` for the implemented core/contracts/fixture packages. `make demo` exercises the synthetic fixture. `make base-check` removes that optional plugin and verifies the base; `make setup` restores the full suite. `npm run contracts:generate` updates shared schemas/types after a Python boundary-model change. Committed lockfiles pin dependency resolution.

Ruff, strict Python typing, TypeScript strict checking/build, and behavior tests exist now. The current TypeScript build is the contract package. Application tasks add the live frontend build, real model checks, and browser media cases; report those separately from this prototype.

Keep functions cohesive and names descriptive. Prefer pure policy/data functions with I/O at the edges. Validate external input once at the appropriate boundary. Raise typed failures with useful context; show actionable messages in the UI. Explain a non-obvious constraint in a comment, and record broader decisions in [the decision record](docs/decisions.md).

## Add a model or avatar

Follow [the plugin contract](docs/plugin-contract.md). A submission includes a manifest, exact artifact revisions and licenses, a typed adapter, configuration example, deterministic contract fixtures, and hardware-specific measurements. It must load only when selected and pass missing-plugin/removal checks.

Small adapters can be reviewed without a GPU using fixtures. Live performance claims require raw timings and a reproducible hardware description. A permissive code license does not establish permission to ship the weights, voice recordings, test videos, or face assets. Keep unresolved licenses visible in the manifest.

## Describe the result

Use [the pull request template](.github/PULL_REQUEST_TEMPLATE.md). Explain the problem, resulting behavior, why the chosen boundary fits, and the evidence. Separate these statuses:

- Prepared design/configuration.
- Implemented and verified with deterministic fixtures.
- Verified with a real model and browser on named hardware.
- Published or deployed.

A test run may support one status without supporting the next. Do not claim a benchmark passed from a mocked adapter, a type check, a Docker build, or the plan verifier.

## Completion and compatibility

Mark a task `done` only after all acceptance checks have evidence and its required dependency tasks are done. Use `blocked` with the exact missing artifact or decision when progress depends on it. Record commands and result paths rather than a bare “works.” Keep private audio/transcripts out of committed fixtures; use synthetic or explicitly redistributable examples.

For changes to public API payloads, plugin manifests, media event fields, or saved asset formats, document the version/compatibility strategy before changing consumers. A single task can introduce its producer and consumer together before the interface has external users; avoid pretending an unshipped internal contract needs a long migration program.
