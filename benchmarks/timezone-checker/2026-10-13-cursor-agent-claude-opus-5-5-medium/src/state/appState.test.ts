import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE, loadState, reducer } from "./appState";

describe("reducer", () => {
  it("adds cities without duplicates and ignores unknown ids", () => {
    const added = reducer(DEFAULT_STATE, { type: "addCity", id: "tokyo" });
    expect(added.cityIds).toEqual(["san-francisco", "denpasar", "geneva", "tokyo"]);
    expect(reducer(added, { type: "addCity", id: "tokyo" })).toBe(added);
    expect(reducer(added, { type: "addCity", id: "atlantis" })).toBe(added);
  });

  it("promotes a city to the reference slot", () => {
    const next = reducer(DEFAULT_STATE, { type: "promoteCity", id: "geneva" });
    expect(next.cityIds).toEqual(["geneva", "san-francisco", "denpasar"]);
  });

  it("removes the reference and the next city takes over", () => {
    const next = reducer(DEFAULT_STATE, { type: "removeCity", id: "san-francisco" });
    expect(next.cityIds).toEqual(["denpasar", "geneva"]);
  });
});

describe("loadState", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
  });

  afterEach(() => {
    store.clear();
    vi.unstubAllGlobals();
  });

  it("returns defaults on first visit", () => {
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it("restores valid state and drops invalid fields", () => {
    store.set(
      "tz-overlap/state/v1",
      JSON.stringify({
        cityIds: ["tokyo", "nowhere", "tokyo", "london"],
        mode: "base",
        settings: { wakeHour: 22, sleepHour: 99, timeFormat: "24h" },
      }),
    );
    expect(loadState()).toEqual({
      cityIds: ["tokyo", "london"],
      mode: "base",
      settings: { wakeHour: 22, sleepHour: 23, timeFormat: "24h" },
    });
  });

  it("survives corrupted storage", () => {
    store.set("tz-overlap/state/v1", "{not json");
    expect(loadState()).toEqual(DEFAULT_STATE);
  });
});
