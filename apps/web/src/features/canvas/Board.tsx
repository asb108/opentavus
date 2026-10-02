import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
  exportToBlob,
  restoreElements,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Download, Eraser, PenLine, Sparkles, X } from "lucide-react";
import DOMPurify from "dompurify";
import katex from "katex";
import { parseTool, type TeachingTool } from "../../api";
import { preserveUserEdits, removeAgentElements, safeDiagram, safeFormula } from "./ownership";

type TeachingCard = { id: string; tool: TeachingTool; html?: string };
export interface BoardHandle {
  apply(id: string, value: unknown, isCurrent: () => boolean): Promise<boolean>;
}
const STORAGE_KEY = "opentavus.board.v1";

function loadBoard(): readonly ExcalidrawElement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 1000000) return [];
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value) && value.length < 500) {
      const valid = value.every((element: unknown) => {
        if (!element || typeof element !== "object") return false;
        const e = element as Record<string, unknown>;
        return (
          typeof e.id === "string" &&
          e.id.length <= 100 &&
          typeof e.type === "string" &&
          [
            "rectangle",
            "diamond",
            "ellipse",
            "arrow",
            "line",
            "freedraw",
            "text",
            "image",
            "frame",
            "embeddable",
          ].includes(e.type) &&
          [e.x, e.y, e.width, e.height, e.version].every(
            (number) => typeof number === "number" && Number.isFinite(number),
          )
        );
      });
      if (valid) return restoreElements(value as ExcalidrawElement[], null);
    }
  } catch {
    /* A corrupted or unavailable local store starts with an empty board. */
  }
  return [];
}

