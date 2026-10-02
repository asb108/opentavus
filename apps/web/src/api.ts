import Ajv2020 from "ajv/dist/2020";
import schema from "../../../packages/contracts/schema.json";
import controlSchema from "../../../packages/contracts/api.schema.json";
import type { BoardReply, CallCreated, CallSettings, WireEvent } from "@opentavus/contracts";

export type Settings = Required<CallSettings>;
export type TeachingTool = BoardReply["tools"][number];
export interface Catalog {
  speech_ready: boolean;
  setup_command: string;
  models: { name: Settings["model"]; ready: boolean; reason: string; size: number }[];
  voices: { id: Settings["voice"]; name: string; description: string }[];
  avatars: { id: Settings["avatar"]; name: string }[];
  stt: string;
  tts: string;
  privacy: string;
}

const ajv = new Ajv2020({ strict: false, validateFormats: false });
const validateEvent = ajv.compile<WireEvent>({
  $defs: schema.$defs,
  ...schema.properties.event,
});
const validateBoard = ajv.compile<BoardReply>({
  $defs: controlSchema.$defs,
  ...controlSchema.properties.board,
});
const validateCreated = ajv.compile<CallCreated>({
  $defs: controlSchema.$defs,
  ...controlSchema.properties.created,
});

export function parseEvent(value: unknown): WireEvent {
  if (!validateEvent(value)) throw new Error("The local server sent an invalid event.");
  return value;
}

export function parseTool(value: unknown): TeachingTool {
  const result: unknown = { tools: [value] };
  if (!validateBoard(result)) throw new Error("The teaching tool was invalid.");
  const tool = result.tools[0];
  if (!tool) throw new Error("The teaching tool was empty.");
  if (
    tool.kind === "quiz" &&
    (!tool.choices.includes(tool.answer) || new Set(tool.choices).size !== tool.choices.length)
  ) {
    throw new Error("The question has an invalid answer.");
  }
  return tool;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const value: unknown = await response.json();
  if (!response.ok) {
    const error = value as { message?: string; detail?: string };
    throw new Error(
      error.message ||
        (typeof error.detail === "string" ? error.detail : "The request could not finish."),
    );
  }
  return value as T;
}

export async function startCall(
  settings: Settings,
  cancellation?: AbortSignal,
): Promise<CallCreated> {
  const value: unknown = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify(settings),
    signal: cancellation
      ? AbortSignal.any([cancellation, AbortSignal.timeout(95000)])
      : AbortSignal.timeout(95000),
  });
  if (!validateCreated(value)) throw new Error("The local server sent invalid call settings.");
  return value;
}
