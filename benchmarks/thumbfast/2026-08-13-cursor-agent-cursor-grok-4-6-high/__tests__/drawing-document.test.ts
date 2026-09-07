import { describe, expect, it } from "vitest";

import {
  cloneDocument,
  constrainArrow,
  constrainRect,
  createArrowElement,
  createEmptyDocument,
  createPersonElement,
  createRectElement,
  createTextElement,
  deleteElements,
  documentHasPerson,
  documentTitle,
  duplicateElements,
  getElementBounds,
  hitTestElement,
  moveElements,
  parseDrawingDocument,
  resizeElement,
  serializeDrawingDocument,
} from "@/features/drawing/drawing.document";
import { createTemplateDocument } from "@/features/drawing/drawing.templates";
import type { DrawingElement } from "@/features/drawing/drawing.schema";

describe("drawing document", () => {
  it("round-trips serialization", () => {
    const document = createEmptyDocument();
    document.elements.push(
      createTextElement({ text: "HOOK", x: 40, y: 40 }),
      createPersonElement({ x: 800, y: 100 }),
    );

    const parsed = parseDrawingDocument(serializeDrawingDocument(document));
    expect(parsed.elements).toHaveLength(2);
    expect(documentTitle(parsed)).toBe("HOOK");
    expect(documentHasPerson(parsed)).toBe(true);
  });

  it("moves, duplicates, and deletes selected objects", () => {
    const first = createTextElement({ id: "a", x: 10, y: 10, text: "A" });
    const second = createPersonElement({ id: "b", x: 100, y: 100 });
    let elements: DrawingElement[] = [first, second];

    elements = moveElements(elements, new Set(["a"]), { x: 15, y: 5 });
    expect(elements[0].x).toBe(25);
    expect(elements[0].y).toBe(15);

    const duplicated = duplicateElements(elements, new Set(["a"]), 10);
    expect(duplicated.elements).toHaveLength(3);
    expect(duplicated.duplicatedIds).toHaveLength(1);

    elements = deleteElements(duplicated.elements, new Set(["b"]));
    expect(elements.some((element) => element.id === "b")).toBe(false);
  });

  it("resizes from a corner and constrains with shift", () => {
    const rect = createRectElement({ x: 0, y: 0, width: 100, height: 50 });
    const resized = resizeElement(rect, "se", { x: 200, y: 80 });
    expect(resized.width).toBe(200);
    expect(resized.height).toBe(80);

    const square = constrainRect({ x: 0, y: 0 }, { x: 40, y: 10 }, true);
    expect(square.width).toBe(square.height);

    const arrow = constrainArrow({ x: 0, y: 0 }, { x: 20, y: 2 }, true);
    expect(Math.abs(arrow.height)).toBeLessThan(0.001);
  });

  it("hits text and misses empty space", () => {
    const text = createTextElement({ x: 10, y: 10, width: 100, height: 40 });
    expect(hitTestElement(text, { x: 20, y: 20 })).toBe(true);
    expect(hitTestElement(text, { x: 400, y: 400 })).toBe(false);
  });

  it("normalizes arrow bounds for leftward arrows", () => {
    const arrow = createArrowElement({ x: 200, y: 100, width: -80, height: 40 });
    const bounds = getElementBounds(arrow);
    expect(bounds.x).toBe(120);
    expect(bounds.width).toBe(80);
    expect(bounds.height).toBe(40);
  });

  it("creates editable template documents", () => {
    const template = createTemplateDocument("split-versus");
    expect(template.elements.length).toBeGreaterThan(3);
    expect(template.elements.some((element) => element.type === "text")).toBe(
      true,
    );
    expect(cloneDocument(template).elements[0].id).toBe(
      template.elements[0].id,
    );
  });
});
