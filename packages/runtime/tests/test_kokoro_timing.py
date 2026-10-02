"""Timing and packet tests use no inference libraries or model downloads."""

import asyncio
import importlib.util
from dataclasses import dataclass
from pathlib import Path

import pytest
from opentavus_core.contracts import AdapterContext, CancellationSignal, Generation, VisemeCue

# Exercise the optional adapter's pure timing policy without installing its plugin,
# NumPy, ONNX Runtime or weights. This also runs in the contributor/CI environment.
source = Path(__file__).resolve().parents[3] / "plugins/local/src/opentavus_kokoro/adapter.py"
spec = importlib.util.spec_from_file_location("kokoro_timing_unit", source)
assert spec and spec.loader
adapter_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter_module)
KokoroAdapter = adapter_module.KokoroAdapter
packet_cues = adapter_module.packet_cues
phoneme_shape = adapter_module.phoneme_shape
sample_cues = adapter_module.sample_cues


@dataclass(frozen=True)
class Mark:
    phoneme: str
    start: float
    end: float


def test_closed_round_and_wide_phonemes_are_distinct():
    assert [phoneme_shape(p) for p in "mbp"] == ["closed"] * 3
    assert phoneme_shape("ɔ") == "round"
    assert phoneme_shape("u") == "pucker"
    assert phoneme_shape("i") == "wide"
    assert phoneme_shape("?") == "rest"


def test_stress_and_length_marks_carry_vowels_instead_of_closing_the_mouth():
    assert sample_cues(
        [Mark("ˈ", 0, 0.02), Mark("u", 0.02, 0.04), Mark("ː", 0.04, 0.06)], 1440
    ) == (VisemeCue("pucker", 0, 1440),)


def test_packet_boundary_splits_a_cue_without_drifting_the_audio_clock():
    cues = sample_cues([Mark("m", 0.06, 0.1), Mark("i", 0.1, 0.15)], 4800)
    assert packet_cues(cues, 0, 1920) == (
        VisemeCue("rest", 0, 1440),
        VisemeCue("closed", 1440, 1920),
    )
    assert packet_cues(cues, 1920, 3840) == (
        VisemeCue("closed", 0, 480),
        VisemeCue("wide", 480, 1680),
        VisemeCue("rest", 1680, 1920),
    )
    assert sample_cues([], 4800) == ()  # Explicit amplitude fallback, not fabricated timing.


@pytest.mark.parametrize(
    "marks",
    [
        [Mark("m", float("nan"), 0.1)],
        [Mark("m", 0, float("inf"))],
        [Mark("m", -0.01, 0.1)],
        [Mark("m", 0.1, 0.09)],
        [Mark("m", 0, 0.3)],
        [Mark("m", 0, 0.1), Mark("a", 0.09, 0.15)],
    ],
)
def test_malformed_model_timings_do_not_enter_playback(marks):
    with pytest.raises(ValueError):
        sample_cues(marks, 4800)


async def test_speak_keeps_pcm_and_cues_together_and_cancels_late_inference():
    adapter = KokoroAdapter(Path("unused"), Path("unused"), "af_heart")
    cues = (VisemeCue("closed", 0, 2400), VisemeCue("wide", 2400, 4800))
    adapter._synthesize = lambda _: (b"\x10\x00" * 4800, cues)
    cancellation = CancellationSignal()
    context = AdapterContext(
        Generation("test", 1), cancellation, lambda _: Path("unused"), lambda *_: None
    )

    async def text():
        yield "A phrase"

    packets = [packet async for packet in adapter.speak(text(), context)]
    assert [len(p.pcm) // 2 for p in packets] == [1920, 1920, 960]
    assert [p.presentation_sample for p in packets] == [0, 1920, 3840]
    assert packets[1].visemes == (VisemeCue("closed", 0, 480), VisemeCue("wide", 480, 1920))

    def late(_):
        cancellation.cancel()
        return b"\x10\x00" * 4800, cues

    adapter._synthesize = late
    with pytest.raises(asyncio.CancelledError):
        _ = [packet async for packet in adapter.speak(text(), context)]
