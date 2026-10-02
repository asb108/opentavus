"""Prepare photographic facial motion offline, without face-detection weights.

Uses only a manually aligned, fictional source and LivePortrait's pinned core.
Expression offsets follow its MIT gradio_pipeline.py controls. These finite states
are an appearance preview, not an audio-to-phoneme model or inferred user emotion.
"""

import argparse
import hashlib
import json
import math
import subprocess
import sys
import time
from importlib.metadata import version
from pathlib import Path

from download import verified

LIVEPORTRAIT_REVISION = "9b294b3d0536135442ea73cb01e6cb3ca7029dd3"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--upstream", type=Path, default=Path(".cache/liveportrait-src"))
    parser.add_argument("--models", type=Path, default=Path(".cache/photographic-models"))
    parser.add_argument("--output", type=Path, default=Path(".cache/photographic-output/motion"))
    parser.add_argument("--device", choices=["cpu", "mps"], default="mps")
    parser.add_argument("--probe", action="store_true", help="Render only expression samples first")
    args = parser.parse_args()
    revision = subprocess.check_output(
        ["git", "-C", str(args.upstream), "rev-parse", "HEAD"], text=True
    ).strip()
    if revision != LIVEPORTRAIT_REVISION:
        raise SystemExit("The animation source does not match its reviewed revision")
    source_manifest = json.loads(Path(__file__).with_name("models.json").read_text())["sources"][1]
    models = args.models / "LivePortrait"
    if not all(verified(models / item["path"], item) for item in source_manifest["files"]):
        raise SystemExit("Animation weights are missing or invalid; run the explicit downloader")

    import numpy as np
    import torch
    from PIL import Image

    sys.path.insert(0, str(args.upstream.resolve()))
    from src.config.inference_config import InferenceConfig
    from src.live_portrait_wrapper import LivePortraitWrapper
    from src.utils.camera import get_rotation_matrix

    torch.set_num_threads(6)
    torch.set_num_interop_threads(2)
    if args.device == "mps" and not torch.backends.mps.is_available():
        raise SystemExit("MPS is unavailable. Select --device cpu for offline preparation")
    started = time.perf_counter()
    checkpoints = models / "liveportrait"
    config = InferenceConfig(
        checkpoint_F=str(checkpoints / "base_models/appearance_feature_extractor.pth"),
        checkpoint_M=str(checkpoints / "base_models/motion_extractor.pth"),
        checkpoint_W=str(checkpoints / "base_models/warping_module.pth"),
        checkpoint_G=str(checkpoints / "base_models/spade_generator.pth"),
        checkpoint_S=str(checkpoints / "retargeting_models/stitching_retargeting_module.pth"),
        flag_force_cpu=args.device == "cpu",
        flag_use_half_precision=False,
        flag_do_crop=False,
        flag_pasteback=False,
        flag_do_torch_compile=False,
    )
    wrapper = LivePortraitWrapper(config)
    source_image = Image.open(args.source).convert("RGB")
    if source_image.width != source_image.height:
        raise SystemExit("Provide a square, manually aligned fictional portrait")
    source = wrapper.prepare_source(np.asarray(source_image))
    info = wrapper.get_kp_info(source)
    feature = wrapper.extract_feature_3d(source)
    source_keypoints = wrapper.transform_keypoint(info)
    device = wrapper.device
    args.output.mkdir(parents=True, exist_ok=True)
    times = []

    def render(expression: str, phase: float, mouth: float, blink: float = 0) -> Image.Image:
        frame_start = time.perf_counter()
        delta = info["exp"].clone()
        # Controlled expression styling; no classification of a user's face/voice.
        smile = 1.2 if expression == "warm" else 0.02
        for index, axis, coefficient in [
            (20, 1, -0.01),
            (14, 1, -0.02),
            (17, 1, 0.0065),
            (17, 2, 0.003),
            (13, 1, -0.00275),
            (16, 1, -0.00275),
            (3, 1, -0.0035),
            (7, 1, -0.0035),
        ]:
            delta[0, index, axis] += smile * coefficient
        eyebrow = -7.0 if expression == "thoughtful" else 3.0 if expression == "attentive" else 0
        if eyebrow > 0:
            delta[0, 1, 1] += eyebrow * 0.001
            delta[0, 2, 1] -= eyebrow * 0.001
        else:
            delta[0, 1, 0] -= eyebrow * 0.001
            delta[0, 2, 0] += eyebrow * 0.001
            delta[0, 1, 1] += eyebrow * 0.0003
            delta[0, 2, 1] -= eyebrow * 0.0003
        rotation = get_rotation_matrix(
            info["pitch"] + math.sin(phase) * 1.0,
            info["yaw"] + math.sin(phase) * 1.5,
            info["roll"] + math.sin(phase + 0.5) * 0.4,
        )
        driving = info["scale"][..., None] * (info["kp"] @ rotation + delta)
        driving[:, :, :2] += info["t"][:, None, :2]
        # Source ratios are declared manual approximations for this closed-lip image.
        if mouth > 0:
            ratio = torch.tensor([[0.015, mouth]], dtype=torch.float32, device=device)
            driving += wrapper.retarget_lip(source_keypoints, ratio)
        if blink > 0:
            ratio = torch.tensor(
                [[0.3, 0.3, 0.3 * (1 - blink)]], dtype=torch.float32, device=device
            )
            driving += wrapper.retarget_eye(source_keypoints, ratio)
        driving = wrapper.stitching(source_keypoints, driving)
        pixels = wrapper.parse_output(
            wrapper.warp_decode(feature, source_keypoints, driving)["out"]
        )[0]
        times.append(time.perf_counter() - frame_start)
        return Image.fromarray(pixels)

    expressions = ["neutral", "warm", "attentive", "thoughtful"]
    if args.probe:
        for expression in expressions:
            render(expression, 0, 0).save(args.output / f"{expression}.png")
            print(f"Rendered {expression} in {times[-1]:.2f}s", flush=True)
        render("neutral", 0, 0.16).save(args.output / "mouth.png")
        render("neutral", 0, 0, 1).save(args.output / "blink.png")
    else:
        # 8 subtle head phases × 4 mouth levels, plus blink keys. Bounded 36-tile sheets.
        levels = [0, 0.07, 0.12, 0.18]
        for expression in expressions:
            sheet = Image.new("RGB", (384 * 6, 384 * 6))
            for index in range(36):
                pose = index // 4 if index < 32 else 0
                mouth = levels[index % 4] if index < 32 else 0
                blink = 0 if index < 32 else [0.3, 0.7, 1, 0.7][index - 32]
                image = render(expression, pose / 8 * math.tau, mouth, blink)
                image = image.resize((384, 384), Image.Resampling.LANCZOS)
                sheet.paste(image, ((index % 6) * 384, (index // 6) * 384))
                if index % 8 == 0:
                    print(
                        f"{expression}: {index + 1}/36; {times[-1]:.2f}s per prepared frame",
                        flush=True,
                    )
            sheet.save(args.output / f"{expression}.webp", quality=88, method=6)
        render("neutral", 0, 0).resize((384, 384), Image.Resampling.LANCZOS).save(
            args.output / "poster.webp", quality=92, method=6
        )
    summary = {
        "source_sha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
        "source_revision": revision,
        "model_revision": source_manifest["revision"],
        "device": device,
        "mps_cpu_fallback_enabled": __import__("os").environ.get("PYTORCH_ENABLE_MPS_FALLBACK")
        == "1",
        "frames": len(times),
        "frame_seconds": times,
        "total_seconds": time.perf_counter() - started,
        "probe": args.probe,
        "output_size": 512,
        "prepared_tile_size": 384,
        "manual_source_ratios": {"lip": 0.015, "eye": 0.3},
        "insightface_loaded": any("insightface" in module for module in sys.modules),
        "dependencies": {
            name: version(name)
            for name in ["torch", "numpy", "opencv-python", "scipy", "PyYAML", "rich", "pillow"]
        },
        "limitations": [
            "finite controlled expressions",
            "approximate mouth levels, not phoneme timing",
            "manually aligned single fictional portrait",
            "prepared assets only; no live video generator",
        ],
    }
    (args.output / "preparation.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({k: v for k, v in summary.items() if k != "frame_seconds"}, indent=2))


if __name__ == "__main__":
    main()
