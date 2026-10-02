# Code and interface style

Use `make format` before `make check`. Committed configuration is the style authority:
Ruff for Python, Prettier for frontend code, ESLint for React, strict mypy/TypeScript,
and the shared generated schemas. Commit both lockfiles when dependencies change.
Do not edit generated contract files manually.

Retained upstream font notices preserve their original text/whitespace and are
exempted from Git whitespace checks in `.gitattributes`. Build-served fonts/licenses
are generated from source notices and installed packages; do not commit those copies.

## Python

Use Python 3.12 for development. Use `snake_case` functions/modules, `PascalCase`
types, and explicit annotations on public boundaries. Prefer dataclasses/protocols
for domain values and Pydantic for untrusted input. Keep framework/model imports
out of `opentavus_core`. Optional inference imports live in their selected plugin.

Keep functions cohesive. Inject dependencies at the composition root. Use ordinary
functions before creating a hierarchy or generic framework. `Any` is limited to
third-party inference/transport seams and decoded metadata awaiting validation.
Do not propagate it into a domain decision when a small typed value will suffice.

Heavy inference and hashing run outside the async media loop. Own background tasks,
bound queues, close partial initialization, and reject generation results after
cancellation. Use a structured, actionable public error. Default diagnostics exclude
raw exceptions containing request data, credentials, transcripts and media.

## TypeScript and React

Use strict TypeScript, named types at the network/media boundary, `camelCase`
functions, and `PascalCase` components. Use generated control/media types. Validate
incoming events and tools at runtime; a type assertion is not input validation.
Avoid `any`. Put browser audio/transport outside React rendering. A ref ending in
`Ref` holds an imperative resource; an effect creates and disposes that resource.

Keep components focused on one user responsibility. Co-locate a feature's behavior
and styles with its feature when it grows. Prefer semantic elements, native dialogs,
visible keyboard focus, sentence-case copy, and a complete reduced-motion behavior.
Show an unavailable engine's recovery action. Never display a mocked success as
real model output or replace a useful response with a latency-counted filler.

The current visual palette is blue, mist, white, ink and a small sunny accent.
Figtree provides the main typeface. The character is the expressive focus; the board
and controls stay quiet. Add tokens when a value repeats; do not introduce a new
CSS framework for a local change.

## Observable tests and commits

Test ordering, user-owned drawing preservation, wrong-session input, cancellation,
cleanup and real failure cases. Fixtures do not establish model speed or visual
quality. Keep live proof in a named reproducible run with hardware and limits.

Use an imperative commit subject describing the result, such as `Fix stale audio
after interruption` or `Add a reviewed local TTS adapter`. Conventional prefixes
are optional. Avoid generated file churn unrelated to the contribution. One pull
request should be understandable as one user-visible change.
