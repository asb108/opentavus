# Browser smoke checks

These opt-in checks use the committed Playwright CLI dependency to drive Chrome. Install Chrome, build the application, and start the backend with `make run`. They do not download a second browser or require a hosted model.

```sh
npm run test:browser
```

The lightweight check opens an isolated browser session, verifies the real call/board UI and settings dialog, and checks a small-screen viewport for horizontal overflow. It writes screenshots under ignored `output/playwright/`, then closes only its own browser. It does not create a model call.

For real models:

```sh
make models
npm run test:browser -- --live
```

The server must already be running, and no other call should be open because this alpha admits one browser call. Add `--headed` to observe the check. It draws a rectangle through the UI, asks public synthetic questions, waits for actual AudioWorklet captions, stops a reply, requests a formula/equation quiz, checks the feedback and rendered browser acknowledgements, and exports PNG/Markdown. It selects 0.5B/Michael/Lumen while 1.5B/Heart/Mira remains active, ends and starts the next call, checks distinct transcript names, then verifies that Clear AI notes retains the drawing. The isolated socket/browser is closed even after a failed assertion. First-call warm-up and inference can take time; an unresponsive model is a failure rather than a silently skipped live result.

`scripts/browser-instrument.js` retains event kinds, generations, sample offsets, browser-clock times, stop acknowledgements, and audio energy. It excludes transcripts, tokens, model output, authorization, and PCM. `smoke-live-events.json` and `smoke-microphone-events.json` are local evidence, not an uploaded telemetry stream. Screenshots intentionally contain the synthetic lesson; do not use private conversations when collecting shareable captures.

The current smoke checks are bounded integration proof. They do not establish 100-turn latency percentiles, physical speaker echo cancellation, exact DAC output timing, phoneme lip-sync, or 20-minute reliability. Compare with [the quality guide](../quality.md) before making those claims. Synthetic microphone verification is recorded separately in [alpha evidence](../releases/0.1.0-alpha.1.md); the basic smoke avoids requesting a real microphone.

Run `npm run test:browser -- --microphone` for the synthetic microphone route. It supplies the committed public speech fixture as an AudioContext MediaStream, waits for the browser's real WebRTC connection, observes real Whisper transcription and model speech reaching playout, and confirms the input track is released on end. It does not capture a physical microphone. The native Chrome fake-file device produced silence in the reference trial, so this explicit source makes the input and its limits reproducible.

For manual diagnosis, use the installed CLI's named sessions, snapshots, visible controls, screenshots, and console checks. Keep hardware/version/model-digest context with a performance report. Browser build/logic tests in `make check` require no browser process; actual Chrome results are separate.

## Automatic board requests

```sh
npm run test:browser -- --board
npm run test:browser -- --board --microphone
```

Both checks keep Teach mode off, split the photosynthesis topic from “diagrams on
the board,” inspect actual SVG labels/connections, wait for a positive canvas ACK
before spoken explanation, and ask a follow-up about the applied diagram. The
microphone variant supplies two committed synthetic Kokoro clips through a
MediaStream into real WebRTC/VAD/Whisper recognition. Its final explanation
follow-up is typed. End releases the synthetic track and audio context.

Evidence files use `smoke-board-*` and `smoke-board-microphone-*` under ignored
`output/playwright/`. These contain public synthetic questions only. The event
files exclude content/credentials/audio. [Published evidence](../releases/board-repair-evidence.json)
records failed model/render iterations as well as the successful bounded cases.
General branching graphs, physical acoustics and percentile latency remain open.

## Optional stock-human check

```sh
npm run test:browser -- --avatar
npm run test:browser -- --avatar --live
```

The first checks a five-second render cadence, switching to a static poster,
missing WebGL 2, invalid GLB data, context loss and late cancelled preparation.
The second also captures a synthetic generated reply and verifies shared-Worklet
Stop, then a successful call after graphics failure. Local screenshots, metrics
and the native-speed capture go to ignored `output/playwright/`. No microphone
recording is made. This checks the optional 3D human, not photographic realism or
phoneme lip-sync. `OPENTAVUS_TEST_URL` can select an independently configured local
check server, leaving another browser's active call intact.


## Prepared photographic check

```sh
npm run test:browser -- --photo
npm run test:browser -- --photo --live
npm run test:browser -- --photo --software
```

The first measures seven seconds of native 512-pixel prepared playback, verifies
the complete prepared blink sequence and that static switching stops drawing and closes all four decoded images, and
checks damaged sheets, cancelled loading and unavailable Canvas 2D recovery.
The live check also records actual local Qwen/Kokoro speech and photographic
motion at normal speed, observes all four presentation cues, verifies Stop and
closed-mouth behavior, requires at least five distinct model-timed speech shapes,
checks at most 80 ms Worklet-cue-to-Canvas scheduling and no stale cues after Stop,
and confirms that a call works after an avatar failure.
Its capture contains only the public synthetic question, never a real microphone.

`--software` starts this check's own Chrome with `--disable-gpu` and
`--disable-accelerated-2d-canvas`. It is a controlled software-rendering check on
the named machine, not weak-PC or CPU-only language-model evidence. Each run
writes `photo-metrics.json`, screenshots and, with `--live`, `photo-call.webm` to
ignored `output/playwright/`; preserve a named copy before another run overwrites
those filenames. Metrics exclude private content and audio. The capture is an
explicit test artifact and contains synthetic speech.

These checks require the updated server and its built frontend. An independently
configured server can use `OPENTAVUS_TEST_URL`; its own allowed origins must match
that address. Do not weaken production admission checks to run the test. Avoid
other calls on the selected server. The CLI closes only its own browser session.
See [timed portrait evidence](../releases/phoneme-portrait-evidence.json) for
measured results and the finite-motion/approximate-lip-sync boundary.

### Historical scientist portrait

```sh
npm run test:browser -- --scientist --live
npm run test:browser -- --scientist --software
```

The same photographic checks select Einstein explicitly, assert the AI portrayal
label and correct static/failure poster, record real local speech and Stop, and
save `output/playwright/einstein-*` artifacts. Questions are public synthetic test
prompts. `--photo` alone retains Mira regression coverage despite the new default.
Software Canvas checks establish only the named browser configuration, not whole
call performance on a weak PC.


## Local compatible model check

```sh
npm run test:browser -- --provider
```

This opt-in check uses the running local Ollama compatible endpoint with
`qwen2.5:1.5b`, real Kokoro speech and browser Worklet playback. It creates an
isolated browser and a temporary provider profile through the actual settings
form. Its key is explicitly synthetic; no hosted service or paid account is used.
It checks transient credential input/public preferences, mobile settings,
conversation-only capability, an ordinary request, correction, follow-up,
unsupported-board spoken recovery, Stop and next-call voice/character isolation.
A separate capable call checks a formula, labeled photosynthesis diagram and quiz,
requiring applied board acknowledgements before speech. It ends its calls and
removes only its temporary provider profile.

Artifacts under ignored `output/playwright/provider-local-*` contain public
synthetic cases, timing/state/error codes and a screenshot. Event records exclude
keys, questions, replies and audio. These are browser-clock/Worklet observations,
not physical speaker waveforms or aggregate latency percentiles. Failed combined
lesson attempts remain in [the evidence record](../releases/provider-local-evidence.json).
Hosted/OpenRouter calls, broader lesson correctness and full naturalness gates
remain separate work.
