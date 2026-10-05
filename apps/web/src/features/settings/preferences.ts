import type { Settings } from "../../api";
import { avatarInfo } from "../avatar/catalog";

export const defaultSettings: Settings = {
  provider_id: "local",
  model: "qwen2.5:1.5b",
  voice: "am_michael",
  avatar: "einstein",
};

// Store only public selections. Provider forms and credentials never pass this boundary.
export function publicPreferences(value: unknown): Settings {
  if (typeof value !== "object" || value === null) return { ...defaultSettings };
  const input = value as Record<string, unknown>;
  const provider = input.provider_id ?? "local";
  if (
    typeof provider !== "string" ||
    !/^[a-zA-Z0-9_.-]{1,96}$/.test(provider) ||
    typeof input.model !== "string" ||
    !/^[a-zA-Z0-9_.:/-]{1,160}$/.test(input.model) ||
    (provider === "local" &&
      !["qwen2.5:0.5b", "qwen2.5:1.5b", "qwen2.5:7b"].includes(input.model)) ||
    typeof input.voice !== "string" ||
    !["af_heart", "af_bella", "am_michael", "bf_emma"].includes(input.voice) ||
    typeof input.avatar !== "string" ||
    !Object.hasOwn(avatarInfo, input.avatar)
  )
    return { ...defaultSettings };
  return {
    provider_id: provider,
    model: input.model,
    voice: input.voice as Settings["voice"],
    avatar: input.avatar as Settings["avatar"],
  };
}

export function savedSettings(): Settings {
  try {
    return publicPreferences(
      JSON.parse(
        localStorage.getItem("opentavus.settings.v2") ??
          localStorage.getItem("opentavus.settings.v1") ??
          "null",
      ),
    );
  } catch {
    return { ...defaultSettings };
  }
}
