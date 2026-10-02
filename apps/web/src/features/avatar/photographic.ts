import manifest from "../../../../../assets/stock/photographic/manifest.json";
import { portraitPose, speechLevel, type Delivery } from "./behavior";
import { AvatarFailure } from "./failure";
import type { AvatarRenderer } from "./renderer";

/** Trusted, prepared photographic frames. Live calls never load inference models. */
export async function createPhotographic(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<AvatarRenderer> {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context)
    throw new AvatarFailure(
      "unsupported_graphics",
      "Portrait animation is unavailable. You can continue talking or choose a static portrait.",
    );
  if (
    manifest.eligibility !== "reviewed_permissive" ||
    manifest.tile !== 384 ||
    manifest.grid !== 6
  )
    throw new AvatarFailure(
      "asset_unavailable",
      "Photographic assets are not prepared. Choose another character and rebuild the app.",
    );
  const images = new Map<Delivery, ImageBitmap>();
  let disposed = false;
  let frame = 0;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    signal.removeEventListener("abort", dispose);
    for (const image of images.values()) image.close();
    images.clear();
  };
  signal.addEventListener("abort", dispose, { once: true });
  try {
    signal.throwIfAborted();
    for (const asset of manifest.files) {
      if (asset.id === "poster") continue;
      const response = await fetch(`/avatars/photo/${asset.id}.webp`, {
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
      if (disposed || signal.aborted || image.width !== 2304 || image.height !== 2304) {
        image.close();
        throw new Error("Photographic preparation was cancelled or malformed");
      }
      images.set(asset.id as Delivery, image);
    }
    if (images.size !== 4) throw new Error("Photographic expressions are incomplete");
    canvas.width = canvas.height = 384;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let level = 0;
    let mouth = 0;
    let listening = false;
    let delivery: Delivery = "neutral";
    let current: Delivery = "neutral";
    let previous: Delivery = "neutral";
    let transition = -Infinity;
    let last = -Infinity;
    const tile = (image: ImageBitmap, index: number, opacity: number) => {
      if (opacity <= 0) return;
      context.globalAlpha = opacity;
      context.drawImage(
        image,
        (index % 6) * 384,
        Math.floor(index / 6) * 384,
        384,
        384,
        0,
        0,
        384,
        384,
      );
    };
    const render = (now: number, immediate = false) => {
      if (disposed) return;
      if (!immediate && (document.hidden || now - last < 1000 / 30 - 0.5)) return;
      last = now;
      // Level zero closes immediately; smoothing only shapes ongoing speech.
      mouth = level === 0 ? 0 : mouth + (level - mouth) * 0.6;
      const desired = listening && level === 0 ? "attentive" : delivery;
      if (desired !== current) {
        previous = current;
        current = desired;
        transition = now;
      }
      const expressionMix = Math.min(1, (now - transition) / 220);
      const pose = portraitPose(now, reducedMotion.matches);
      const position = mouth * 3;
      const lower = Math.floor(position);
      const upper = Math.min(3, lower + 1);
      const mix = position - lower;
      const image = images.get(current)!;
      // Normalize each compositing step so bilinear weights sum to one.
      const weights = [
        [pose.phase * 4 + lower, (1 - pose.mix) * (1 - mix)],
        [pose.phase * 4 + upper, (1 - pose.mix) * mix],
        [pose.next * 4 + lower, pose.mix * (1 - mix)],
        [pose.next * 4 + upper, pose.mix * mix],
      ];
      let total = 0;
      for (const [index, weight] of weights) {
        if (weight <= 0) continue;
        total += weight;
        tile(image, index, weight / total);
      }
      if (mouth === 0 && pose.blink > 0) {
        const index = Math.min(2, Math.floor(pose.blink * 3));
        tile(image, 32 + index, pose.blink);
      }
      if (expressionMix < 1) tile(images.get(previous)!, pose.phase * 4 + lower, 1 - expressionMix);
      context.globalAlpha = 1;
      canvas.dataset.expression = current;
      canvas.dataset.mouth = String(mouth);
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
        if (level === 0 && mouth > 0) render(performance.now(), true);
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
