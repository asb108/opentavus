"""Source-checkout CLI: setup, doctor and loopback server."""

import argparse
import asyncio
import importlib.util
import shutil
from pathlib import Path

import httpx
from opentavus_runtime.installation import (
    CATALOG,
    LLM_NAMES,
    OLLAMA_URL,
    Installation,
    digest,
    model_digest,
)

ROOT = Path(__file__).resolve().parents[4]


async def download_models(directory: Path, model: str, *, skip_llm: bool = False) -> None:
    await asyncio.to_thread(directory.mkdir, parents=True, exist_ok=True)
    pending = [
        a
        for a in CATALOG["artifacts"]
        if not (directory / a["path"]).is_file() or digest(directory / a["path"]) != a["sha256"]
    ]
    needed = sum(a["size"] for a in pending) + 350 * 1024 * 1024
    if shutil.disk_usage(directory).free < needed:
        raise RuntimeError(
            "Insufficient storage for verified speech models and 350 MB of working space."
        )
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(60, connect=15), follow_redirects=True, trust_env=False
    ) as client:
        for artifact in pending:
            destination = directory / artifact["path"]
            destination.parent.mkdir(parents=True, exist_ok=True)
            partial = destination.with_suffix(destination.suffix + ".part")
            print(
                f"Downloading {artifact['path']} "
                f"({artifact['size'] / 1_000_000:.1f} MB; {artifact['license']})",
                flush=True,
            )
            try:
                async with client.stream("GET", artifact["url"]) as response:
                    response.raise_for_status()
                    with partial.open("wb") as output:
                        async for block in response.aiter_bytes():
                            output.write(block)
                if (
                    partial.stat().st_size != artifact["size"]
                    or digest(partial) != artifact["sha256"]
                ):
                    raise RuntimeError("Downloaded artifact failed its pinned digest check.")
                partial.replace(destination)
            finally:
                partial.unlink(missing_ok=True)
        if not skip_llm:
            selected = next(m for m in CATALOG["llms"] if m["name"] == model)
            tags = (await client.get(OLLAMA_URL + "/api/tags")).json().get("models", [])
            if not any(
                m.get("name") == model
                and model_digest(str(m.get("digest", ""))) == model_digest(selected["digest"])
                for m in tags
            ):
                if shutil.disk_usage(directory).free < selected["size"] + 350 * 1024 * 1024:
                    raise RuntimeError(
                        "Not enough storage for that LLM. Retry setup --model qwen2.5:0.5b."
                    )
                print(
                    f"Pulling {model} from the local Ollama server "
                    f"({selected['size'] / 1_000_000:.0f} MB)",
                    flush=True,
                )
                async with client.stream(
                    "POST", OLLAMA_URL + "/api/pull", json={"name": model}, timeout=1800
                ) as response:
                    response.raise_for_status()
                    async for _line in response.aiter_lines():
                        pass
            tags = (await client.get(OLLAMA_URL + "/api/tags")).json().get("models", [])
            if not any(
                m.get("name") == model
                and model_digest(str(m.get("digest", ""))) == model_digest(selected["digest"])
                for m in tags
            ):
                raise RuntimeError(
                    "Ollama manifest changed upstream. Ask maintainers to review the new digest."
                )
    print("Speech models verified. Run make run to open the application.", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(prog="opentavus")
    commands = parser.add_subparsers(dest="command", required=True)
    setup = commands.add_parser("setup", help="Download the pinned, reviewed local models")
    setup.add_argument("--model", choices=LLM_NAMES, default="qwen2.5:1.5b")
    setup.add_argument("--skip-llm", action="store_true", help="Only prepare speech artifacts")
    commands.add_parser("doctor", help="Check installed engines and pinned artifacts")
    commands.add_parser("serve", help="Serve the application at http://127.0.0.1:8765")
    args = parser.parse_args()
    if args.command == "setup":
        try:
            asyncio.run(download_models(ROOT / "models", args.model, skip_llm=args.skip_llm))
        except (RuntimeError, httpx.HTTPError) as error:
            parser.exit(
                1, f"Setup could not finish: {error}. Ensure Ollama is running, then retry.\n"
            )
    elif args.command == "doctor":
        installation = Installation(ROOT / "models")
        catalog = asyncio.run(installation.catalog())
        print(f"Local speech models: {'ready' if catalog['speech_ready'] else 'run make models'}")
        print(
            "Pipecat WebRTC: "
            + ("installed" if importlib.util.find_spec("pipecat") else "run make models")
        )
        for model in catalog["models"]:
            print(f"{model['name']}: {model['reason']}")
        print(f"Free storage: {shutil.disk_usage(ROOT).free / 1024**3:.1f} GiB")
    else:
        import uvicorn

        from .app import create_app

        try:
            from loguru import logger

            logger.remove()
            logger.add(lambda message: print(message, end=""), level="WARNING")
        except ImportError:
            pass
        print("Open http://127.0.0.1:8765 — local AI, no hosted inference account required.")
        uvicorn.run(
            create_app(ROOT), host="127.0.0.1", port=8765, access_log=False, log_level="warning"
        )


if __name__ == "__main__":
    main()
