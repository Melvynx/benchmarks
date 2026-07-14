import { describe, expect, it } from "vitest";
import {
  createEmptyDocument,
  deserializeDocument,
  serializeDocument,
  type DrawingDocument,
  type DrawingElement,
} from "@/features/drawing/drawing-document";
import {
  getSelectionBounds,
  hitTestElement,
  resizeBox,
} from "@/features/drawing/drawing-geometry";

function sampleDocument(): DrawingDocument {
  const elements: DrawingElement[] = [
    {
      id: "rect-1",
      type: "rectangle",
      x: 100,
      y: 120,
      width: 200,
      height: 140,
      rotation: 0.2,
      opacity: 0.9,
      stroke: "#1e1e1e",
      strokeWidth: 4,
      fill: "transparent",
      cornerRadius: 12,
    },
    {
      id: "text-1",
      type: "text",
      x: 50,
      y: 60,
      width: 360,
      height: 90,
      rotation: 0,
      opacity: 1,
      text: "Hello\nWorld",
      color: "#e03131",
      fontSize: 64,
      fontFamily: "hand",
      fontWeight: 800,
      align: "center",
    },
    {
      id: "arrow-1",
      type: "arrow",
      start: { x: 10, y: 20 },
      end: { x: 200, y: 40 },
      opacity: 1,
      stroke: "#1971c2",
      strokeWidth: 6,
    },
    {
      id: "free-1",
      type: "freedraw",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      stroke: "#2f9e44",
      strokeWidth: 3,
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ],
    },
    {
      id: "ph-1",
      type: "placeholder",
      x: 400,
      y: 200,
      width: 240,
      height: 340,
      rotation: 0,
      opacity: 1,
      color: "#94a3b8",
      label: "Subject",
    },
    {
      id: "img-1",
      type: "image",
      x: 700,
      y: 100,
      width: 420,
      height: 260,
      rotation: 0,
      opacity: 1,
      url: "https://example.com/image.png",
      naturalRatio: 1.6,
    },
  ];
  return { ...createEmptyDocument(), background: "#fafafa", elements };
}

describe("drawing serialization", () => {
  it("round-trips a full scene without loss", () => {
    const document = sampleDocument();
    const { document: restored, ok } = deserializeDocument(
      serializeDocument(document),
    );
    expect(ok).toBe(true);
    expect(restored.background).toBe("#fafafa");
    expect(restored.elements).toEqual(document.elements);
  });

  it("returns an empty document for null/garbage input", () => {
    expect(deserializeDocument(null).ok).toBe(false);
    expect(deserializeDocument(null).document.elements).toHaveLength(0);
    expect(deserializeDocument("{not json").ok).toBe(false);
    expect(deserializeDocument("{not json").document.elements).toHaveLength(0);
  });

  it("drops unknown element types and repairs missing fields", () => {
    const raw = JSON.stringify({
      version: 1,
      elements: [
        { type: "unknown-shape", x: 0, y: 0 },
        { type: "rectangle", x: 5, y: 5, width: 10, height: 10 },
        { type: "image" }, // missing url -> dropped
      ],
    });
    const { document } = deserializeDocument(raw);
    expect(document.elements).toHaveLength(1);
    const [rect] = document.elements;
    expect(rect.type).toBe("rectangle");
    // Missing style fields get defaults.
    expect(rect).toMatchObject({ stroke: "#1e1e1e", strokeWidth: 3 });
  });
});

describe("drawing geometry", () => {
  it("resizes keeping the opposite corner fixed (no rotation)", () => {
    const next = resizeBox(
      { x: 100, y: 100, width: 200, height: 100, rotation: 0 },
      "se",
      { x: 400, y: 260 },
      false,
    );
    // Top-left (nw) stays put; bottom-right follows the pointer.
    expect(next.x).toBeCloseTo(100);
    expect(next.y).toBeCloseTo(100);
    expect(next.width).toBeCloseTo(300);
    expect(next.height).toBeCloseTo(160);
  });

  it("keeps the anchor corner fixed in world space when rotated", () => {
    const box = {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: Math.PI / 2,
    };
    // The nw anchor's world position before the resize.
    const before = anchorWorld(box);
    const next = resizeBox(box, "se", { x: 250, y: 350 }, false);
    const after = anchorWorld({ ...next, rotation: box.rotation });
    expect(after.x).toBeCloseTo(before.x, 3);
    expect(after.y).toBeCloseTo(before.y, 3);
  });

  it("hit-tests inside and outside a rotated box", () => {
    const element = sampleDocument().elements[0];
    const inside = { x: 200, y: 190 };
    const outside = { x: 1000, y: 1000 };
    expect(hitTestElement(element, inside)).toBe(true);
    expect(hitTestElement(element, outside)).toBe(false);
  });

  it("computes selection bounds covering all elements", () => {
    const bounds = getSelectionBounds(sampleDocument().elements);
    expect(bounds).not.toBeNull();
    expect(bounds?.width ?? 0).toBeGreaterThan(0);
    expect(bounds?.height ?? 0).toBeGreaterThan(0);
  });
});

/** World-space position of the top-left (nw) corner of a rotated box. */
function anchorWorld(box: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const local = { x: box.x, y: box.y };
  const cos = Math.cos(box.rotation);
  const sin = Math.sin(box.rotation);
  const dx = local.x - cx;
  const dy = local.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}
