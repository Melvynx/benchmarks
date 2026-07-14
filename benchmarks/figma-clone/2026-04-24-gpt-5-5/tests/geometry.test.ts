import { describe, expect, it } from "vitest";
import { nodeBounds } from "../src/geometry/bounds";
import { invert, multiply, rotate, transformPoint } from "../src/geometry/matrix";
import { createRectangle } from "../src/scene/factory";

describe("matrix", () => {
  it("inverts composed transforms", () => {
    const matrix = multiply({ a: 1, b: 0, c: 0, d: 1, e: 20, f: -8 }, rotate(35));
    const point = { x: 14, y: 22 };
    const transformed = transformPoint(matrix, point);
    expect(transformPoint(invert(matrix), transformed).x).toBeCloseTo(point.x);
    expect(transformPoint(invert(matrix), transformed).y).toBeCloseTo(point.y);
  });
});

describe("bounds", () => {
  it("computes rotated bounds", () => {
    const node = { ...createRectangle(null, 0, 0, 100, 50), rotation: 45 };
    const bounds = nodeBounds(node);
    expect(bounds.width).toBeGreaterThan(100);
    expect(bounds.height).toBeGreaterThan(50);
  });
});
