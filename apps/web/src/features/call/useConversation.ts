import { useCallback, useRef, useState, type RefObject } from "react";
import type { CallCreated, WireEvent } from "@opentavus/contracts";
import { parseEvent, request, startCall, type Settings } from "../../api";
import { Playout, type PlayoutUpdate } from "../../media/playout";
import { Microphone } from "../../media/microphone";
import type { BoardHandle } from "../canvas/Board";
import type { AvatarRenderer } from "../avatar/renderer";
import { deliveryFor } from "../avatar/behavior";
import { avatarInfo } from "../avatar/catalog";

export type CallState = "idle" | "preparing" | "listening" | "thinking" | "speaking";
export interface Transcript {
  id: string;
  role: "user" | "assistant";
  text: string;
  name?: string;
  partial?: boolean;
}

export function useConversation(
  board: RefObject<BoardHandle | null>,
  avatar: RefObject<AvatarRenderer | null>,
) {
  const [state, setState] = useState<CallState>("idle");
  const [teachingAvailable, setTeachingAvailable] = useState(true);
  const [messages, setMessages] = useState<Transcript[]>([]);
  const [error, setError] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const call = useRef<CallCreated | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const microphone = useRef(new Microphone());
  const playout = useRef<Playout | null>(null);
  const generation = useRef(0);
  const clientSequence = useRef(0);
  const lastAck = useRef(0);
  const working = useRef(false);
  const starting = useRef(false);
  const startup = useRef<AbortController | null>(null);
  const send = useCallback((value: object) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(value));
  }, []);
  const eventBase = useCallback(
    () => ({
      schema_version: 1,
      conversation_id: call.current?.conversation_id,
      generation_id: generation.current,
      sequence: ++clientSequence.current,
    }),
    [],
  );

  const onPlayout = useCallback(
    (update: PlayoutUpdate) => {
      if (!call.current) return;
      if (update.type === "stopped") {
        if (update.generation === generation.current) {
          avatar.current?.setLevel(0);
          avatar.current?.setViseme?.("rest");
        }
        send({
          ...eventBase(),
          type: "playback_stopped",
          stopped_generation_id: update.oldGeneration,
          last_played_sample: update.played,
        });
        return;
      }
      if (update.generation !== generation.current) return;
      if (update.type === "viseme") avatar.current?.setViseme?.(update.shape ?? null);
      if (update.type === "caption" && update.text) {
        setState("speaking");
        const text = update.text;
        avatar.current?.setListening(false);
        avatar.current?.setDelivery?.(deliveryFor(text));
        const id = `${call.current.conversation_id}:assistant-${update.generation}`;
        const name = avatarInfo[call.current.settings.avatar ?? "einstein"].name;
        setMessages((previous) => {
          const existing = previous.find((m) => m.id === id);
          return existing
            ? previous.map((m) => (m.id === id ? { ...m, text: `${m.text} ${text}` } : m))
            : [...previous, { id, role: "assistant" as const, text, name }].slice(-30);
        });
      }
      if (update.type === "progress") {
        avatar.current?.setLevel(update.level || 0);
        if (performance.now() - lastAck.current > 100) {
          send({ ...eventBase(), type: "playback_progress", played_sample: update.played || 0 });
          lastAck.current = performance.now();
        }
        if (update.idle && update.done) {
          working.current = false;
          setState("listening");
          avatar.current?.setListening(true);
        }
      }
      if (update.type === "overflow")
        setError("Playback fell behind. Stop and reconnect the call.");
    },
    [avatar, eventBase, send],
  );

  const handleEvent = useCallback(
    async (event: WireEvent) => {
      if (event.conversation_id !== call.current?.conversation_id) return;
      if (event.type === "interrupt" && event.generation_id >= generation.current) {
        const wasWorking = working.current;
        setMessages((previous) =>
          previous.map((message) =>
            message.id === `${event.conversation_id}:assistant-${event.stopped_generation_id}` &&
            wasWorking
              ? { ...message, partial: true }
              : message,
          ),
        );
        if (event.generation_id > generation.current) {
          generation.current = event.generation_id;
          playout.current?.reset(generation.current);
        }
        return;
      }
      if (event.generation_id !== generation.current) return;
      if (event.type === "transcript" && event.role === "user") {
        setMessages((previous) =>
          [
            ...previous,
            {
              id: `${event.conversation_id}:user-${event.generation_id}`,
              role: "user" as const,
              text: event.text,
            },
          ].slice(-30),
        );
        working.current = true;
      } else if (event.type === "audio") {
        playout.current?.receive(event);
      } else if (event.type === "status") {
        if (event.status === "thinking") {
          avatar.current?.setListening(false);
          avatar.current?.setDelivery?.("thoughtful");
        }
        if (
          event.status === "thinking" ||
          event.status === "speaking" ||
          event.status === "listening"
        )
          setState(event.status);
      } else if (event.type === "reply_done") {
        playout.current?.done(generation.current);
      } else if (event.type === "canvas") {
        const ownedGeneration = event.generation_id;
        const applied = await board.current?.apply(
          event.operation_id,
          event.payload,
          () =>
            ownedGeneration === generation.current &&
            call.current?.conversation_id === event.conversation_id,
        );
        if (ownedGeneration === generation.current)
          send({
            ...eventBase(),
            type: "canvas_result",
            operation_id: event.operation_id,
            applied: applied === true,
          });
      } else if (event.type === "error") {
        setError(event.message);
      }
    },
    [avatar, board, eventBase, send],
  );

  const start = useCallback(
    async (settings: Settings, withMicrophone: boolean) => {
      if (call.current || starting.current) return;
      starting.current = true;
      const cancellation = new AbortController();
      startup.current = cancellation;
      setState("preparing");
      setError("");
      try {
        playout.current = new Playout(onPlayout);
        await playout.current.prepare();
        const created = await startCall(settings, cancellation.signal);
        call.current = created;
        setTeachingAvailable(created.teaching_available ?? true);
        generation.current = 0;
        clientSequence.current = 0;
        playout.current.reset(0);
        const ws = new WebSocket(
          `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
        );
        socket.current = ws;
        ws.onmessage = ({ data }) => {
          try {
            const event = parseEvent(JSON.parse(data));
            void handleEvent(event).catch(() =>
              setError("This update could not be applied. Reconnect the call."),
            );
          } catch {
            setError("The local server sent an invalid update. Reconnect the call.");
          }
        };
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Call connection timed out.")), 10000);
          ws.onopen = () => {
            clearTimeout(timeout);
            ws.send(
              JSON.stringify({
                type: "hello",
                conversation_id: created.conversation_id,
                token: created.token,
              }),
            );
            resolve();
          };
          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("Could not connect to the local conversation."));
          };
        });
        cancellation.signal.throwIfAborted();
        ws.onclose = () => {
          if (socket.current !== ws) return;
          microphone.current.close();
          setMicEnabled(false);
          setState("idle");
          avatar.current?.setLevel(0);
          avatar.current?.setViseme?.("rest");
          avatar.current?.setListening(false);
          avatar.current?.setDelivery?.("neutral");
          void playout.current?.close();
          playout.current = null;
          call.current = null;
        };
        setState("listening");
        avatar.current?.setListening(true);
        if (withMicrophone) {
          try {
            await microphone.current.connect(created);
            setMicEnabled(true);
          } catch {
            setError(
              "Microphone access or connection failed. You can type a question, or end the call and retry microphone access.",
            );
          }
        }
      } catch (failure) {
        if (call.current) {
          void request(`/api/conversations/${call.current.conversation_id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${call.current.token}` },
          }).catch(() => {});
        }
        socket.current?.close();
        call.current = null;
        microphone.current.close();
        await playout.current?.close();
        playout.current = null;
        setState("idle");
        if (!cancellation.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : "Could not start the conversation.",
          );
      } finally {
        starting.current = false;
        if (startup.current === cancellation) startup.current = null;
      }
    },
    [avatar, handleEvent, onPlayout],
  );

  const ask = useCallback(
    async (text: string, settings: Settings, teach: boolean) => {
      if (!text.trim()) return;
      if (!call.current) await start(settings, false);
      if (call.current) {
        setError("");
        setState("thinking");
        avatar.current?.setListening(false);
        avatar.current?.setDelivery?.("thoughtful");
        working.current = true;
        const enabled = teach && (call.current.teaching_available ?? true);
        send({ type: "teach_mode", enabled });
        send({ type: "ask", text: text.trim(), teach: enabled });
      }
    },
    [avatar, send, start],
  );

  const stop = useCallback(() => {
    const old = generation.current;
    const conversationId = call.current?.conversation_id;
    const wasWorking = working.current;
    setMessages((previous) =>
      previous.map((message) =>
        message.id === `${conversationId}:assistant-${old}` && wasWorking
          ? { ...message, partial: true }
          : message,
      ),
    );
    generation.current += 1;
    playout.current?.reset(generation.current);
    avatar.current?.setLevel(0);
    avatar.current?.setViseme?.("rest");
    avatar.current?.setListening(true);
    avatar.current?.setDelivery?.("neutral");
    working.current = false;
    setState("listening");
    send({ type: "stop" });
  }, [avatar, send]);

  const end = useCallback(async () => {
    startup.current?.abort();
    stop();
    microphone.current.close();
    setMicEnabled(false);
    const current = call.current;
    avatar.current?.setLevel(0);
    avatar.current?.setViseme?.("rest");
    avatar.current?.setListening(false);
    avatar.current?.setDelivery?.("neutral");
    setState("idle");
    if (current)
      await request(`/api/conversations/${current.conversation_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${current.token}` },
      }).catch(() => {});
    call.current = null;
    socket.current?.close();
    socket.current = null;
    await playout.current?.close();
    playout.current = null;
  }, [avatar, stop]);

  const toggleMic = useCallback(async () => {
    if (!microphone.current.hasStream && call.current) {
      try {
        await microphone.current.connect(call.current);
        setMicEnabled(true);
      } catch {
        setError("Could not enable the microphone. End the call and retry microphone access.");
      }
    } else {
      microphone.current.mute(micEnabled);
      setMicEnabled(!micEnabled);
    }
  }, [micEnabled]);
  const setTeaching = useCallback(
    (enabled: boolean) =>
      send({ type: "teach_mode", enabled: enabled && (call.current?.teaching_available ?? true) }),
    [send],
  );
  return {
    teachingAvailable,
    state,
    messages,
    error,
    setError,
    micEnabled,
    start,
    ask,
    stop,
    end,
    toggleMic,
    setTeaching,
  };
}
