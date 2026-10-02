import type { CallCreated } from "@opentavus/contracts";
import { request } from "../api";

export class Microphone {
  private stream: MediaStream | null = null;
  private peer: RTCPeerConnection | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private revision = 0;

  get hasStream(): boolean {
    return this.stream !== null;
  }

  async connect(call: CallCreated): Promise<void> {
    const revision = this.revision;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      if (revision !== this.revision) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Microphone connection was cancelled.");
      }
      this.stream = stream;
      this.peer = new RTCPeerConnection({ iceServers: [] });
      for (const track of this.stream.getAudioTracks()) this.peer.addTrack(track, this.stream);
      const channel = this.peer.createDataChannel("control");
      channel.onopen = () => {
        this.heartbeat = setInterval(() => {
          if (channel.readyState === "open") channel.send("ping");
        }, 3000);
      };
      await this.peer.setLocalDescription(await this.peer.createOffer());
      await Promise.race([
        new Promise<void>((resolve) => {
          if (this.peer?.iceGatheringState === "complete") resolve();
          else
            this.peer?.addEventListener("icegatheringstatechange", () => {
              if (this.peer?.iceGatheringState === "complete") resolve();
            });
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Microphone connection timed out.")), 10000),
        ),
      ]);
      const answer = await request<RTCSessionDescriptionInit>(
        `/api/conversations/${call.conversation_id}/offer`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${call.token}` },
          body: JSON.stringify({ type: "offer", sdp: this.peer.localDescription?.sdp }),
        },
      );
      await this.peer.setRemoteDescription(answer);
      const peer = this.peer;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => finish(new Error("Microphone media did not connect.")),
          10000,
        );
        const changed = () => {
          if (peer.connectionState === "connected") finish();
          else if (["failed", "closed"].includes(peer.connectionState))
            finish(new Error("Microphone media connection failed."));
        };
        const finish = (error?: Error) => {
          clearTimeout(timeout);
          peer.removeEventListener("connectionstatechange", changed);
          if (error) reject(error);
          else resolve();
        };
        peer.addEventListener("connectionstatechange", changed);
        changed();
      });
    } catch (error) {
      this.close();
      throw error;
    }
  }

  mute(muted: boolean): void {
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  close(): void {
    this.revision += 1;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.peer?.close();
    this.stream = null;
    this.peer = null;
  }
}
