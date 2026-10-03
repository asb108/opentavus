import type { VisemeSpan } from "@opentavus/contracts";
import { portraitPose, speechLevel, type Delivery } from "./behavior";
import { AvatarFailure } from "./failure";
import type { AvatarRenderer } from "./renderer";
import {
  photographicShapes,
  validatePhotographicManifest,
  type PhotographicBank,
} from "./photographic-asset";

type Shape = VisemeSpan["shape"];
const shapes = photographicShapes;
const openness: Record<Shape, number> = {
  rest: 0,
  closed: 0,
  open: 1,
  wide: 0.55,
  round: 0.7,
  pucker: 0.25,
  teeth: 0.15,
  tongue: 0.3,
};

/** Prepared neural portrait frames; live calls need neither WebGL nor inference. */
export async function createPhotographic(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  bank: PhotographicBank,
): Promise<AvatarRenderer> {
  const manifest = validatePhotographicManifest(bank.manifest, bank.id);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context)
    throw new AvatarFailure(
      "unsupported_graphics",
      "Portrait animation is unavailable. You can continue talking or choose a static portrait.",
    );
  const size = manifest.tile;
  const images = new Map<Delivery, ImageBitmap>();
  const overlay = new OffscreenCanvas(size, size);
  const overlayContext = overlay.getContext("2d");
  if (!overlayContext)
    throw new AvatarFailure(
      "unsupported_graphics",
      "Portrait compositing is unavailable. Choose a static portrait.",
    );
  // Soft masks replace only a coherent facial region; lip changes never fade the entire face.
  const mask = (x: number, y: number, width: number, height: number) => {
    const surface = new OffscreenCanvas(size, size);
    const ctx = surface.getContext("2d")!;
    ctx.translate(x * size, y * size);
    ctx.scale(width * size, height * size);
    const gradient = ctx.createRadialGradient(0, 0, 0.65, 0, 0, 1);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(-1, -1, 2, 2);
    return surface;
  };
  const mouthMask = mask(...manifest.regions.mouth);
  const eyeMask = mask(...manifest.regions.eyes);
  let disposed = false;
  let frame = 0;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    signal.removeEventListener("abort", dispose);
    for (const image of images.values()) image.close();
    images.clear();
    for (const surface of [overlay, mouthMask, eyeMask]) surface.width = surface.height = 1;
  };
  signal.addEventListener("abort", dispose, { once: true });
  try {
    signal.throwIfAborted();
    for (const asset of manifest.files) {
      if (asset.id === "poster") continue;
      const response = await fetch(`${bank.root}/${asset.id}.webp`, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      });
      if (!response.ok || Number(response.headers.get("Content-Length")) > 4 * 1024 * 1024)
        throw new Error("Photographic asset loading failed");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== asset.bytes || bytes.byteLength > 4 * 1024 * 1024)
        throw new Error("Invalid photographic asset size");
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== asset.sha256) throw new Error("Invalid photographic checksum");
      const image = await createImageBitmap(new Blob([bytes], { type: "image/webp" }));
      if (disposed || signal.aborted || image.width !== size * 6 || image.height !== size * 6) {
        image.close();
        throw new Error("Photographic preparation was cancelled or malformed");
      }
      images.set(asset.id as Delivery, image);
    }
    if (images.size !== 4) throw new Error("Photographic expressions are incomplete");
    canvas.width = canvas.height = size;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let level = 0;
    let timedShape: Shape | null = "rest";
    let listening = false;
    let delivery: Delivery = "neutral";
    let last = -Infinity;
    let cue = 0;
    let cueReceivedAt = 0;
    const tile = (
      ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
      image: ImageBitmap,
      index: number,
      opacity: number,
    ) => {
      if (opacity <= 0) return;
      ctx.globalAlpha = opacity;
      ctx.drawImage(
        image,
        (index % 6) * size,
        Math.floor(index / 6) * size,
        size,
        size,
        0,
        0,
        size,
        size,
      );
    };
    const region = (image: ImageBitmap, index: number, mask: OffscreenCanvas) => {
      overlayContext.globalCompositeOperation = "source-over";
      overlayContext.globalAlpha = 1;
      overlayContext.clearRect(0, 0, size, size);
      tile(overlayContext, image, index, 1);
      overlayContext.globalAlpha = 1;
      overlayContext.globalCompositeOperation = "destination-in";
      overlayContext.drawImage(mask, 0, 0);
      context.globalAlpha = 1;
      context.drawImage(overlay, 0, 0);
    };
    const render = (now: number, immediate = false) => {
      if (disposed) return;
      if (!immediate && (document.hidden || now - last < 1000 / 30 - 0.5)) return;
      last = now;
      const current = listening && level === 0 ? "attentive" : delivery;
      const shape = timedShape ?? (level === 0 ? "rest" : level > 0.6 ? "open" : "wide");
      const pose = portraitPose(now, reducedMotion.matches, manifest.poses);
      const image = images.get(current)!;
      // One coherent head pose avoids doubled eyes/hair from crossfading photographs.
      const head = pose.mix < 0.5 ? pose.phase : pose.next;
      tile(context, image, head * 8, 1);
      const index = shapes.indexOf(shape);
      if (index > 0) region(image, head * 8 + index, mouthMask);
      if (pose.blinkTile !== null) {
        region(image, pose.blinkTile, eyeMask);
      }
      context.globalAlpha = 1;
      canvas.dataset.expression = current;
      canvas.dataset.mouth = String(openness[shape]);
      canvas.dataset.viseme = shape;
      canvas.dataset.timing = timedShape === null ? "energy-fallback" : "phoneme";
      canvas.dataset.blinkTile = pose.blinkTile === null ? "" : String(pose.blinkTile);
      if (canvas.dataset.cue !== String(cue)) {
        canvas.dataset.cue = String(cue);
        canvas.dataset.cueReceivedAt = String(cueReceivedAt);
        canvas.dataset.cueRenderedAt = String(performance.now());
      }
    };
    const draw = (now: number) => {
      if (disposed) return;
      render(now);
      frame = requestAnimationFrame(draw);
    };
    render(performance.now(), true);
    frame = requestAnimationFrame(draw);
    return {
      setLevel(value) {
        if (disposed) return;
        level = speechLevel(value);
      },
      setViseme(shape) {
        if (disposed) return;
        timedShape = shape;
        cueReceivedAt = performance.now();
        cue++;
        // Stop closes immediately; ordinary articulation retains the 30 FPS cap.
        if (shape === "rest" && level === 0) render(cueReceivedAt, true);
      },
      setListening(value) {
        listening = value;
      },
      setDelivery(value) {
        delivery = value;
      },
      dispose,
    };
  } catch (error) {
    dispose();
    if (signal.aborted) throw error;
    throw new AvatarFailure(
      "asset_unavailable",
      "Photographic motion could not load. The portrait and call still work; rebuild the app and refresh.",
    );
  }
}
