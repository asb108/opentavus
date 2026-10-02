"""Pipecat owns WebRTC, resampling, VAD and speech segmentation.

PCM output uses the single browser playout clock. Track playout comparison is a
remaining release gate, recorded in the alpha decision and quality documents.
"""

import asyncio
from collections.abc import AsyncGenerator, AsyncIterator
from typing import Any

from opentavus_core.contracts import AudioInput
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import (
    Frame,
    InputAudioRawFrame,
    TranscriptionFrame,
    VADUserStartedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.audio.vad_processor import VADProcessor
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.stt_service import SegmentedSTTService
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.utils.time import time_now_iso8601
from pipecat.workers.runner import WorkerRunner

from .conversation import Conversation


class LocalSTT(SegmentedSTTService):  # type: ignore[misc]
    def __init__(self, conversation: Conversation) -> None:
        super().__init__(sample_rate=16000, trailing_silence_secs=0.35)
        self.conversation = conversation
        # Pipecat 1.12.0 exposes this protected queue; bounding it is intentional.
        self._segment_queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=2)

    @property
    def wants_wav_segments(self) -> bool:
        return False

    async def run_stt(self, audio: bytes) -> AsyncGenerator[Frame | None, None]:
        async def segment() -> AsyncIterator[AudioInput]:
            yield AudioInput(audio, 16000, 1, 0)

        try:
            async for transcript in self.conversation.stt.transcribe(
                segment(),
                self.conversation.input_context(),
            ):
                yield TranscriptionFrame(transcript.text, "local-user", time_now_iso8601())
        except Exception:
            # Pipecat reports this exception; keep private input/provider details out of it.
            raise RuntimeError("Local speech recognition failed.") from None

    async def process_audio_frame(
        self, frame: InputAudioRawFrame, direction: FrameDirection
    ) -> None:
        if len(self._audio_buffer) > 16000 * 2 * 29:
            self._audio_buffer.clear()
            await self.conversation.status("listening")
        await super().process_audio_frame(frame, direction)


class SpeechSink(FrameProcessor):  # type: ignore[misc]
    def __init__(self, conversation: Conversation) -> None:
        super().__init__()
        self.conversation = conversation

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)
        if direction == FrameDirection.DOWNSTREAM:
            if isinstance(frame, TranscriptionFrame):
                await self.conversation.ask(
                    frame.text, from_mic=True, teach=self.conversation.teaching
                )
            elif isinstance(frame, VADUserStartedSpeakingFrame) and not self.conversation.speaking:
                await self.conversation.status("listening")
        await self.push_frame(frame, direction)


class MicrophoneConnection:
    def __init__(
        self, connection: SmallWebRTCConnection, worker: PipelineWorker, task: asyncio.Task[Any]
    ) -> None:
        self.connection = connection
        self.worker = worker
        self.task = task

    async def close(self) -> None:
        await self.worker.cancel()
        try:
            await asyncio.wait_for(self.task, timeout=5)
        except (TimeoutError, asyncio.CancelledError):
            self.task.cancel()
        await self.connection.disconnect()


async def connect_microphone(
    conversation: Conversation, sdp: str
) -> tuple[MicrophoneConnection, dict[str, Any]]:
    connection = SmallWebRTCConnection(ice_servers=[], connection_timeout_secs=20)
    try:
        await connection.initialize(sdp, "offer")
        transport = SmallWebRTCTransport(
            connection,
            TransportParams(
                audio_in_enabled=True,
                audio_out_enabled=False,
                audio_in_sample_rate=16000,
            ),
        )
        pipeline = Pipeline(
            [
                transport.input(),
                VADProcessor(
                    vad_analyzer=SileroVADAnalyzer(
                        sample_rate=16000,
                        params=VADParams(confidence=0.65, start_secs=0.15, stop_secs=0.65),
                    )
                ),
                LocalSTT(conversation),
                SpeechSink(conversation),
                transport.output(),
            ]
        )
        worker = PipelineWorker(
            pipeline,
            params=PipelineParams(audio_in_sample_rate=16000),
            enable_rtvi=False,
            enable_turn_tracking=False,
            idle_timeout_secs=None,
        )
        runner = WorkerRunner(handle_sigint=False)
        task = asyncio.create_task(runner.run(worker))
        answer = connection.get_answer()
        if not isinstance(answer, dict):
            raise ValueError("WebRTC did not produce an answer")
        return MicrophoneConnection(connection, worker, task), answer
    except BaseException:
        await connection.disconnect()
        raise
