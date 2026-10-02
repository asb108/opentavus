import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

function worklet() {
  const events: Record<string, unknown>[] = [];
  const sandbox = {
    sampleRate: 48000,
    AudioWorkletProcessor: class {
      port = {
        onmessage: (_value: { data: unknown }) => {},
        postMessage: (value: Record<string, unknown>) => events.push(value),
      };
    },
    registerProcessor: (_name: string, value: unknown) => {
      processor = value;
    },
  };
  let processor: unknown;
  vm.runInNewContext(
    readFileSync(new URL("../public/playout-worklet.js", import.meta.url), "utf8"),
    sandbox,
  );
  const Constructor = processor as new () => {
    port: { onmessage: (value: { data: unknown }) => void };
    process: (inputs: never[], outputs: Float32Array[][]) => boolean;
  };
  return { instance: new Constructor(), events };
}

describe("single-clock playout", () => {
  it("flushes queued speech on reset and rejects a late old generation", () => {
    const { instance, events } = worklet();
    instance.port.onmessage({ data: { type: "reset", generation: 1 } });
    instance.port.onmessage({
      data: {
        type: "chunk",
        generation: 1,
        samples: new Float32Array(1000).fill(0.5),
        sampleRate: 24000,
        caption: "Current phrase",
      },
    });
    const first = new Float32Array(128);
    instance.process([], [[first]]);
    expect(first.every((sample) => sample === 0.5)).toBe(true);
    instance.port.onmessage({ data: { type: "reset", generation: 2 } });
    instance.port.onmessage({
      data: {
        type: "chunk",
        generation: 1,
        samples: new Float32Array(1000).fill(0.9),
        sampleRate: 24000,
      },
    });
    const after = new Float32Array(128).fill(1);
    instance.process([], [[after]]);
    expect(after.every((sample) => sample === 0)).toBe(true);
    expect(events.filter((event) => event.type === "caption")).toHaveLength(1);
    expect(events.some((event) => event.type === "stopped" && event.oldGeneration === 1)).toBe(
      true,
    );
  });
  it("counts source samples on a different browser rate without replaying chunks", () => {
    const { instance, events } = worklet();
    instance.port.onmessage({
      data: {
        type: "chunk",
        generation: 0,
        samples: new Float32Array(128).fill(0.25),
        sampleRate: 24000,
        caption: "Once",
      },
    });
    for (let i = 0; i < 20; i++) instance.process([], [[new Float32Array(128)]]);
    const progress = events.filter((event) => event.type === "progress");
    expect(progress[0].played).toBe(128);
    expect(events.filter((event) => event.type === "caption")).toHaveLength(1);
  });
});

it("mouth shapes follow played samples at a resampled rate, including silence and untimed fallback", () => {
  const { instance, events } = worklet();
  const render = (count: number) => {
    for (let i = 0; i < count; i++) instance.process([], [[new Float32Array(128)]]);
  };
  instance.port.onmessage({
    data: {
      type: "chunk",
      generation: 0,
      samples: new Float32Array(256).fill(0.5),
      sampleRate: 24000,
      visemes: [
        { shape: "closed", start_sample: 0, end_sample: 128 },
        { shape: "round", start_sample: 128, end_sample: 256 },
      ],
    },
  });
  render(2); // 256 browser samples = 128 source samples.
  expect(events.filter((e) => e.type === "viseme").map((e) => e.shape)).toEqual(["closed"]);
  render(2);
  expect(events.filter((e) => e.type === "viseme").map((e) => e.shape)).toEqual([
    "closed",
    "round",
  ]);
  expect(events.find((e) => e.shape === "round")?.played).toBe(128);
  render(1);
  expect(events.filter((e) => e.type === "viseme").at(-1)?.shape).toBe("rest");
  instance.port.onmessage({
    data: {
      type: "chunk",
      generation: 0,
      samples: new Float32Array(128).fill(0.5),
      sampleRate: 24000,
    },
  });
  render(1);
  expect(events.filter((e) => e.type === "viseme").at(-1)?.shape).toBe(null);
});

it("flushes mouth cues along with buffered PCM and ignores late old-generation cues", () => {
  const { instance, events } = worklet();
  const chunk = (generation: number) => ({
    type: "chunk",
    generation,
    samples: new Float32Array(256).fill(0.5),
    sampleRate: 24000,
    visemes: [{ shape: "open", start_sample: 0, end_sample: 256 }],
  });
  instance.port.onmessage({ data: chunk(0) });
  instance.process([], [[new Float32Array(128)]]);
  expect(events.filter((e) => e.type === "viseme").at(-1)?.shape).toBe("open");
  instance.port.onmessage({ data: { type: "reset", generation: 1 } });
  const boundary = events.length;
  instance.port.onmessage({ data: chunk(0) });
  for (let i = 0; i < 20; i++) instance.process([], [[new Float32Array(128)]]);
  expect(events.slice(boundary).some((e) => e.type === "viseme" && e.shape !== "rest")).toBe(false);
  expect(events.filter((e) => e.type === "stopped").at(-1)?.generation).toBe(1);
});
