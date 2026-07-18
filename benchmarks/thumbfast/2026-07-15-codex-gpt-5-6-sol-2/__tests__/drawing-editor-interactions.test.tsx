import { DrawingCanvas } from "@/features/drawing/drawing-canvas";
import {
  createDrawingDocument,
  createRectangle,
  createText,
  type DrawingDocument,
} from "@/features/drawing/drawing-document";
import type { DrawingTool } from "@/features/drawing/drawing-toolbar";
import { useDrawingHistory } from "@/features/drawing/use-drawing-history";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

describe("drawing editor interactions", () => {
  it("merges delayed additions into the latest history document", () => {
    const initialDocument = createDrawingDocument();
    const { result } = renderHook(() => useDrawingHistory(initialDocument));

    act(() => {
      result.current.commit({
        ...result.current.document,
        objects: [createText({ id: "newer-edit", text: "Keep this" })],
      });
    });
    act(() => {
      result.current.commitWith((currentDocument) => ({
        ...currentDocument,
        objects: [
          ...currentDocument.objects,
          createRectangle({ id: "delayed-upload" }),
        ],
      }));
    });

    expect(result.current.document.objects.map((object) => object.id)).toEqual([
      "newer-edit",
      "delayed-upload",
    ]);

    act(() => result.current.undo());
    expect(result.current.document.objects.map((object) => object.id)).toEqual([
      "newer-edit",
    ]);
  });

  it("keeps a shift-constrained shape inside the thumbnail frame", () => {
    render(
      <CanvasHarness
        initialDocument={createDrawingDocument()}
        initialTool="rect"
      />,
    );
    const canvas = screen.getByRole("application");
    mockCanvasPointerApis(canvas);

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 1_200,
      clientY: 650,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 1_275,
      clientY: 718,
      pointerId: 1,
      shiftKey: true,
    });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    const shape = canvas.querySelector<SVGRectElement>(
      "g[data-object-id] > rect",
    );
    expect(shape).not.toBeNull();
    const x = Number(shape?.getAttribute("x"));
    const y = Number(shape?.getAttribute("y"));
    const width = Number(shape?.getAttribute("width"));
    const height = Number(shape?.getAttribute("height"));
    expect(width).toBe(height);
    expect(x + width).toBeLessThanOrEqual(1_280);
    expect(y + height).toBeLessThanOrEqual(720);
  });

  it("keeps a shift-constrained horizontal arrow perfectly horizontal", () => {
    render(
      <CanvasHarness
        initialDocument={createDrawingDocument()}
        initialTool="arrow"
      />,
    );
    const canvas = screen.getByRole("application");
    mockCanvasPointerApis(canvas);

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 200,
      clientY: 300,
      pointerId: 3,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 520,
      clientY: 312,
      pointerId: 3,
      shiftKey: true,
    });
    fireEvent.pointerUp(canvas, { pointerId: 3 });

    const arrow = canvas.querySelector<SVGLineElement>(
      "g[data-object-id] > line",
    );
    expect(arrow).not.toBeNull();
    expect(arrow?.getAttribute("y1")).toBe(arrow?.getAttribute("y2"));
  });

  it("keeps a resize handle attached after crossing the opposite corner", () => {
    const rectangle = createRectangle({
      id: "resize-me",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    });
    render(
      <CanvasHarness
        initialDocument={createDrawingDocument({ objects: [rectangle] })}
        initialSelectedObjectId={rectangle.id}
      />,
    );
    const canvas = screen.getByRole("application");
    mockCanvasPointerApis(canvas);
    const selection = screen.getByLabelText("Selected object controls");
    const northWestHandle =
      selection.querySelector<SVGRectElement>('rect[width="38"]');
    expect(northWestHandle).not.toBeNull();

    fireEvent.pointerDown(northWestHandle as SVGRectElement, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 2,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 400,
      clientY: 250,
      pointerId: 2,
    });
    fireEvent.pointerUp(canvas, { pointerId: 2 });

    const resized = canvas.querySelector<SVGRectElement>(
      'g[data-object-id="resize-me"] > rect',
    );
    expect(resized).toHaveAttribute("x", "300");
    expect(resized).toHaveAttribute("y", "200");
    expect(resized).toHaveAttribute("width", "100");
    expect(resized).toHaveAttribute("height", "50");
  });

  it("edits text on double-click and commits it with Escape", () => {
    const text = createText({ id: "headline", text: "Before" });
    render(
      <CanvasHarness
        initialDocument={createDrawingDocument({ objects: [text] })}
      />,
    );

    fireEvent.doubleClick(
      screen.getByRole("button", { name: "text drawing object" }),
    );
    const editor = screen.getByRole("textbox", { name: "Edit drawing text" });
    fireEvent.change(editor, { target: { value: "After" } });
    fireEvent.keyDown(editor, { key: "Escape" });

    expect(
      screen.queryByRole("textbox", { name: "Edit drawing text" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });
});

function CanvasHarness({
  initialDocument,
  initialTool = "select",
  initialSelectedObjectId = null,
}: {
  initialDocument: DrawingDocument;
  initialTool?: DrawingTool;
  initialSelectedObjectId?: string | null;
}) {
  const [document, setDocument] = useState(initialDocument);
  const [tool, setTool] = useState(initialTool);
  const [selectedObjectId, setSelectedObjectId] = useState(
    initialSelectedObjectId,
  );
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  return (
    <DrawingCanvas
      document={document}
      tool={tool}
      disabled={false}
      selectedObjectId={selectedObjectId}
      editingTextId={editingTextId}
      onSelectObject={setSelectedObjectId}
      onToolChange={setTool}
      onPreviewDocument={setDocument}
      onCommitDocument={(_previous, next) => setDocument(next)}
      onStartTextEditing={setEditingTextId}
      onFinishTextEditing={() => setEditingTextId(null)}
    />
  );
}

function mockCanvasPointerApis(canvas: HTMLElement) {
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 1_280,
    top: 0,
    width: 1_280,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  Object.defineProperties(canvas, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
}
