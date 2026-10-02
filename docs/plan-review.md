# OpenTavus: plan review and proposed first release

Reviewed on 2 October 2026 against the attached plan and current primary sources.

**Status: historical review.** The user's follow-up retains LAM as a removable plugin and calls for a stronger launch feature set. [The current design](design.md) and [implementation roadmap](roadmap.md) supersede this document's release-scope recommendations. The source and licensing findings remain inputs to the current design.

**Verdict: the project is feasible and the architecture is a useful foundation. The current v0.1 scope needs to be reduced, and the default avatar licensing needs correction before implementation.**

This is a design review, not a runtime benchmark. The project directory was empty when inspected. No models were installed, no call was run, and no GitHub repository was created. All performance numbers below are either attributed upstream claims or explicitly proposed acceptance targets.

## What to retain

- Pipecat for the conversation runtime, with separate STT, LLM, TTS, turn detection, and avatar adapters.
- SmallWebRTC for the initial one-user browser call.
- YAML configuration, streaming output, cancellation, and per-stage tracing from the beginning.
- A native Apple Silicon install and a CPU fallback. Separate environments for future CUDA workers.
- FastAPI, React/Vite/TypeScript, and SQLite when persistence becomes useful.
- Explicit AI disclosure and independently selectable persona, voice, and appearance.
- A later teaching board. This is a useful product direction once conversation quality is established.

Use a small common engine descriptor, but separate interfaces for speech recognition, language generation, speech synthesis, avatar animation, and image jobs. Their inputs, streaming behavior, cancellation, and outputs differ too much for one universal method interface.

## Findings that change the plan

### 1. LAM is not cleared for a permissive default

LAM's code repository has a separate `LICENSE_WEIGHT` containing **CC BY-NC 4.0**. Its published LAM-20K Hugging Face README also advertises Apache-2.0. These sources conflict. Treat photo reconstruction as **license unresolved**, rather than assuming the code license covers the weights. Keep it out of the default profile until the authors clarify the terms for the exact checkpoint. Sources: [dedicated weight license](https://github.com/aigc3d/LAM/blob/339573649dd93df4cba8093a964e85a80d1b61f3/LICENSE_WEIGHT), [LAM-20K model card](https://huggingface.co/3DAIGC/LAM-20K/blob/a710cd3c40c86ffe3fc572e895ed12f3ead47289/README.md).

This finding concerns photo reconstruction. The WebGL renderer, audio-to-expression model, and exported face assets are separate artifacts whose terms must be checked separately. Do not infer that every LAM-related artifact has the same restriction.

LAM's documented creation path uses CUDA; exporting an avatar for OpenAvatarChat also uses Blender. Cheap browser playback does not establish CPU-only photo creation. Ship a licensed, prebuilt character first. Sources: [LAM setup and export instructions](https://github.com/aigc3d/LAM), [LAM audio-to-expression weights](https://huggingface.co/3DAIGC/LAM_audio2exp).

### 2. TalkingHead is a practical first avatar, with a specific asset contract

