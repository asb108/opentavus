# Try OpenTavus without NVIDIA

The conversation does not require CUDA. Whisper tiny and Kokoro use CPU adapters;
Ollama supplies the language model and can run on CPU. Photographic Mira draws
prepared frames through browser Canvas 2D; no neural avatar model runs during a
call. The optional 3D human uses WebGL 2 on supported integrated graphics. Select
a static portrait for the least animation work. No server avatar model, LAM
package or portrait inference weights are installed for these choices.

The measured machine is currently an Apple M3 Pro with 18 GB of memory. These are
CPU-oriented choices to try, not a validated low-spec Windows/Linux profile or a
published minimum-RAM requirement. Latency depends on the processor, memory and
model size. Full PC speech/acoustic and 100-turn quality gates remain open.

## Start with a smaller model

Install the tools in the [local quickstart](local.md), with Ollama running. The
Make commands currently target the documented macOS/Linux development workflow;
native Windows live setup still needs its own tested quickstart.

```sh
make setup
uv sync --locked --group app --group models --group fixtures
uv run --no-sync opentavus setup --model qwen2.5:0.5b
make doctor
make run
```

Open [the local app](http://127.0.0.1:8765), then Companion settings. Choose
**Qwen 2.5 0.5b** under Brain and **Mira · Photographic preview** or **Mira · Static portrait**
under Character. Changes apply to the next call. Existing saved Orbit/Lumen
choices are preserved. You can type instead of using speech recognition.

The 0.5B model needs less model memory and storage than 1.5B, but often produces
weaker explanations and tool output. If it is fast enough, try the reviewed 1.5B
model for better lessons. Keep the server running after its initial model warm-up.

## Choose the graphics work

| Path | Required graphics | Current support |
| --- | --- | --- |
| Static human portrait + speech/board | No 3D rendering | Shipped preview; the portrait does not move its lips. |
| Prepared photographic human + speech/board | Browser Canvas 2D; no CUDA/server avatar inference | Shipped preview; about 3 MB of sheets/poster and 81 MiB of decoded sheet data. Finite expressions and approximate audio-driven mouth movement. |
| Stock 3D human + speech/board | Browser WebGL 2; NVIDIA/CUDA is not required | Shipped preview; mouth movement follows played-audio energy. |
| Live neural talking video | Depends on the selected model and measured hardware | Experimental. Native MuseTalk MLX reached about 5.3 FPS on this Mac and missed the 25 FPS live target. |

Photographic frames were prepared once by the maintainer with an open portrait
model. The measured Mac preparation took about 196 seconds for 145 frames; users
playing the shipped sheets do not repeat that work. The selected source image is
an explicitly requested one-time OpenAI creation. The [asset provenance](../../assets/stock/photographic/README.md)
also documents a fully open FLUX source and recipe. The [browser measurements](../releases/photographic-human-evidence.json)
apply to this Mac; they do not establish weak-PC speed or minimum system memory.

The CPU-oriented [LiteAvatar](https://github.com/HumanAIGC/lite-avatar) project
reports 30 FPS on CPU for a prepared 2D avatar. That upstream claim is not an
OpenTavus measurement. Its downloadable model/face component terms need a complete
review before it can become an unrestricted default; the top-level code license
alone is insufficient. It is a separate candidate, not a shipped option.

## Check CPU versus GPU language-model use

Run `ollama ps` while a reply is running. Its Processor column distinguishes CPU
from GPU or a split. Ollama documents CPU operation and non-NVIDIA hardware in its
[hardware guide](https://docs.ollama.com/gpu). If an unsupported graphics backend
causes trouble, use the guide's instructions for that backend rather than changing
the model name or bypassing OpenTavus's reviewed digest check.

Whisper/Kokoro CPU use is independent of the character choice. A 3D browser avatar
does not make Ollama use CUDA, and choosing a static portrait does not automatically
move a language model off an available accelerator. The alpha has no application
switch to force CPU-only Ollama yet; its backend selection follows the local
Ollama configuration.

If animation fails, the page displays a static portrait and a recovery message. You can
keep talking, choose another character for the next call, or refresh to retry.
The fallback preserves the chosen brain/voice and the board. It does not silently
claim human video or phoneme-accurate lip-sync.
