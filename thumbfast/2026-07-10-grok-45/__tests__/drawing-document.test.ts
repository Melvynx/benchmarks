import { describe, expect, it } from "vitest";
import {
  createEmptyDrawingDocument,
  createPerson,
  createRectangle,
  createText,
  parseDrawingDocument,
  serializeDrawingDocument,
} from "../src/features/drawing/drawing.document";
import { getDrawingTemplate } from "../src/features/drawing/drawing.templates";
import {
  hitTestElement,
  moveElement,
  normalizeDrawnBox,
  resizeElement,
} from "../src/features/drawing/drawing.geometry";

describe("drawing document", () => {
  it("round-trips serialization", () => {
    const doc = createEmptyDrawingDocument({
      elements: [
        createText({ x: 10, y: 20, text: "Hello" }),
        createPerson({ x: 100, y: 40 }),
        createRectangle({ x: 40, y: 60, width: 120, height: 80 }),
      ],
    });

    const restored = parseDrawingDocument(serializeDrawingDocument(doc));
    expect(restored.elements).toHaveLength(3);
    expect(restored.elements[0]?.type).toBe("text");
    expect(restored.width).toBe(1280);
    expect(restored.height).toBe(720);
  });

  it("builds editable templates", () => {
    const template = getDrawingTemplate("versus-split");
    expect(template).not.toBeNull();
    const doc = template!.create();
    expect(doc.elements.length).toBeGreaterThan(2);
    expect(doc.elements.some((element) => element.type === "person")).toBe(
      true,
    );
  });
});

describe("drawing geometry", () => {
  it("moves and resizes rectangles", () => {
    const rect = createRectangle({ x: 10, y: 20, width: 100, height: 50 });
    const moved = moveElement(rect, 5, 7);
    expect(moved.x).toBe(15);
    expect(moved.y).toBe(27);

    const resized = resizeElement(
      rect,
      "se",
      { x: 160, y: 100 },
      { x: 10, y: 20, width: 100, height: 50 },
      false,
    );
    expect(resized.width).toBe(150);
    expect(resized.height).toBe(80);
  });

  it("hit-tests elements", () => {
    const rect = createRectangle({ x: 10, y: 20, width: 100, height: 50 });
    expect(hitTestElement({ x: 20, y: 30 }, rect)).toBe(true);
    expect(hitTestElement({ x: 0, y: 0 }, rect)).toBe(false);
  });

  it("constrains square drawing with shift", () => {
    const box = normalizeDrawnBox(
      { x: 0, y: 0 },
      { x: 100, y: 40 },
      true,
    );
    expect(box.width).toBe(100);
    expect(box.height).toBe(100);
  });
});
