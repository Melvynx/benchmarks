import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, sanitizePreferences } from "./preferences-schema";

describe("sanitizePreferences", () => {
  it("falls back to defaults for missing or corrupt data", () => {
    expect(sanitizePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences("garbage")).toEqual(DEFAULT_PREFERENCES);
  });

  it("keeps valid persisted values", () => {
    const saved = { cityIds: ["tokyo", "london"], mode: "base", wakeHour: 22, sleepHour: 6, timeFormat: "24h" };
    expect(sanitizePreferences(saved)).toEqual(saved);
  });

  it("drops unknown and duplicate cities but keeps an intentionally empty list", () => {
    expect(sanitizePreferences({ cityIds: ["tokyo", "atlantis", "tokyo", 4] }).cityIds).toEqual(["tokyo"]);
    expect(sanitizePreferences({ cityIds: [] }).cityIds).toEqual([]);
  });

  it("rejects out-of-range settings individually", () => {
    const result = sanitizePreferences({ wakeHour: 24, sleepHour: 5.5, mode: "solo", timeFormat: "36h" });
    expect(result).toMatchObject({
      wakeHour: DEFAULT_PREFERENCES.wakeHour,
      sleepHour: DEFAULT_PREFERENCES.sleepHour,
      mode: DEFAULT_PREFERENCES.mode,
      timeFormat: DEFAULT_PREFERENCES.timeFormat,
    });
  });
});
