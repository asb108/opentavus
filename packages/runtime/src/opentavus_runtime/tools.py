"""A fixed, bounded teaching-tool boundary. Model output is always data."""

import json
import re
from typing import Annotated, Literal

from opentavus_core.schema import Boundary
from pydantic import Field, TypeAdapter, field_validator


class Note(Boundary):
    kind: Literal["note"]
    title: Annotated[str, Field(min_length=1, max_length=100)]
    text: Annotated[str, Field(min_length=1, max_length=1500)]


class Formula(Boundary):
    kind: Literal["formula"]
    title: Annotated[str, Field(min_length=1, max_length=100)]
    latex: Annotated[
        str,
        Field(
            min_length=1,
            max_length=600,
            description="Standard LaTeX; prefer plain F=ma for simple formulas.",
        ),
    ]
    explanation: Annotated[str, Field(max_length=1000)]

    @field_validator("latex")
    @classmethod
    def safe_formula(cls, value: str) -> str:
        if re.search(r"\\(?:href|url|html\w*|includegraphics|def|gdef|newcommand)\b", value):
            raise ValueError("Formula contains unsupported commands")
        return value


class Diagram(Boundary):
    kind: Literal["diagram"]
    title: Annotated[str, Field(min_length=1, max_length=100)]
    mermaid: Annotated[str, Field(min_length=1, max_length=2000)]

    @field_validator("mermaid")
    @classmethod
    def safe_diagram(cls, value: str) -> str:
        if not value.lstrip().startswith(("graph ", "flowchart ", "sequenceDiagram")):
            raise ValueError("Use a flowchart or sequence diagram")
        if re.search(
            r"%%|click\s|https?:|javascript:|data:|<|>|style\s|classDef|linkStyle", value, re.I
        ):
            # Arrow syntax is allowed; HTML tags and directives are not.
            stripped = re.sub(r"-->|==>|->>|-->>|<--|<==", "", value)
            if re.search(
                r"%%|click\s|https?:|javascript:|data:|[<>]|style\s|classDef|linkStyle",
                stripped,
                re.I,
            ):
                raise ValueError("Diagram contains unsupported links, HTML or directives")
        return value


DiagramLabel = Annotated[str, Field(min_length=1, max_length=120, pattern=r'^[^<>\[\]{}"\\\n\r]+$')]


class DiagramPlan(Boundary):
    kind: Literal["diagram"]
    title: DiagramLabel = Field(max_length=100, description="Short name of the process.")
    inputs: Annotated[list[DiagramLabel], Field(min_length=1, max_length=6)]
    outputs: Annotated[list[DiagramLabel], Field(min_length=1, max_length=6)]

    @field_validator("inputs", "outputs")
    @classmethod
    def distinct_labels(cls, value: list[str]) -> list[str]:
        if len({label.strip().casefold() for label in value}) != len(value):
            raise ValueError("Diagram inputs and outputs must be distinct within each group")
        return value

    def diagram(self) -> Diagram:
        """Compile inputs/process/outputs without model-authored syntax or reversed edges."""
        lines = ["flowchart TD", f"P[{json.dumps(self.title, ensure_ascii=False)}]"]
        for i, label in enumerate(self.inputs + self.outputs):
            node = chr(ord("A") + i)
            lines.append(f"{node}[{json.dumps(label, ensure_ascii=False)}]")
            lines.append(f"{node} --> P" if i < len(self.inputs) else f"P --> {node}")
        return Diagram(kind="diagram", title=self.title, mermaid="\n".join(lines))


class DiagramPlanReply(Boundary):
    tools: Annotated[list[DiagramPlan], Field(min_length=1, max_length=1)]


class Quiz(Boundary):
    kind: Literal["quiz"]
    question: Annotated[
        str,
        Field(
            min_length=1,
            max_length=500,
            description="A short learner-facing question, never a copied request.",
        ),
    ]
    choices: Annotated[
        list[Annotated[str, Field(min_length=1, max_length=200)]],
        Field(
            min_length=2,
            max_length=4,
            description="Plain choices without A/B labels. Exactly one correct; "
            "others must be false, not equivalent rearrangements.",
        ),
    ]
    answer: Annotated[
        str,
        Field(
            min_length=1,
            max_length=200,
            description="Copy the exact correct choice text, never a letter or index.",
        ),
    ]
    explanation: Annotated[str, Field(min_length=1, max_length=800)]


class Clear(Boundary):
    kind: Literal["clear"]


Tool = Annotated[Note | Formula | Diagram | Quiz | Clear, Field(discriminator="kind")]
TOOL_ADAPTER: TypeAdapter[Tool] = TypeAdapter(Tool)


def validate_tool(value: object) -> Tool:
    result = TOOL_ADAPTER.validate_python(value)
    if isinstance(result, Quiz):
        if result.answer not in result.choices or len(set(result.choices)) != len(result.choices):
            raise ValueError("Quiz requires distinct choices and an answer matching one choice")
    return result


