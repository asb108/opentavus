from pathlib import Path

from fastapi.testclient import TestClient
from opentavus_api.app import create_app
from opentavus_api.models import CallSettings
from opentavus_core.errors import CoreError

ORIGIN = {"origin": "http://127.0.0.1:8765"}


class FakeInstallation:
    async def catalog(self):
        return {"speech_ready": False, "models": []}

    async def close(self):
        pass


def client(prepare=None):
    kwargs = {"installation": FakeInstallation()}
    if prepare:
        kwargs["prepare"] = prepare
    return TestClient(create_app(Path("."), **kwargs))


def test_local_app_catalog_needs_no_models_or_optional_avatar():
    with client() as browser:
        assert browser.get("/api/health").json()["mode"] == "local"
        assert browser.get("/api/catalog").json()["speech_ready"] is False


def test_mutations_reject_missing_or_foreign_origin():
    with client() as browser:
        assert browser.post("/api/conversations", json={}).status_code == 403
        assert (
            browser.post(
                "/api/conversations", json={}, headers={"origin": "https://example.com"}
            ).status_code
            == 403
        )
        assert browser.get("/api/health", headers={"host": "evil.example"}).status_code == 400


def test_invalid_settings_are_rejected_without_echoing_request_data():
    with client() as browser:
        response = browser.post(
            "/api/conversations",
            headers=ORIGIN,
            json={"model": "unreviewed-model", "secret": "private-value"},
        )
        assert response.status_code == 422
        assert "private-value" not in response.text


def test_scientist_defaults_and_independent_existing_choices():
    assert CallSettings().avatar == "einstein"
    assert CallSettings().voice == "am_michael"
    for avatar in (
        "einstein",
        "einstein-portrait",
        "mira-photo",
        "portrait",
        "mira",
        "orbit",
        "lumen",
    ):
        settings = CallSettings(avatar=avatar, model="qwen2.5:7b", voice="bf_emma")
        assert settings.model == "qwen2.5:7b"
        assert settings.voice == "bf_emma"
    with client() as browser:
        response = browser.post(
            "/api/conversations", headers=ORIGIN, json={"avatar": "unreviewed-scientist"}
        )
        assert response.status_code == 422
        assert "unreviewed-scientist" not in response.text


def test_failed_preparation_releases_the_single_user_capacity():
    calls = []

    async def prepare(*args):
        calls.append(args)
        raise CoreError("model_unavailable", "Install a model first.")

    with client(prepare) as browser:
        for _ in range(2):
            response = browser.post("/api/conversations", headers=ORIGIN, json={})
            assert response.json()["code"] == "model_unavailable"
        assert len(calls) == 2


def test_a_foreign_websocket_is_rejected():
    from starlette.websockets import WebSocketDisconnect

    with client() as browser:
        try:
            with browser.websocket_connect("/ws", headers={"origin": "https://example.com"}):
                raise AssertionError("Foreign websocket connected")
        except WebSocketDisconnect as error:
            assert error.code == 1008
