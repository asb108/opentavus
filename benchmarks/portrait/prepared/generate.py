"""Generate a fictional portrait locally using the pinned Apache-2.0 4B model."""

import argparse
import hashlib
import json
import platform
import time
from importlib.metadata import version
from pathlib import Path

from download import verified


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", type=Path, default=Path(".cache/photographic-models"))
    parser.add_argument(
        "--output", type=Path, default=Path(".cache/photographic-output/source.png")
    )
    parser.add_argument("--seed", type=int, default=7206)
    parser.add_argument("--size", type=int, choices=[512, 768], default=768)
    args = parser.parse_args()
    manifest = json.loads(Path(__file__).with_name("models.json").read_text())
    source = manifest["sources"][0]
    model_path = args.models / source["id"].split("/")[-1]
    if not all(verified(model_path / item["path"], item) for item in source["files"]):
        raise SystemExit(
            "Run the explicit downloader first; required artifacts are missing or invalid"
        )
    # Heavy imports belong to this explicitly invoked, isolated experiment only.
    import mlx.core as mx
    from mflux.models.flux2.variants import Flux2Klein

    mx.set_cache_limit(1024 * 1024 * 1024)
    mx.reset_peak_memory()
    started = time.perf_counter()
    model = Flux2Klein(model_path=str(model_path.resolve()))
    loaded = time.perf_counter()
    prompt = Path(__file__).with_name("prompt.txt").read_text().strip()
    image = model.generate_image(
        seed=args.seed,
        prompt=prompt,
        num_inference_steps=4,
        height=args.size,
        width=args.size,
        guidance=1.0,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(path=str(args.output), export_json_metadata=True)
    result = {
        "model": source["id"],
        "revision": source["revision"],
        "model_license": "Apache-2.0",
        "seed": args.seed,
        "steps": 4,
        "guidance": 1.0,
        "width": args.size,
        "height": args.size,
        "prompt": prompt,
        "source_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
        "source_bytes": args.output.stat().st_size,
        "load_seconds": loaded - started,
        "total_seconds": time.perf_counter() - started,
        "mlx_peak_bytes": mx.get_peak_memory(),
        "platform": platform.platform(),
        "dependencies": {x: version(x) for x in ["mflux", "mlx", "transformers", "numpy"]},
        "identity": "fictional adult; no photograph or driving video of a real person",
    }
    args.output.with_suffix(".generation.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k != "prompt"}, indent=2))


if __name__ == "__main__":
    main()
