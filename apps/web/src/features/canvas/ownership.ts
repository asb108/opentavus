import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export function preserveUserEdits(
  elements: readonly ExcalidrawElement[],
  versions: ReadonlyMap<string, number>,
): ExcalidrawElement[] {
  return elements.map((element) => {
    const original = versions.get(element.id);
    if (
      element.customData?.owner === "agent" &&
      original !== undefined &&
      element.version > original
    ) {
      return { ...element, customData: { ...element.customData, owner: "user" } };
    }
    return element;
  });
}

export function removeAgentElements(elements: readonly ExcalidrawElement[]): ExcalidrawElement[] {
  return elements.filter((element) => element.customData?.owner !== "agent");
}

export function safeDiagram(source: string): void {
  if (source.length > 2000 || !/^(graph |flowchart |sequenceDiagram)/.test(source.trim())) {
    throw new Error("Use a short flowchart or sequence diagram.");
  }
  const plain = source.replace(/-->|==>|->>|-->>|<--|<==/g, "");
  if (/%%|click\s|https?:|javascript:|data:|[<>]|style\s|classDef|linkStyle/i.test(plain)) {
    throw new Error("Links, HTML and directives are unavailable on the teaching board.");
  }
}

export function safeFormula(source: string): void {
  if (
    source.length > 600 ||
    /\\(?:href|url|html\w*|includegraphics|def|gdef|newcommand)\b/.test(source)
  ) {
    throw new Error("Use a short formula with standard math commands.");
  }
}
