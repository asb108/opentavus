# Synthetic speech input

`photosynthesis.wav` is 24 kHz, mono, signed 16-bit PCM asking “Explain photosynthesis in one sentence.” It was synthesized with the pinned Kokoro 82M model/English Heart preset. No person's conversation was recorded. `photosynthesis.json` records provenance, format, and SHA-256. The synthetic fixture is contributed under this repository's Apache-2.0 license; the upstream model has its separate Apache-2.0 terms.

The optional browser microphone smoke supplies this file as a synthetic MediaStream, with an eight-second lead for connection setup. WebRTC, VAD, Whisper, local Qwen, TTS, and browser playout remain real. It verifies that route without establishing physical acoustics, speaker echo, natural speech variability, or a full latency corpus.
