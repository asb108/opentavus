import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateStockGlb } from "../src/features/avatar/asset";
import { deliveryFor, portraitPose, speechLevel } from "../src/features/avatar/behavior";
import {
  photographicBank,
  validatePhotographicManifest,
} from "../src/features/avatar/photographic-asset";
import { avatarInfo } from "../src/features/avatar/catalog";

function glb(value: unknown): ArrayBuffer {
  const json = new TextEncoder().encode(JSON.stringify(value));
  const length = Math.ceil(json.length / 4) * 4;
  const bytes = new ArrayBuffer(20 + length);
  const view = new DataView(bytes);
  [0x46546c67, 2, bytes.byteLength, length, 0x4e4f534a].forEach((v, i) =>
    view.setUint32(i * 4, v, true),
  );
  const chunk = new Uint8Array(bytes, 20);
  chunk.fill(0x20);
  chunk.set(json);
  return bytes;
}

describe("stock human asset boundary", () => {
  const base = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: 4 }],
    images: [{ bufferView: 0 }],
  };
  it("accepts the actual distributed stock human", () => {
    const bytes = readFileSync(new URL("../../../assets/stock/mira/mira.glb", import.meta.url));
    expect(() => validateStockGlb(Uint8Array.from(bytes).buffer)).not.toThrow();
  });
  it("rejects remote buffers, images and executable decoder extensions", () => {
    expect(() =>
      validateStockGlb(glb({ ...base, buffers: [{ uri: "https://invalid.example/mesh" }] })),
    ).toThrow();
    expect(() =>
      validateStockGlb(glb({ ...base, images: [{ uri: "data:image/svg+xml,<svg/>" }] })),
    ).toThrow();
    expect(() =>
      validateStockGlb(glb({ ...base, extensionsRequired: ["KHR_draco_mesh_compression"] })),
    ).toThrow();
    expect(() => validateStockGlb(glb({ ...base, extensionsUsed: "EXT_texture_webp" }))).toThrow();
  });
  it("rejects truncated, oversized and incompatible GLB data", () => {
    expect(() => validateStockGlb(new ArrayBuffer(0))).toThrow();
    expect(() => validateStockGlb(new ArrayBuffer(8 * 1024 * 1024 + 1))).toThrow();
    expect(() => validateStockGlb(glb({ ...base, asset: { version: "1.0" } }))).toThrow();
    const bytes = glb(base);
    new DataView(bytes).setUint32(12, bytes.byteLength, true);
    expect(() => validateStockGlb(bytes)).toThrow();
  });
});

describe("photographic presentation policy", () => {
  it("uses the companion's delivery and defaults unknown text to neutral", () => {
    expect(deliveryFor("Hello, welcome to our science lesson.")).toBe("warm");
    expect(deliveryFor("However, it depends on the temperature.")).toBe("thoughtful");
    expect(deliveryFor("Plants use sunlight to make sugars.")).toBe("neutral");
    expect(deliveryFor("Use an arbitrary expression URL.")).toBe("neutral");
  });
  it("bounds bad energy and closes immediately at a zero playback signal", () => {
    expect(speechLevel(NaN)).toBe(0);
    expect(speechLevel(Infinity)).toBe(0);
    expect(speechLevel(-1)).toBe(0);
    expect(speechLevel(2)).toBe(1);
    expect(speechLevel(0)).toBe(0);
  });
  it("keeps reduced motion still and returns a bounded blink/pose across loops", () => {
    expect(portraitPose(6300, true)).toEqual({
      phase: 0,
      next: 0,
      mix: 0,
      blink: 0,
      blinkTile: null,
    });
    expect(portraitPose(6300, false).blink).toBeCloseTo(1);
    expect(portraitPose(6400, false)).toEqual(portraitPose(0, false));
    for (const time of [-5, 0, 6000, 6200, 6399, 9999999]) {
      const pose = portraitPose(time, false);
      expect(pose.phase).toBeGreaterThanOrEqual(0);
      expect(pose.phase).toBeLessThan(8);
      expect(pose.blink).toBeGreaterThanOrEqual(0);
      expect(pose.blink).toBeLessThanOrEqual(1);
    }
  });
  it("plays the prepared blink once in closing/opening order instead of reopening at its peak", () => {
    expect([6210, 6260, 6310, 6360].map((time) => portraitPose(time, false, 4).blinkTile)).toEqual([
      32, 33, 34, 35,
    ]);
    expect(portraitPose(6200, false, 4).blinkTile).toBe(null);
    expect(portraitPose(6400, false, 4).blinkTile).toBe(null);
    expect(portraitPose(6310, true, 4).blinkTile).toBe(null);
  });
});

describe("reviewed photographic character selection", () => {
  it("keeps each face's own poster, compositing geometry and AI portrayal disclosure", () => {
    const scientist = photographicBank("einstein")!;
    const mira = photographicBank("mira-photo")!;
    expect(scientist.root).toBe("/avatars/einstein");
    expect(photographicBank("einstein-portrait")).toEqual(scientist);
    expect(photographicBank("portrait")).toEqual(mira);
    expect(photographicBank("orbit")).toBeUndefined();
    const parsed = validatePhotographicManifest(scientist.manifest, scientist.id);
    expect(parsed.regions).not.toEqual(
      validatePhotographicManifest(mira.manifest, mira.id).regions,
    );
    expect(avatarInfo.einstein.label).toContain("AI portrayal");
    expect(avatarInfo.einstein.label).toContain("Synthetic voice");
  });
  it("rejects swapped identities, invalid facial regions, blink sequences and remote/path file IDs", () => {
    const bank = photographicBank("einstein")!;
    const original = bank.manifest as Record<string, unknown>;
    for (const value of [
      { ...original, id: "stock.mira.photographic.v2" },
      { ...original, regions: { mouth: [NaN, 0.5, 0.2, 0.1], eyes: [0.5, 0.4, 0.2, 0.1] } },
      { ...original, regions: { mouth: [0.05, 0.5, 0.2, 0.1], eyes: [0.5, 0.4, 0.2, 0.1] } },
      { ...original, blink_indices: [32, 33, 35, 34] },
      { ...original, files: [{ id: "../unreviewed", bytes: 10, sha256: "0".repeat(64) }] },
      {
        ...original,
        files: Array.from({ length: 5 }, () => ({
          id: "neutral",
          bytes: 10,
          sha256: "0".repeat(64),
        })),
      },
    ])
      expect(() => validatePhotographicManifest(value, bank.id)).toThrow();
  });
});
