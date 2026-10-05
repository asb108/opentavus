# Local alpha quickstart

This guide runs the actual `0.1.0-alpha.1` product from source. Start with Chrome on an Apple Silicon Mac. The reference machine is an M3 Pro / 18 GB; CPU adapters are provided for other Macs/Linux, with live results on those systems still open. See [release evidence](../releases/0.1.0-alpha.1.md).

## Install once

Install Python 3.12, Node.js 22.12+, npm, [uv](https://docs.astral.sh/uv/getting-started/installation/), and [Ollama](https://ollama.com/download). Use the Ollama desktop app or `ollama serve` to start the local model service. It listens at `127.0.0.1:11434`; the alpha uses this fixed local endpoint.

Allow at least 5 GB of free storage for a new installation. The default language model is about 986 MB, speech files about 432 MB, and development/inference dependencies add storage. The optional 7B model is about 4.7 GB by itself; it was not installed or benchmarked on the reference machine. Download and inference requirements are distinct.

```sh
git clone https://github.com/asb108/opentavus.git
cd opentavus
make setup
make models
make doctor
make run
```

`make setup` is the lightweight development install. `make models` adds Pipecat WebRTC, faster-whisper, and Kokoro ONNX dependencies, checks downloads against the committed artifact metadata, and installs the reviewed Qwen 1.5B digest. Models are never downloaded merely by opening the app. No hosted API key is needed.

Open [http://127.0.0.1:8765](http://127.0.0.1:8765). Keep the server open. Ctrl-C in its terminal stops it. `make run` rebuilds the frontend; after an existing build, the faster start command is `uv run --no-sync opentavus serve`.

## Try the three experiences

1. Type “What is two plus two? Answer in one sentence.” and send. This creates a call without requesting microphone access. The first call warms models before becoming ready and can take tens of seconds; subsequent calls reuse warm speech engines while the server runs.
2. Click Start conversation for voice input, or unmute a typed call. Allow microphone access. Use headphones for initial trials. Say a short question, pause, and wait for a reply. English is the tested speech profile. The current turn detector uses Silero VAD and segmented Whisper; natural pause/speaker echo and fast spoken interruption targets are still open. Stop reply flushes playback immediately; a spoken correction is recognized after transcription.
3. Enable Teach on board, then ask for a short explanation, formula/flowchart, or quiz. The model produces validated structured lesson data. Formula/diagram/quiz cards appear above the drawing canvas; notes appear in it. The browser confirms a visible result before speech describes the board. Small models can produce incorrect or rejected lessons; request a simpler lesson or use a stronger installed model.

Settings select brain, voice, and character independently. The UI shows installed/eligible language models and recovery instructions for unavailable ones. Changes apply to the next call; end the current conversation first. Four Kokoro English voices are selectable. STT and TTS model-family pickers follow additional adapter work.

Use the canvas tools to draw/edit. Clear AI notes removes only agent-owned content. Editing an AI note makes it yours. Canvas exports a PNG of drawings/notes; Lesson exports formula/diagram/quiz source as Markdown. These exports are separate because cards are not Excalidraw elements.

## Additional language model

The source registry currently approves three exact Ollama digests. To install the smaller alternative:

```sh
uv run --no-sync opentavus setup --model qwen2.5:0.5b
```

Refresh the page after a download, then choose the model in settings. The 0.5B model uses less storage but generally makes weaker lessons. The 7B choice is an unbenchmarked larger option, not a promised performance profile. Arbitrary model names/remote URLs are deliberately not accepted by this alpha boundary. New reviewed models enter through a manifest/catalog contribution.

## Configure a compatible endpoint

After `make models`, open Companion settings and choose Add model provider.
For local Ollama, keep `http://127.0.0.1:11434/v1`, set the exact installed model ID,
and leave the key blank. Save and select the new card. Leave schema-based board
tools off for a conversation-only profile. Enable them separately when testing
teaching. Settings apply to the next call; changing the brain preserves the voice
and character. Unsupported board requests show an error and continue an explanation.

For a self-hosted remote endpoint, use HTTPS and its explicit model ID. It must
support `GET /models` and streamed `POST /chat/completions`; teaching also needs
`response_format` JSON schema support. For OpenRouter choose its type, then set an
explicit model ID and submit the key in the password field. These profiles are
experimental; no hosted route is live-verified yet. See [the provider contract](../provider-contract.md).

Provider credentials live in the ignored `models/providers.json` file, saved
atomically with POSIX owner-only permissions. This is plaintext server configuration,
not encrypted storage. Public API responses and browser preferences never contain
key values. Replace/remove a key or remove the provider through settings while no
call is open. Clearing browser site data does not delete server-held credentials.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Local server unavailable | Start `make run` in this checkout and refresh. Use the `127.0.0.1:8765` address. |
| Model unavailable | Keep Ollama running; run `make doctor`, then `make models`. A digest mismatch requires a reviewed catalog update, not bypassing validation. |
| Cold start feels slow | Wait for model warm-up before sending another request. Keep the server running to reuse speech engines. |
| Microphone connection fails | Use typed input, check Chrome permission, end and restart the call. The local profile has no TURN or Internet traversal. |
| Another local call is open | End that call or close its tab. This alpha admits one active browser call. A prepared call with no socket expires after 30 seconds. |
| Board update rejected | Ask for a simpler standard formula or short flowchart. Unsupported commands, HTML, links, and excessive output are rejected. |
| Playback fell behind | Stop and reconnect. Suspended tabs cannot accumulate unlimited server audio; keep the active tab visible during trials. |
| Install runs out of space | Free space through your usual file-management process, then rerun setup. Partial model files are not accepted as installed artifacts. |

## Data and offline use

The server does not save audio recordings or transcripts by default. It holds call context in memory and clears it when the call ends. The on-page transcript remains visible until refresh. Settings and drawing elements use versioned local browser storage. Formula/diagram/quiz cards currently last only for the page session; export before refreshing. Image attachments use Excalidraw's in-page files and are not included in our drawing persistence.

To delete saved drawings/settings, clear site data for `127.0.0.1:8765` in Chrome. Use this intentionally; it removes your browser's board. Downloaded weights are in this checkout's ignored `models/` directory, while Ollama manages its own model store. Stop the app before deliberately removing a selected model; unrelated models and user files should be preserved.

The reviewed default and a loopback compatible endpoint keep inference local after
downloads. Selecting an external provider sends conversation text and board
requests to that destination and may incur charges. Speech/portrait inference
remains local. Fonts/assets are bundled. Optional Excalidraw help/library links may navigate outside the app if you choose them; external resources are not needed for a call. Keep Ollama running when testing without Internet access. The alpha binds to loopback and is not a multi-user/public server; see [security](../../SECURITY.md).

## Develop with live models

Run the backend in one terminal:

```sh
uv run --no-sync opentavus serve
```

Run the frontend in another:

```sh
make dev
```

Open `http://127.0.0.1:5173`. Vite proxies the local API and socket. The backend's origin guard accepts the two documented loopback ports. Restart the backend after Python edits; Vite reloads frontend edits. Run `make check` before submitting a contribution.