export const Board = forwardRef<BoardHandle, { onTeach: () => void; busy: boolean }>(function Board(
  { onTeach, busy },
  ref,
) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [cards, setCards] = useState<TeachingCard[]>([]);
  const [error, setError] = useState("");
  const [initial] = useState(loadBoard);
  const versions = useRef(
    new Map(initial.filter((e) => e.customData?.owner === "agent").map((e) => [e.id, e.version])),
  );
  const operations = useRef(new Set<string>());
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saved = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);
  useEffect(
    () => () => {
      if (saved.current) clearTimeout(saved.current);
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      async apply(id, value, isCurrent) {
        if (operations.current.has(id)) return true;
        try {
          const tool = parseTool(value);
          let html: string | undefined;
          if (tool.kind === "formula") {
            safeFormula(tool.latex);
            html = katex.renderToString(tool.latex, {
              displayMode: true,
              throwOnError: true,
              trust: false,
              strict: "error",
              maxExpand: 500,
              maxSize: 6,
            });
          }
          if (tool.kind === "diagram") {
            safeDiagram(tool.mermaid);
            const { default: mermaid } = await import("mermaid");
            mermaid.initialize({
              startOnLoad: false,
              securityLevel: "strict",
              maxTextSize: 2000,
              maxEdges: 40,
              flowchart: { htmlLabels: false },
              theme: "neutral",
            });
            const rendered = await mermaid.render(`board-${id}`, tool.mermaid);
            html = DOMPurify.sanitize(rendered.svg, {
              USE_PROFILES: { svg: true, svgFilters: true },
              FORBID_TAGS: ["foreignObject", "a", "script", "image"],
              FORBID_ATTR: ["href", "xlink:href"],
            });
            if (/url\(\s*["']?(https?:|data:|\/\/)/i.test(html))
              throw new Error("Diagram references external content.");
          }
          if (!isCurrent()) return false;
          const canvas = apiRef.current;
          if (!canvas) return false;
          if (tool.kind === "clear") {
            canvas.updateScene({ elements: removeAgentElements(canvas.getSceneElements()) });
            setCards([]);
          } else if (tool.kind === "note") {
            const y = 40 + [...versions.current.keys()].length * 130;
            const elements = convertToExcalidrawElements([
              {
                type: "text",
                x: 40,
                y,
                text: `${tool.title}\n${tool.text}`,
                width: 440,
                fontSize: 20,
                fontFamily: 2,
                strokeColor: "#193b73",
                customData: { owner: "agent", operationId: id },
              },
            ]);
            for (const element of elements) versions.current.set(element.id, element.version);
            canvas.updateScene({ elements: [...canvas.getSceneElements(), ...elements] });
            canvas.scrollToContent(elements, { fitToContent: true, animate: false });
          } else {
            setCards((previous) => [...previous, { id, tool, html }].slice(-12));
          }
          operations.current.add(id);
          setError("");
          // Let the React commit and browser painting happen before confirming a visible result.
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          return isCurrent();
        } catch (failure) {
          setError(
            failure instanceof Error ? failure.message : "This board update could not render.",
          );
          return false;
        }
      },
    }),
    [],
  );

  const exportBoard = async () => {
    if (!api) return;
    try {
      const blob = await exportToBlob({
        elements: api.getSceneElements(),
        appState: {
          ...api.getAppState(),
          exportWithDarkMode: false,
          exportBackground: true,
        },
        files: api.getFiles(),
        mimeType: "image/png",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "opentavus-board.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {
      setError("Draw or add a note before exporting the canvas.");
    }
  };
  const exportLesson = () => {
    const content = cards
      .map(({ tool }) => {
        if (tool.kind === "formula")
          return `## ${tool.title}\n\n$$${tool.latex}$$\n\n${tool.explanation}`;
        if (tool.kind === "diagram")
          return `## ${tool.title}\n\n\`\`\`mermaid\n${tool.mermaid}\n\`\`\``;
        if (tool.kind === "quiz")
          return `## ${tool.question}\n\n${tool.choices.map((choice, i) => `${i + 1}. ${choice}`).join("\n")}\n\nAnswer: ${tool.answer}. ${tool.explanation}`;
        return "";
      })
      .join("\n\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
    link.download = "opentavus-lesson.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  return (
    <section className="board" aria-label="Shared teaching board">
      <header className="board-header">
        <div>
          <PenLine size={18} />
          <h2>Room to think</h2>
          <span>Your shared canvas</span>
        </div>
        <button className="board-teach" onClick={onTeach} disabled={busy}>
          <Sparkles size={16} /> Teach on board
        </button>
      </header>
      {error && (
        <div className="board-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss board error">
            <X size={16} />
          </button>
        </div>
      )}
      {cards.length > 0 && (
        <div className="lesson-cards" aria-label="Teaching notes and practice">
          <p className="lesson-label">
            AI lesson · Review the answers and ask follow-up questions.
          </p>
          {cards.map(({ id, tool, html }) => (
            <article className="lesson-card" key={id}>
              {(tool.kind === "formula" || tool.kind === "diagram") && (
                <>
                  <h3>{tool.title}</h3>
                  <div
                    className="rendered-lesson"
                    dangerouslySetInnerHTML={{ __html: html || "" }}
                  />
                  {tool.kind === "formula" && <p>{tool.explanation}</p>}
                  <details>
                    <summary>View source</summary>
                    <pre>{tool.kind === "formula" ? tool.latex : tool.mermaid}</pre>
                  </details>
                </>
              )}
              {tool.kind === "quiz" && <Quiz tool={tool} />}
            </article>
          ))}
        </div>
      )}
      <div className="drawing-area">
        <Excalidraw
          excalidrawAPI={setApi}
          initialData={{
            elements: initial,
            appState: {
              viewBackgroundColor: "#fcfdff",
              currentItemStrokeColor: "#193b73",
              currentItemFontFamily: 2,
            },
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              toggleTheme: false,
            },
          }}
          onChange={(elements: readonly ExcalidrawElement[]) => {
            const owned = preserveUserEdits(elements, versions.current);
            if (owned.some((element, i) => element !== elements[i]))
              apiRef.current?.updateScene({ elements: owned });
            if (saved.current) clearTimeout(saved.current);
            saved.current = setTimeout(() => {
              try {
                if (owned.length < 500) localStorage.setItem(STORAGE_KEY, JSON.stringify(owned));
              } catch {
                /* Storage quota does not stop the live drawing session. */
              }
            }, 500);
          }}
        />
      </div>
      <footer className="board-footer">
        <span>
          <span className="small-dot" /> Your drawings stay yours
        </span>
        <div>
          <button
            onClick={() => {
              if (api) api.updateScene({ elements: removeAgentElements(api.getSceneElements()) });
              setCards([]);
            }}
            title="Remove only AI-authored content"
          >
            <Eraser size={15} /> Clear AI notes
          </button>
          <button onClick={exportBoard}>
            <Download size={15} /> Canvas
          </button>
          {cards.length > 0 && (
            <button onClick={exportLesson}>
              <Download size={15} /> Lesson
            </button>
          )}
        </div>
      </footer>
    </section>
  );
});

function Quiz({ tool }: { tool: Extract<TeachingTool, { kind: "quiz" }> }) {
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <>
      <span className="practice-label">A little practice</span>
      <h3>{tool.question}</h3>
      <div className="quiz-choices">
        {tool.choices.map((choice, index) => (
          <button
            key={choice + index}
            disabled={chosen !== null}
            className={chosen === index ? (choice === tool.answer ? "correct" : "incorrect") : ""}
            onClick={() => setChosen(index)}
          >
            <span>{String.fromCharCode(65 + index)}</span>
            {choice}
          </button>
        ))}
      </div>
      {chosen !== null && (
        <p className="quiz-feedback" role="status">
          {tool.choices[chosen] === tool.answer
            ? "That's right. "
            : `The answer is ${tool.answer}. `}
          {tool.explanation}
        </p>
      )}
    </>
  );
}
