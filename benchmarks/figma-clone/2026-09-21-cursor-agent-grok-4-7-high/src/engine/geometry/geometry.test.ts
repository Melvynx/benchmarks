import { describe, expect, it } from "vitest";
import { aabbOfBox, containsPoint, intersects } from "./bounds";
import { apply, decompose, invert, localMatrix, mul, translate } from "./matrix";
import { resizeBox } from "./resize";

describe("matrix", () => {
  it("inverts a translation-rotation", () => {
    const m = localMatrix({ x: 10, y: 20, width: 100, height: 40, rotation: 30 });
    const inv = invert(m);
    expect(inv).not.toBeNull();
    if (!inv) return;
    const back = mul(inv, m);
    expect(back.a).toBeCloseTo(1);
    expect(back.b).toBeCloseTo(0);
    expect(back.e).toBeCloseTo(0);
    expect(back.f).toBeCloseTo(0);
  });

  it("keeps the center stable under rotation", () => {
    const box = { x: 10, y: 20, width: 100, height: 40, rotation: 75 };
    const center = apply(localMatrix(box), 50, 20);
    expect(center.x).toBeCloseTo(60);
    expect(center.y).toBeCloseTo(40);
  });

  it("decomposes back to x, y, and rotation", () => {
    const box = { x: -30, y: 12, width: 80, height: 25, rotation: 33 };
    const d = decompose(localMatrix(box), box.width, box.height);
    expect(d.x).toBeCloseTo(box.x);
    expect(d.y).toBeCloseTo(box.y);
    expect(d.rotation).toBeCloseTo(box.rotation);
  });

  it("round-trips a point through translate", () => {
    const m = translate(5, -2);
    const p = apply(m, 3, 4);
    expect(p).toEqual({ x: 8, y: 2 });
  });
});

describe("rotated hit bounds", () => {
  it("rejects a point inside the aabb but outside the rotated rect", () => {
    const box = { x: 0, y: 0, width: 100, height: 20, rotation: 45 };
    const m = localMatrix(box);
    const inv = invert(m);
    expect(inv).not.toBeNull();
    if (!inv) return;
    const aabb = aabbOfBox(m, 100, 20);
    const probe = { x: aabb.x + 0.5, y: aabb.y + aabb.height / 2 };
    const local = apply(inv, probe.x, probe.y);
    const inside = local.x >= 0 && local.y >= 0 && local.x <= 100 && local.y <= 20;
    expect(inside).toBe(false);
    expect(containsPoint(aabb, probe)).toBe(true);
  });

  it("accepts a point along the rotated length", () => {
    const box = { x: 0, y: 0, width: 100, height: 20, rotation: 90 };
    const inv = invert(localMatrix(box));
    if (!inv) throw new Error("invert");
    const local = apply(inv, 50, 40);
    expect(local.x >= 0 && local.x <= 100 && local.y >= 0 && local.y <= 20).toBe(true);
  });
});

describe("resize", () => {
  it("extends the east edge of an unrotated rect and keeps the west edge", () => {
    const start = { x: 10, y: 10, width: 100, height: 50, rotation: 0 };
    const next = resizeBox({
      start,
      handle: "e",
      pointer: { x: 140, y: 35 },
      shift: false,
      alt: false,
    });
    expect(next.x).toBeCloseTo(10);
    expect(next.y).toBeCloseTo(10);
    expect(next.width).toBeCloseTo(130);
    expect(next.height).toBeCloseTo(50);
  });

  it("keeps the local west edge fixed when the node is rotated 90 degrees", () => {
    const start = { x: 0, y: 0, width: 100, height: 50, rotation: 90 };
    const next = resizeBox({
      start,
      handle: "e",
      pointer: { x: 50, y: 95 },
      shift: false,
      alt: false,
    });
    expect(next.width).toBeCloseTo(120);
    expect(next.height).toBeCloseTo(50);
    expect(next.rotation).toBeCloseTo(90);
    const m = localMatrix(next);
    const right = apply(m, next.width, next.height / 2);
    expect(right.x).toBeCloseTo(50);
    expect(right.y).toBeCloseTo(95);
    const left = apply(m, 0, next.height / 2);
    expect(left.x).toBeCloseTo(50);
    expect(left.y).toBeCloseTo(-25);
  });

  it("resizes from the center when alt is held", () => {
    const start = { x: 0, y: 0, width: 100, height: 40, rotation: 0 };
    const next = resizeBox({
      start,
      handle: "e",
      pointer: { x: 80, y: 20 },
      shift: false,
      alt: true,
    });
    expect(next.width).toBeCloseTo(60);
    expect(next.x + next.width / 2).toBeCloseTo(50);
    expect(next.y + next.height / 2).toBeCloseTo(20);
  });

  it("locks aspect ratio with shift on a corner", () => {
    const start = { x: 0, y: 0, width: 100, height: 50, rotation: 0 };
    const next = resizeBox({
      start,
      handle: "se",
      pointer: { x: 200, y: 60 },
      shift: true,
      alt: false,
    });
    expect(next.width / next.height).toBeCloseTo(2);
    expect(next.x).toBeCloseTo(0);
    expect(next.y).toBeCloseTo(0);
  });
});

describe("aabb", () => {
  it("detects overlap", () => {
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 9, width: 2, height: 2 })).toBe(
      true,
    );
    expect(intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 11, y: 0, width: 2, height: 2 })).toBe(
      false,
    );
  });
});
