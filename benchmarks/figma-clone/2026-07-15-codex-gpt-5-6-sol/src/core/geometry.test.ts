import { describe, expect, it } from "vitest";

import { IDENTITY, invert, multiply, nodeLocalMatrix, rotate, rotatePointAround, transformPoint, transformedBounds } from "./geometry";
import { createRectangle, rgba } from "./scene";

describe("affine geometry", () => {
  it("round-trips points through an inverted matrix", () => {
    const matrix = multiply({ ...IDENTITY, e: 42, f: -18 }, rotate(37));
    const input = { x: 13.2, y: -5.1 };
    const output = transformPoint(invert(matrix), transformPoint(matrix, input));
    expect(output.x).toBeCloseTo(input.x, 8);
    expect(output.y).toBeCloseTo(input.y, 8);
  });

  it("rotates nodes around their local center", () => {
    const node = { ...createRectangle("node", "Node", null, 100, 50, 200, 80, rgba(0, 0, 0)), rotation: 90 };
    const center = transformPoint(nodeLocalMatrix(node), { x: 100, y: 40 });
    expect(center).toEqual({ x: 200, y: 90 });
  });

  it("computes rotated axis-aligned bounds", () => {
    const bounds = transformedBounds({ x: 0, y: 0, width: 100, height: 50 }, rotate(90));
    expect(bounds.width).toBeCloseTo(50);
    expect(bounds.height).toBeCloseTo(100);
  });

  it("projects deltas onto a rotated local axis", () => {
    const delta = rotatePointAround({ x: 10, y: 0 }, { x: 0, y: 0 }, -90);
    expect(delta.x).toBeCloseTo(0);
    expect(delta.y).toBeCloseTo(-10);
  });
});
