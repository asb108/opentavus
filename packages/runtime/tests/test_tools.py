import pytest
from opentavus_runtime.policies import should_interrupt, split_phrases
from opentavus_runtime.tools import DiagramPlan, board_requested, requested_kinds, validate_tool


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


@pytest.mark.parametrize(
    "question",
    [
        "diagrams on the board.",
        "Explain photosynthesis with the help of diagrams.",
        "Create a fluid diagram on the right hand side.",
        "Show the equations on the canvas.",
        "Draw the photosynthesis process.",
        "Make a flow chart.",
        "Make a quiz.",
    ],
)
def test_explicit_board_requests_do_not_require_teaching_mode(question):
    assert board_requested(question)


@pytest.mark.parametrize(
    "question",
    [
        "Hello Orbit.",
        "What's going on in the market?",
        "Can you inspect my diagram?",
        "Don't draw a diagram, just explain it.",
        "Do not use the board.",
        "Please don't make a flowchart.",
        "Do not generate any formulas.",
    ],
)
def test_ordinary_chat_inspection_and_refusal_do_not_generate_board_content(question):
    assert not board_requested(question)


def test_explicit_refusal_overrides_teaching_mode():
    assert not board_requested("Do not use the board.", teaching=True)


def test_plural_and_spoken_tool_names_select_the_expected_output():
    assert requested_kinds("diagrams on the board") == ["diagram"]
    assert requested_kinds("draw a flow chart") == ["diagram"]
    assert requested_kinds("show formulas and quizzes") == ["formula", "quiz"]
    assert requested_kinds("Make a quiz.") == ["quiz"]
    assert requested_kinds("Draw an equation.") == ["formula"]
    assert requested_kinds("Draw a note about the concept.") == ["note"]


def test_process_diagram_preserves_labels_and_keeps_outputs_on_separate_branches():
    plan = DiagramPlan.model_validate(
        {
            "kind": "diagram",
            "title": "Photosynthesis",
            "inputs": ["Sunlight", "Carbon dioxide (CO2)", "Water"],
            "outputs": ["Glucose + stored energy", "Oxygen"],
        }
    )
    source = plan.diagram().mermaid
    assert 'B["Carbon dioxide (CO2)"]' in source
    assert "B --> P" in source and "P --> D" in source and "P --> E" in source
    assert "D --> E" not in source and "E --> D" not in source
    assert validate_tool(plan.diagram().model_dump()).kind == "diagram"


@pytest.mark.parametrize(
    "changed",
    [
        {"inputs": ["Water", "water"]},
        {"outputs": []},
        {"title": "<script>"},
        {"inputs": ['Unclosed ["']},
        {"outputs": ["https://example.com"]},
        {"inputs": ["x"] * 7},
    ],
)
def test_generated_process_rejects_ambiguous_missing_or_unsafe_content(changed):
    value = {
        "kind": "diagram",
        "title": "Photosynthesis",
        "inputs": ["Sunlight"],
        "outputs": ["Glucose"],
    }
    with pytest.raises(ValueError):
        DiagramPlan.model_validate({**value, **changed}).diagram()
