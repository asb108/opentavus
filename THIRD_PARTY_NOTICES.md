# Third-party notices

OpenTavus source code uses Apache-2.0. Model artifacts, fonts, and runtime packages retain their own licenses. Installation resolves the committed `uv.lock` and `package-lock.json`; those packages include upstream license files/notices. This source repository does not redistribute model weights or a combined model-runtime binary.

## Models and speech runtime

| Component | Notice / source |
| --- | --- |
| Qwen2.5 0.5B, 1.5B, 7B | Qwen team, Apache-2.0 selected weights. [Source license](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/main/LICENSE). Exact selected Ollama manifests: [model matrix](docs/models.md). |
| Whisper | OpenAI, MIT. [License](https://github.com/openai/whisper/blob/main/LICENSE). CPU conversion by SYSTRAN: [faster-whisper](https://github.com/SYSTRAN/faster-whisper/blob/master/LICENSE). |
| Kokoro 82M | hexgrad and contributors, Apache-2.0 model. [Source](https://huggingface.co/hexgrad/Kokoro-82M). ONNX conversion/runtime by thewh1teagle: [kokoro-onnx MIT license](https://github.com/thewh1teagle/kokoro-onnx/blob/main/LICENSE). Only the reviewed English voice presets are enabled; consult the model's voice provenance for other languages. |
| eSpeak NG runtime | eSpeak NG authors and contributors. The optional Kokoro phonemization path loads the eSpeak NG shared library, whose [COPYING](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING) contains GPL-3.0 terms. The Python [espeakng-loader](https://github.com/thewh1teagle/espeakng-loader) wrapper uses MIT; its bundled library retains eSpeak's terms. Do not replace the library's terms with the wrapper license. A distributor of runtime binaries must retain applicable notices and provide corresponding source as required by those terms. Upstream sources/build instructions are linked from the loader repository. |
| Silero VAD | Silero Team, MIT. [Source license](https://github.com/snakers4/silero-vad/blob/master/LICENSE). Pipecat supplies the pinned runtime model. |
| Pipecat | Pipecat contributors, BSD-2-Clause. [License](https://github.com/pipecat-ai/pipecat/blob/main/LICENSE). |
| ONNX Runtime | Microsoft and contributors, MIT. [License](https://github.com/microsoft/onnxruntime/blob/main/LICENSE). |
| Ollama | Ollama contributors, MIT code. [License](https://github.com/ollama/ollama/blob/main/LICENSE). Model weights use their separate source terms. |

## Browser dependencies and fonts

The application uses React/React DOM (MIT), Vite (MIT), Excalidraw (MIT), KaTeX (MIT), Mermaid (MIT), DOMPurify (Apache-2.0 OR MPL-2.0), AJV (MIT), Lucide icons (ISC), and Playwright CLI (Apache-2.0). Their installed packages retain upstream license files. Primary sources: [React](https://github.com/facebook/react), [Vite](https://github.com/vitejs/vite), [Excalidraw](https://github.com/excalidraw/excalidraw), [KaTeX](https://github.com/KaTeX/KaTeX), [Mermaid](https://github.com/mermaid-js/mermaid), [DOMPurify](https://github.com/cure53/DOMPurify), [AJV](https://github.com/ajv-validator/ajv), [Lucide](https://github.com/lucide-icons/lucide), [Playwright CLI](https://github.com/microsoft/playwright-cli).

Figtree is self-hosted through `@fontsource-variable/figtree` and uses the SIL Open Font License 1.1. Excalidraw's bundled font collection and KaTeX fonts retain their supplied licenses. Excalidraw font notices are copied alongside local font assets during the build. [Fontsource Figtree](https://fontsource.org/fonts/figtree), [Excalidraw font sources](https://github.com/excalidraw/excalidraw/tree/master/packages/excalidraw/fonts), [KaTeX license](https://github.com/KaTeX/KaTeX/blob/main/LICENSE).

This list records key directly used components and a relevant transitive runtime boundary. It is not a replacement for the full dependency license inventory. If adding a model, voice, face, font, runtime, or redistributed artifact, update the component review and retain its actual license/attribution. Unresolved components remain unavailable in the default profile.

## Stock browser human

Mira derives only from Mika Suominen's CC0 `mpfb.glb` example in TalkingHead at
`b3e277b3b46f88e557bf28a2c5612a5b04e075c3`. Its [asset-specific upstream terms](https://github.com/met4citizen/TalkingHead/blob/b3e277b3b46f88e557bf28a2c5612a5b04e075c3/README.md#credits),
[manifest/preparation](assets/stock/mira/README.md), and [CC0 notice](assets/stock/mira/LICENSE.txt)
cover the prepared mesh and its static portrait separately from application code.
Other demo avatars and animations from that project are not included.

The app's lazy renderer uses Three.js 0.180.0 (MIT, Three.js authors).
[Pinned source license](https://github.com/mrdoob/three.js/blob/r180/LICENSE).
The full installed notice is copied to `/fonts/licenses/Three.txt` during builds.
TalkingHead's speech implementation and its example cloud TTS are not bundled.
Offline asset preparation uses MIT glTF Transform and Sharp tooling in an isolated
directory; it is not part of the base application installation or live pipeline.

## Prepared photographic human

The selected fictional Mira source is a one-time built-in OpenAI image generation,
explicitly requested by the project owner. OpenAI's generator is proprietary and
its model version was not exposed by the tool. The source bytes, exact prompt,
open-model sibling and prepared output digests are recorded in the [asset manifest and provenance](assets/stock/photographic/README.md).
The prepared fictional outputs are offered under [CC0 to the extent of held rights](assets/stock/photographic/LICENSE.txt).
This dedication does not change model, code or service terms. The installed app
does not use an OpenAI API/key or download an OpenAI image model.

LivePortrait code and the selected human appearance/motion/warping/generator/
stitching/retargeting models carry the published MIT terms. Expression-offset
math in the offline preparation is adapted from its pinned `gradio_pipeline.py`;
retain the [upstream copyright/license](benchmarks/portrait/prepared/LivePortrait-LICENSE.txt).
Exact source/model revisions and component review are in [provenance.json](benchmarks/portrait/prepared/provenance.json).
InsightFace, landmark and animal models and upstream actor/driving media are
excluded. A repository-level license is not assumed to license excluded weights.

The retained open-model source uses the Apache-2.0 FLUX.2 Klein **4B** pipeline,
including its selected Qwen3 text encoder and VAE, through a pinned MLX 4-bit
conversion. The noncommercial 9B models are excluded. Source links, exact hashes
and the conversion-provenance boundary are in the [preparation manifest](benchmarks/portrait/prepared/models.json)
and review. Neither generation nor animation weights are redistributed here or
installed by the base app; all heavy preparation runs separately from live media.

## Historical scientist portrait

Einstein uses Ferdinand Schmutzer's 1921 photograph, preserved as original source
bytes and manually aligned before open LivePortrait preparation. [The source and
rights statement](https://commons.wikimedia.org/wiki/File:Albert_Einstein_1921_by_F_Schmutzer.jpg)
identifies it as public domain, including the country-of-origin and US unpublished-work
reasoning. The upstream digital version removes white specks. [Asset provenance](assets/stock/einstein/README.md),
[manifest](assets/stock/einstein/manifest.json), and [notice](assets/stock/einstein/LICENSE.txt)
retain the exact author, file version, source/hash, derivative scope and model revisions.
The prepared derivative waiver applies only to rights held by contributors; it
conveys no endorsement. The app labels the educational simulation as an AI portrayal
and uses independent Kokoro presets rather than an authentic or cloned Einstein voice.