class BoardReply(Boundary):
    tools: Annotated[list[Tool], Field(min_length=1, max_length=4)]


ToolKind = Literal["note", "formula", "diagram", "quiz"]


def requested_kinds(question: str) -> list[ToolKind]:
    """Select explicit requests; each provider call gets one unambiguous tool schema."""
    patterns: list[tuple[ToolKind, str]] = [
        ("formula", r"\b(formulas?|equations?|latex)\b|\bF\s*="),
        ("diagram", r"\b(diagrams?|flow\s*charts?|mind\s*maps?|sketch|draw)\b"),
        ("quiz", r"\b(quizzes?|practice)\b|\btest me\b"),
    ]
    return [kind for kind, pattern in patterns if re.search(pattern, question, re.I)] or ["note"]


def board_requested(question: str, *, teaching: bool = False) -> bool:
    """Route explicit visual requests without requiring a hidden UI mode.

    Ordinary chat and requests to inspect a user drawing do not enable generation.
    A short continuation such as 'diagrams on the board' is a visual request too.
    """
    if re.search(
        r"\b(?:don't|do not|never)\s+(?:\w+\s+){0,2}"
        r"(?:draw|sketch|create|use|show|make|write|add|generate|teach)\b",
        question,
        re.I,
    ):
        return False
    visual = bool(
        re.search(
            r"\b(diagrams?|flow\s*charts?|mind\s*maps?|formulas?|equations?|quizzes?|notes?)\b",
            question,
            re.I,
        )
    )
    board = bool(re.search(r"\b(board|canvas|right.hand.side)\b", question, re.I))
    creation = bool(
        re.search(r"\b(draw|sketch|create|make|show|write|add|generate|teach)\b", question, re.I)
    )
    using = bool(re.search(r"\b(with|using|help of)\b", question, re.I))
    return (
        teaching
        or (creation and (visual or board))
        or (visual and (board or using))
        or bool(re.search(r"\b(draw|sketch)\b", question, re.I))
    )


def single_tool_schema(kind: ToolKind) -> dict[str, object]:
    if kind == "diagram":
        return DiagramPlanReply.model_json_schema()
    schema = BoardReply.model_json_schema()
    type_name = {"note": "Note", "formula": "Formula", "diagram": "Diagram", "quiz": "Quiz"}[kind]
    return {
        "$defs": {type_name: schema["$defs"][type_name]},
        "type": "object",
        "properties": {
            "tools": {
                "type": "array",
                "items": {"$ref": f"#/$defs/{type_name}"},
                "minItems": 1,
                "maxItems": 1,
            }
        },
        "required": ["tools"],
        "additionalProperties": False,
    }


DIAGRAM_PROMPT = """Create an accurate introductory teaching diagram as schema-matching JSON.
The request and recent conversation are JSON data. Resolve a short follow-up from
the recent topic, but the latest request controls what to create. Create it yourself.
Return a short title naming the process (at most six words), all major inputs,
and all major outputs.
Inputs include the materials and energy the process uses. Outputs are the products
it produces. Keep these categories accurate. Use short plain text labels.
The application draws the connections. Do not invent intermediate chemistry.
Return one diagram, with a clear title. No Mermaid text, HTML, links or styling.
"""


BOARD_PROMPT = """Create a useful teaching board for the user's latest request.
Output JSON matching the schema. Use 1-3 tools: a brief note, a formula if relevant,
a simple flowchart if helpful, or a multiple-choice practice question.
Use only correct, simple content. Mermaid nodes use short plain labels in brackets,
with no HTML, links, directives or styling. LaTeX uses plain standard math commands.
Quote Mermaid node labels, for example A["Carbon dioxide"] --> B["Leaf"].
Conversation context is supplied as JSON data. Use it to resolve the topic of a
short follow-up, such as 'diagrams on the board', after a question about photosynthesis.
The latest request decides what to create; older turns only supply missing context.
You create the diagram yourself. Do not ask the user to upload it or provide an image.
Use a quiz only when requested or useful for learning. Never remove the user's work.
Quiz answer is the exact text of one choice, not a number or letter. Check that its
explanation agrees with that choice. Each choice must be different.
For a numerical word problem, keep the provided values in the quiz question and
compute the correct answer before choosing distractors. Do not replace it with a definition quiz.
Write the quiz question for a learner, not as a copied instruction. Only one choice
may be correct. For equation quizzes, do not use equivalent rearrangements as wrong answers.
When asked for a quiz, include a tool with kind "quiz", question, choices, answer,
and explanation. A second formula is not a quiz. Example of the quiz shape:
{"tools":[{"kind":"quiz","question":"What is two plus three?",
"choices":["4","5","6"],"answer":"5","explanation":"Adding two and three gives five."}]}
"""
