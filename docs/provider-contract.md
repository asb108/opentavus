# Language-model provider boundary

Planned first-product work / T28. Current runtime selection supports only curated
local Ollama models. This document defines the next boundary; it does not expose
a hosted endpoint or install a provider SDK.

## Purpose and ownership

Change the reasoning backend without changing speech, avatar rendering, capability
ownership or call timing. Ordinary conversation is independent of a tutor role;
teaching is the first validated optional capability. The first supported additions
are one OpenAI-compatible chat-completions adapter for a configured self-hosted endpoint and an explicitly
selected OpenRouter route. Providers with other protocols can supply an adapter
against the same observable contract.

The existing core `LanguageModel.reply()` emits text/tool deltas and uses lifecycle
and cancellation context. The current `BoardPlanner.board()` seam supplies bounded
schema-directed teaching output; it is declared in `conversation.py`. T28 should
extract that shared planning protocol into framework-free contracts when both
local and hosted implementations use it, and coordinate producer/consumer tests.
Keep provider JSON, HTTP clients and SDK types inside adapters. Do not build a
second conversation loop just because a gateway also offers an agent SDK.

The composition root constructs the validated model adapter and injects it into
the existing conversation. That owner validates tool proposals, applies deadlines,
dispatches board operations and waits for browser acknowledgements. The model
cannot execute a canvas or computer action by returning a tool name.

## Public configuration and capabilities

| Field group | Meaning |
| --- | --- |
| Provider/configuration ID | Stable operator-configured choice; browser selection refers to this ID |
| Model/route | Declared model identity and explicit routing/fallback policy; distinguish independently verified artifacts from provider-declared identity |
| Endpoint | Operator-configured destination, validated and normalized on the server; no model-generated endpoint |
| Credential reference | Server-side secret handle, never the key value in catalog/profile responses |
| Capabilities | Streaming answer, schema-directed teaching or normalized tool output, language/context limits, cancellation and optional input modalities |
| Limits | Connection/turn deadlines, response/event sizes, output/tool count and configured usage budget |
| Availability | Core conversation state and separate teaching-capability state; configured, missing credential, unreachable, unsupported, ready or failed, with an actionable sanitized reason |
| Terms and routing | Local/open-model eligibility or explicitly selected external-service policy; model/service terms and data destination |

These are planned contract fields, not a new executable configuration format.
T28 chooses the smallest concrete schema and generates browser types from it.
Keep the default reviewed open-model eligibility rules. External services have
an explicit selection policy and accurate provenance; they do not bypass artifact
eligibility or become labeled open models through a configuration flag.

Provider/model/voice/character selection takes effect on the next call. Resolve
the full profile before preparation. A model without a tested teaching capability
can start an ordinary call as conversation-only. Explain the capability limit
before a teaching request; fail/recover that capability without breaking unrelated
conversation or silently changing the provider.

## Compatible endpoints and OpenRouter

OpenRouter documents a chat-completions endpoint, streaming and compatible client
usage. Its native tool calls are model proposals that the caller executes and
returns as results. Normalize a selected supported route into our existing
validated teaching contract rather than trusting provider-shaped arguments.
[API guide](https://openrouter.ai/docs/quickstart),
[tool calling](https://openrouter.ai/docs/guides/features/tool-calling).

Schema support varies by model and serving endpoint. For an OpenRouter schema
route, request the needed response format and require parameter-compatible
routing; validate the completed response locally. A compatibility label or model
catalog listing alone does not prove board quality. An invalid/truncated result
can receive a bounded repair attempt; on failure, show a teaching error and avoid
a spoken success claim. Keep the simpler schema strategy for weaker local models.
[Structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs),
[provider routing](https://openrouter.ai/docs/guides/routing/provider-selection).

Publish supported model/endpoint capabilities from tested configuration and a
bounded readiness probe. Do not invent a capability from an unvalidated remote
response. Tools/structured JSON, streaming and reasoning-token formats can differ
across compatible endpoints; add a narrow provider-specific adaptation only for
an actual second behavior. Keep internal reasoning out of spoken output.

## Credentials, data and failure behavior

Credentials come from explicit operator configuration, a server secret store or
an intentionally submitted credential form. Credential input is transient in
the page; it is not persisted in browser local storage or echoed in responses.
Show only configured/missing state or a masked identifier. Support replace/delete
and verify the secret is removed from the configured store. Model credentials
remain separate from call authorization and future computer-action grants.

Configure local destinations explicitly. Use HTTPS for remote services, disable
unexpected redirects, validate destinations and scope credentials to their
provider. The browser does not submit an arbitrary URL per question. Private
network endpoints are deliberate operator choices, not model-selected fallback
targets. Exclude keys, authorization headers, raw provider exceptions and prompt/
response text from default diagnostics.

The user chooses when conversation/board context goes to a hosted route. Keep
routing and provider terms visible. Do not silently upload a failed local turn to
a different service. Fallbacks and spending limits are configured explicitly;
record any selected route changes. Estimated usage is identified as an estimate
when the provider supplies no authoritative usage record.

Use bounded streaming parsing, deadlines and retries. Authentication/unsupported
schema failures are actionable errors. Rate limits do not create infinite retries.
After any speech or board effect starts, a retry must not duplicate it. Cancelling
closes the client stream and rejects old-generation output; it does not promise
that a remote provider stopped computing or billing. Retain acknowledged-history,
board ownership and cleanup behavior on network loss.

## OpenCode integration

OpenCode's providers include OpenRouter, and its own headless server exposes
agent sessions/messages, events, abort and permission APIs. That is a distinct
agent boundary. The core interaction can call the configured underlying LLM directly.
An optional OpenCode bridge is later T30 work; it must map task cancellation,
permission requests and verified results through our computer-use boundary.
It cannot implicitly authorize shell/file actions during a teaching call.
[Providers](https://opencode.ai/docs/providers/),
[server](https://opencode.ai/docs/server/), [SDK](https://opencode.ai/docs/sdk/).

## Verification and advertisement

Fixture checks cover malformed/oversized/truncated streams, fragmented tool
arguments, unsupported schema, wrong model/session, missing/invalid credentials,
timeouts/rate limits, cancellation, late output and partial initialization. Verify
that secrets are absent from browser responses/logs, and a backend change preserves
voice, face and user drawings. These tests use no paid service.

Live evidence must include one reviewed local route and one explicitly configured
hosted route completing ordinary spoken conversation, corrections, follow-up,
Stop and recovery. Demonstrate those calls with teaching unselected, including
a conversation-only route. Separately verify capable teaching routes completing
a formula, labeled diagram and quiz with applied-result acknowledgements.
Record the model/endpoint, capabilities, network,
warm/cold state, usage limits, failures and actual browser playback. Keep fake
provider proof separate from a paid/remote model run. T07 exposes validated choices;
T12/T13 publish only evidenced profiles.
