import type { AvatarVariant } from "./catalog";
import type { AvatarFailure } from "./failure";
import type { Delivery } from "./behavior";

/** A trusted renderer boundary. Optional plugins are never imported by metadata URL. */
export interface AvatarRenderer {
  setLevel(level: number): void;
  setListening(listening: boolean): void;
  setDelivery?(delivery: Delivery): void;
  dispose(): void;
}

export async function createAvatar(
  canvas: HTMLCanvasElement,
  variant: AvatarVariant,
  signal: AbortSignal,
  unavailable: (failure: AvatarFailure) => void,
): Promise<AvatarRenderer> {
  signal.throwIfAborted();
  if (variant === "mira-photo") {
    const { createPhotographic } = await import("./photographic");
    signal.throwIfAborted();
    return createPhotographic(canvas, signal);
  }
  if (variant === "mira") {
    const { createHuman } = await import("./human");
    signal.throwIfAborted();
    return createHuman(canvas, signal, unavailable);
  }
  if (variant === "portrait") return { setLevel() {}, setListening() {}, dispose() {} };
  return createCompanion(canvas, variant);
}

export function createCompanion(
  canvas: HTMLCanvasElement,
  variant: "orbit" | "lumen",
): AvatarRenderer {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Character rendering is unavailable.");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let level = 0;
  let targetLevel = 0;
  let listening = false;
  let frame = 0;
  const draw = (now: number) => {
    const scale = Math.min(window.devicePixelRatio, 2);
    const size = 380;
    if (canvas.width !== size * scale) {
      canvas.width = size * scale;
      canvas.height = size * scale;
    }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, size, size);
    level += (targetLevel - level) * 0.38;
    const float = reduced ? 0 : Math.sin(now / 1100) * 4;
    context.save();
    context.translate(190, 178 + float);
    // One original character: softly shaped ceramic face, expressive gaze and speech.
    context.fillStyle = "rgba(12,41,121,0.16)";
    context.beginPath();
    context.ellipse(0, 127 - float, 84, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = variant === "orbit" ? "#f8c94e" : "#b2f1d5";
    context.beginPath();
    context.roundRect(-57, 77, 114, 62, [36, 36, 12, 12]);
    context.fill();
    context.strokeStyle = variant === "orbit" ? "#f8c94e" : "#b2f1d5";
    context.lineWidth = 11;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(0, -105);
    context.lineTo(0, -128);
    context.stroke();
    context.fillStyle = listening ? "#fff9d1" : "#dceaff";
    context.beginPath();
    context.arc(0, -134, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#aec9ff";
    context.beginPath();
    context.roundRect(-116, -44, 30, 75, 14);
    context.roundRect(86, -44, 30, 75, 14);
    context.fill();
    context.fillStyle = "#e4efff";
    context.beginPath();
    context.roundRect(-95, -104, 190, 197, [72, 72, 63, 63]);
    context.fill();
    context.fillStyle = "#f7fbff";
    context.beginPath();
    context.roundRect(-79, -88, 158, 165, [61, 61, 53, 53]);
    context.fill();
    const blink = !reduced && now % 5200 > 5000;
    const gaze = listening && !reduced ? Math.sin(now / 1500) * 3 : 0;
    context.fillStyle = "#143763";
    for (const x of [-32, 32]) {
      context.beginPath();
      context.roundRect(x - 10 + gaze, -28, 20, blink ? 4 : 32, 10);
      context.fill();
      if (!blink) {
        context.fillStyle = "white";
        context.beginPath();
        context.arc(x - 3 + gaze, -20, 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#143763";
      }
    }
    context.fillStyle = "#cadaef";
    context.beginPath();
    context.ellipse(-52, 19, 13, 6, 0, 0, Math.PI * 2);
    context.ellipse(52, 19, 13, 6, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#143763";
    context.beginPath();
    context.ellipse(0, 29, 16 + level * 10, 3 + level * 35, 0, 0, Math.PI * 2);
    context.fill();
    if (level > 0.12) {
      context.fillStyle = "#f9a8b0";
      context.beginPath();
      context.ellipse(0, 33 + level * 13, 10, level * 8, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "#214be4";
    context.beginPath();
    context.arc(0, 111, 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return {
    setLevel(value) {
      targetLevel = Math.min(1, Math.max(0, value * 6));
    },
    setListening(value) {
      listening = value;
    },
    dispose() {
      cancelAnimationFrame(frame);
    },
  };
}
