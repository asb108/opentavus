# Mira stock human

Mira is a fictional 3D character, adapted from the CC0 `mpfb.glb` example by
Mika Suominen (`met4citizen`). It is not a captured person, cloned face, or generated
video. The original was made with Blender and the open-source MPFB extension.

The [manifest](manifest.json) pins the upstream commit, exact source/prepared
SHA-256, sizes, eligibility and preparation versions. The asset-specific CC0
statement is in the [pinned upstream credits](https://github.com/met4citizen/TalkingHead/blob/b3e277b3b46f88e557bf28a2c5612a5b04e075c3/README.md#credits).
Other TalkingHead demo assets have different, sometimes noncommercial terms. This
review covers only `mpfb.glb` and this derivative.

The prepared file keeps the original geometry, skin, clothing and skeleton,
retains jaw/blink shapes, removes unused shape buffers, deduplicates data, and
converts textures to WebP at at most 1024 pixels. It is 4,692,576 bytes versus
36,815,920 bytes upstream. The preview has audio-energy mouth movement, without
phoneme-level timing. Custom GLB/VRM import is not implemented.

`mira.png` is a normal browser capture of this same mesh for loading/static
portrait fallback. The prepared GLB and portrait are distributed under CC0-1.0;
OpenTavus code remains Apache-2.0. See [license notice](LICENSE.txt).

## Reproduce the prepared asset

This is an offline maintainer operation, separate from `make setup` and runtime.
Use Node.js 22+ and an isolated temporary directory. It downloads only the pinned
reviewed stock mesh, not inference weights. From the repository root:

```sh
mkdir -p .cache/avatar-prep
curl --fail --location \
  https://raw.githubusercontent.com/met4citizen/TalkingHead/b3e277b3b46f88e557bf28a2c5612a5b04e075c3/avatars/mpfb.glb \
  --output .cache/avatar-prep/source.glb
npm install --prefix .cache/avatar-prep --save-exact \
  @gltf-transform/core@4.2.1 @gltf-transform/functions@4.2.1 \
  @gltf-transform/extensions@4.2.1 sharp@0.34.3
cp assets/stock/tools/prepare.mjs .cache/avatar-prep/prepare.mjs
node .cache/avatar-prep/prepare.mjs \
  .cache/avatar-prep/source.glb .cache/avatar-prep/reproduced.glb
```

The script refuses a source digest mismatch and prints the result's size/digest.
Compare it with the manifest. Codec/transitive package versions can affect binary
encoding; a changed result needs review rather than an automatic manifest update.
The app build checks the committed asset hash and copies it into local public
assets. Browser preparation verifies it again and rejects remote dependencies.
The browser avatar check can capture a poster with `--capture-poster`; review that
image and update its manifest hash before committing it.
