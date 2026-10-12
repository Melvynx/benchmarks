import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  addCity,
  parseAppState,
  promoteCity,
  removeCity,
  setMode,
  updateSettings,
} from "./app-state";

describe("parseAppState", () => {
  it("returns defaults for missing or non-object input", () => {
    expect(parseAppState(null)).toEqual(DEFAULT_STATE);
    expect(parseAppState("garbage")).toEqual(DEFAULT_STATE);
    expect(parseAppState([1, 2, 3])).toEqual(DEFAULT_STATE);
  });

  it("drops unknown and duplicate cities but keeps order", () => {
    const parsed = parseAppState({ cityIds: ["tokyo", "atlantis", "tokyo", "london"] });
    expect(parsed.cityIds).toEqual(["tokyo", "london"]);
  });

  it("preserves an intentionally empty city list", () => {
    expect(parseAppState({ cityIds: [] }).cityIds).toEqual([]);
  });

  it("falls back per field when values are invalid", () => {
    const parsed = parseAppState({
      cityIds: ["tokyo"],
      mode: "sideways",
      settings: { wakeHour: 25, sleepHour: 22.5, timeFormat: "18h" },
    });
    expect(parsed).toEqual({
      cityIds: ["tokyo"],
      mode: DEFAULT_STATE.mode,
      settings: DEFAULT_STATE.settings,
    });
  });

  it("accepts valid settings", () => {
    const parsed = parseAppState({
      cityIds: [],
      mode: "base",
      settings: { wakeHour: 22, sleepHour: 6, timeFormat: "24h" },
    });
    expect(parsed).toEqual({
      cityIds: [],
      mode: "base",
      settings: { wakeHour: 22, sleepHour: 6, timeFormat: "24h" },
    });
  });
});

describe("state transitions", () => {
  it("appends new cities and ignores duplicates", () => {
    const added = addCity(DEFAULT_STATE, "tokyo");
    expect(added.cityIds).toEqual([...DEFAULT_STATE.cityIds, "tokyo"]);
    expect(addCity(added, "tokyo")).toBe(added);
  });

  it("ignores unknown city ids", () => {
    expect(addCity(DEFAULT_STATE, "atlantis")).toBe(DEFAULT_STATE);
  });

  it("removes a city", () => {
    expect(removeCity(DEFAULT_STATE, "denpasar").cityIds).toEqual(["san-francisco", "geneva"]);
  });

  it("promotes a city to the front, keeping the rest in order", () => {
    expect(promoteCity(DEFAULT_STATE, "geneva").cityIds).toEqual([
      "geneva",
      "san-francisco",
      "denpasar",
    ]);
  });

  it("does nothing when promoting the reference again", () => {
    expect(promoteCity(DEFAULT_STATE, "san-francisco")).toBe(DEFAULT_STATE);
  });

  it("updates mode and settings immutably", () => {
    expect(setMode(DEFAULT_STATE, "base").mode).toBe("base");
    expect(setMode(DEFAULT_STATE, "meeting")).toBe(DEFAULT_STATE);

    const next = updateSettings(DEFAULT_STATE, { wakeHour: 6 });
    expect(next.settings).toEqual({ ...DEFAULT_STATE.settings, wakeHour: 6 });
    expect(DEFAULT_STATE.settings.wakeHour).toBe(7);
  });
});
