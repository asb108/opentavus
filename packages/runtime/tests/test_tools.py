import pytest
from opentavus_runtime.policies import should_interrupt, split_phrases
from opentavus_runtime.tools import validate_tool


@pytest.mark.parametrize(
    "text,result",
    [
        ("okay", False),
        ("yes", False),
        ("stop", True),
        ("Actually I meant force", True),
        ("what about mass", True),
    ],
)
def test_backchannels_and_corrections(text, result):
    assert should_interrupt(text, assistant_speaking=True) is result
    assert should_interrupt(text, assistant_speaking=False)


def test_short_phrases_and_final_reply_are_retained():
    assert split_phrases("First sentence. Next") == (["First sentence."], "Next")
    assert split_phrases("Next", final=True) == (["Next"], "")


@pytest.mark.parametrize(
    "tool",
    [
        {
            "kind": "formula",
            "title": "unsafe",
            "latex": r"\href{https://example.com}{x}",
            "explanation": "",
        },
        {
            "kind": "diagram",
            "title": "unsafe",
            "mermaid": "graph TD\nA-->B\nclick A 'https://example.com'",
        },
        {"kind": "diagram", "title": "unsafe", "mermaid": "%%{init: {}}%%\ngraph TD\nA-->B"},
        {
            "kind": "quiz",
            "question": "Example?",
            "choices": ["a", "b"],
            "answer": 2,
            "explanation": "test",
        },
        {"kind": "clear", "user_element_ids": ["private-drawing"]},
    ],
)
def test_unsafe_or_invalid_tool_is_rejected(tool):
    with pytest.raises(ValueError):
        validate_tool(tool)


def test_regular_diagram_and_formula_are_accepted():
    assert (
        validate_tool(
            {
                "kind": "diagram",
                "title": "Force",
                "mermaid": "graph LR\nA[Force] --> B[Acceleration]",
            }
        ).kind
        == "diagram"
    )
    assert (
        validate_tool(
            {"kind": "formula", "title": "Force", "latex": "F=ma", "explanation": "Force."}
        ).kind
        == "formula"
    )


def test_quiz_answer_matches_a_distinct_choice_without_index_ambiguity():
    example = {
        "kind": "quiz",
        "question": "A 5 kg mass accelerates at 2 m/s². Net force?",
        "choices": ["10 N", "8 N", "6 N", "4 N"],
        "answer": "10 N",
        "explanation": "F = ma = 5 × 2 = 10 N.",
    }
    assert validate_tool(example).answer == "10 N"
    for changed in [{"answer": 1}, {"answer": "Not a choice"}, {"choices": ["10 N", "10 N"]}]:
        with pytest.raises(ValueError):
            validate_tool({**example, **changed})
