import {
  STARTER_TEMPLATES,
  cloneDrawingDocument,
  createArrowFromCanvasPoints,
  createDocumentFromTemplate,
  createDrawingDocument,
  createEllipse,
  createImage,
  createPencilFromCanvasPoints,
  createPerson,
  createRectangle,
  createText,
  hasPersonObject,
  isPersonObject,
  moveObject,
  parseDrawingDocument,
  serializeDrawingDocument,
} from "@/features/drawing/drawing-document";
import { assertValidDrawingDocument } from "@convex/lib/drawingDocument";
import { describe, expect, it } from "vitest";

describe("drawing document", () => {
  it("round trips every object type through strict serialization", () => {
    const document = createDrawingDocument({
      background: "#f8fafc",
      objects: [
        createRectangle({ id: "rect-1" }),
        createEllipse({ id: "ellipse-1" }),
        createArrowFromCanvasPoints(
          { x: 700, y: 100 },
          { x: 520, y: 340 },
          { id: "arrow-1" },
        ),
        createText({ id: "text-1", text: "First line\nSecond line" }),
        createPencilFromCanvasPoints(
          [
            { x: 80, y: 560 },
            { x: 240, y: 500 },
            { x: 430, y: 590 },
          ],
          { id: "pencil-1" },
        ),
        createImage({
          id: "image-1",
          src: "https://images.example.com/subject.png",
          alt: "Subject",
        }),
        createPerson({ id: "person-1", label: "SUBJECT" }),
      ],
    });

    const parsed = parseDrawingDocument(serializeDrawingDocument(document));

    expect(parsed).toEqual(document);
    expect(parsed).not.toBe(document);
    expect(parsed.objects).not.toBe(document.objects);

    const arrow = parsed.objects.find((object) => object.type === "arrow");
    const pencil = parsed.objects.find((object) => object.type === "pencil");
    expect(arrow).toMatchObject({
      startX: 1,
      startY: 0,
      endX: 0,
      endY: 1,
    });
    expect(
      pencil?.points.every(
        (point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1,
      ),
    ).toBe(true);
  });

  it("rejects documents with the wrong version or unknown fields", () => {
    const document = createDrawingDocument();

    expect(() =>
      parseDrawingDocument({
        ...document,
        version: 2,
      }),
    ).toThrow();
    expect(() =>
      parseDrawingDocument({
        ...document,
        rotation: 0,
      }),
    ).toThrow();
  });

  it("provides exactly four fresh, editable starter compositions", () => {
    expect(STARTER_TEMPLATES.map((template) => template.id)).toEqual([
      "big-text-subject",
      "reaction-arrow",
      "versus-split",
      "tutorial-callout",
    ]);

    const documents = STARTER_TEMPLATES.map((template) =>
      createDocumentFromTemplate(template.id),
    );
    const coveredTypes = new Set(
      documents.flatMap((document) =>
        document.objects.map((object) => object.type),
      ),
    );

    expect(coveredTypes).toEqual(
      new Set(["rect", "ellipse", "arrow", "text", "pencil", "person"]),
    );

    for (const [index, document] of documents.entries()) {
      expect(document.objects.length).toBeGreaterThan(0);
      expect(() => parseDrawingDocument(document)).not.toThrow();
      expect(document.objects.every((object) => !("rotation" in object))).toBe(
        true,
      );

      const firstObject = document.objects[0];
      const movedObject = moveObject(firstObject, 20, 12);
      expect(movedObject.x).toBe(firstObject.x + 20);
      expect(movedObject.y).toBe(firstObject.y + 12);

      const freshDocument = createDocumentFromTemplate(
        STARTER_TEMPLATES[index].id,
      );
      expect(freshDocument).not.toBe(document);
      expect(freshDocument.objects).not.toBe(document.objects);
      expect(freshDocument.objects[0].id).not.toBe(firstObject.id);

      const clonedDocument = cloneDrawingDocument(document);
      clonedDocument.objects[0].x += 40;
      expect(document.objects[0].x).toBe(firstObject.x);
    }
  });

  it("detects person placeholders without treating other objects as people", () => {
    const text = createText({ id: "headline" });
    const person = createPerson({ id: "subject" });
    const withoutPerson = createDrawingDocument({ objects: [text] });
    const withPerson = createDrawingDocument({ objects: [text, person] });

    expect(isPersonObject(text)).toBe(false);
    expect(isPersonObject(person)).toBe(true);
    expect(hasPersonObject(withoutPerson)).toBe(false);
    expect(hasPersonObject(withPerson)).toBe(true);
    expect(hasPersonObject(withPerson.objects)).toBe(true);
  });

  it("rejects malformed documents again at the Convex persistence boundary", () => {
    const rectangle = createRectangle({ id: "duplicate" });
    const validDocument = createDrawingDocument({ objects: [rectangle] });

    expect(() => assertValidDrawingDocument(validDocument)).not.toThrow();
    expect(() =>
      assertValidDrawingDocument({
        ...validDocument,
        objects: [rectangle, { ...rectangle }],
      }),
    ).toThrow("Invalid drawing document");
    expect(() =>
      assertValidDrawingDocument({
        ...validDocument,
        objects: [{ ...rectangle, opacity: Number.NaN }],
      }),
    ).toThrow("Invalid drawing document");
  });
});
