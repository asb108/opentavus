import asyncio
import json
from pathlib import Path

from opentavus_core.contracts import AudioOutput, TextDelta
from opentavus_core.schema import AudioEvent, CanvasEvent, ErrorEvent, InterruptEvent
from opentavus_runtime.conversation import Conversation


class FakeEngines:
    def __init__(self, *, chunks=3, fail=False, late=False):
        self.chunks = chunks
        self.fail = fail
        self.late = late
        self.closed = 0
        self.started = asyncio.Event()
        self.reply_called = False
        self.messages = []

    async def prepare(self):
        pass

    async def close(self):
        self.closed += 1

    async def interrupt(self, _generation):
        pass

    async def reply(self, messages, context):
        self.messages = messages
        self.reply_called = True
        self.started.set()
        if self.fail:
            raise RuntimeError("credential=private-secret; transcript=private text")
        yield TextDelta("A useful first phrase. ")
        if self.late:
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                # Mimics an engine that finishes a callback after cancellation.
                yield TextDelta("Obsolete late output. ")
        else:
            yield TextDelta("A second phrase.")

    async def speak(self, text, context):
        async for _ in text:
            for sequence in range(self.chunks):
                yield AudioOutput(
                    context.generation,
                    "fixture",
                    sequence,
                    sequence * 1920,
                    b"\x10\x00" * 1920,
                    24000,
                    1,
                )

    async def transcribe(self, audio, context):
        if False:
            yield

    async def board(self, prompt, schema, context):
        return json.dumps(
            {"tools": [{"kind": "note", "title": "Momentum", "text": "Mass times velocity."}]}
        )


def conversation(engine):
    return Conversation("test-call", engine, engine, engine, engine, Path("."))


async def test_stream_waits_for_playout_and_has_contiguous_samples():
    engine = FakeEngines(chunks=40)
    call = conversation(engine)
    events = []

    async def emit(event):
        events.append(event)

    call.emit = emit
    await call.ask("Explain momentum")
    await asyncio.sleep(0.03)
    samples = [event for event in events if isinstance(event, AudioEvent)]
    assert len(samples) <= 27  # Approximately two seconds can be in flight.
    assert not call.reply_task.done()
    for _ in range(5):
        call.acknowledge_playback(call.generation, call.sent_sample)
        await asyncio.sleep(0.01)
    await asyncio.wait_for(call.reply_task, 1)
    samples = [event for event in events if isinstance(event, AudioEvent)]
    assert all(
        right.presentation_sample == left.presentation_sample + 1920
        for left, right in zip(samples[:-1], samples[1:], strict=True)
    )
    assert samples[0].caption == "A useful first phrase."
    await call.close()


async def test_late_text_audio_and_board_are_cancelled_by_generation():
    engine = FakeEngines(late=True)
    call = conversation(engine)
    events = []

    async def emit(event):
        events.append(event)

    call.emit = emit
    await call.ask("Explain momentum")
    await engine.started.wait()
    await asyncio.sleep(0.01)
    old = call.generation
    await call.interrupt()
    after_stop = events[
        events.index(
            next(
                e
                for e in events
                if isinstance(e, InterruptEvent) and e.stopped_generation_id == old
            )
        )
        + 1 :
    ]
    assert not any(e.generation_id == old for e in after_stop)
    assert not any(getattr(e, "text", "") == "Obsolete late output. " for e in events)
    assert call.reply_task.done()
    await call.close()
    await call.close()
    assert engine.closed == 3


async def test_board_success_requires_the_current_browser_ack_before_speech():
    engine = FakeEngines()
    call = conversation(engine)
    events = []

    async def emit(event):
        events.append(event)
        if isinstance(event, AudioEvent):
            call.acknowledge_playback(event.generation_id, event.presentation_sample + 1920)

    await call.ask("Previous unfinished question")
    await call.reply_task
    engine.reply_called = False
    call.emit = emit
    await call.ask("Teach momentum", teach=True)
    await asyncio.sleep(0.01)
    operation = next(e for e in events if isinstance(e, CanvasEvent))
    assert not engine.reply_called
    call.acknowledge_canvas(operation.generation_id - 1, operation.operation_id, True)
    await asyncio.sleep(0.01)
    assert not engine.reply_called
    call.acknowledge_canvas(operation.generation_id, operation.operation_id, True)
    await asyncio.wait_for(call.reply_task, 1)
    assert engine.reply_called
    assert engine.messages[-1].role == "user"
    assert engine.messages[-1].content == "Teach momentum"
    assert "Mass times velocity." in engine.messages[0].content
    assert any("Previous reply interrupted" in m.content for m in engine.messages)
    assert all(
        not (left.role == right.role == "user")
        for left, right in zip(engine.messages[:-1], engine.messages[1:], strict=True)
    )
    await call.close()