TalkingHead is MIT-licensed and supports streamed PCM with timed lip-sync data and interruption. Its documented avatar contract expects a compatible skeleton and facial shapes. It documents conversion of VRoid/VRM assets; arbitrary VRM/GLB files are not guaranteed to work directly. Sources: [TalkingHead implementation and streaming interface](https://github.com/met4citizen/TalkingHead), [VRoid conversion instructions](https://github.com/met4citizen/TalkingHead/blob/main/blender/VRoid/VROID.md).

Move one verified stock GLB into v0.1. Delay general upload support. For lip-sync, use timed visemes/words when available, or a separately verified audio-to-expression adapter. A volume-driven mouth can be a development fallback, but should not be described as accurate phonetic lip-sync. Choose a redistributable character with working facial shapes; a CC0 asset label alone does not establish rig compatibility.

The proposed `wav2arkit_cpu` conversion advertises Apache-2.0 and CPU inference. Its file listing includes a roughly 402 MB external weight file in addition to the 1.86 MB ONNX graph. Package both and benchmark the complete artifact. Its speed claims are not a measurement on this project's hardware. Sources: [model card](https://huggingface.co/myned-ai/wav2arkit_cpu), [pinned file listing](https://huggingface.co/myned-ai/wav2arkit_cpu/tree/48b7d27a147d4dfcce4c8225b11209ce4cd76e05).

### 3. Photorealistic avatars are viable experiments, with separate performance gates

SoulX-FlashHead reports 96 FPS for Lite on a 4090 and up to three concurrent avatar streams. These are upstream avatar-generation claims, not evidence that a co-located STT/LLM/TTS/avatar stack meets the plan's call latency or concurrency target. Its Lite implementation loads an LTX VAE. Verify the exact bundled VAE's lineage and terms; LTX releases have version-specific model licenses. Sources: [FlashHead README](https://github.com/Soul-AILab/SoulX-FlashHead), [Lite VAE selection](https://github.com/Soul-AILab/SoulX-FlashHead/blob/main/flash_head/src/pipeline/flash_head_pipeline.py), [LTX license matrix](https://huggingface.co/Lightricks/LTX-Video-0.9.7-distilled).

MuseTalk permits commercial use of its own model and code, but explicitly requires compliance with component licenses and limits its supplied test data to noncommercial research. It is primarily lip-sync over a source face/video; its documented limitations include identity detail loss and jitter. It does not establish Tavus-equivalent upper-body behavior. Source: [MuseTalk license and limitations](https://github.com/TMElyralab/MuseTalk).

Do one GPU feasibility experiment after the local call works. Measure first playable frame, warm-up/compile time, memory, audio continuity, interruption, sustained quality, and then concurrency with the entire stack running. Support only one GPU avatar adapter initially.

### 4. The voice and turn choices are credible, but exact checkpoints matter

Gemma 4 E4B and Kokoro-82M have Apache-2.0 model cards. Silero VAD uses MIT; Smart Turn v3.2 uses BSD-2-Clause. These are reasonable candidates for the initial local profile. Pin the model artifact, quantization, runtime, and conversion rather than documenting only a family name. Sources: [Gemma 4 E4B](https://huggingface.co/google/gemma-4-E4B-it), [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), [Silero](https://github.com/snakers4/silero-vad), [Smart Turn](https://github.com/pipecat-ai/smart-turn).

The `gemma4:e4b` Ollama tag exists, but "E4B" describes effective parameters rather than a complete 4-billion-parameter memory footprint. Pin the chosen backend and quantization, cap conversation context for the first experiment, and measure loaded memory alongside STT and the browser. Source: [Ollama's E4B artifact and model information](https://ollama.com/library/gemma4:e4b).

Pocket TTS has MIT code, CC BY 4.0 weights, a gated model download/use statement, and separately documented voices. Keep it as an optional adapter pending review of that complete distribution. Sources: [Pocket TTS code](https://github.com/kyutai-labs/pocket-tts), [weight model card](https://huggingface.co/kyutai/pocket-tts).

Start with English as the explicitly validated language unless the product requirement changes. Hindi/Hinglish needs its own speech and pronunciation evaluation. Qwen3-TTS's published ten-language list does not include Hindi, and Pocket TTS's published six-language list does not include Hindi. A multilingual LLM does not fix that gap. Sources: [Qwen3-TTS language table](https://github.com/QwenLM/Qwen3-TTS), [Pocket TTS language support](https://github.com/kyutai-labs/pocket-tts).

Whisper should be described as using a streaming or chunking adapter, rather than assuming every Whisper backend emits stable partial transcripts natively. Evaluate short speech, long speech, internal pauses, and final transcript latency.

### 5. Define the open-source promise precisely

Recommended promise: **Apache-2.0 application code, self-hostable models with reviewed permissive weight licenses, and a complete local profile requiring no proprietary inference service.** This does not claim that every model's training data and training pipeline are available.

OpenAI-compatible HTTP is a protocol, not a license guarantee. A hosted endpoint needs a declared model and revision where possible. For a fully open local setup, document Ollama or llama.cpp. LM Studio's application is governed by its own restrictive terms and should not be presented as an open-source runtime. Sources: [Ollama](https://github.com/ollama/ollama), [llama.cpp](https://github.com/ggml-org/llama.cpp), [LM Studio application terms](https://lmstudio.ai/app-terms).

The proposed `commercial_ok` flag and `ALLOW_NONCOMMERCIAL` switch are too coarse. Record code, weights, component weights, voice/face assets, attribution requirements, source URLs, revisions, and review date. Use explicit statuses such as reviewed-permissive, restricted, and unresolved. Unresolved or restricted artifacts should not enter the strict default profile. A user setting cannot change the underlying license.

The plan correctly distinguishes LiveKit's permissive server/framework from its turn model: that model's license restricts use to LiveKit Agents. A future self-hosted LiveKit transport can still use a different turn detector. Source: [LiveKit turn model license](https://huggingface.co/livekit/turn-detector/blob/main/LICENSE).

### 6. Specify playback and cancellation before a remote-worker protocol

For v0.1, choose one output-audio route and prove it. Standard WebRTC audio/video tracks are a useful starting point. Bundling PCM and animation in a data channel can simplify a shared playback timeline, but then the application owns buffering, scheduling, underrun handling, and stale-chunk removal. It needs a deliberate test, not an assumption that timestamps alone guarantee sync.

For either route:

- Attach a conversation ID, utterance ID, and generation/epoch ID to generated output.
- Cancel LLM generation, TTS generation, queued avatar output, and browser playback on a confirmed interruption. Reject any later output from the old generation.
- Use bounded queues and an explicit backpressure policy. Drop obsolete animation/video frames rather than building an ever-growing delay.
- Define sample rates, channel count, PCM format, frame/viseme timebase, and resampling boundaries.
- Anchor animation to the browser's actual audio playout timeline. Do not compare raw timestamps from unrelated machines.
- Track the reply that was actually played so conversation history does not assume an interrupted answer was fully spoken.
- Keep inference off the asynchronous event loop when a backend performs blocking computation.

When two real adapters reveal the common requirements, stabilize the worker protocol. WebSocket/protobuf is an acceptable later transport. Define handshake version, errors, deadlines, session ownership, authentication, cancellation acknowledgement, health, and queue limits. JPEG video is an experiment with an encoding and bandwidth cost; it is not the final media architecture.

### 7. SmallWebRTC reduces infrastructure, not networking requirements

The framework documents signaling and browser/client setup as required, with STUN/TURN needed for some network paths. A localhost demo does not prove a cloud or cross-network call. Move TURN/TLS into the first externally accessible deployment milestone, even if it precedes LiveKit. Source: [Pipecat SmallWebRTC documentation](https://docs.pipecat.ai/api-reference/server/services/transport/small-webrtc).

Test microphone permissions, echo cancellation, browser playback activation, disconnect cleanup, and one restrictive-network/TURN route before claiming remote usability. Validate mobile and Safari separately before promising any-device support.

### 8. Hardware recommendations need whole-pipeline evidence

The initial release should validate one named Apple Silicon profile and one named CPU fallback. Treat 8 GB machines and the remaining OS/GPU matrix as experimental until measured.

Account for weights, LLM context/KV cache, inference activations, browser rendering, OS memory, and concurrent sessions. On Apple Silicon, CPU and GPU share memory; a desktop CUDA VRAM heuristic does not apply directly. Changing placement changes latency, so `doctor` should report the trade-off and require an explicit configuration choice rather than silently moving active sessions.

A 30-second benchmark is useful for smoke tests, not a reliable P95 call-latency estimate. Keep automatic profiling simple at first: show supported hardware, installed artifacts, and a named recommended profile. Add automatic placement after measurements from real sessions exist.

Correct the NVIDIA profile table: desktop RTX 5090 has **32 GB**, whereas 3090/4090 have 24 GB. GPU model name alone also does not establish the driver's compatibility with a worker image. Source: [NVIDIA RTX 5090 specifications](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/).

### 9. Keep useful safety controls, with accurate claims

A recorded phrase and transcript match collect evidence of an attestation; they do not independently prove identity, liveness, or authorization over another person's face/voice. Keep stock characters and preset voices in v0.1. Before cloning, design consent scope, withdrawal, asset deletion, retention, and hosted misuse handling.

Keep input camera access and recordings off until those features need them. Showing an animated face does not require collecting the user's camera feed. Make transcript retention explicit and allow deletion.

AudioSeal does support streaming and has MIT code/weights. Measure its added latency, audio quality, and watermark detection after the actual audio encoding path. It is useful evidence of synthetic content, not proof of consent or comprehensive compliance. Source: [AudioSeal](https://github.com/facebookresearch/audioseal).

For an EU-facing deployment, the plan's attention to disclosure is sensible. Article 50 includes machine-readable marking obligations, and Article 2's open-source exception does not automatically exempt systems covered by Article 50. Applicability still depends on the deployment and actors. A warning switch is not an adequate control for prohibited emotion inference in workplace or education uses; Article 5 has a prohibition with specified exceptions. Keep this capability absent from the initial product. Sources: [Article 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50), [Article 2](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-2), [Article 5](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-5).

### 10. Give OpenTavus a distinct reason to exist

OpenAvatarChat already implements replaceable ASR, LLM, TTS, and avatar modules, including LAM, LiteAvatar, MuseTalk, and FlashHead. Its current documentation also includes interruption modes. Study it before rebuilding those integrations; its default API-backed examples do not by themselves satisfy an all-local model requirement. Source: [OpenAvatarChat](https://github.com/HumanAIGC-Engineering/OpenAvatarChat/blob/main/readme_en.md).

Recommended focus: an easy-to-run, well-documented local conversation kit with clear license evidence, a small developer API, reproducible benchmarks, and a later tutor canvas. Compare a thin new Pipecat-based implementation with reusing existing avatar integrations in one feasibility experiment. Choose using maintenance and deployment evidence.

Tavus currently describes Phoenix rendering plus perception and conversation behavior. An audio-driven animated face implements only part of that experience. Describe OpenTavus's measured capabilities honestly and avoid a parity claim until visual and conversational evaluations support it. Source: [Tavus CVI](https://www.tavus.io/cvi).

Keep `opentavus` as a working name in the existing directory. Name availability and brand clearance were not established by this review; state independent affiliation when publishing.

## Proposed milestones

These are suggested scope changes, not implemented or approved product decisions. Use acceptance gates rather than dates until the first model spike establishes the work involved.

| Milestone | Deliverable | Gate before proceeding |
| --- | --- | --- |
| Feasibility spike | One native Mac browser voice call: Silero + Smart Turn + Whisper adapter + quantized Gemma 4 via Ollama + Kokoro; voice-only view permitted | Measure complete-turn latency and memory; interrupt and restart repeatedly without stale speech |
| v0.1 local conversation | Add one licensed stock GLB, proven lip-sync route, live transcript, start/end controls, persona prompt, YAML settings, minimal API, model manifest, native install instructions | Stable 10-minute call, repeatable scripted cases, documented measured performance, offline operation after downloads |
| v0.2 GPU preview | One GPU avatar adapter with isolated dependencies; optional additional TTS/LLM adapters | Exact component/asset licenses reviewed; whole-stack latency, peak memory, and interruption measured |
| v0.3 remote and deployable | Worker transport, authenticated signaling/session links, TURN/TLS, cloud example, then LiveKit if room requirements justify it | Cross-network tests, bounded queues, disconnect cleanup, measured cost/capacity; no leaked server credentials |
| v0.4 learning/workflow features | Tool calling and a simple note/formula/diagram card; camera/screen input only if required | Validated tools and schemas, safe rendering, visible tool results tied to the spoken answer |
| Later product expansion | Full Excalidraw board, knowledge sources, model picker, general avatar uploads/studio, consented cloning, image engine, recordings and export provenance | Independent acceptance criteria for each feature |

The image engine is optional for teaching: notes and formulas can work first. Excalidraw is MIT-licensed. A complete drawing board needs adapters/layout for formulas and diagrams rather than assuming Mermaid/KaTeX are native board elements. FLUX.2 Klein 4B is an Apache-2.0 candidate for a later image adapter; its full dependencies and memory still need review. Sources: [Excalidraw](https://github.com/excalidraw/excalidraw), [FLUX.2 Klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B).

## Proposed v0.1 acceptance criteria

The following numbers are engineering targets for the selected reference machine, **not performance predictions**. Revisit them using the first spike's results and publish failures as well as successes.

| Measure | Proposed definition and target |
| --- | --- |
| Response latency | Human's actual last speech sample to first audible reply in browser; report P50/P95 over at least 100 representative warm turns. Initial target P95 <= 2 seconds; retain <= 1 second as a stretch objective |
| Playback interruption | Confirmed interrupt to last audible sample and final stale animation; initial target P95 <= 300 ms. Also report speech-start-to-confirmation delay separately |
| Synchronization | Absolute audio/mouth offset, including long utterances and interruptions; initial target P95 <= 100 ms, with a stated measurement method |
| Reliability | Ten-minute call plus repeated start/end cycles without unbounded queues, old output replay, resource leaks, or microphone cleanup failure |
| Conversation behavior | Short questions, a long utterance, an internal pause, background noise, a backchannel, a correction, an interruption, and a disconnect; document outcome for each |
| Local independence | After artifacts are downloaded, the default profile completes a call without external inference, hosted avatar conversion, or a paid service |
| Reproducibility | Record hardware/OS, runtime versions, model revision and quantization, prompt/context settings, warm-up, sample count, and raw timing data |
| Installability | Fresh installation from documented steps on the named supported target; show clear download, license, and unsupported-hardware messages |

Keep cold start, model loading, and one-time avatar preprocessing separate from warm response latency. Measure first audible output and first synchronized visual output independently. Evaluate one session before testing two or three. Per-stage measurements explain the total, but their individual P95 values should not be added to manufacture an end-to-end P95.

## Changes to the original 18 tasks

| Original task | Suggested adjustment |
| --- | --- |
| Name/repo/scaffold | Reuse the existing project workspace; document the license policy and select reference hardware first; scaffold after the scope is settled |
| Mac voice spike | Keep first; add browser-perceived response and interruption measurements |
| Engine core | Keep typed adapters/config; defer entry-point packaging and general placement resolver |
| Doctor | Start with hardware/install diagnostics and explicit profiles; defer automatic microbenchmark placement |
| CPU/Apple adapters | One STT backend per reference target, one LLM endpoint adapter, one default TTS; defer extra providers |
| LAM path | Replace default photo reconstruction with one licensed stock GLB; retain LAM as a separate unresolved-license experiment |
| Worker protocol | Defer until a local GPU adapter and its lifecycle work |
| GPU worker | Separate v0.2 feasibility/release gate |
| Control plane API | Keep conversation start/end/status and one persona/config path; defer broad CRUD, API-key management UI, and webhooks |
| Web app | One conversation screen; defer the dashboard and consent/cloning studio |
| Turn tuning | Move basic interruption into the spike; advanced patience/backchannel policy follows measured examples |
| Safety defaults | Keep AI label, minimal permissions, privacy/retention decisions; benchmark watermarking; defer cloning |
| Quality/CI | Start with cancellation and session-lifecycle checks plus reference-machine browser measurements; CI build success is not GPU performance proof |
| Docs/release | One validated native quickstart and explicit experimental targets; expand as targets pass |
| Model picker | Keep configurable slots now; catalog/settings UI later |
| VRM/GLB uploads | One known-compatible stock GLB now; general uploads/conversion later |
| Teaching canvas | Bring one text/formula/diagram card forward after tools; full board/images remain later |
| Avatar studio | Keep later, after asset compatibility and consent design are proven |

The original learning contributions remain meaningful future decisions: interruption policy affects conversational behavior; hardware placement policy affects quality and speed. Implement them only when the surrounding runtime and measured cases exist, so the user can make an informed choice.

**Recommended next implementation step:** prove one entirely local Mac voice conversation, including browser playback cancellation. Then add the stock avatar to that same call. This resolves the project's central feasibility risk before committing to the larger platform.
