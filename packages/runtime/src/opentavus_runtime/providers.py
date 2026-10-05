"""Small server-held provider store; public views never contain secret values."""

import json
import os
import tempfile
from pathlib import Path
from typing import Annotated, Literal

from opentavus_core.errors import CoreError
from opentavus_core.providers import ProviderConfiguration, ProviderView
from opentavus_core.schema import Boundary
from pydantic import Field, SecretStr


class StoredProvider(Boundary):
    configuration: ProviderConfiguration
    api_key: SecretStr | None = None


class StoredProviders(Boundary):
    schema_version: Literal[1] = 1
    providers: Annotated[list[StoredProvider], Field(max_length=8)] = Field(default_factory=list)


class ProviderStore:
    def __init__(self, path: Path | None) -> None:
        self.path = path
        self._entries: dict[str, StoredProvider] = {}
        if path is not None and path.exists():
            try:
                if path.is_symlink() or path.stat().st_size > 65536:
                    raise ValueError("Invalid provider store")
                if os.name == "posix" and path.stat().st_mode & 0o077:
                    raise ValueError("Provider credentials require private file permissions")
                stored = StoredProviders.model_validate_json(path.read_bytes())
                self._entries = {item.configuration.id: item for item in stored.providers}
                if len(self._entries) != len(stored.providers):
                    raise ValueError("Duplicate provider IDs")
            except (OSError, ValueError):
                raise CoreError(
                    "invalid_config", "Provider configuration could not be read securely."
                ) from None

    def get(self, provider_id: str, model: str) -> StoredProvider:
        entry = self._entries.get(provider_id)
        if entry is None or entry.configuration.model != model:
            raise CoreError("invalid_config", "Refresh settings and select a configured model.")
        if entry.configuration.requires_key and entry.api_key is None:
            raise CoreError("provider_auth", "Add this provider's API key in companion settings.")
        return entry.model_copy(deep=True)

    def views(self, *, plugin_installed: bool, speech_ready: bool) -> list[ProviderView]:
        result = []
        for entry in self._entries.values():
            key_ready = not entry.configuration.requires_key or entry.api_key is not None
            ready = key_ready and plugin_installed and speech_ready
            reason = (
                "Run make models to install the compatible adapter and speech models"
                if not plugin_installed or not speech_ready
                else "Add an API key in settings"
                if not key_ready
                else "Configured; connection is checked when starting a call"
            )
            result.append(
                ProviderView(
                    configuration=entry.configuration,
                    credential_configured=entry.api_key is not None,
                    ready=ready,
                    reason=reason,
                )
            )
        return result

    def save(
        self, configuration: ProviderConfiguration, api_key: SecretStr | None, *, remove_key: bool
    ) -> None:
        old = self._entries.get(configuration.id)
        changed_destination = old is not None and (
            old.configuration.endpoint != configuration.endpoint
            or old.configuration.kind != configuration.kind
        )
        # A credential belongs to its destination, even when the operator reuses an ID.
        key = None if remove_key or changed_destination else old.api_key if old else None
        if api_key is not None:
            key = api_key
        updated = dict(self._entries)
        updated[configuration.id] = StoredProvider(configuration=configuration, api_key=key)
        if len(updated) > 8:
            raise CoreError("capacity", "At most eight configured providers are supported.")
        self._write(updated)
        self._entries = updated

    def delete(self, provider_id: str) -> None:
        updated = dict(self._entries)
        updated.pop(provider_id, None)
        self._write(updated)
        self._entries = updated

    def _write(self, entries: dict[str, StoredProvider]) -> None:
        if self.path is None:
            return
        temporary: str | None = None
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            descriptor, temporary = tempfile.mkstemp(prefix=".providers-", dir=self.path.parent)
            with os.fdopen(descriptor, "w") as stream:
                json.dump(
                    {
                        "schema_version": 1,
                        "providers": [
                            {
                                "configuration": entry.configuration.model_dump(mode="json"),
                                "api_key": entry.api_key.get_secret_value()
                                if entry.api_key
                                else None,
                            }
                            for entry in entries.values()
                        ],
                    },
                    stream,
                )
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, self.path)
        except OSError:
            raise CoreError(
                "invalid_config", "Provider configuration could not be saved."
            ) from None
        finally:
            if temporary is not None:
                Path(temporary).unlink(missing_ok=True)
