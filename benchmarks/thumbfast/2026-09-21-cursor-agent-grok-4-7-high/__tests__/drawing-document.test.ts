import { describe, expect, it } from "vitest";
import {
  arrowBoxFromPoints,
  hitTest,
  resizeObject,
} from "../src/features/drawing/drawing-geometry";
import {
  createEmptyDrawing,
  parseDrawingDocument,
  serializeDrawing,
} from "../src/features/drawing/drawing.schema";
import { documentFromTemplate } from "../src/features/drawing/drawing-templates";

describe("drawing document", () => {
  it("round-trips a scene with every object type", () => {
    const document = createEmptyDrawing();
    document.objects = [
      {
        id: "rect-1",
        type: "rect",
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        rotation: 15,
        stroke: "#1e1e1e",
        fill: "#fff3bf",
        strokeWidth: 4,
      },
      {
        id: "text-1",
        type: "text",
        x: 40,
        y: 40,
        width: 200,
        height: 80,
        rotation: 0,
        text: "Hello",
        fontSize: 48,
        color: "#1e1e1e",
      },
      {
        id: "person-1",
        type: "person",
        x: 400,
        y: 80,
        width: 200,
        height: 300,
        rotation: 0,
        label: "Subject",
        stroke: "#1e1e1e",
        fill: "#fffef9",
        strokeWidth: 4,
      },
    ];

    const restored = parseDrawingDocument(serializeDrawing(document));
    expect(restored).toEqual(document);
  });

  it("rejects a flattened image payload that is not a drawing", () => {
    expect(parseDrawingDocument('{"image":"only.png"}')).toBeNull();
  });

  it("builds editable starter templates", () => {
    for (const id of [
      "big-text-subject",
      "reaction-arrow",
      "split-versus",
      "tutorial-callout",
    ]) {
      const document = documentFromTemplate(id);
      expect(document).not.toBeNull();
      expect(document?.objects.length).toBeGreaterThan(1);
      expect(parseDrawingDocument(serializeDrawing(document!))).toEqual(document);
    }
  });

  it("resizes from the opposite edge and locks aspect with shift", () => {
    const rect = {
      id: "rect-1",
      type: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      stroke: "#1e1e1e",
      fill: "transparent",
      strokeWidth: 4,
    };
    const resized = resizeObject(rect, "se", { x: 200, y: 80 }, false);
    expect(resized.x).toBe(0);
    expect(resized.y).toBe(0);
    expect(resized.width).toBe(200);
    expect(resized.height).toBe(80);

    const locked = resizeObject(rect, "se", { x: 200, y: 80 }, true);
    expect(locked.width / locked.height).toBeCloseTo(2);
  });

  it("snaps arrows to 45 degrees", () => {
    const free = arrowBoxFromPoints({ x: 0, y: 0 }, { x: 100, y: 10 }, false);
    const snapped = arrowBoxFromPoints({ x: 0, y: 0 }, { x: 100, y: 10 }, true);
    expect(Math.abs(free.rotation)).toBeGreaterThan(0);
    expect(snapped.rotation).toBeCloseTo(0);
  });

  it("hits the topmost object", () => {
    const back = {
      id: "back",
      type: "rect" as const,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      stroke: "#1e1e1e",
      fill: "transparent",
      strokeWidth: 4,
    };
    const front = { ...back, id: "front", x: 20, y: 20 };
    expect(hitTest([back, front], { x: 30, y: 30 })?.id).toBe("front");
    expect(hitTest([back, front], { x: 5, y: 5 })?.id).toBe("back");
  });
});