# Photographic Mira

A fictional adult face with prepared photographic facial/head motion. This
preview replaces the rejected 3D appearance goal while retaining the separately
labeled 3D/cartoon options. It is a finite motion set, not a live neural video
generator or a validated phoneme lip-sync model.

The user explicitly authorized creating needed assets and then suggested using
ChatGPT image generation. `source-openai.png` is the selected polished variant,
created with the built-in OpenAI image generator using `source-open.png` as its
fictional reference. The tool does not expose a selectable/verified "Image 2.5"
version. Its [exact prompt](openai-prompt.txt) is retained. This source creation
is an explicitly authorized exception to open-model-only asset generation, not
a claim that OpenAI's image model is open source. No OpenAI key, subscription or
API is used by the installed app or its live animation.

`source-open.png` and its [generation record](../../../benchmarks/portrait/prepared/open-generation-result.json)
retain a fully open-model alternative: pinned Apache-2.0 FLUX.2 Klein 4B through
MLX. Contributors can regenerate that source locally and prepare its own sheets
with the [documented isolated workflow](../../../benchmarks/portrait/prepared/README.md).
The selected OpenAI image itself cannot be regenerated with FLUX or claimed as
an exactly reproducible open-model output; its committed bytes are the source
for repeatable animation preparation.

LivePortrait's pinned MIT core animates the manually aligned source without
InsightFace or landmark weights. Preparation uses its appearance/motion/warping/
generator/stitching/retargeting models and declared approximate eye/lip ratios.
It prepares neutral, warm, attentive and thoughtful faces, subtle head phases,
mouth levels and blink keys. The browser draws the locally bundled WebP sheets
against played-audio energy and closes speech movement immediately on Stop.
These are presentation expressions, not inference about the user's emotions.

The asset [manifest](manifest.json) pins sources, hashes and preparation records.
Four 2304 × 2304 sheets contain 36 native 384 × 384 tiles each, with bounded
decoded memory of approximately 81 MiB. Static mode uses only the poster. Source
images and preparation models are not copied into browser public assets. Prepared
assets are distributed under [CC0](LICENSE.txt) to the extent of held rights;
the engine and app retain their own licenses.

Inspect changes at native playback speed. Mouth levels are approximate and cannot
distinguish consonants/vowels. Eye/teeth texture and subtle transition artifacts
can occur. Full natural interaction/prosody, exact lip timing, long-call resources
and weak-PC performance still require separate evidence. Do not relabel a static
camera pan, 3D face or mocked speech check as photographic human-video proof.
