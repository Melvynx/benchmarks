import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_DATA, sanitize, STORAGE_KEY, usePlanner } from "@/state/store";

describe("sanitize", () => {
  it("falls back to defaults for missing or corrupt data", () => {
    expect(sanitize(undefined)).toEqual(DEFAULT_DATA);
    expect(sanitize("nope")).toEqual(DEFAULT_DATA);
  });

  it("drops unknown and duplicate cities and clamps settings", () => {
    expect(
      sanitize({
        cityIds: ["tokyo", "atlantis", "tokyo", "lisbon"],
        mode: "weird",
        settings: { wakeHour: 30, sleepHour: 5, timeFormat: "24h" },
      }),
    ).toEqual({
      cityIds: ["tokyo", "lisbon"],
      mode: "meeting",
      settings: { wakeHour: 7, sleepHour: 5, timeFormat: "24h" },
    });
  });
});

describe("planner store", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlanner.setState({ ...DEFAULT_DATA });
  });

  it("starts with the default cities", () => {
    expect(usePlanner.getState().cityIds).toEqual(["san-francisco", "denpasar", "geneva"]);
    expect(usePlanner.getState().mode).toBe("meeting");
  });

  it("adds cities once and ignores unknown ids", () => {
    const { addCity } = usePlanner.getState();
    addCity("tokyo");
    addCity("tokyo");
    addCity("atlantis");
    expect(usePlanner.getState().cityIds).toEqual(["san-francisco", "denpasar", "geneva", "tokyo"]);
  });

  it("promotes a city to reference and removes cities", () => {
    usePlanner.getState().makeReference("geneva");
    expect(usePlanner.getState().cityIds).toEqual(["geneva", "san-francisco", "denpasar"]);
    usePlanner.getState().removeCity("geneva");
    expect(usePlanner.getState().cityIds).toEqual(["san-francisco", "denpasar"]);
  });

  it("persists state to localStorage", () => {
    usePlanner.getState().setMode("base");
    usePlanner.getState().updateSettings({ wakeHour: 22, sleepHour: 6 });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.state).toMatchObject({
      mode: "base",
      settings: { wakeHour: 22, sleepHour: 6, timeFormat: "12h" },
    });
  });
});
