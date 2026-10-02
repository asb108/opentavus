"""A single-user, loopback-only application with scoped call authorization."""

import asyncio
import json
import secrets
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from opentavus_core.errors import CoreError
from opentavus_core.schema import (
    EVENT_ADAPTER,
    CanvasResultEvent,
    PlaybackProgressEvent,
    PlaybackStoppedEvent,
    SessionEvent,
    WireEvent,
)
from opentavus_runtime.bootstrap import prepare_conversation
from opentavus_runtime.conversation import Conversation
from opentavus_runtime.installation import Installation
from pydantic import ValidationError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .models import CallCreated, CallSettings, Hello, Offer, Question, TeachMode

ORIGINS = {
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
}
Prepare = Callable[[Installation, str, str, str], Awaitable[Conversation]]


@dataclass
class ActiveCall:
    conversation: Conversation
    token: str
    settings: CallSettings
    microphone: Any = None
    websocket: WebSocket | None = None
    expiry: asyncio.Task[None] | None = None
    connecting_microphone: bool = False

    async def close(self) -> None:
        if self.expiry and self.expiry is not asyncio.current_task():
            self.expiry.cancel()
        if self.microphone is not None:
            await self.microphone.close()
            self.microphone = None
        await self.conversation.close()


def create_app(
    root: Path, *, installation: Installation | None = None, prepare: Prepare = prepare_conversation
) -> FastAPI:
    installation = installation or Installation(root / "models")
    active: ActiveCall | None = None
    preparing = False

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        yield
        if active:
            await active.close()
        await installation.close()

    app = FastAPI(title="OpenTavus local alpha", version="0.1.0a1", lifespan=lifespan)
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(ORIGINS),
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.middleware("http")
    async def origin_guard(request: Request, call_next: Any) -> Any:
        if (
            request.method in {"POST", "DELETE", "PUT", "PATCH"}
            and request.headers.get("origin") not in ORIGINS
        ):
            return JSONResponse(
                {"code": "invalid_origin", "message": "Use the local OpenTavus page."},
                status_code=403,
            )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.exception_handler(CoreError)
    async def core_error(_request: Request, error: CoreError) -> JSONResponse:
        return JSONResponse(error.public_details(), status_code=409)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_request: Request, _error: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            {"code": "invalid_config", "message": "The request has invalid or unsupported fields."},
            status_code=422,
        )

    @app.get("/api/catalog")
    async def catalog() -> dict[str, Any]:
        return await installation.catalog()

    @app.get("/api/health")
    async def health() -> dict[str, Any]:
        return {"status": "ok", "version": "0.1.0a1", "mode": "local"}

    def authorize(call_id: str, authorization: str | None) -> ActiveCall:
        if active is None or active.conversation.id != call_id:
            raise HTTPException(404, "Call ended. Start a new conversation.")
        if not authorization or not secrets.compare_digest(authorization, "Bearer " + active.token):
            raise HTTPException(403, "Call authorization is invalid.")
        return active

    @app.post("/api/conversations", response_model=CallCreated)
    async def create(settings: CallSettings, request: Request) -> CallCreated:
        nonlocal active, preparing
        if active is not None or preparing:
            raise CoreError(
                "capacity", "Another local call is open. End it before starting a new one."
            )
        preparing = True
        try:
            conversation_id = secrets.token_hex(16)
            async with asyncio.timeout(90):
                conversation = await prepare(
                    installation, conversation_id, settings.model, settings.voice
                )
            conversation.character_name = "Orbit" if settings.avatar == "orbit" else "Lumen"
            if await request.is_disconnected():
                await conversation.close()
                raise CoreError(
                    "session_closed", "The browser disconnected while preparing the call."
                )
            active = ActiveCall(conversation, secrets.token_urlsafe(32), settings)
            owned = active

            async def expire_unconnected() -> None:
                nonlocal active
                await asyncio.sleep(30)
                if active is owned and owned.websocket is None:
                    await owned.close()
                    active = None

            owned.expiry = asyncio.create_task(expire_unconnected())
            return CallCreated(
                conversation_id=conversation_id, token=owned.token, settings=settings
            )
        except CoreError:
            raise
        except Exception:
            raise CoreError(
                "model_failed", "Could not warm the local models. Run make doctor and retry."
            ) from None
        finally:
            preparing = False

    @app.post("/api/conversations/{call_id}/offer")
    async def offer(
        call_id: str, body: Offer, authorization: str | None = Header(default=None)
    ) -> dict[str, Any]:
        owned = authorize(call_id, authorization)
        if owned.microphone is not None or owned.connecting_microphone:
            raise HTTPException(409, "Microphone already connected.")
        from opentavus_runtime.webrtc import connect_microphone

        owned.connecting_microphone = True
        try:
            microphone, answer = await connect_microphone(owned.conversation, body.sdp)
            if active is not owned or owned.conversation.closed:
                await microphone.close()
                raise CoreError("session_closed", "Call ended while connecting the microphone.")
            owned.microphone = microphone
            return answer
        except Exception:
            raise CoreError(
                "model_failed", "Microphone connection failed. Use a typed question or reconnect."
            ) from None
        finally:
            owned.connecting_microphone = False

    @app.delete("/api/conversations/{call_id}")
    async def end(call_id: str, authorization: str | None = Header(default=None)) -> dict[str, str]:
        nonlocal active
        owned = authorize(call_id, authorization)
        await owned.close()
        if active is owned:
            active = None
        if owned.websocket is not None:
            await owned.websocket.close()
        return {"state": "ended"}

    @app.websocket("/ws")
    async def events(websocket: WebSocket) -> None:
        nonlocal active
        if websocket.headers.get("origin") not in ORIGINS or websocket.url.hostname not in {
            "localhost",
            "127.0.0.1",
            "testserver",
        }:
            await websocket.close(code=1008)
            return
        await websocket.accept()
        owned: ActiveCall | None = None
        try:
            first = await asyncio.wait_for(websocket.receive_text(), timeout=5)
            if len(first) > 1024:
                raise ValueError("Handshake exceeds its limit")
            hello = Hello.model_validate_json(first)
            owned = authorize(hello.conversation_id, "Bearer " + hello.token)
            if owned.websocket is not None:
                raise ValueError("Call already has a browser")
            owned.websocket = websocket
            if owned.expiry:
                owned.expiry.cancel()
            conversation = owned.conversation

            async def send(event: WireEvent) -> None:
                await websocket.send_text(event.model_dump_json())

            conversation.emit = send
            await send(SessionEvent(**conversation.base(), type="session", state="ready"))
            await conversation.status("listening")
            while True:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=1800)
                if len(raw) > 20000:
                    raise ValueError("Client message exceeds its limit")
                value = json.loads(raw)
                if not isinstance(value, dict):
                    raise ValueError("Client message must be an object")
                if value.get("type") == "ask":
                    question = Question.model_validate(value)
                    await conversation.ask(question.text, teach=question.teach)
                elif value.get("type") == "teach_mode":
                    conversation.teaching = TeachMode.model_validate(value).enabled
                elif value.get("type") == "stop":
                    if set(value) != {"type"}:
                        raise ValueError("Invalid stop message")
                    await conversation.interrupt()
                    await conversation.status("listening")
                else:
                    event = EVENT_ADAPTER.validate_python(value)
                    if event.conversation_id != conversation.id:
                        raise ValueError("Event belongs to a different call")
                    if isinstance(event, PlaybackProgressEvent):
                        conversation.acknowledge_playback(event.generation_id, event.played_sample)
                    elif isinstance(event, PlaybackStoppedEvent):
                        # Positive acknowledgement is retained in sanitized timing evidence.
                        conversation.timings.append(
                            {
                                "playback_stopped_generation": event.stopped_generation_id,
                                "last_played_sample": event.last_played_sample,
                            }
                        )
                    elif isinstance(event, CanvasResultEvent):
                        conversation.acknowledge_canvas(
                            event.generation_id, event.operation_id, event.applied
                        )
                    else:
                        raise ValueError("Unsupported client event")
        except (WebSocketDisconnect, TimeoutError, ValueError, ValidationError, HTTPException):
            pass
        finally:
            if owned is not None and owned.websocket is websocket:
                owned.conversation.emit = None
                owned.websocket = None
                await owned.close()
                if active is owned:
                    active = None
            try:
                await websocket.close()
            except (RuntimeError, WebSocketDisconnect):
                pass

    dist = root / "apps/web/dist"
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def page(path: str) -> FileResponse:
        if path.startswith(("api/", "ws")) or ".." in path:
            raise HTTPException(404)
        target = dist / path
        if path and target.is_file() and target.resolve().is_relative_to(dist.resolve()):
            return FileResponse(target)
        if not (dist / "index.html").is_file():
            raise HTTPException(503, "Build the browser with npm run build before starting.")
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-store"})

    return app
