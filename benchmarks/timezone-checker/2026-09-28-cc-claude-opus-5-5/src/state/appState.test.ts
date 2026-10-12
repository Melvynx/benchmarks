import { describe, expect, it } from "vitest";
import { DEFAULT_STATE, appReducer } from "./appState";

describe("appReducer", () => {
  it("adds catalog cities without duplicates", () => {
    const added = appReducer(DEFAULT_STATE, { type: "city/add", id: "tokyo" });
    expect(added.cityIds).toEqual(["san-francisco", "denpasar", "geneva", "tokyo"]);
    expect(appReducer(added, { type: "city/add", id: "tokyo" })).toBe(added);
    expect(appReducer(added, { type: "city/add", id: "atlantis" })).toBe(added);
  });

  it("promotes a city to the reference slot", () => {
    const promoted = appReducer(DEFAULT_STATE, { type: "city/promote", id: "geneva" });
    expect(promoted.cityIds).toEqual(["geneva", "san-francisco", "denpasar"]);
  });

  it("removes cities and updates settings", () => {
    const removed = appReducer(DEFAULT_STATE, { type: "city/remove", id: "san-francisco" });
    expect(removed.cityIds).toEqual(["denpasar", "geneva"]);
    const updated = appReducer(removed, { type: "settings/update", patch: { wake: 22, sleep: 6 } });
    expect(updated.settings).toEqual({ wake: 22, sleep: 6, timeFormat: "12h" });
  });
});
