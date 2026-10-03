"""Pinned local model inventory; downloads are explicit and checked by digest."""

import asyncio
import hashlib
import json
from importlib.resources import files
from pathlib import Path
from typing import Any

import httpx
from opentavus_core.contracts import Adapter
from opentavus_core.registry import InstalledPlugin, PluginRegistry, discover_installed

CATALOG: dict[str, Any] = json.loads(
    files("opentavus_runtime").joinpath("downloads.json").read_text()
)
VOICE_IDS = ("af_heart", "af_bella", "am_michael", "bf_emma")
LLM_NAMES = tuple(m["name"] for m in CATALOG["llms"])
OLLAMA_URL = "http://127.0.0.1:11434"


def model_digest(value: str) -> str:
    return value.removeprefix("sha256:")


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        while block := stream.read(1024 * 1024):
            hasher.update(block)
    return hasher.hexdigest()


class Installation:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.registry = PluginRegistry(discover_installed())
        self._verified: dict[str, tuple[int, int]] = {}
        self.speech_cache: dict[str, Adapter] = {}

    async def close(self) -> None:
        await asyncio.gather(*(adapter.close() for adapter in self.speech_cache.values()))
        self.speech_cache.clear()

    def artifact_ready(self, artifact: dict[str, Any]) -> bool:
        path = self.directory / artifact["path"]
        if not path.is_file() or path.stat().st_size != artifact["size"]:
            return False
        stamp = (path.stat().st_size, path.stat().st_mtime_ns)
        if self._verified.get(artifact["path"]) != stamp:
            if digest(path) != artifact["sha256"]:
                return False
            self._verified[artifact["path"]] = stamp
        return True

    def speech_ready(self) -> bool:
        return all(self.artifact_ready(a) for a in CATALOG["artifacts"])

    async def installed_models(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=3, trust_env=False) as client:
            try:
                response = await client.get(OLLAMA_URL + "/api/tags")
                response.raise_for_status()
                models = response.json()["models"]
                return models if isinstance(models, list) else []
            except (httpx.HTTPError, ValueError, KeyError):
                return []

    async def catalog(self) -> dict[str, Any]:
        installed = {
            m.get("name"): model_digest(str(m.get("digest", "")))
            for m in await self.installed_models()
        }
        plugin_ids = {m.id for m in self.registry.manifests()}
        ready = (
            await asyncio.to_thread(self.speech_ready)
            and {"local.whisper", "local.kokoro", "local.ollama"} <= plugin_ids
        )
        return {
            "schema_version": 1,
            "speech_ready": ready,
            "setup_command": "make models",
            "models": [
                {
                    **m,
                    "ready": ready and installed.get(m["name"]) == model_digest(m["digest"]),
                    "reason": "Ready"
                    if ready and installed.get(m["name"]) == model_digest(m["digest"])
                    else "Run make models"
                    if not ready
                    else f"Run ollama pull {m['name']}",
                }
                for m in CATALOG["llms"]
            ],
            "voices": [
                {"id": "af_heart", "name": "Heart", "description": "Warm American English"},
                {"id": "af_bella", "name": "Bella", "description": "Bright American English"},
                {"id": "am_michael", "name": "Michael", "description": "Calm American English"},
                {"id": "bf_emma", "name": "Emma", "description": "British English"},
            ],
            "avatars": [
                {"id": "einstein", "name": "Einstein · Historical portrait"},
                {"id": "einstein-portrait", "name": "Einstein · Static portrait"},
                {"id": "mira-photo", "name": "Mira · Photographic preview"},
                {"id": "mira", "name": "Mira · 3D human"},
                {"id": "portrait", "name": "Mira · Static portrait"},
                {"id": "orbit", "name": "Orbit"},
                {"id": "lumen", "name": "Lumen"},
            ],
            "stt": "Whisper tiny / English",
            "tts": "Kokoro 82M / ONNX",
            "privacy": "No recordings or server transcript storage. "
            "Your board stays in this browser.",
        }

    def available_artifacts(self, model: str) -> frozenset[str]:
        available = set()
        for manifest in self.registry.manifests():
            if manifest.id not in {"local.whisper", "local.kokoro", "local.ollama"}:
                continue
            for artifact in manifest.artifacts:
                if (
                    artifact.purpose == "code"
                    or (manifest.id != "local.ollama" and self.speech_ready())
                    or (manifest.id == "local.ollama" and artifact.source_url.endswith(model))
                ):
                    available.add(f"{manifest.id}/{artifact.id}")
        return frozenset(available)


def installed_local_plugins() -> list[InstalledPlugin]:
    return [p for p in discover_installed() if p.manifest.id.startswith("local.")]
