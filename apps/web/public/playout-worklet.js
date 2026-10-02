// A single audio clock owns speech, caption start, avatar energy and progress.
class OpenTavusPlayout extends AudioWorkletProcessor {
  constructor() {
    super();
    this.generation = 0;
    this.queue = [];
    this.current = null;
    this.position = 0;
    this.played = 0;
    this.phase = 0;
    this.tick = 0;
    this.completed = false;
    this.port.onmessage = ({ data }) => {
      if (data.type === "reset") {
        const old = this.generation;
        const played = this.played;
        this.generation = data.generation;
        this.queue = [];
        this.current = null;
        this.position = this.played = this.phase = 0;
        this.completed = false;
        this.port.postMessage({ type: "stopped", oldGeneration: old, played });
      } else if (data.generation === this.generation && data.type === "chunk") {
        // The server bounds in-flight audio; a malformed sender also hits this guard.
        if (this.queue.length < 64) this.queue.push(data);
        else this.port.postMessage({ type: "overflow" });
      } else if (data.type === "done" && data.generation === this.generation) {
        this.completed = true;
      }
    };
  }
  process(_inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) return true;
    let energy = 0;
    for (let i = 0; i < output.length; i++) {
      if (!this.current) {
        this.current = this.queue.shift() || null;
        this.position = 0;
        this.phase = 0;
        if (this.current?.caption)
          this.port.postMessage({
            type: "caption",
            generation: this.generation,
            text: this.current.caption,
          });
      }
      if (this.current) {
        const samples = this.current.samples;
        const a = Math.floor(this.phase);
        const fraction = this.phase - a;
        output[i] =
          (samples[a] || 0) * (1 - fraction) +
          (samples[Math.min(a + 1, samples.length - 1)] || 0) * fraction;
        energy += output[i] * output[i];
        this.phase += this.current.sampleRate / sampleRate;
        const advanced = Math.min(Math.floor(this.phase), samples.length) - this.position;
        this.played += Math.max(0, advanced);
        this.position += Math.max(0, advanced);
        if (this.phase >= samples.length) this.current = null;
      } else output[i] = 0;
    }
    // Native audio runs every ~3ms; send UI updates only at ~30 Hz.
    this.tick += output.length;
    if (this.tick >= sampleRate / 30) {
      this.tick = 0;
      this.port.postMessage({
        type: "progress",
        generation: this.generation,
        played: this.played,
        level: Math.sqrt(energy / output.length),
        idle: !this.current && this.queue.length === 0,
        done: this.completed,
      });
    }
    return true;
  }
}
registerProcessor("opentavus-playout", OpenTavusPlayout);
