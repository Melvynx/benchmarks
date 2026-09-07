import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE, loadState, saveState } from "./storage";

const KEY = "timezone-overlap:v1";

function stubStorage(seed?: string) {
  const store = new Map<string, string>();
  if (seed !== undefined) store.set(KEY, seed);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
  return store;
}

beforeEach(() => stubStorage());
afterEach(() => vi.unstubAllGlobals());

describe("loadState", () => {
  it("starts from defaults in a fresh session", () => {
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it("restores a saved configuration", () => {
    stubStorage(
      JSON.stringify({ cityIds: ["tokyo", "berlin"], wake: 5, sleep: 21, format: "24h", mode: "base" }),
    );
    expect(loadState()).toEqual({
      cityIds: ["tokyo", "berlin"],
      wake: 5,
      sleep: 21,
      format: "24h",
      mode: "base",
    });
  });

  it("drops unknown cities and duplicates", () => {
    stubStorage(JSON.stringify({ ...DEFAULT_STATE, cityIds: ["tokyo", "atlantis", "tokyo", 7] }));
    expect(loadState().cityIds).toEqual(["tokyo"]);
  });

  it("keeps an intentionally empty city list", () => {
    stubStorage(JSON.stringify({ ...DEFAULT_STATE, cityIds: [] }));
    expect(loadState().cityIds).toEqual([]);
  });

  it("repairs out-of-range or malformed fields one by one", () => {
    stubStorage(
      JSON.stringify({ cityIds: ["paris"], wake: 99, sleep: -3, format: "13h", mode: "party" }),
    );
    expect(loadState()).toEqual({
      cityIds: ["paris"],
      wake: DEFAULT_STATE.wake,
      sleep: DEFAULT_STATE.sleep,
      format: DEFAULT_STATE.format,
      mode: DEFAULT_STATE.mode,
    });
  });

  it("falls back to defaults on corrupt JSON", () => {
    stubStorage("{not json");
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it("survives storage being unavailable", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(loadState()).toEqual(DEFAULT_STATE);
  });
});

describe("saveState", () => {
  it("round-trips through storage", () => {
    const store = stubStorage();
    const state = { ...DEFAULT_STATE, mode: "base" as const, wake: 6 };
    saveState(state);
    expect(store.get(KEY)).toBe(JSON.stringify(state));
    expect(loadState()).toEqual(state);
  });

  it("does not throw when writes are blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        setItem: () => {
          throw new Error("quota");
        },
      },
    });
    expect(() => saveState(DEFAULT_STATE)).not.toThrow();
  });
});
