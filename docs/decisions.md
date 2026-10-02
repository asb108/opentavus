# Decision record

This record distinguishes the user's requirements from engineering choices. All application choices remain unmeasured until the corresponding tasks provide evidence.

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
| D14 | Development baseline | Python 3.12 and Node.js 22+ with committed uv/npm lockfiles; current CI installs the tested uv 0.7.1 | Local core checks on Python 3.12.11/Node.js 26.8.2; CI runner proof is recorded separately after publication |

No user-authored feature exclusions were supplied. Later-release assignments schedule work; they do not erase features from the original vision. English is the first proposed validated speech language. Add a language only after its STT, TTS, and lip-sync cases pass.

Unknown hardware performance, avatar quality, component licenses, and exact runtime versions are settled by the named tasks, not by assuming upstream results apply to this application. A material change to the launch experiences should be brought back to the user with the observed evidence; routine implementation choices remain with the task owner.
