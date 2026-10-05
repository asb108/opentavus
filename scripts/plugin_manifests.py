"""Generate the curated local manifests from pinned download metadata."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = json.loads((ROOT / "packages/runtime/src/opentavus_runtime/downloads.json").read_text())


def generate(*, check: bool = False) -> None:
    generate_compatible(check=check)
    for name, kind in [("whisper", "stt"), ("kokoro", "tts"), ("ollama", "llm")]:
        directory = ROOT / f"plugins/local/src/opentavus_{name}"
        artifact_ids = ["code"]
        artifacts = [
            {
                "id": "code",
                "purpose": "code",
                "source_url": f"repo://plugins/local/src/opentavus_{name}/adapter.py",
                "revision": "0.1.0a1",
                "sha256": hashlib.sha256((directory / "adapter.py").read_bytes()).hexdigest(),
                "license_id": "Apache-2.0",
                "license_url": "repo://LICENSE",
                "attribution": "OpenTavus contributors",
                "eligibility": "reviewed_permissive",
            }
        ]
        selected = [
            a
            for a in DOWNLOADS["artifacts"]
            if (name == "whisper" and a["path"].startswith("whisper-tiny/"))
            or (name == "kokoro" and not a["path"].startswith("whisper-tiny/"))
        ]
        for index, a in enumerate(selected):
            aid = f"artifact{index}"
            artifact_ids.append(aid)
            artifacts.append(
                {
                    "id": aid,
                    "purpose": "voice" if "voices" in a["path"] else "weights",
                    "source_url": a["url"],
                    "revision": a["revision"],
                    "sha256": a["sha256"],
                    "license_id": a["license"],
                    "license_url": "https://huggingface.co/hexgrad/Kokoro-82M"
                    if name == "kokoro"
                    else "https://github.com/openai/whisper/blob/main/LICENSE",
                    "attribution": "hexgrad and thewh1teagle"
                    if name == "kokoro"
                    else "OpenAI and SYSTRAN",
                    "eligibility": "reviewed_permissive",
                }
            )
        mode = "endpoint" if name == "ollama" else "in_process"
        properties: dict[str, object] = {}
        required: list[str] = []
        if name in {"whisper", "kokoro"}:
            properties["model_path"] = {"type": "string", "minLength": 1}
            required.append("model_path")
        if name == "kokoro":
            properties.update(
                voices_path={"type": "string", "minLength": 1},
                voice={"enum": ["af_heart", "af_bella", "am_michael", "bf_emma"]},
            )
            required.extend(["voices_path", "voice"])
        if name == "ollama":
            properties.update(
                model={"enum": [m["name"] for m in DOWNLOADS["llms"]]},
                endpoint={"enum": ["http://127.0.0.1:11434", "http://localhost:11434"]},
            )
            required.extend(["model", "endpoint"])
        formats = {
            "stt": (["pcm_s16le"], ["transcript.v1"]),
            "tts": (["text.delta.v1"], ["pcm_s16le"]),
            "llm": (["text.delta.v1"], ["text.delta.v1"]),
        }
        inputs, outputs = formats[kind]
        capabilities = {
            "default": {
                "required_artifacts": artifact_ids,
                "input_formats": inputs,
                "output_formats": outputs,
            }
        }
        if name == "ollama":
            capabilities = {}
            for index, m in enumerate(DOWNLOADS["llms"]):
                aid = f"model{index}"
                artifacts.append(
                    {
                        "id": aid,
                        "purpose": "weights",
                        "source_url": m["source"],
                        "revision": m["digest"],
                        "sha256": m["digest"].split(":")[1],
                        "license_id": m["license"],
                        "license_url": "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/main/LICENSE",
                        "attribution": "Qwen team; GGUF distributed by Ollama",
                        "eligibility": "reviewed_permissive",
                    }
                )
                capabilities[f"qwen{index}"] = {
                    "required_artifacts": ["code", aid],
                    "input_formats": inputs,
                    "output_formats": outputs,
                }
        manifest = {
            "schema_version": 1,
            "api_version": 1,
            "id": f"local.{name}",
            "kind": kind,
            "display_name": {
                "whisper": "Whisper tiny (CPU)",
                "kokoro": "Kokoro 82M (ONNX)",
                "ollama": "Ollama / Qwen2.5",
            }[name],
            "entry_point": f"opentavus_{name}.adapter:create",
            "capabilities": capabilities,
            "execution": [mode],
            "languages": ["en"],
            "streaming": "native" if name == "ollama" else "chunk_adapter",
            "cancellation": "discard_late_output",
            "hardware": {
                mode: {
                    "min_ram_mb": 0 if name == "ollama" else 512,
                    "accelerator": "none" if name == "ollama" else "cpu",
                }
            },
            "artifacts": artifacts,
            "config_schema": {
                "type": "object",
                "properties": properties,
                "required": required,
                "additionalProperties": False,
            },
        }
        path = directory / "opentavus-plugin.json"
        expected = json.dumps(manifest, indent=2) + "\n"
        if check:
            if not path.exists() or path.read_text() != expected:
                raise SystemExit(f"Stale manifest: {path.relative_to(ROOT)}; run make format.")
        else:
            path.write_text(expected)


def generate_compatible(*, check: bool) -> None:
    directory = ROOT / "plugins/llm/compatible/src/opentavus_compatible"
    properties = {
        "id": {"type": "string", "pattern": "^[a-zA-Z0-9_.-]+$", "minLength": 1, "maxLength": 96},
        "name": {"type": "string", "minLength": 1, "maxLength": 80},
        "kind": {"enum": ["compatible", "openrouter"]},
        "endpoint": {"type": "string", "minLength": 1, "maxLength": 300},
        "model": {
            "type": "string",
            "minLength": 1,
            "maxLength": 160,
            "pattern": "^[a-zA-Z0-9_.:/-]+$",
        },
        "teaching": {"type": "boolean"},
        "requires_key": {"type": "boolean"},
        "max_output_tokens": {"type": "integer", "minimum": 64, "maximum": 1024},
        "timeout_seconds": {"type": "integer", "minimum": 5, "maximum": 90},
        "terms_url": {"type": ["string", "null"], "maxLength": 300},
        "model_identity": {"const": "provider_declared"},
        "api_key": {"type": "string", "minLength": 1, "maxLength": 512, "writeOnly": True},
    }
    manifest = {
        "schema_version": 1,
        "api_version": 1,
        "id": "provider.compatible",
        "kind": "llm",
        "display_name": "Configured compatible model (experimental)",
        "entry_point": "opentavus_compatible.adapter:create",
        "capabilities": {
            "default": {
                "required_artifacts": ["code"],
                "input_formats": ["text.delta.v1"],
                "output_formats": ["text.delta.v1"],
            }
        },
        "execution": ["endpoint"],
        "languages": ["en"],
        "streaming": "native",
        "cancellation": "discard_late_output",
        "hardware": {"endpoint": {"min_ram_mb": 0, "accelerator": "none"}},
        "artifacts": [
            {
                "id": "code",
                "purpose": "code",
                "source_url": "repo://plugins/llm/compatible/src/opentavus_compatible/adapter.py",
                "revision": "0.1.0a1",
                "sha256": hashlib.sha256((directory / "adapter.py").read_bytes()).hexdigest(),
                "license_id": "Apache-2.0",
                "license_url": "repo://LICENSE",
                "attribution": "OpenTavus contributors",
                "eligibility": "reviewed_permissive",
            }
        ],
        "config_schema": {
            "type": "object",
            "properties": properties,
            "required": ["id", "name", "endpoint", "model"],
            "additionalProperties": False,
        },
    }
    path = directory / "opentavus-plugin.json"
    expected = json.dumps(manifest, indent=2) + "\n"
    if check:
        if not path.exists() or path.read_text() != expected:
            raise SystemExit("Stale compatible manifest; run make format.")
    else:
        path.write_text(expected)


if __name__ == "__main__":
    generate(check="--check" in sys.argv)
