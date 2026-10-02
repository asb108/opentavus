# Apple Silicon portrait experiment

T20 tests a native MLX port of MuseTalk 1.5 separately from the application. The
M3 Pro/18 GB/macOS 14.5 reference run generated 32 actual frames in 6.009 seconds:
**5.326 FPS**, below the fixed **25 FPS** target. The completed run's warm single
frame took 267 ms; that is compute time, not first playable browser video.
Peak MLX allocation was 5.766 GB. [Exact results](../../../docs/releases/mac-portrait-experiment.json)
retain preparation costs, the incomplete first trial, package versions and unmet gates.

This path is an experiment. It is absent from base installation, model downloads,
plugin discovery and the avatar picker. Numerical lip-sync, browser interruption,
long-call drift and multiple-face quality have not passed. The simple feathered
256-pixel crop is visibly softer than the source portrait. A fast generated frame
does not establish a responsive live avatar.

## Reproduce with your own eligible portrait

Use Apple Silicon, Python 3.12 and ffmpeg. Allow about 3 GB of additional storage
for the isolated dependencies, 1.884 GB of weights, and small output files. These
commands do not change the app's environment:

```sh
uv venv .cache/portrait-env --python 3.12
uv pip install --python .cache/portrait-env/bin/python -r benchmarks/portrait/mac/requirements.txt
python3 benchmarks/portrait/mac/download.py .cache/portrait-model
.cache/portrait-env/bin/python benchmarks/portrait/mac/run.py \
  --models .cache/portrait-model --portrait /absolute/path/eligible-portrait.png \
  --crop 230 300 800 910 --audio tests/fixtures/speech/photosynthesis-intro.wav \
  --output .cache/portrait-output
```

Adjust the crop coordinates to your own image: left, top, right, bottom, including
the forehead, eyes and chin. Asset detection/preparation is manual in this spike.
`run.py` writes metrics progressively, three sampled frames, and a 25 FPS MP4 with
the first 32 frames and matching audio. Encoding at 25 FPS does not mean inference
achieved 25 FPS. Keep personal portraits and their outputs outside Git.

## Artifact terms and provenance

The [published conversion](https://huggingface.co/mlx-community/MuseTalk-1.5-fp16/tree/ad54104a0129121fe2ea67471250c0656c985284)
declares MIT and contains MuseTalk UNet, SD VAE and Whisper encoder weights. Every
file is pinned by revision, size and SHA-256 in `models.json` and checked by the
explicit downloader. The [port's metadata](https://github.com/xocialize/musetalk-mlx/blob/c6eb30ebd1ed4d043983209813370153de9346bf/pyproject.toml)
declares MIT; this revision has no standalone license notice. The conversion does
not identify the exact original checkpoint revision of every component. Default
profile eligibility therefore stays unresolved rather than inheriting a blanket
permissive label. No third-party source or weights are vendored here.

The local trial used an upstream demonstration portrait. [MuseTalk's repository](https://github.com/TMElyralab/MuseTalk/tree/0a89dec45a0192b824e3cf4daf96c239440c5ed8)
limits its example data to noncommercial research; that face and its generated
clip are excluded from this repository and release defaults. The reproduction
command uses a portrait with independent rights. The committed audio is synthetic
Kokoro speech with documented provenance, not a recording of a person.

The next live-avatar work belongs to T10: a faster measured backend, complete
component/asset review, and shared audio-clock/cancellation integration. This
experiment does not weaken the release's timing or visual gates.
