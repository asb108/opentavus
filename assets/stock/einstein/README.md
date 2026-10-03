# Albert Einstein photographic AI portrayal

The stock scientist uses Ferdinand Schmutzer's **1921 photograph** of Albert
Einstein. Its monochrome appearance comes from the historical photograph.
The on-screen character is labeled **AI portrayal · Synthetic voice**. It uses an
independent Kokoro preset, not a recording or a clone of Einstein's voice.
Generated facial expressions and replies are educational simulation, not
historical evidence, quotations or endorsement.

## Source and rights

[Wikimedia Commons source and rights statement](https://commons.wikimedia.org/wiki/File:Albert_Einstein_1921_by_F_Schmutzer.jpg)
identifies the work as public domain in its country of origin and the United
States. The author lived from 1870 to 1928. The page explains the unpublished-work
history; do not replace that explanation with an assumption about publication in
1921. The selected digital version dates to July 6, 2014 and includes upstream
removal of white specks. `source-original.jpg` preserves its exact bytes.

[The manifest](manifest.json) records URLs, source/derivative SHA-256 hashes,
crop coordinates, manual eye/lip ratios, per-face compositing regions, code/model
revisions and the preparation record. [The notice](LICENSE.txt) distinguishes
the public-domain original, CC0 derivative waiver to the extent of rights held,
MIT animation components and the Apache-2.0 application. No source-generation
service, face detector, actor driving clip, InsightFace or voice cloning is used.

## Reproduce the prepared motion

Use the isolated [offline preparation environment](../../../benchmarks/portrait/prepared/README.md).
Its explicit downloader supplies the pinned animation core; generating a new
source image is unnecessary. Inference never runs in the browser call:

```sh
PYTORCH_ENABLE_MPS_FALLBACK=1 .cache/face-env/bin/python \
  benchmarks/portrait/prepared/prepare.py \
  --source assets/stock/einstein/source-original.jpg \
  --crop 790 250 1220 --source-lip 0.015 --source-eye 0.3 \
  --output .cache/einstein-output/motion
```

Run `--probe` first when changing alignment. `--crop` validates a square inside
the original image; ratios must be finite and between zero and one. The script
retains `source-aligned.png` and records all parameters. Backend versions may
produce different bytes; inspect the face, mouth, eyelids and native-speed output
before updating the manifest. Never copy unreviewed outputs into a release.

Four expression sheets contain four gentle head poses × eight broad speech
shapes, followed by four ordered blink keys. Each tile is native 512 × 512.
The existing audio Worklet supplies phoneme timing; the renderer uses Einstein's
own mouth/eye masks. Only the selected character's four sheets are decoded.
Mira remains available with her independent source and geometry.

## Contribute another scientist

Choose a rights-reviewed historical or consented source, retain its author and
exact bytes, and prepare an alignment/probe. Review the derivative assets and
their hashes. Register the trusted bank in
`apps/web/src/features/avatar/photographic-asset.ts`, add the explicit settings
choice in the API and runtime catalog, and regenerate contracts. Add its UI
name, accurate portrayal/voice disclosure, failure poster and bounded identity
prompt. Reuse the shared renderer and audio queue.

Run contributor checks plus a real browser check of native speech, blink order,
Stop and damaged-asset recovery. This curated example is not an arbitrary photo
upload/import feature. Perceptual phoneme accuracy, natural emotional behavior,
Windows/weak-PC and long-call proof remain separate quality tasks.
