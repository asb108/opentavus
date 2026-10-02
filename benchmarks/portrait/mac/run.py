"""Bounded native compute/clip experiment; never a live-avatar support claim."""

import argparse
import hashlib
import json
import resource
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", type=Path, required=True)
    parser.add_argument("--portrait", type=Path, required=True)
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--crop", type=int, nargs=4, required=True)
    parser.add_argument("--frames", type=int, default=32)
    args = parser.parse_args()
    if not 2 <= args.frames <= 200:
        parser.error("Choose between 2 and 200 frames")
    if not shutil.which("ffmpeg"):
        parser.error("Install ffmpeg before running the clip experiment")
    manifest = json.loads(Path(__file__).with_name("models.json").read_text())
    for artifact in manifest["files"]:
        with (args.models / artifact["name"]).open("rb") as stream:
            actual = hashlib.file_digest(stream, "sha256").hexdigest()
        if actual != artifact["sha256"]:
            raise ValueError(f"Pinned model hash mismatch: {artifact['name']}")

    # Optional model libraries belong only to this explicit, isolated experiment.
    import cv2
    import mlx.core as mx
    import numpy as np
    from musetalk_mlx.pipeline_mlx import MuseTalkPipeline

    image = cv2.imread(str(args.portrait))
    if image is None:
        raise ValueError("Portrait could not be decoded")
    height, width = image.shape[:2]
    x1, y1, x2, y2 = args.crop
    if not (0 <= x1 < x2 <= width and 0 <= y1 < y2 <= height):
        raise ValueError("Crop must lie inside the portrait")
    args.output.mkdir(parents=True, exist_ok=True)
    result: dict[str, Any] = {
        "schema_version": 1,
        "measurement": "Native compute timing; browser playout and cancellation unverified",
        "targets": {
            "prepared_first_playable_ms": 2000,
            "fps": 25,
            "lip_sync_ms": 80,
            "stop_ms": 200,
        },
        "device": mx.metal.device_info(),
        "mlx": mx.__version__,
        "source_revision": manifest["source_revision"],
        "model_revision": manifest["revision"],
        "frames": args.frames,
        "frame_rate": 25,
        "batch_size": 8,
    }

    def record(key: str, value: Any) -> None:
        result[key] = value
        (args.output / "metrics.json").write_text(json.dumps(result, indent=2) + "\n")
        print(key, value, flush=True)

    mx.set_default_device(mx.gpu)
    start = time.perf_counter()
    pipe = MuseTalkPipeline.from_pretrained_mlx(args.models)
    record("load_seconds", time.perf_counter() - start)
    crop = cv2.resize(image[y1:y2, x1:x2], (256, 256), interpolation=cv2.INTER_LANCZOS4)
    start = time.perf_counter()
    latent = pipe.get_latents_for_unet(crop)
    mx.eval(latent)
    record("asset_prepare_seconds", time.perf_counter() - start)
    start = time.perf_counter()
    chunks = pipe.encode_audio_from_wav(args.audio, fps=25)
    mx.eval(chunks)
    record("audio_feature_seconds", time.perf_counter() - start)
    record("available_audio_frames", int(chunks.shape[0]))
    if args.frames > chunks.shape[0]:
        raise ValueError("Audio is shorter than the requested frame count")
    start = time.perf_counter()
    pipe.generate_faces(latent.astype(mx.float16), chunks[:1].astype(mx.float16))
    record("cold_first_frame_ms", (time.perf_counter() - start) * 1000)
    start = time.perf_counter()
    pipe.generate_faces(latent.astype(mx.float16), chunks[1:2].astype(mx.float16))
    record("warm_first_frame_ms", (time.perf_counter() - start) * 1000)
    stack = mx.concatenate([latent] * args.frames, axis=0).astype(mx.float16)
    start = time.perf_counter()
    faces = pipe.run_batched(stack, chunks[: args.frames].astype(mx.float16), batch_size=8)
    elapsed = time.perf_counter() - start
    record("batch_generation_seconds", elapsed)
    record("generation_fps", len(faces) / elapsed)
    record("mlx_peak_bytes", mx.get_peak_memory())
    record("process_peak_rss_bytes", resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    record("cadence_gate_pass", result["generation_fps"] >= 25)
    record("live_avatar_gates_pass", False)  # No browser timing, lip-sync or stop measurement.

    silent = args.output / "silent.mp4"
    writer = cv2.VideoWriter(str(silent), cv2.VideoWriter_fourcc(*"mp4v"), 25, (width, height))
    if not writer.isOpened():
        raise ValueError("Video encoder could not open the output")
    # This simple lower-face feather is a spike, not a validated portrait compositor.
    mask = np.zeros((256, 256), np.float32)
    mask[135:245, 20:236] = 1
    mask = cv2.GaussianBlur(mask, (51, 51), 12)
    mask = cv2.resize(mask, (x2 - x1, y2 - y1))[..., None]
    try:
        for i, face in enumerate(faces):
            frame = image.copy()
            generated = cv2.resize(face, (x2 - x1, y2 - y1))
            original = frame[y1:y2, x1:x2].astype(np.float32)
            frame[y1:y2, x1:x2] = (generated * mask + original * (1 - mask)).astype(np.uint8)
            writer.write(frame)
            if i in (0, len(faces) // 2, len(faces) - 1):
                cv2.imwrite(str(args.output / f"frame-{i:03d}.png"), frame)
    finally:
        writer.release()
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(silent),
            "-i",
            str(args.audio),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            str(args.output / "portrait-research.mp4"),
        ],
        check=True,
    )
    record("output_complete", True)


if __name__ == "__main__":
    main()
