"""Explicit research download; never called by setup, doctor or a default profile."""

import argparse
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    manifest = json.loads(Path(__file__).with_name("models.json").read_text())
    args.directory.mkdir(parents=True, exist_ok=True)
    missing = []
    for artifact in manifest["files"]:
        path = args.directory / artifact["name"]
        if path.exists():
            with path.open("rb") as stream:
                actual = hashlib.file_digest(stream, "sha256").hexdigest()
            if actual == artifact["sha256"]:
                print("Verified existing", artifact["name"], flush=True)
                continue
            raise ValueError(
                f"Existing {artifact['name']} has a different hash; choose a fresh directory"
            )
        missing.append(artifact)
    if shutil.disk_usage(args.directory).free < sum(a["size"] for a in missing) + 650_000_000:
        raise ValueError("Insufficient storage: keep 650 MB free after the model download")
    for artifact in missing:
        destination = args.directory / artifact["name"]
        partial = destination.with_suffix(destination.suffix + ".partial")
        url = (
            f"https://huggingface.co/{manifest['repository']}/resolve/"
            f"{manifest['revision']}/{artifact['name']}"
        )
        digest = hashlib.sha256()
        size = 0
        print("Downloading", artifact["name"], artifact["size"], flush=True)
        try:
            with urllib.request.urlopen(url, timeout=180) as response, partial.open("wb") as output:
                while block := response.read(1024 * 1024):
                    size += len(block)
                    if size > artifact["size"]:
                        raise ValueError("Download exceeded the pinned artifact size")
                    digest.update(block)
                    output.write(block)
            if size != artifact["size"] or digest.hexdigest() != artifact["sha256"]:
                raise ValueError("Downloaded artifact failed size/hash verification")
            partial.rename(destination)
            print("Verified", artifact["name"], flush=True)
        except BaseException:
            partial.unlink(missing_ok=True)
            raise


if __name__ == "__main__":
    main()
