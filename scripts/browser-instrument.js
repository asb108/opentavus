// Playwright CLI function. Records browser clock evidence, never content or credentials.
async (page) => {
  await page.evaluate(() => {
    window.__alphaEvents = [];
    const record = (value) => {
      if (window.__alphaEvents.length < 20000)
        window.__alphaEvents.push({ t: performance.now(), ...value });
    };
    const OriginalSocket = window.WebSocket;
    window.WebSocket = class extends OriginalSocket {
      constructor(...args) {
        super(...args);
        this.addEventListener("message", ({ data }) => {
          const event = JSON.parse(data);
          if (event.type !== "text")
            record({
              direction: "in",
              type: event.type,
              generation: event.generation_id,
              sample: event.presentation_sample,
              tool: event.tool_name,
              status: event.status,
              code: event.code,
            });
        });
      }
      send(data) {
        const event = JSON.parse(data);
        if (["ask", "stop", "canvas_result", "playback_stopped"].includes(event.type))
          record({
            direction: "out",
            type: event.type,
            generation: event.generation_id,
            applied: event.applied,
            teach: event.teach,
          });
        return super.send(data);
      }
    };
    const OriginalWorklet = window.AudioWorkletNode;
    window.AudioWorkletNode = class extends OriginalWorklet {
      constructor(...args) {
        super(...args);
        let completedGeneration = -1;
        this.port.addEventListener("message", ({ data }) => {
          if (data.type === "progress" && data.idle && data.done) {
            if (completedGeneration === data.generation) return;
            completedGeneration = data.generation;
          }
          if (data.type !== "progress" || data.level > 0 || data.done)
            record({
              direction: "playout",
              type: data.type,
              generation: data.generation,
              oldGeneration: data.oldGeneration,
              level: data.level,
              played: data.played,
              idle: data.idle,
              done: data.done,
            });
        });
        this.port.start();
      }
    };
  });
};
