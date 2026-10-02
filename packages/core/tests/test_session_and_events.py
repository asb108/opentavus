import base64
import json

import pytest
from opentavus_core.contracts import Generation
from opentavus_core.errors import CoreError
from opentavus_core.schema import EVENT_ADAPTER
from opentavus_core.session import accepts_output, next_generation, transition
from pydantic import ValidationError


def test_generation_rejects_late_and_foreign_outputs():
    original = Generation("conversation-a", 1)
    active = next_generation(original)
    assert not accepts_output(active, original)
    assert not accepts_output(active, Generation("conversation-b", 2))
    assert accepts_output(active, active)


def test_session_lifecycle_cannot_reopen_an_ended_session():
    state = "created"
    for target in ["preparing", "ready", "active", "ending", "ended"]:
        state = transition(state, target)
    with pytest.raises(CoreError) as result:
        transition(state, "active")
    assert result.value.code == "invalid_transition"
    assert transition("failed", "ending") == "ending"


def audio_event():
    return {
        "schema_version": 1,
        "type": "audio",
        "conversation_id": "conversation-a",
        "generation_id": 2,
        "sequence": 0,
        "utterance_id": "utterance-a",
        "presentation_sample": 240,
        "format": "pcm_s16le",
        "sample_rate": 24000,
        "channels": 1,
        "data_b64": base64.b64encode(b"\x00\x00" * 240).decode(),
    }


def test_audio_event_roundtrip_preserves_sample_timebase():
    event = EVENT_ADAPTER.validate_json(json.dumps(audio_event()))
    assert event.type == "audio"
    assert event.presentation_sample == 240
    assert EVENT_ADAPTER.validate_json(EVENT_ADAPTER.dump_json(event)) == event


@pytest.mark.parametrize(
    "change",
    [
        {"generation_id": "2"},
        {"sequence": -1},
        {"schema_version": 2},
        {"data_b64": "invalid-base64!"},
        {"data_b64": "AA=="},
        {"channels": 2, "data_b64": "AAA="},
        {"sample_rate": 0},
        {"unexpected": True},
    ],
)
def test_malformed_audio_event_is_rejected(change):
    event = audio_event()
    event.update(change)
    with pytest.raises(ValidationError):
        EVENT_ADAPTER.validate_json(json.dumps(event))


def test_stop_ack_carries_the_stopped_generation():
    event = EVENT_ADAPTER.validate_json(
        json.dumps(
            {
                "schema_version": 1,
                "type": "playback_stopped",
                "conversation_id": "conversation-a",
                "generation_id": 3,
                "sequence": 4,
                "stopped_generation_id": 2,
                "last_played_sample": 480,
            }
        )
    )
    assert event.type == "playback_stopped"
    assert event.stopped_generation_id == 2
