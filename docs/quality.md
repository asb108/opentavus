# Experience and release quality

These are full v0.1 launch targets, not a claim that the local alpha passes. T01/T04 establish baselines; T13 can pass only with evidence. The earlier community trial has its own bounded T18 acceptance and [release evidence](releases/0.1.0-alpha.1.md). If targets are missed, identify the stage and adjust implementation/profile before advertising it. Do not silently replace a quality gate with a weaker number.

## Local alpha evidence boundary

The alpha's lightweight checks cover generation cancellation, contiguous PCM samples, bounded server buffering, browser Worklet resets/clock progress, acknowledged history, tool validation, safe formula/diagram arguments, user-edit preservation, profile validation, and local-origin admission using synthetic engines/data. `make check` runs these without inference packages or weights. `make base-check` separately verifies the installed core with every plugin absent.

Opt-in Playwright CLI checks drive Chrome with installed local models. Record generated speech reaching the Worklet, actual canvas acknowledgements, stop/reset behavior, and selection changes separately from server-send timing. Synthetic microphone capture verifies the WebRTC/VAD/STT route without recording a person's environment; it does not prove physical microphone acoustics, speaker echo cancellation, or accessibility across every browser.

Photographic Mira uses model-derived phoneme cues on the actual played-sample clock. Untimed engines and the other characters use played-audio energy. Cue scheduling is measurable separately from perceptual phoneme accuracy; neither fixture tests nor a 30 FPS counter establish realistic human speech. Serial board planning/render acknowledgement adds delay before the spoken lesson. Small-model factual errors and rejected tool output must be included in evidence. The 100-turn latency percentiles, 20-minute/cycle reliability, natural-turn detection, physical speaker echo, media-route comparison, and additional platform profiles remain open.

T21's [stock-human preview check](releases/browser-human-evidence.json) measured
approximately 30 FPS over five seconds at 384 × 384 on M3 Pro, with a 34.1 ms
P95 frame gap and no gap above 100 ms. A real local Qwen/Kokoro reply reached the
shared Worklet; Stop acknowledgement took 50 ms in that single case and no later
positive audio energy appeared for the cancelled generation. Static switching,
lost WebGL context, invalid assets, late cancelled preparation and unavailable
WebGL each passed their bounded browser scenarios. This is neither a 20-minute
run nor a latency/lip-sync percentile study. Its 3D appearance did not satisfy
the user's realism requirement.

T22's [photographic preview evidence](releases/photographic-human-evidence.json)
measured 30 FPS over seven seconds, a 34 ms P95 frame gap and no gap above 100 ms
at 384 × 384 on this Mac. Real local Qwen/Kokoro speech drove the same Worklet;
all four presentation cues were observed. The two successful live checks recorded
Stop acknowledgement at 50.4 and 54.3 ms, with no later positive old-generation
energy and a closed mouth in either case. A
normal-speed canvas/audio capture and actual board screenshot are published.
Static switching stopped drawing and closed all four decoded ImageBitmaps;
damaged assets, cancelled loading and unavailable Canvas 2D recovered to a poster
or the selected alternate character. A damaged avatar did not prevent a reply.

An additional `--photo --software` run used Chrome's `--disable-gpu` and
`--disable-accelerated-2d-canvas` flags. The final run measured 29.9994 FPS over seven seconds,
a 34.2 ms P95 gap and no gap above 100 ms; cleanup and failure recovery also
passed. Chrome diagnostics confirmed software rendering and unavailable WebGL/WebGPU.
This controls browser graphics on the M3 Pro, not Ollama acceleration
or the speed of a weaker processor. Keep PC claims separate.

This establishes bounded prepared photographic playback, not full human behavior.
The source identity is consistent in inspected expression frames and sampled
capture frames, but teeth/eye texture and crossfade artifacts can occur. That T22 version's
mouth followed amplitude rather than consonant/vowel timing and was rejected by
the user for its appearance and lack of lip-sync. A single synthetic
utterance/Stop and a seven-second cadence sample do not satisfy the multiple-face,
100-turn, 20-minute, physical-acoustic, weak-PC or precise lip-sync gates. MPS
preparation had CPU fallback enabled; no profiler proof establishes which
individual operations executed on which processor.

