# OpenTavus

[![Checks](https://github.com/asb108/opentavus/actions/workflows/core.yml/badge.svg)](https://github.com/asb108/opentavus/actions/workflows/core.yml)

An open-source human-like AI companion you can talk to, learn with, and build on.
The first product centers on natural conversation with a realistic AI human.
Teaching on a shared board is its first useful capability; later capabilities
extend the same interaction. The current local alpha runs speech and language
models on your computer and requires no API key or subscription.

The alpha also includes experimental, configurable compatible endpoints and
OpenRouter model selection alongside the reviewed open-model profile. Speech and
portraits stay local; an explicitly selected external model receives conversation
text and board requests under its own terms and charges. Hosted live acceptance
remains open. The [product plan](docs/product-plan.md) places permission-controlled
computer assistance in a later phase.

**Current product: local alpha on `main`.** You can try the conversation, independent model/voice/character settings, a photographic Einstein AI portrayal, Mira, and the teaching board now. The earlier `v0.1.0-alpha.1` tag preserves its original preview. This is an early single-user application. Response speed and generated lesson quality still vary; the full v0.1 [quality targets](docs/quality.md) remain open.

| Try it | What it does |
| --- | --- |
| Talk or type | Local Whisper recognition, streaming Qwen replies, and Kokoro speech. Use Stop to interrupt queued audio immediately. |
| Meet Einstein | A historical photographic AI portrayal with an independent synthetic preset voice. Prepared head movement, blinking, listening and expression cues accompany speech. Mira remains available. Kokoro phoneme timings drive distinct mouth shapes on the played-audio clock; Stop closes it immediately. No NVIDIA avatar server is required. |
| Make it yours | Choose reviewed local Qwen sizes or configure a compatible/OpenRouter model, independently of four English voices and photographic/static/3D/cartoon characters. Experimental routes are clearly labeled; changes apply to the next call. |
| Teach on board | Ask directly for a note, formula, process flowchart, or practice question. Explicit drawing requests work with Teach mode off. Draw alongside the AI, keep your edits, and export a canvas PNG or lesson Markdown. |
| Build in the open | Typed engine interfaces, generated Python/browser schemas, focused behavior tests, and contributor checks that work without model downloads. |

![Einstein AI portrayal during real local speech](docs/releases/einstein-portrait-preview.png)

[Watch Einstein's actual voice-and-portrait preview](docs/releases/einstein-portrait-preview.webm).
This normal-speed capture uses real local Qwen/Kokoro speech and the historical
photograph's prepared motion. The [measured evidence](docs/releases/einstein-portrait-evidence.json)
records approximately 30 FPS drawing, model-timed mouth cues, all blink stages,
Stop and recovery checks. Perceptual phoneme accuracy and full natural emotional
behavior remain open. [Mira's earlier timed preview](docs/releases/phoneme-portrait-preview.webm)
and [evidence](docs/releases/phoneme-portrait-evidence.json) remain available.

## Try the local app

The live reference machine is an Apple M3 Pro with 18 GB of memory, using Chrome. Linux/other Macs can try the CPU adapters, but their live performance has not been validated. English is the first speech profile. Read the [guide without NVIDIA](docs/quickstarts/low-spec.md) for smaller-model and graphics choices. Prepared photographic playback is included; custom GLB/VRM imports, live neural video, LAM, GPU workers, and Internet hosting have separate acceptance work.

Install **Python 3.12, Node.js 22.12+, [uv](https://docs.astral.sh/uv/getting-started/installation/), and [Ollama](https://ollama.com/download)**. Start Ollama before installing the models. Allow at least **5 GB of free storage** for dependencies and the default models; existing dependencies and caches change the total.

```sh
git clone https://github.com/asb108/opentavus.git
cd opentavus
make setup
make models
make doctor
make run
```

Open **[http://127.0.0.1:8765](http://127.0.0.1:8765)** in Chrome. Type a question to try a reply without microphone access. Start conversation for microphone input; headphones are recommended while speaker echo behavior is still being evaluated. The first call warms the speech models and can take tens of seconds. Keep the server running to reuse them.

New settings select **Einstein · Historical portrait** with the Michael preset
voice. Existing saved choices are preserved; select Einstein in
**Companion settings → Character** before the next call. The visible **AI portrayal ·
Synthetic voice** label distinguishes the simulation from the historical person.
Mira remains available, and character changes keep your selected model and voice. Static portrait mode uses only a still image. Avatar loading failure shows
that portrait and a recovery message while the conversation remains usable.

Try “What is two plus two?” Then ask “Draw the photosynthesis process on the board.” You can also say the topic first, followed by “diagrams on the board,” and ask about its arrows. **Teach on board** optionally adds lessons to general questions; an explicit drawing request needs no toggle. For a formula and quiz, try “Teach Newton's second law with F=ma and a practice question about which equation describes it.” The small default model can make mistakes. Review the lesson or try a larger installed model.

The [board repair evidence](docs/releases/board-repair-evidence.json) records real
typed and synthetic-microphone checks. The current generated flowchart format is
inputs → process → outputs; arbitrary branching diagrams remain future work.

Setup downloads pinned Whisper tiny and Kokoro artifacts with SHA-256 checks, then the reviewed `qwen2.5:1.5b` Ollama model. Model downloads are explicit. After installation, inference runs on your machine. For recovery, additional models, development mode, data deletion, and exact commands, read the [local quickstart](docs/quickstarts/local.md).

## Try another reasoning model

Open **Companion settings → Brain → Add model provider** after installing models.
For the Mac/local Ollama compatible route, use `http://127.0.0.1:11434/v1` and an
installed model such as `qwen2.5:1.5b`; no API key is needed. Leave board tools off
for ordinary conversation, or enable them to test schema-based teaching. Voice
and character stay independent. For OpenRouter, select the type and enter an
explicit model ID and key in the password field. Never put a key in an issue or PR.
Read [provider setup and limits](docs/provider-contract.md) before using an external
route. The local server holds keys in a private, ignored plaintext configuration
file; the browser saves only public selections.

## Contribute without downloading models

```sh
make setup
make check
make demo
make base-check
```

These checks cover the API/runtime with fake engines, cancellation and playback behavior, safe teaching tools, ownership of drawings, generated contracts, strict types, formatting, and the production frontend build. They need no model server, paid service, or GPU. `make base-check` uses a separate environment to prove the core works with every plugin absent.

Start with [CONTRIBUTING.md](CONTRIBUTING.md), the [style guide](docs/style-guide.md), and [small contribution ideas](docs/contribution-guide.md). A focused bug fix or better failure message is useful; you do not need to implement an entire roadmap task. Humans and coding agents follow [AGENTS.md](AGENTS.md) and the same review rules. Issues and pull requests have templates.

For call architecture work, read the [LiveKit and transport comparison](docs/transport-review.md).
Self-hosted LiveKit through Pipecat is the preferred candidate for deployed calls;
T26 will compare it against the current local transport and playback before
adoption. This is planned work: the current app uses SmallWebRTC input and
AudioWorklet output and requires no LiveKit server.

## Models, privacy, and scope

The curated Qwen weights and Kokoro model use Apache-2.0 terms; Whisper uses MIT. Exact revisions, voice restrictions, and runtime notices are recorded in the [model matrix](docs/models.md) and [third-party notices](THIRD_PARTY_NOTICES.md). Optional dependencies retain their own licenses, including the eSpeak NG runtime used for phonemization. The application code is [Apache-2.0](LICENSE).

The server binds to loopback. It keeps call context in memory, does not save recordings or transcripts by default, and drops server call history when a call ends. The visible transcript stays in the page until it is refreshed. Drawings and settings are stored in this browser; formula/diagram/quiz cards currently last for the page session. Use exports before refreshing. The app is intended for trusted local use; [security reporting](SECURITY.md) documents that boundary.

Einstein uses [Ferdinand Schmutzer's public-domain 1921 photograph](assets/stock/einstein/README.md), prepared with the pinned open LivePortrait core. No source-generation service or actual Einstein recording is used. His replies and expressions are an educational AI simulation.

Mira's selected source portrait was created once with the built-in OpenAI image
generator, as explicitly requested by the project owner. That generator is
proprietary. No OpenAI key or hosted image service is used by the installed app.
The [asset provenance and exact prompt](assets/stock/photographic/README.md)
also retain a locally generated FLUX.2 Klein 4B source and an [open-model preparation recipe](benchmarks/portrait/prepared/README.md).
LivePortrait's reviewed MIT core prepared the motion without InsightFace or actor
media. The prepared files are offered under CC0 to the extent of held rights;
engine and model licenses remain separate. The browser downloads about 5.5 MB of
frames, with approximately 144 MiB of decoded image storage; source images and
preparation models stay out of browser assets.

LAM is a separately planned, removable plugin. Nothing in the base app installs
or imports LAM, Blender or reconstruction weights. Its unresolved photo-weight
terms remain visible in the [plugin contract](docs/plugin-contract.md). The
optional stock 3D human uses a pinned CC0 asset and a lazy browser renderer, with
[measured preview evidence](docs/releases/browser-human-evidence.json). It remains
labeled 3D; the photographic preview supplies the current human appearance.

The first [Mac human-portrait experiment](benchmarks/portrait/mac/README.md)
generated actual frames with MLX on the M3 Pro GPU at about 5.3 FPS. It missed the
25 FPS live target and remains separate from the app. Its dependencies and research
faces are excluded from the default installation. Prepared browser playback avoids
that experiment's live-inference cost; it does not establish a live neural-video
or precise lip-sync claim.

## Project map

- [Product plan](docs/product-plan.md): human-interaction core, independent capabilities, delivery order and later computer assistance.
- [Current design](docs/design.md) and [decisions](docs/decisions.md): architecture, implemented boundaries and reasons.
- [Provider contract](docs/provider-contract.md) and [future computer use](docs/computer-use.md): implemented model and future action boundaries.
- [Roadmap](docs/roadmap.md): work, dependencies, ownership, acceptance criteria, and evidence.
- [Plugin contract](docs/plugin-contract.md): add an engine without coupling the core to its packages.
- [Quality gates](docs/quality.md) and [alpha release notes](docs/releases/0.1.0-alpha.1.md): measured behavior and remaining targets.
- [Code of conduct](CODE_OF_CONDUCT.md) and [governance](GOVERNANCE.md): participation and review.

Edit `docs/tasks.json`, then run `make plan-render` and `make plan-check`. The plan verifier checks documents and the task graph; it does not establish live model performance. Historical source research is in [the plan review](docs/plan-review.md).

OpenTavus is an independent project and is not affiliated with Tavus.
