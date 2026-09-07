import { describe, expect, it } from "vitest";
import { SpatialIndex } from "./spatial-index";

describe("SpatialIndex", () => {
  it("returns inserted ids that overlap a query", () => {
    const index = new SpatialIndex(64);
    index.insert("a", { minX: 0, minY: 0, maxX: 10, maxY: 10 });
    index.insert("b", { minX: 100, minY: 100, maxX: 110, maxY: 110 });
    expect(index.query({ minX: 0, minY: 0, maxX: 20, maxY: 20 })).toEqual(["a"]);
    expect(index.queryPoint(105, 105)).toEqual(["b"]);
  });
});
