import { beforeEach, describe, expect, it } from "vitest";
import { deserializeDocument } from "@/features/drawing/drawing-document";
import {
  createRectangle,
  DEFAULT_STYLE,
} from "@/features/drawing/drawing-factory";
import { DRAWING_TEMPLATES } from "@/features/drawing/drawing-templates";
import { useDrawingStore } from "@/features/drawing/drawing-store";

function rect() {
  return createRectangle({ x: 10, y: 10 }, { x: 110, y: 90 }, DEFAULT_STYLE);
}

describe("drawing store", () => {
  beforeEach(() => {
    useDrawingStore.getState().reset();
  });

  it("adds and selects an element", () => {
    const element = rect();
    useDrawingStore.getState().addElement(element);
    const state = useDrawingStore.getState();
    expect(state.elements).toHaveLength(1);
    expect(state.selectedIds).toEqual([element.id]);
    expect(state.isDirty).toBe(true);
  });

  it("undoes and redoes discrete edits", () => {
    const store = useDrawingStore.getState();
    store.addElement(rect());
    expect(useDrawingStore.getState().elements).toHaveLength(1);
    useDrawingStore.getState().undo();
    expect(useDrawingStore.getState().elements).toHaveLength(0);
    useDrawingStore.getState().redo();
    expect(useDrawingStore.getState().elements).toHaveLength(1);
  });

  it("deletes and duplicates the selection", () => {
    const element = rect();
    useDrawingStore.getState().addElement(element);
    useDrawingStore.getState().duplicateSelected();
    expect(useDrawingStore.getState().elements).toHaveLength(2);
    // Duplicates get fresh ids.
    const ids = useDrawingStore.getState().elements.map((el) => el.id);
    expect(new Set(ids).size).toBe(2);
    useDrawingStore.getState().deleteSelected();
    expect(useDrawingStore.getState().elements).toHaveLength(1);
  });

  it("copies and pastes via the clipboard", () => {
    const element = rect();
    useDrawingStore.getState().addElement(element);
    useDrawingStore.getState().copySelected();
    useDrawingStore.getState().paste();
    expect(useDrawingStore.getState().elements).toHaveLength(2);
    // Pasted element is selected and offset.
    const selected = useDrawingStore.getState().selectedIds;
    expect(selected).toHaveLength(1);
    expect(selected[0]).not.toBe(element.id);
  });

  it("applies style to the current selection", () => {
    const element = rect();
    useDrawingStore.getState().addElement(element);
    useDrawingStore.getState().applyStyleToSelection({ stroke: "#e03131" });
    const updated = useDrawingStore
      .getState()
      .elements.find((el) => el.id === element.id);
    expect(updated).toMatchObject({ stroke: "#e03131" });
    expect(useDrawingStore.getState().activeStyle.stroke).toBe("#e03131");
  });

  it("inserts a template as editable elements", () => {
    const template = DRAWING_TEMPLATES[0];
    useDrawingStore.getState().addElements(template.build());
    expect(useDrawingStore.getState().elements.length).toBeGreaterThan(0);
    // Every template element is individually addressable.
    const ids = useDrawingStore.getState().elements.map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("serializes and reloads without losing the scene", () => {
    useDrawingStore.getState().addElements(DRAWING_TEMPLATES[1].build());
    const serialized = useDrawingStore.getState().getSerialized();
    const { document } = deserializeDocument(serialized);
    useDrawingStore.getState().reset();
    useDrawingStore.getState().loadDocument(document);
    const state = useDrawingStore.getState();
    expect(state.elements).toEqual(document.elements);
    // A freshly loaded document is not dirty.
    expect(state.isDirty).toBe(false);
  });
});
