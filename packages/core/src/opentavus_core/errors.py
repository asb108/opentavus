"""Failures safe to expose without raw configuration or model output."""

from typing import Literal

ErrorCode = Literal[
    "invalid_manifest",
    "invalid_config",
    "incompatible_protocol",
    "plugin_missing",
    "duplicate_plugin",
    "capability_missing",
    "license_ineligible",
    "artifact_missing",
    "unsupported_language",
    "unsupported_hardware",
    "kind_mismatch",
    "format_mismatch",
    "invalid_transition",
    "plugin_load_failed",
    "model_unavailable",
    "model_failed",
    "provider_auth",
    "provider_rate_limited",
    "provider_unavailable",
    "provider_invalid_response",
    "playback_timeout",
    "tool_rejected",
    "session_closed",
    "invalid_message",
    "capacity",
]


class CoreError(Exception):
    def __init__(self, code: ErrorCode, message: str, *, plugin_id: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.plugin_id = plugin_id

    def public_details(self) -> dict[str, str | None]:
        return {"code": self.code, "message": self.message, "plugin_id": self.plugin_id}
