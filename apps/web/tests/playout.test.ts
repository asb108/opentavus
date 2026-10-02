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
