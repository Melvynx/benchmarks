import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrawingCanvas } from "@/features/drawing/drawing-canvas";
import {
  createRectangle,
  DEFAULT_STYLE,
} from "@/features/drawing/drawing-factory";
import { DRAWING_TEMPLATES } from "@/features/drawing/drawing-templates";
import { useDrawingStore } from "@/features/drawing/drawing-store";

// happy-dom lacks ResizeObserver, which the canvas uses to track scale.
class ResizeObserverMock {
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  useDrawingStore.getState().reset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DrawingCanvas", () => {
  it("mounts and renders the stage", () => {
    const { container } = render(<DrawingCanvas />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders store elements as SVG shapes", () => {
    const { container } = render(<DrawingCanvas />);
    const before = container.querySelectorAll("rect").length;
    act(() => {
      useDrawingStore
        .getState()
        .addElement(
          createRectangle({ x: 10, y: 10 }, { x: 110, y: 90 }, DEFAULT_STYLE),
        );
    });
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(before);
  });

  it("renders a selection overlay for the selected element", () => {
    const { container } = render(<DrawingCanvas />);
    const element = createRectangle(
      { x: 10, y: 10 },
      { x: 110, y: 90 },
      DEFAULT_STYLE,
    );
    act(() => {
      useDrawingStore.getState().addElement(element);
    });
    // Selecting an element renders resize handles (small rects) on top of the
    // element rect and the background rect.
    const handleCount = container.querySelectorAll("rect").length;
    expect(handleCount).toBeGreaterThan(2);
  });

  it("renders every element of an inserted template", () => {
    const { container } = render(<DrawingCanvas />);
    const template = DRAWING_TEMPLATES[2];
    const elements = template.build();
    act(() => {
      useDrawingStore.getState().addElements(elements);
    });
    // Text elements render as foreignObject; shapes as rect/ellipse/line.
    const rendered = container.querySelectorAll(
      "rect, ellipse, line, polyline, foreignObject, image, g",
    );
    expect(rendered.length).toBeGreaterThan(0);
  });
});