T23 replaces amplitude-only photographic articulation with bounded packet-relative
phoneme cues from Kokoro's existing duration-enabled export, distinct prepared
mouth shapes, native 512-pixel tiles, and mouth-region compositing. Its
[timed portrait evidence](releases/phoneme-portrait-evidence.json) records real
model/browser checks and a normal-speed capture. Targets for this bounded slice
are 30 FPS drawing and at most 80 ms Worklet-cue-receipt-to-completed-Canvas draw.
Report coalesced/short cues and visual artifacts. This scheduling result excludes
DAC output latency and independent acoustic/perceptual alignment; the full v0.1
lip-sync gate below stays open. A finite portrait bank is not demonstrated Tavus
quality or full natural human behavior. Windows, weak-PC and long-call checks
remain separate acceptance work.

## Reference profiles and timing

Measure one named native Apple Silicon configuration first. Add a CPU fallback and GPU profile only after complete-stack measurements. Capture OS, CPU/GPU model, RAM/VRAM, runtime/package versions, exact model revisions/quantization, language, prompt/context length, transport path, network conditions, and warm-up state.

| Metric | Definition | Launch target on the advertised reference profile |
| --- | --- | --- |
| Useful reply latency | User's actual last speech sample to first audible content answering the turn | P50 <= 800 ms; P95 <= 1.5 s over at least 100 representative warm turns |
| Interruption recognition | User speech onset to confirmed interrupt decision | Report separately; target P95 <= 200 ms on explicit interruption cases |
| Playback stop | Confirmed interrupt to last old-generation audio/animation at the client | P95 <= 200 ms; zero stale-generation replay |
| Speech pacing | Gaps/underruns within the spoken response | No repeatable unintended gap above 150 ms; report underrun count and duration |
| Lip-sync | Absolute mouth/audio timing offset with a documented observation method | P95 <= 80 ms; no growing drift during a long reply |
| Stock animation | Browser-rendered frame cadence on the reference client | Sustained 30 FPS target; report dropped frames and device constraints |
| GPU portrait preview | First synchronized playable output and sustained frame cadence | T10 fixes numerical delay/cadence targets for the named profile before its run; advertise only after its timing/sync/visual gate passes |
| Canvas timing | Playback of related speech segment to corresponding visual update | P95 <= 300 ms; formula/diagram results appear before the agent describes them as shown |
| Reliability | Conversation, interruptions, and cleanup | 20-minute call plus 20 start/end/reconnect cycles without stale output, unbounded queues, or unreleased mic/session resources |

These percentiles are measured end to end, not made by summing stage P95 values. Canned acknowledgements, greetings, loading indicators, and silence do not count as useful reply content. Separate model loading, compile time, asset creation, and warm call behavior. Pin a bounded context for the baseline, then report long-context results separately.

Only measure cross-device timing after establishing the audio/sample timebase or clock-offset uncertainty. Use browser playout events, waveform capture, and aligned test cases where possible; report estimated lip-sync or remote-clock measurements as estimates. A rendered counter or server send timestamp is not the client's audible playback time.

## Implementation strategy for responsiveness

Warm selected models and prepared avatars before `ready`. During user speech, incrementally process audio, maintain bounded STT context, and finalize reliably. Stream short, usable LLM phrases to TTS; use non-thinking generation and avoid reading internal reasoning aloud. Tune phrase aggregation from measured audio naturalness and first-chunk delay.

A confirmed interruption increments the generation, cancels LLM/TTS/avatar/tool production, purges old queues, and asks client playout to stop. Reject late callbacks/chunks. Keep independent stage/task deadlines and close resources even when initialization failed. Never run heavy blocking inference on the I/O event loop.

