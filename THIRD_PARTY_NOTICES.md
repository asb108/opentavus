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
