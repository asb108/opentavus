import { describe, expect, it } from "vitest";
import { defaultSettings, publicPreferences } from "../src/features/settings/preferences";

describe("public companion preferences", () => {
  it("drops credentials and endpoints even when passed with valid selections", () => {
    const preferences = publicPreferences({
      ...defaultSettings,
      provider_id: "fixture",
      model: "vendor/model",
      api_key: "fixture-private-key",
      endpoint: "https://private.example",
    });
    expect(preferences).toEqual({
      provider_id: "fixture",
      model: "vendor/model",
      voice: "am_michael",
      avatar: "einstein",
    });
    expect(JSON.stringify(preferences)).not.toContain("private");
  });
  it("migrates legacy choices and preserves independent face and voice", () => {
    expect(publicPreferences({ model: "qwen2.5:7b", avatar: "orbit", voice: "bf_emma" })).toEqual({
      provider_id: "local",
      model: "qwen2.5:7b",
      avatar: "orbit",
      voice: "bf_emma",
    });
    expect(publicPreferences({ ...defaultSettings, model: "unknown" })).toEqual(defaultSettings);
    expect(publicPreferences({ ...defaultSettings, provider_id: "../../provider" })).toEqual(
      defaultSettings,
    );
  });
});
