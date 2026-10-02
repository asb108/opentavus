"""Explicit, pinned downloads for the isolated photographic portrait experiment."""

import argparse
import concurrent.futures
import hashlib
import json
import shutil
import time
import urllib.request
from pathlib import Path


def verified(path: Path, item: dict) -> bool:
    if not path.exists() or path.stat().st_size != item["bytes"]:
        return False
    algorithm = "sha256" if "sha256" in item else "sha1"
    digest = hashlib.new(algorithm)
    if algorithm == "sha1":
        digest.update(f"blob {item['bytes']}\0".encode())
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest() == item.get("sha256", item.get("git_blob_sha1"))


def download(root: Path, source: dict, item: dict) -> None:
    destination = root / source["id"].split("/")[-1] / item["path"]
    if verified(destination, item):
        print(f"Verified {item['path']}", flush=True)
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + ".part")
    url = f"https://huggingface.co/{source['id']}/resolve/{source['revision']}/{item['path']}"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=120) as response, partial.open("wb") as out:
                shutil.copyfileobj(response, out, length=1024 * 1024)
            if not verified(partial, item):
                raise ValueError("Downloaded artifact does not match the pinned hash/size")
            partial.replace(destination)
            print(f"Downloaded and verified {item['path']} ({item['bytes']} bytes)", flush=True)
            return
        except Exception as error:
            partial.unlink(missing_ok=True)
            print(f"Retry {attempt + 1} for {item['path']}: {type(error).__name__}", flush=True)
            if attempt == 2:
                raise RuntimeError(f"Could not verify {item['path']}") from None
            time.sleep(2 * (attempt + 1))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path, default=Path(".cache/photographic-models"))
    args = parser.parse_args()
    manifest = json.loads(Path(__file__).with_name("models.json").read_text())
    args.destination.mkdir(parents=True, exist_ok=True)
    entries = [(s, f) for s in manifest["sources"] for f in s["files"]]
    missing = sum(
        f["bytes"]
        for s, f in entries
        if not verified(args.destination / s["id"].split("/")[-1] / f["path"], f)
    )
    if shutil.disk_usage(args.destination).free < missing + 512 * 1024 * 1024:
        raise SystemExit("Not enough free space for the explicit download and a 512 MiB reserve")
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(download, args.destination, s, f) for s, f in entries]
        for future in concurrent.futures.as_completed(futures):
            future.result()


if __name__ == "__main__":
    main()
