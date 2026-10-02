# Photographic portrait preparation

T22 prepares a fictional photographic human after the user rejected the 3D
appearance. This is an explicit offline maintainer workflow. It is separate from
the base installation, live speech and the earlier MuseTalk experiment. A
prepared-frame preview is not unrestricted live video generation or validated
phoneme lip-sync.

The [artifact manifest](models.json) pins every downloaded component by revision,
size and SHA-256 (or Git blob SHA-1 for small tokenizer/index files). The
[provenance review](provenance.json) records published terms and component scope.
Generation uses the Apache-2.0 FLUX.2 Klein **4B** pipeline, including its Qwen3
text encoder and VAE, from a pinned MLX 4-bit conversion. The noncommercial 9B
models are excluded. This workflow produced the retained `source-open.png`.
The selected polished source was then created once with the built-in OpenAI
image tool at the owner's explicit request. Its model version was not exposed;
it is not an open-model creation. [Exact prompt and source provenance](../../../assets/stock/photographic/README.md)
remain separate from the open sibling and generation record.
Animation uses only LivePortrait's MIT human core and
stitching/retargeting models. No InsightFace, landmark detector, animal model,
real actor image or driving video is required or downloaded.

LivePortrait's expression offsets are adapted from its MIT `gradio_pipeline.py`.
Retain its [copyright and license](LivePortrait-LICENSE.txt). Model/engine terms
are independent of any rights in a generated output. These are the selected
upstream published terms; training data and conversion provenance were not
independently reconstructed.

## Reproduce on Apple Silicon

Allow at least 7 GB of free space for this isolated workflow, beyond the existing
app. Its explicit models total 5,142,020,356 bytes. Heavy preparation is done once;
it is not required on a computer playing the prepared avatar.

```sh
uv venv --python 3.12 .cache/face-env
uv pip install --python .cache/face-env/bin/python \
  -r benchmarks/portrait/prepared/requirements-macos.txt
.cache/face-env/bin/python benchmarks/portrait/prepared/download.py
git clone --filter=blob:none --no-checkout \
  https://github.com/KlingAIResearch/LivePortrait.git .cache/liveportrait-src
git -C .cache/liveportrait-src checkout --detach \
  9b294b3d0536135442ea73cb01e6cb3ca7029dd3
HF_HUB_OFFLINE=1 .cache/face-env/bin/python benchmarks/portrait/prepared/generate.py
PYTORCH_ENABLE_MPS_FALLBACK=1 .cache/face-env/bin/python \
  benchmarks/portrait/prepared/prepare.py \
  --source .cache/photographic-output/source.png --probe
```

Inspect the actual source and every expression sample. Then omit `--probe` to
prepare the bounded frame sheets. MPS can fall back to CPU for unsupported
operations. Record that fallback is enabled; without profiling, do not assert
which operations used CPU or call execution entirely GPU-native.
`--device cpu` selects offline CPU preparation explicitly. CPU runtime
performance still needs measurement; the full frozen generation environment is
Mac-specific, while browser playback installs none of these packages.

The source is manually aligned and square. Retargeting starts from declared
approximate eye/lip ratios; it does not load a face-analysis model to measure them.
Motion contains eight small head phases, four mouth levels and four blink keys
per expression. Expression styling uses a fixed allowlist. Mouth selection from
audio energy cannot distinguish phonemes, and natural interaction/prosody require
their own quality work. Check native-speed output for identity drift, eye/teeth
artifacts and visible transitions before making an asset eligible.

Generation and preparation write parameters, dependency versions, hashes,
resource/time measurements and local output under ignored `.cache/`. Never use a
private person's face or conversation as the published evidence. The repository
asset manifest must be updated deliberately only after visual/license review.

To prepare the exact selected source bytes rather than regenerate an open sibling:

```sh
PYTORCH_ENABLE_MPS_FALLBACK=1 .cache/face-env/bin/python \
  benchmarks/portrait/prepared/prepare.py \
  --source assets/stock/photographic/source-openai.png \
  --output .cache/photographic-output/openai-prepared
```

The [open generation result](open-generation-result.json) records 27.5 seconds
and 9.71 GB peak MLX allocation on the M3 Pro. [Selected preparation](preparation-result.json)
records 145 actual neural frames in 196.3 seconds with MPS/CPU fallback enabled.
Outputs are 512 pixels before being reduced to native 384-pixel prepared tiles.
Different runtime/numerical backends may change output bytes; compare appearance
and update hashes deliberately. The browser uses the committed assets and loads
none of these inference dependencies. See the [published playback evidence](../../../docs/releases/photographic-human-evidence.json).
