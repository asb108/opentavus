import { describe, expect, it } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { parseEvent, parseTool } from "../src/api";
import {
  preserveUserEdits,
  removeAgentElements,
  safeDiagram,
  safeFormula,
} from "../src/features/canvas/ownership";

const element = (id: string, version: number, owner?: string) =>
  ({ id, version, customData: owner ? { owner } : undefined }) as ExcalidrawElement;

describe("drawing ownership", () => {
  it("retains user drawings and promotes edited AI notes before clearing", () => {
    const scene = [
      element("drawing", 1),
      element("untouched", 1, "agent"),
      element("edited", 3, "agent"),
    ];
    const result = preserveUserEdits(
      scene,
      new Map([
        ["untouched", 1],
        ["edited", 1],
      ]),
    );
    expect(removeAgentElements(result).map((value) => value.id)).toEqual(["drawing", "edited"]);
  });
  it("rejects remote links, HTML, directives and macro expansion", () => {
    expect(() => safeDiagram("graph TD\nA[<script>bad</script>] --> B")).toThrow();
    expect(() => safeDiagram("graph TD\nclick A 'https://example.com'")).toThrow();
    expect(() => safeFormula("\\gdef\\a{\\a}\\a")).toThrow();
    expect(() => safeDiagram("graph LR\nA[Mass] --> B[Force]")).not.toThrow();
  });
  it("accepts only validated event and tool boundaries", () => {
    expect(() => parseEvent({ type: "audio", data_b64: "bad" })).toThrow();
    expect(() => parseTool({ kind: "clear", userIds: ["drawing"] })).toThrow();
    expect(() =>
      parseTool({
        kind: "quiz",
        question: "Example?",
        choices: ["A", "B"],
        answer: 2,
        explanation: "Test.",
      }),
    ).toThrow();
    expect(
      parseTool({ kind: "formula", title: "Force", latex: "F=ma", explanation: "Force." }).kind,
    ).toBe("formula");
  });
  it("requires the exact correct choice and rejects ambiguous quiz answers", () => {
    const quiz = {
      kind: "quiz",
      question: "5 kg at 2 m/s²?",
      choices: ["10 N", "8 N"],
      answer: "10 N",
      explanation: "5 × 2 = 10 N.",
    };
    expect(parseTool(quiz)).toEqual(quiz);
    expect(() => parseTool({ ...quiz, answer: 1 })).toThrow();
    expect(() => parseTool({ ...quiz, answer: "6 N" })).toThrow();
    expect(() => parseTool({ ...quiz, choices: ["10 N", "10 N"] })).toThrow();
  });
});
