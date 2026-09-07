import { describe, expect, it } from "vitest";
import {
  IDENTITY,
  apply,
  invert,
  localToParent,
  mul,
  nodeAABB,
  nodeLocalMatrix,
  parentToLocal,
  resizeRotated,
  rotateMat,
  translate,
} from "./geometry";

describe("matrices", () => {
  it("inverts a translation", () => {
    const m = translate(10, 20);
    const inv = invert(m);
    expect(inv).not.toBeNull();
    const p = apply(mul(inv!, m), { x: 3, y: 4 });
    expect(p.x).toBeCloseTo(3);
    expect(p.y).toBeCloseTo(4);
  });

  it("keeps identity stable", () => {
    const p = apply(IDENTITY, { x: 5, y: 7 });
    expect(p).toEqual({ x: 5, y: 7 });
  });
});

describe("rotated bounds", () => {
  it("AABB grows when a square is rotated 45deg", () => {
    const box = { x: 0, y: 0, width: 100, height: 100, rotation: 45 };
    const aabb = nodeAABB(box);
    expect(aabb.maxX - aabb.minX).toBeGreaterThan(100);
    expect(aabb.maxY - aabb.minY).toBeGreaterThan(100);
  });

  it("round-trips local and parent space around center rotation", () => {
    const node = { x: 40, y: 80, width: 120, height: 60, rotation: 33 };
    const local = { x: 120, y: 0 };
    const parent = localToParent(node, local);
    const back = parentToLocal(node, parent);
    expect(back).not.toBeNull();
    expect(back!.x).toBeCloseTo(local.x, 5);
    expect(back!.y).toBeCloseTo(local.y, 5);
  });
});

describe("resizeRotated", () => {
  it("keeps the opposite corner fixed in parent space", () => {
    const start = { x: 100, y: 80, width: 200, height: 100, rotation: 30 };
    const nw = localToParent(start, { x: 0, y: 0 });
    const pointer = localToParent(start, { x: 260, y: 140 });
    const next = resizeRotated(start, "se", pointer, { keepRatio: false, fromCenter: false });
    const nw2 = localToParent(next, { x: 0, y: 0 });
    expect(nw2.x).toBeCloseTo(nw.x, 4);
    expect(nw2.y).toBeCloseTo(nw.y, 4);
    expect(next.width).toBeCloseTo(260, 2);
    expect(next.height).toBeCloseTo(140, 2);
  });

  it("resizes from center when alt is set", () => {
    const start = { x: 0, y: 0, width: 100, height: 80, rotation: 0 };
    const pointer = { x: 130, y: 80 };
    const next = resizeRotated(start, "se", pointer, { keepRatio: false, fromCenter: true });
    const c1 = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
    const c2 = { x: next.x + next.width / 2, y: next.y + next.height / 2 };
    expect(c2.x).toBeCloseTo(c1.x, 4);
    expect(c2.y).toBeCloseTo(c1.y, 4);
  });
});

describe("nodeLocalMatrix", () => {
  it("places the local origin at the unrotated top-left", () => {
    const node = { x: 10, y: 20, width: 40, height: 30, rotation: 0 };
    const p = apply(nodeLocalMatrix(node), { x: 0, y: 0 });
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(20);
  });

  it("rotates around the geometric center", () => {
    const node = { x: 0, y: 0, width: 100, height: 100, rotation: 90 };
    const p = apply(mul(nodeLocalMatrix(node), rotateMat(0)), { x: 100, y: 0 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(100);
  });
});