async def test_model_failure_is_safe_and_does_not_leak_raw_exception():
    engine = FakeEngines(fail=True)
    call = conversation(engine)
    events = []

    async def emit(event):
        events.append(event)

    call.emit = emit
    await call.ask("Synthetic example")
    await call.reply_task
    error = next(e for e in events if isinstance(e, ErrorEvent))
    assert error.code == "model_failed"
    assert "private" not in error.model_dump_json()
    await call.close()


async def test_cancelled_board_ack_is_discarded_and_waiter_is_released():
    engine = FakeEngines()
    call = conversation(engine)
    events = []

    async def emit(event):
        events.append(event)

    call.emit = emit
    await call.ask("Teach momentum", teach=True)
    await asyncio.sleep(0.01)
    operation = next(e for e in events if isinstance(e, CanvasEvent))
    await call.interrupt()
    call.acknowledge_canvas(operation.generation_id, operation.operation_id, True)
    assert not engine.reply_called
    assert not call._tool_waiters
    await call.close()


async def test_requested_quiz_cannot_silently_be_replaced_by_another_tool():
    call = conversation(FakeEngines())  # This planner returns a note for every request.
    events = []

    async def emit(event):
        events.append(event)

    call.emit = emit
    await call.ask("Create a practice quiz", teach=True)
    await call.reply_task
    assert any(isinstance(event, ErrorEvent) for event in events)
    assert not any(isinstance(event, CanvasEvent) for event in events)
    await call.close()


async def test_history_retains_only_acknowledged_complete_phrases_after_interruption():
    call = conversation(FakeEngines())
    await call.ask("Explain momentum")
    await call.reply_task
    assert [message.role for message in call.history] == ["user"]
    # The browser heard the first complete phrase, then part of the second.
    call.acknowledge_playback(call.generation, 3 * 1920 + 100)
    await call.interrupt()
    assert call.history[-1].content == "A useful first phrase. [interrupted]"
    assert "second" not in call.history[-1].content
    await call.close()


async def test_listening_cancellation_is_independent_of_answer_interruption():
    call = conversation(FakeEngines())
    listening = call.input_context()
    reply = call.context()
    await call.interrupt()
    listening.cancellation.check()
    try:
        reply.cancellation.check()
        raise AssertionError("Interrupted output context stayed active")
    except asyncio.CancelledError:
        pass
    await call.close()

    try:
        listening.cancellation.check()
        raise AssertionError("Closed listening context stayed active")
    except asyncio.CancelledError:
        pass


async def test_fragmented_spoken_diagram_uses_prior_topic_without_teaching_toggle():
    class DiagramEngines(FakeEngines):
        async def board(self, prompt, schema, context):
            self.board_prompt = prompt
            return json.dumps(
                {
                    "tools": [
                        {
                            "kind": "diagram",
                            "title": "Photosynthesis",
                            "inputs": ["Sunlight", "Water", "Carbon dioxide"],
                            "outputs": ["Glucose", "Oxygen"],
                        }
                    ]
                }
            )

    engine = DiagramEngines()
    call = conversation(engine)
    events = []

    async def emit(event):
        events.append(event)
        if isinstance(event, CanvasEvent):
            call.acknowledge_canvas(event.generation_id, event.operation_id, True)
        elif isinstance(event, AudioEvent):
            call.acknowledge_playback(event.generation_id, call.sent_sample)

    call.emit = emit
    await call.ask("Can you explain photosynthesis concept with the help of", from_mic=True)
    await call.reply_task
    assert not any(isinstance(event, CanvasEvent) for event in events)
    await call.ask("diagrams on the board.", from_mic=True)
    await asyncio.wait_for(call.reply_task, 1)
    assert "photosynthesis concept" in engine.board_prompt
    assert '"latest_request": "diagrams on the board."' in engine.board_prompt
    operation = next(event for event in events if isinstance(event, CanvasEvent))
    assert operation.tool_name == "canvas_diagram"
    assert "Photosynthesis" in engine.messages[0].content
    assert call.board_history[0].title == "Photosynthesis"

    await call.ask("Explain what those arrows mean.")
    await call.reply_task
    assert "Previously applied board data" in engine.messages[0].content
    assert "Sunlight" in engine.messages[0].content
    assert len(call.board_history) == 1  # An explanation does not regenerate a diagram.
    await call.close()
    assert call.board_history == []


async def test_failed_diagram_application_is_not_remembered_as_visible():
    call = conversation(FakeEngines())

    async def emit(event):
        if isinstance(event, CanvasEvent):
            call.acknowledge_canvas(event.generation_id, event.operation_id, False)

    call.emit = emit
    await call.ask("Write a note about momentum on the board.")
    await call.reply_task
    assert call.board_history == []
    assert not call.llm.reply_called
    await call.close()
