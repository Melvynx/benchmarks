import {
  DRAWING_HEIGHT,
  DRAWING_TEMPLATE_IDS,
  DRAWING_WIDTH,
  cloneDrawingObject,
  createBlankDrawingDocument,
  createDrawingTemplate,
  createPersonPlaceholder,
  parseDrawingDocument,
  serializeDrawingDocument,
} from "@/features/inspiration/drawing/drawing-document";
import {
  getDrawingObjectAtPoint,
  normalizePathPoints,
} from "@/features/inspiration/drawing/drawing-renderer";
import { describe, expect, it } from "vitest";

describe("drawing document", () => {
  it("round-trips a versioned editable document", () => {
    const document = createDrawingTemplate("reaction-arrow");
    const serialized = serializeDrawingDocument(document);

    expect(parseDrawingDocument(serialized)).toEqual(document);
    expect(JSON.parse(serialized)).toMatchObject({
      version: 1,
      width: DRAWING_WIDTH,
      height: DRAWING_HEIGHT,
    });
  });

  it.each(DRAWING_TEMPLATE_IDS)(
    "creates %s as ordinary editable objects",
    (templateId) => {
      const document = createDrawingTemplate(templateId);

      expect(document.objects.length).toBeGreaterThan(1);
      expect(document.objects.every((object) => Boolean(object.id))).toBe(true);
      expect(document.objects.some((object) => object.type === "text")).toBe(
        true,
      );
      expect(() => serializeDrawingDocument(document)).not.toThrow();
    },
  );

  it("duplicates an object with an independent id and offset", () => {
    const person = createPersonPlaceholder();
    const duplicate = cloneDrawingObject(person);

    expect(duplicate.id).not.toBe(person.id);
    expect(duplicate.x).toBe(person.x + 24);
    expect(duplicate.y).toBe(person.y + 24);
    expect(duplicate.type).toBe("person");
  });

  it("rejects flattened or unsupported drawing payloads", () => {
    expect(() =>
      parseDrawingDocument(JSON.stringify({ preview: "only.png" })),
    ).toThrow("invalid or uses an unsupported version");
    expect(() =>
      parseDrawingDocument(
        JSON.stringify({
          ...createBlankDrawingDocument(),
          version: 2,
        }),
      ),
    ).toThrow("invalid or uses an unsupported version");
  });
});

describe("drawing geometry", () => {
  it("normalizes freehand points into resize-safe local coordinates", () => {
    const normalized = normalizePathPoints([
      { x: 100, y: 200 },
      { x: 200, y: 350 },
      { x: 300, y: 250 },
    ]);

    expect(normalized).toMatchObject({
      x: 100,
      y: 200,
      width: 200,
      height: 150,
    });
    expect(normalized.points[0]).toEqual({ x: 0, y: 0 });
    expect(normalized.points[1]).toEqual({ x: 0.5, y: 1 });
  });

  it("hit-tests the topmost editable object", () => {
    const first = createPersonPlaceholder();
    const second = { ...createPersonPlaceholder(), x: first.x, y: first.y };
    const document = {
      ...createBlankDrawingDocument(),
      objects: [first, second],
    };

    expect(
      getDrawingObjectAtPoint(document, {
        x: first.x + first.width / 2,
        y: first.y + first.height / 2,
      })?.id,
    ).toBe(second.id);
  });
});
