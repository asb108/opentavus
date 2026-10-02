import type { AudioEvent, VisemeSpan } from "@opentavus/contracts";

export interface PlayoutUpdate {
  type: "caption" | "progress" | "stopped" | "overflow" | "viseme";
  generation: number;
  oldGeneration?: number;
  played?: number;
  text?: string;
  level?: number;
  idle?: boolean;
  done?: boolean;
  shape?: VisemeSpan["shape"] | null;
}

export class Playout {
  private context: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private generation = 0;
  private expectedSample = 0;

  constructor(private readonly onUpdate: (update: PlayoutUpdate) => void) {}

  async prepare(): Promise<void> {
    if (this.context) return this.context.resume();
    this.context = new AudioContext();
    await this.context.resume();
    await this.context.audioWorklet.addModule("/playout-worklet.js");
    this.node = new AudioWorkletNode(this.context, "opentavus-playout", {
      outputChannelCount: [1],
    });
    this.node.port.onmessage = ({ data }: MessageEvent<PlayoutUpdate>) => this.onUpdate(data);
    this.node.connect(this.context.destination);
  }

  reset(generation: number): void {
    this.generation = generation;
    this.expectedSample = 0;
    this.node?.port.postMessage({ type: "reset", generation });
  }

  receive(event: AudioEvent): void {
    if (event.generation_id !== this.generation) return;
    if (
      event.channels !== 1 ||
      event.sample_rate !== 24000 ||
      event.presentation_sample !== this.expectedSample
    ) {
      throw new Error("Speech packets arrived out of order. Reconnect the call.");
    }
    const bytes = atob(event.data_b64);
    if (bytes.length % 2 || bytes.length > 48000) throw new Error("Invalid speech packet.");
    const samples = new Float32Array(bytes.length / 2);
    const visemes = event.visemes || [];
    let previousEnd = 0;
    if (visemes.length > 64) throw new Error("Too many speech mouth cues.");
    for (const cue of visemes) {
      if (
        !Number.isSafeInteger(cue.start_sample) ||
        !Number.isSafeInteger(cue.end_sample) ||
        cue.start_sample < previousEnd ||
        cue.end_sample <= cue.start_sample ||
        cue.end_sample > samples.length ||
        !["rest", "closed", "open", "wide", "round", "pucker", "teeth", "tongue"].includes(
          cue.shape,
        )
      )
        throw new Error("Invalid speech mouth cue.");
      previousEnd = cue.end_sample;
    }
    for (let i = 0; i < samples.length; i++) {
      const unsigned = bytes.charCodeAt(i * 2) | (bytes.charCodeAt(i * 2 + 1) << 8);
      samples[i] = (unsigned >= 32768 ? unsigned - 65536 : unsigned) / 32768;
    }
    this.expectedSample += samples.length;
    this.node?.port.postMessage(
      {
        type: "chunk",
        generation: this.generation,
        samples,
        sampleRate: event.sample_rate,
        caption: event.caption,
        visemes,
      },
      [samples.buffer],
    );
  }

  done(generation: number): void {
    this.node?.port.postMessage({ type: "done", generation });
  }

  async close(): Promise<void> {
    this.node?.disconnect();
    this.node = null;
    await this.context?.close();
    this.context = null;
  }
}
