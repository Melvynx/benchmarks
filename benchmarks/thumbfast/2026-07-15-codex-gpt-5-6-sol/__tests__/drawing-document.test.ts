import {
  STARTER_TEMPLATES,
  createDocumentFromTemplate,
  createDrawingDocument,
  createShapeObject,
  deserializeDrawingDocument,
  duplicateDrawingObject,
  normalizeDraggedObject,
  serializeDrawingDocument,
} from "@/features/drawing/drawing-document";
import { describe, expect, it } from "vitest";

describe("drawing document", () => {
  it("round-trips every editable starter template", () => {
    for (const template of STARTER_TEMPLATES) {
      const document = createDocumentFromTemplate(template.id);
      const restored = deserializeDrawingDocument(
        serializeDrawingDocument(document),
      );

      expect(restored).toEqual(document);
      expect(restored.objects.length).toBeGreaterThan(2);
      expect(new Set(restored.objects.map((object) => object.id)).size).toBe(
        restored.objects.length,
      );
    }
  });

  it("falls back to a blank valid document for corrupt data", () => {
    expect(deserializeDrawingDocument("not-json")).toEqual(
      createDrawingDocument(),
    );
    expect(
      deserializeDrawingDocument(
        JSON.stringify({ version: 99, width: 1, height: 1, objects: [] }),
      ),
    ).toEqual(createDrawingDocument());
  });

  it("duplicates objects with a new id and visible offset", () => {
    const object = createShapeObject("rectangle", { x: 100, y: 100 });
    const duplicate = duplicateDrawingObject(object);

    expect(duplicate.id).not.toBe(object.id);
    expect(duplicate.x).toBeGreaterThan(object.x);
    expect(duplicate.y).toBeGreaterThan(object.y);
  });

  it("preserves arrow direction while normalizing its bounds", () => {
    const arrow = createShapeObject("arrow", { x: 500, y: 400 });
    const normalized = normalizeDraggedObject(
      arrow,
      { x: 500, y: 400 },
      { x: 200, y: 100 },
    );

    expect(normalized.type).toBe("arrow");
    if (normalized.type !== "arrow") return;
    expect(normalized).toMatchObject({
      x: 200,
      y: 100,
      width: 300,
      height: 300,
      flipX: true,
      flipY: true,
    });
  });
});
