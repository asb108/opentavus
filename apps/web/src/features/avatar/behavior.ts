/** Presentation cues for the companion's own delivery; never user-emotion inference. */
export type Delivery = "neutral" | "warm" | "attentive" | "thoughtful";

/** Small contribution point: tune delivery cues without changing audio ownership. */
export function deliveryFor(text: string): Delivery {
  const phrase = text.slice(0, 2000).toLowerCase();
  if (/\b(hello|welcome|thank|thanks|glad|great|well done|good job)\b/.test(phrase)) return "warm";
  if (/\b(consider|compare|however|depends|uncertain|let's think|reason)\b/.test(phrase))
    return "thoughtful";
  return "neutral";
}

export function speechLevel(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value * 6)) : 0;
}

/** A blink meets the neutral head pose at the loop boundary, avoiding a pose jump. */
export function portraitPose(now: number, reduced: boolean) {
  if (reduced) return { phase: 0, next: 0, mix: 0, blink: 0 };
  const time = ((now % 6400) + 6400) % 6400;
  const position = (time / 6400) * 8;
  const phase = Math.floor(position);
  const blink = time > 6200 ? Math.sin(((time - 6200) / 200) * Math.PI) : 0;
  return { phase, next: (phase + 1) % 8, mix: position - phase, blink };
}