Queues have limits expressed as buffered media time and a logged overflow decision. Drop obsolete visual work; preserve audio continuity. The chosen media route must handle actual browser audio clocks, echo cancellation, packet jitter, and backpressure. T04 records the winning implementation and evidence. A slow engine produces an honest state/error instead of unlimited buffering or a fake fast response.

## Deterministic behavior cases

The base contract/replay suite uses fake engines and redistributable synthetic fixtures:

- Natural pause inside a sentence; true end of turn; short backchannel; explicit correction/interruption.
- Late LLM, TTS, avatar, and canvas output after generation cancellation.
- TTS sample-rate mismatch, partial/final STT transitions, and chunk ordering.
- Avatar/plugin absent, unavailable worker, preparation failure, and close after partial initialization.
- Full bounded queue and a slow consumer; no monotonic growth of buffered media.
- Call end and reconnect; stale session token and disconnected microphone.
- Model/voice selection applied to the next call; invalid capability/language/configuration rejected before ready.
- Duplicate canvas operation, old generation, attempted removal of user-owned elements, and unsafe formula/diagram input.
- Asset provenance/consent record retention when an optional plugin is removed.

Tests assert observable behavior and task/resource cleanup. They do not reproduce implementation details just to achieve a coverage percentage.

## Real browser and model evidence

Use a scripted conversation corpus containing short/long speech, internal pauses, noise, backchannels, corrections, interruptions, and a long answer. The first corpus validates English. Add code-switching and other languages as separate profiles with evaluated pronunciation/transcription.

Measure a named Chrome/macOS route initially. Validate Safari, Firefox, mobile browsers, and Windows/Linux profiles separately before advertising support. Run speaker playback/echo cancellation and microphone permission/autoplay cases; a headphone-only run does not prove speaker behavior. Cross-network profiles include HTTPS/signaling and TURN traversal, with throttled/jittered network cases.

Visual proof includes actual real-time captures at normal speed, with the underlying audio, character identity, mouth movements, idle state, and interruption. Review several faces/utterances for jitter, lip artifacts, frozen/unnatural motion, and audio pops. A static screenshot, model FPS claim, or frontend build cannot satisfy this gate.

## Benchmark run artifact

Each run has a unique `run_id` and produces a JSON summary, raw per-turn JSONL events, and shareable synthetic input/output captures. The summary records profile/config/model digests, stage timing boundaries, sample count, failures, P50/P95, cold/warm state, and measurement uncertainty. Log conversation/generation correlation IDs, not private transcripts/media by default.

Store large local outputs under `artifacts/`; commit small synthetic fixtures and summaries that can be redistributed. Name excluded/failed turns and reasons; publish unfiltered failure counts rather than dropping slow turns. Repeat or broaden testing when a change affects a stage, a failure remains, or evidence is inconsistent.

## Release gates

The public v0.1 demonstration includes all three required experiences: interruptible avatar conversation, installed-model/voice selection, and tutor canvas. The permissive base completes its local demo after downloads with no external inference dependency. LAM is removable and has capability-specific eligibility. Optional GPU/LAM paths have separate support status. A validated local profile is sufficient for this first release; advertised GPU or cross-network support additionally requires T10/T11 evidence. Keep unsupported paths visible rather than delaying the local release for unused infrastructure.

Core/base CI runs formatting, types, behavior/replay, and frontend build checks without GPU/model downloads. Separate jobs verify selected lightweight adapters and browser integration. GPU workers get image-build/contract checks in CI plus a scheduled or manual real-GPU evidence run before a GPU claim ships. Packaging-only checks do not establish GPU FPS/latency.

Document asset/model licenses and privacy/retention behavior. Keep AI disclosure visible. Consented cloning, recording/export watermarking, and vision have independent future gates. The earlier [research review](plan-review.md) provides their source evidence; do not describe a consent phrase, watermark, or disclosure banner as comprehensive regulatory compliance.
