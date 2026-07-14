import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addElements,
  createArrow,
  createEllipse,
  createEmptyDrawingDocument,
  createFreehand,
  createImage,
  createPerson,
  createRectangle,
  createText,
  duplicateElements,
  removeElements,
  updateElements,
} from "./drawing.document";
import {
  getElementBounds,
  getSelectionBounds,
  hitTestHandle,
  hitTestTopElement,
  moveElement,
  normalizeDrawnBox,
  resizeElement,
  rotateElement,
  type Point,
} from "./drawing.geometry";
import {
  canRedo,
  canUndo,
  commitHistory,
  createHistory,
  redoHistory,
  replacePresent,
  undoHistory,
  type DrawingHistory,
} from "./drawing.history";
import { getDrawingTemplate } from "./drawing.templates";
import type {
  DrawingDocument,
  DrawingElement,
  DrawingTool,
  ResizeHandle,
  TextElement,
} from "./drawing.types";

type DragMode =
  | { type: "none" }
  | { type: "pan-select"; start: Point; moved: boolean }
  | {
      type: "move";
      start: Point;
      originElements: DrawingElement[];
      originDocument: DrawingDocument;
    }
  | {
      type: "resize";
      handle: Exclude<ResizeHandle, "rotate">;
      originBounds: ReturnType<typeof getElementBounds>;
      originElement: DrawingElement;
      originDocument: DrawingDocument;
    }
  | {
      type: "rotate";
      originElement: DrawingElement;
      originDocument: DrawingDocument;
    }
  | {
      type: "draw-shape";
      start: Point;
      tool: Exclude<DrawingTool, "select" | "image" | "person" | "text">;
    }
  | {
      type: "draw-freehand";
      points: Point[];
    }
  | {
      type: "draw-arrow";
      start: Point;
    };

type UseDrawingEditorOptions = {
  initialDocument?: DrawingDocument | null;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable ||
    target.closest("[data-drawing-text-editor='true']") !== null
  );
}

