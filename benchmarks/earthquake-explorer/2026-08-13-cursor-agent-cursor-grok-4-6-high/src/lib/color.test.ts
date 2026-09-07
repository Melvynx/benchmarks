import { describe, expect, it } from "vitest";

import { depthColor, magColor, magInk, quakeColor } from "./color";

describe("magnitude colors", () => {
  it("uses ice for small events and magma for large ones", () => {
    expect(magColor(1.2)).toBe("#8ec5d4");
    expect(magColor(4.4)).toBe("#e39a32");
    expect(magColor(6.2)).toBe("#c41e3a");
    expect(magColor(8.1)).toBe("#7a1238");
    expect(magColor(null)).toBe("#8a8896");
  });

  it("pairs dark ink on pale stops and light ink on magma", () => {
    expect(magInk(2.1)).toBe("#0c1c18");
    expect(magInk(6.8)).toBe("#fff6f6");
  });
});

describe("depth colors", () => {
  it("moves from crustal heat to indigo mantle", () => {
    expect(depthColor(12)).toBe("#e05228");
    expect(depthColor(90)).toBe("#c9c85a");
    expect(depthColor(420)).toBe("#6d5cff");
  });
});

describe("quakeColor", () => {
  it("switches encoding with the color mode", () => {
    const quake = { mag: 2.0, depth: 400 };
    expect(quakeColor(quake, "magnitude")).toBe("#5aa38f");
    expect(quakeColor(quake, "depth")).toBe("#6d5cff");
  });
});
