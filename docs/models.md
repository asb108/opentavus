# Local alpha models and runtime

The default product makes no proprietary inference request. Installation downloads explicit reviewed artifacts; after setup, inference uses local Ollama and CPU speech adapters. This is an artifact-level review, not a claim that upstream training datasets are completely public. Downloaded files are ignored by Git and verified against [downloads.json](../packages/runtime/src/opentavus_runtime/downloads.json).

| Component | Source / exact selection | Terms and alpha behavior |
| --- | --- | --- |
| Language | [Qwen2.5](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct), Ollama `qwen2.5:0.5b`, `:1.5b`, `:7b` | These selected sizes use Apache-2.0 weights. Exact Ollama manifest digests are committed. 1.5B is the default; 0.5B is a weaker small alternative. 7B has not been live-benchmarked here. Other Qwen sizes have different terms and are not implicitly approved. |
| Recognition | [SYSTRAN faster-whisper-tiny](https://huggingface.co/Systran/faster-whisper-tiny), revision `d90ca5fe260221311c53c58e660288d3deb8d356` | MIT converted Whisper weights/tokenizer. CPU int8, English, beam size 1, local files only. Segment length capped at 30 seconds. |
| Speech | [Kokoro 82M](https://huggingface.co/hexgrad/Kokoro-82M), [ONNX model files](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1) | Apache-2.0 weights, exact ONNX/voice-file digests. Bounded phrase synthesis followed by 80 ms PCM packets; this is chunk-adapted synthesis, not native token streaming. |
| Voices | [Kokoro voice notes](https://huggingface.co/hexgrad/Kokoro-82M/blob/f3ff3571791e39611d31c381e3a41a3af07b4987/VOICES.md): `af_heart`, `af_bella`, `am_michael`, `bf_emma` | Curated English presets under the reviewed model terms. Other bundled voice/language provenance can carry additional restrictions/attribution and is not enabled. No voice cloning in this alpha. |
| Voice activity | [Silero VAD](https://github.com/snakers4/silero-vad), supplied by Pipecat's pinned runtime | MIT ONNX VAD. Speech end currently uses silence/segmentation. Smart Turn is not integrated yet. |
| Character | Curated photographic Einstein/Mira; original Orbit/Lumen and optional stock 3D alternatives | Source/preparation rights are separate from model terms; see [Einstein](../assets/stock/einstein/README.md) and [Mira](../assets/stock/photographic/README.md). Photographic mouth cues use Kokoro durations on the played-audio clock. Perceptual precision/full naturalness, custom import and live neural-video claims remain open. |

## Exact language manifests

| Ollama tag | Manifest SHA-256 | Approximate download |
| --- | --- | --- |
| `qwen2.5:0.5b` | `a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67` | 398 MB |
| `qwen2.5:1.5b` | `65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b` | 986 MB |
| `qwen2.5:7b` | `845dbda0ea48ed749caafd9e6037047aa19acfcfd82e704d7ca97d631a0b697e` | 4.68 GB |

Ollama manifest digests identify the complete selected tag's manifest, not a direct hash of the GGUF alone. Setup and readiness compare the local tag digest. An upstream tag change requires a new component review and committed metadata; it is not accepted silently.

## Pinned inference libraries

`uv.lock` pins Pipecat 1.12.0, faster-whisper 1.2.1, kokoro-onnx 0.6.1, and their resolved dependencies. The model group is explicit. Pipecat's WebRTC/VAD/STT segmentation is reused; core contracts never import it. An OpenAI client package appears as a Pipecat dependency, but this application calls local Ollama's native API and requires no OpenAI key.

The lightweight core/development install and tests exclude the model group. All libraries retain their own terms; the optional TTS path includes the eSpeak NG phonemizer runtime under GPL terms. See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Do not label the entire transitive dependency set as Apache-2.0 or permissive merely because the model artifacts are.

## Support and eligibility

Only curated installed models are selectable. The API rejects arbitrary model names, unreviewed digest changes, remote endpoints, and unsupported voices before preparing a call. Manifests separate code and weight artifacts from capabilities and validate execution/configuration. Runtime failures produce sanitized messages; raw provider output is not a default diagnostic.

New STT/LLM/TTS/voice/avatar models can be contributed through [the plugin contract](plugin-contract.md). Include exact terms and artifact digests, deterministic behavior, and real hardware results before advertising speed or language support. LAM and GPU portrait paths remain separately reviewed future plugins.

## Planned compatible and hosted LLM choices

The [first-product plan](product-plan.md) adds user-selected compatible/self-hosted
endpoints and hosted gateways such as OpenRouter under T28. Conversation-only
routes remain useful; teaching needs its own tested capability. The table above is the
current local artifact set, not a claim that those routes already work. Preserve
the reviewed open-model reference profile; optional external models/services keep
their own terms, routing, charges and provider-declared identity. Their credentials
stay on the server. See [the provider contract](provider-contract.md) for capabilities,
configuration, failure behavior and separate live evidence. OpenCode is a later
agent/server bridge, not another weight artifact in this matrix.