export function useDrawingEditor(options?: UseDrawingEditorOptions) {
  const initial = options?.initialDocument ?? createEmptyDrawingDocument();
  const [history, setHistory] = useState<DrawingHistory>(() =>
    createHistory(initial),
  );
  const [tool, setTool] = useState<DrawingTool>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [strokeColor, setStrokeColor] = useState("#1e1e1e");
  const [fillColor, setFillColor] = useState("transparent");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [previewElement, setPreviewElement] = useState<DrawingElement | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [clipboard, setClipboard] = useState<DrawingElement[]>([]);
  const dragRef = useRef<DragMode>({ type: "none" });
  const savedSnapshotRef = useRef(JSON.stringify(initial));
  const textEditOriginRef = useRef<DrawingDocument | null>(null);

  const document = history.present;

  const selectedElements = useMemo(
    () =>
      document.elements.filter((element) => selectedIds.includes(element.id)),
    [document.elements, selectedIds],
  );

  const selectedElement =
    selectedElements.length === 1 ? selectedElements[0] : null;

  const markDirty = useCallback((nextDoc: DrawingDocument) => {
    setIsDirty(JSON.stringify(nextDoc) !== savedSnapshotRef.current);
  }, []);

  const commit = useCallback(
    (nextDoc: DrawingDocument) => {
      setHistory((current) => commitHistory(current, nextDoc));
      markDirty(nextDoc);
    },
    [markDirty],
  );

  const replace = useCallback(
    (nextDoc: DrawingDocument) => {
      setHistory((current) => replacePresent(current, nextDoc));
      markDirty(nextDoc);
    },
    [markDirty],
  );

  const loadDocument = useCallback((nextDoc: DrawingDocument) => {
    setHistory(createHistory(nextDoc));
    setSelectedIds([]);
    setEditingTextId(null);
    setPreviewElement(null);
    savedSnapshotRef.current = JSON.stringify(nextDoc);
    setIsDirty(false);
  }, []);

  const markSaved = useCallback(
    (nextDoc?: DrawingDocument) => {
      const snapshot = nextDoc ?? history.present;
      savedSnapshotRef.current = JSON.stringify(snapshot);
      setIsDirty(false);
    },
    [history.present],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setEditingTextId(null);
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    commit(removeElements(document, selectedIds));
    clearSelection();
  }, [clearSelection, commit, document, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (selectedElements.length === 0) return;
    const copies = duplicateElements(selectedElements);
    commit(addElements(document, copies));
    setSelectedIds(copies.map((element) => element.id));
  }, [commit, document, selectedElements]);

  const copySelected = useCallback(() => {
    if (selectedElements.length === 0) return;
    setClipboard(structuredClone(selectedElements));
  }, [selectedElements]);

  const pasteClipboard = useCallback(() => {
    if (clipboard.length === 0) return;
    const copies = duplicateElements(clipboard);
    commit(addElements(document, copies));
    setSelectedIds(copies.map((element) => element.id));
  }, [clipboard, commit, document]);

  const undo = useCallback(() => {
    setHistory((current) => {
      const next = undoHistory(current);
      markDirty(next.present);
      return next;
    });
    setEditingTextId(null);
  }, [markDirty]);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = redoHistory(current);
      markDirty(next.present);
      return next;
    });
    setEditingTextId(null);
  }, [markDirty]);

  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = getDrawingTemplate(templateId);
      if (!template) return;
      const next = template.create();
      commit(next);
      clearSelection();
      setTool("select");
    },
    [clearSelection, commit],
  );

  const insertPerson = useCallback(
    (point?: Point) => {
      const element = createPerson({
        x: point?.x ?? document.width / 2 - 90,
        y: point?.y ?? document.height / 2 - 140,
        strokeColor,
        fillColor: fillColor === "transparent" ? "#dee2e6" : fillColor,
      });
      commit(addElements(document, [element]));
      setSelectedIds([element.id]);
      setTool("select");
    },
    [commit, document, fillColor, strokeColor],
  );

  const insertImage = useCallback(
    async (src: string, naturalWidth: number, naturalHeight: number) => {
      const maxWidth = 420;
      const scale = Math.min(1, maxWidth / naturalWidth);
      const width = Math.round(naturalWidth * scale);
      const height = Math.round(naturalHeight * scale);
      const element = createImage({
        x: document.width / 2 - width / 2,
        y: document.height / 2 - height / 2,
        width,
        height,
        src,
      });
      commit(addElements(document, [element]));
      setSelectedIds([element.id]);
      setTool("select");
    },
    [commit, document],
  );

  const insertTextAt = useCallback(
    (point: Point) => {
      const element = createText({
        x: point.x,
        y: point.y,
        text: "Text",
        strokeColor,
      });
      const next = addElements(document, [element]);
      textEditOriginRef.current = structuredClone(document);
      commit(next);
      setSelectedIds([element.id]);
      setEditingTextId(element.id);
      setTool("select");
    },
    [commit, document, strokeColor],
  );

  const updateSelectedStyle = useCallback(
    (patch: Partial<DrawingElement>) => {
      if (selectedIds.length === 0) return;
      commit(
        updateElements(document, selectedIds, (element) => {
          return { ...element, ...patch } as DrawingElement;
        }),
      );
    },
    [commit, document, selectedIds],
  );

  const updateTextContent = useCallback(
    (id: string, text: string) => {
      replace(
        updateElements(document, [id], (element) => {
          if (element.type !== "text") return element;
          const next: TextElement = {
            ...element,
            text,
            width: Math.max(
              element.width,
              Math.max(text.length, 1) * element.fontSize * 0.55,
            ),
            height: Math.max(
              element.height,
              text.split("\n").length * element.fontSize * 1.3,
            ),
          };
          return next;
        }),
      );
    },
    [document, replace],
  );

  const finishTextEditing = useCallback(() => {
    if (!editingTextId) return;
    const element = document.elements.find((item) => item.id === editingTextId);
    const origin = textEditOriginRef.current;
    textEditOriginRef.current = null;

    if (element?.type === "text" && element.text.trim() === "") {
      const next = removeElements(document, [editingTextId]);
      if (origin) {
        setHistory((current) => ({
          past: [...current.past, structuredClone(origin)].slice(-100),
          present: structuredClone(next),
          future: [],
        }));
        markDirty(next);
      } else {
        commit(next);
      }
    } else if (origin) {
      setHistory((current) => ({
        past: [...current.past, structuredClone(origin)].slice(-100),
        present: structuredClone(current.present),
        future: [],
      }));
      markDirty(document);
    } else {
      commit(document);
    }
    setEditingTextId(null);
  }, [commit, document, editingTextId, markDirty]);

  const onPointerDown = useCallback(
    (point: Point, event: { shiftKey: boolean; detail: number }) => {
      if (editingTextId) {
        finishTextEditing();
      }

      if (tool === "text") {
        insertTextAt(point);
        return;
      }

      if (tool === "person") {
        insertPerson(point);
        return;
      }

      if (tool === "image") {
        return;
      }

      if (tool === "freehand") {
        dragRef.current = { type: "draw-freehand", points: [point] };
        setPreviewElement(
          createFreehand({
            x: point.x,
            y: point.y,
            points: [point],
            strokeColor,
          }),
        );
        return;
      }

      if (tool === "arrow") {
        dragRef.current = { type: "draw-arrow", start: point };
        setPreviewElement(
          createArrow({
            x: point.x,
            y: point.y,
            points: [point, point],
            strokeColor,
          }),
        );
        return;
      }

      if (tool === "rectangle" || tool === "ellipse") {
        dragRef.current = { type: "draw-shape", start: point, tool };
        const box = normalizeDrawnBox(point, point, false);
        setPreviewElement(
          tool === "rectangle"
            ? createRectangle({
                ...box,
                strokeColor,
                fillColor,
              })
            : createEllipse({
                ...box,
                strokeColor,
                fillColor,
              }),
        );
        return;
      }

      // select tool
      if (selectedElements.length > 0) {
        const bounds = getSelectionBounds(selectedElements);
        if (bounds) {
          const handle = hitTestHandle(point, bounds);
          if (handle === "rotate" && selectedElement) {
            dragRef.current = {
              type: "rotate",
              originElement: structuredClone(selectedElement),
              originDocument: structuredClone(document),
            };
            return;
          }
          if (handle && handle !== "rotate" && selectedElement) {
            dragRef.current = {
              type: "resize",
              handle,
              originBounds: getElementBounds(selectedElement),
              originElement: structuredClone(selectedElement),
              originDocument: structuredClone(document),
            };
            return;
          }
        }
      }

      const hit = hitTestTopElement(point, document.elements);
      if (hit) {
        if (event.detail === 2 && hit.type === "text") {
          textEditOriginRef.current = structuredClone(document);
          setSelectedIds([hit.id]);
          setEditingTextId(hit.id);
          return;
        }
        const nextIds = event.shiftKey
          ? selectedIds.includes(hit.id)
            ? selectedIds.filter((id) => id !== hit.id)
            : [...selectedIds, hit.id]
          : [hit.id];
        setSelectedIds(nextIds);
        const moving = document.elements.filter((element) =>
          nextIds.includes(element.id),
        );
        dragRef.current = {
          type: "move",
          start: point,
          originElements: structuredClone(moving),
          originDocument: structuredClone(document),
        };
        return;
      }

      clearSelection();
      dragRef.current = { type: "pan-select", start: point, moved: false };
    },
    [
      clearSelection,
      document,
      editingTextId,
      fillColor,
      finishTextEditing,
      insertPerson,
      insertTextAt,
      selectedElement,
      selectedElements,
      selectedIds,
      strokeColor,
      tool,
    ],
  );

  const onPointerMove = useCallback(
    (point: Point, event: { shiftKey: boolean }) => {
      const drag = dragRef.current;

      if (drag.type === "move") {
        const dx = point.x - drag.start.x;
        const dy = point.y - drag.start.y;
        const moved = drag.originElements.map((element) =>
          moveElement(element, dx, dy),
        );
        const movedById = new Map(
          moved.map((element) => [element.id, element]),
        );
        replace({
          ...document,
          elements: document.elements.map(
            (element) => movedById.get(element.id) ?? element,
          ),
        });
        return;
      }

      if (drag.type === "resize") {
        const next = resizeElement(
          drag.originElement,
          drag.handle,
          point,
          drag.originBounds,
          event.shiftKey,
        );
        replace(updateElements(document, [drag.originElement.id], () => next));
        return;
      }

      if (drag.type === "rotate") {
        const next = rotateElement(drag.originElement, point);
        replace(updateElements(document, [drag.originElement.id], () => next));
        return;
      }

      if (drag.type === "draw-freehand") {
        const points = [...drag.points, point];
        dragRef.current = { type: "draw-freehand", points };
        setPreviewElement(
          createFreehand({
            x: points[0].x,
            y: points[0].y,
            points,
            strokeColor,
          }),
        );
        return;
      }

      if (drag.type === "draw-arrow") {
        setPreviewElement(
          createArrow({
            x: drag.start.x,
            y: drag.start.y,
            points: [drag.start, point],
            strokeColor,
          }),
        );
        return;
      }

      if (drag.type === "draw-shape") {
        const box = normalizeDrawnBox(drag.start, point, event.shiftKey);
        setPreviewElement(
          drag.tool === "rectangle"
            ? createRectangle({
                ...box,
                strokeColor,
                fillColor,
              })
            : createEllipse({
                ...box,
                strokeColor,
                fillColor,
              }),
        );
      }
    },
    [document, fillColor, replace, strokeColor],
  );

  const onPointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = { type: "none" };

    if (
      drag.type === "move" ||
      drag.type === "resize" ||
      drag.type === "rotate"
    ) {
      setHistory((current) => ({
        past: [...current.past, structuredClone(drag.originDocument)].slice(
          -100,
        ),
        present: structuredClone(current.present),
        future: [],
      }));
      markDirty(document);
      return;
    }

    if (drag.type === "draw-freehand" && previewElement?.type === "freehand") {
      if (previewElement.points.length > 1) {
        commit(addElements(document, [previewElement]));
        setSelectedIds([previewElement.id]);
        setTool("select");
      }
      setPreviewElement(null);
      return;
    }

    if (drag.type === "draw-arrow" && previewElement?.type === "arrow") {
      const [start, end] = previewElement.points;
      if (Math.hypot(end.x - start.x, end.y - start.y) > 8) {
        commit(addElements(document, [previewElement]));
        setSelectedIds([previewElement.id]);
        setTool("select");
      }
      setPreviewElement(null);
      return;
    }

    if (
      drag.type === "draw-shape" &&
      previewElement &&
      (previewElement.type === "rectangle" || previewElement.type === "ellipse")
    ) {
      if (previewElement.width > 4 && previewElement.height > 4) {
        commit(addElements(document, [previewElement]));
        setSelectedIds([previewElement.id]);
        setTool("select");
      }
      setPreviewElement(null);
    }
  }, [commit, document, markDirty, previewElement]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) && event.key !== "Escape") {
        return;
      }

      const meta = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (editingTextId) {
          finishTextEditing();
          return;
        }
        if (selectedIds.length > 0) {
          clearSelection();
          return;
        }
        if (tool !== "select") {
          setTool("select");
        }
        return;
      }

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (meta && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelected();
        return;
      }

      if (meta && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }

      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        !editingTextId
      ) {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (!meta && !editingTextId) {
        const toolByKey = new Map<string, DrawingTool>([
          ["v", "select"],
          ["t", "text"],
          ["r", "rectangle"],
          ["o", "ellipse"],
          ["a", "arrow"],
          ["p", "freehand"],
          ["h", "person"],
        ]);
        const nextTool = toolByKey.get(event.key.toLowerCase());
        if (nextTool) {
          event.preventDefault();
          setTool(nextTool);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    clearSelection,
    copySelected,
    deleteSelected,
    duplicateSelected,
    editingTextId,
    finishTextEditing,
    pasteClipboard,
    redo,
    selectedIds.length,
    tool,
    undo,
  ]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return {
    document,
    tool,
    setTool,
    selectedIds,
    selectedElement,
    selectedElements,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    editingTextId,
    setEditingTextId,
    previewElement,
    isDirty,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    undo,
    redo,
    clearSelection,
    deleteSelected,
    duplicateSelected,
    copySelected,
    pasteClipboard,
    applyTemplate,
    insertPerson,
    insertImage,
    updateSelectedStyle,
    updateTextContent,
    finishTextEditing,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    loadDocument,
    markSaved,
    commit,
  };
}

export type DrawingEditorApi = ReturnType<typeof useDrawingEditor>;
