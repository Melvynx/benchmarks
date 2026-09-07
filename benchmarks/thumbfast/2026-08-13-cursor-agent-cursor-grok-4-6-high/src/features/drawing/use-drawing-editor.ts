import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  constrainArrow,
  constrainRect,
  createArrowElement,
  createEllipseElement,
  createEmptyDocument,
  createImageElement,
  createPencilElement,
  createPersonElement,
  createRectElement,
  createTextElement,
  deleteElements,
  duplicateElements,
  hitTestHandle,
  hitTestTopElement,
  moveElements,
  normalizePencilElement,
  parseDrawingDocument,
  resizeElement,
} from "./drawing.document";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type DrawingDocument,
  type DrawingElement,
  type DrawingTool,
  type HandleId,
  type PencilElement,
  type Point,
} from "./drawing.schema";
import { createTemplateDocument, type DrawingTemplateId } from "./drawing.templates";

const MAX_HISTORY = 80;

type DragSession =
  | {
      kind: "move";
      start: Point;
      origin: DrawingElement[];
    }
  | {
      kind: "resize";
      handle: HandleId;
      origin: DrawingElement;
    }
  | {
      kind: "create";
      id: string;
      start: Point;
    }
  | {
      kind: "pencil";
      id: string;
    };

function isTextTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function useDrawingEditor(initialDocument?: DrawingDocument | null) {
  const [document, setDocument] = useState<DrawingDocument>(
    () => initialDocument ?? createEmptyDocument(),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<DrawingTool>("select");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [shiftKey, setShiftKey] = useState(false);
  const [history, setHistory] = useState<DrawingDocument[]>([
    initialDocument ?? createEmptyDocument(),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [savedSerialized, setSavedSerialized] = useState(() =>
    JSON.stringify(initialDocument ?? createEmptyDocument()),
  );

  const dragRef = useRef<DragSession | null>(null);
  const pointerStartRef = useRef<Point | null>(null);
  const clipboardRef = useRef<DrawingElement[]>([]);
  const documentRef = useRef(document);
  const selectedIdsRef = useRef(selectedIds);
  const toolRef = useRef(tool);
  const editingTextIdRef = useRef(editingTextId);
  const shiftKeyRef = useRef(shiftKey);
  const historyRef = useRef({ stack: history, index: historyIndex });

  useLayoutEffect(() => {
    documentRef.current = document;
    selectedIdsRef.current = selectedIds;
    toolRef.current = tool;
    editingTextIdRef.current = editingTextId;
    shiftKeyRef.current = shiftKey;
    historyRef.current = { stack: history, index: historyIndex };
  }, [document, selectedIds, tool, editingTextId, shiftKey, history, historyIndex]);

  const isDirty = useMemo(
    () => JSON.stringify(document) !== savedSerialized,
    [document, savedSerialized],
  );

  const selectedElements = useMemo(
    () => document.elements.filter((element) => selectedIds.includes(element.id)),
    [document.elements, selectedIds],
  );

  const commit = useCallback((next: DrawingDocument) => {
    setDocument(next);
    const { stack, index } = historyRef.current;
    const trimmed = stack.slice(0, index + 1);
    const historyNext = [...trimmed, next].slice(-MAX_HISTORY);
    const nextIndex = historyNext.length - 1;
    historyRef.current = { stack: historyNext, index: nextIndex };
    setHistory(historyNext);
    setHistoryIndex(nextIndex);
  }, []);

  const replaceDocument = useCallback((next: DrawingDocument, selectIds: string[] = []) => {
    commit(next);
    setSelectedIds(selectIds);
    setEditingTextId(null);
    setTool("select");
  }, [commit]);

  const loadDocument = useCallback((next: DrawingDocument) => {
    setDocument(next);
    setHistory([next]);
    setHistoryIndex(0);
    historyRef.current = { stack: [next], index: 0 };
    setSavedSerialized(JSON.stringify(next));
    setSelectedIds([]);
    setEditingTextId(null);
    setTool("select");
  }, []);

  const markSaved = useCallback((next: DrawingDocument) => {
    setSavedSerialized(JSON.stringify(next));
  }, []);

  const undo = useCallback(() => {
    const { stack, index } = historyRef.current;
    if (index <= 0) return;
    const nextIndex = index - 1;
    historyRef.current = { stack, index: nextIndex };
    setHistoryIndex(nextIndex);
    setDocument(stack[nextIndex]);
    setSelectedIds([]);
    setEditingTextId(null);
  }, []);

  const redo = useCallback(() => {
    const { stack, index } = historyRef.current;
    if (index >= stack.length - 1) return;
    const nextIndex = index + 1;
    historyRef.current = { stack, index: nextIndex };
    setHistoryIndex(nextIndex);
    setDocument(stack[nextIndex]);
    setSelectedIds([]);
    setEditingTextId(null);
  }, []);

  const stopTextEditing = useCallback(() => {
    if (!editingTextIdRef.current) return;
    commit(documentRef.current);
    setEditingTextId(null);
  }, [commit]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setEditingTextId(null);
  }, []);

  const handleEscape = useCallback(() => {
    if (editingTextIdRef.current) {
      stopTextEditing();
      return "text";
    }
    if (selectedIdsRef.current.length > 0) {
      clearSelection();
      return "selection";
    }
    if (toolRef.current !== "select") {
      setTool("select");
      return "tool";
    }
    return "none";
  }, [clearSelection, stopTextEditing]);

  const deleteSelected = useCallback(() => {
    if (editingTextIdRef.current) return;
    if (selectedIdsRef.current.length === 0) return;
    const ids = new Set(selectedIdsRef.current);
    commit({
      ...documentRef.current,
      elements: deleteElements(documentRef.current.elements, ids),
    });
    setSelectedIds([]);
  }, [commit]);

  const duplicateSelected = useCallback(() => {
    if (selectedIdsRef.current.length === 0) return;
    const result = duplicateElements(
      documentRef.current.elements,
      new Set(selectedIdsRef.current),
    );
    commit({ ...documentRef.current, elements: result.elements });
    setSelectedIds(result.duplicatedIds);
  }, [commit]);

  const copySelected = useCallback(() => {
    clipboardRef.current = documentRef.current.elements
      .filter((element) => selectedIdsRef.current.includes(element.id))
      .map((element) => structuredClone(element));
  }, []);

  const pasteClipboard = useCallback(() => {
    if (clipboardRef.current.length === 0) return;
    const result = duplicateElements(
      clipboardRef.current,
      new Set(clipboardRef.current.map((element) => element.id)),
    );
    const pasted = result.elements.filter((element) =>
      result.duplicatedIds.includes(element.id),
    );
    commit({
      ...documentRef.current,
      elements: [...documentRef.current.elements, ...pasted],
    });
    setSelectedIds(pasted.map((element) => element.id));
    setTool("select");
  }, [commit]);

  const applyTemplate = useCallback(
    (templateId: DrawingTemplateId) => {
      const next = createTemplateDocument(templateId);
      replaceDocument(
        next,
        next.elements.map((element) => element.id),
      );
    },
    [replaceDocument],
  );

  const insertImage = useCallback(
    (src: string, size?: { width: number; height: number }) => {
      const width = size?.width ?? 360;
      const height = size?.height ?? 200;
      const element = createImageElement({
        src,
        x: (CANVAS_WIDTH - width) / 2,
        y: (CANVAS_HEIGHT - height) / 2,
        width,
        height,
      });
      commit({
        ...documentRef.current,
        elements: [...documentRef.current.elements, element],
      });
      setSelectedIds([element.id]);
      setTool("select");
    },
    [commit],
  );

  const insertPerson = useCallback(() => {
    const element = createPersonElement();
    commit({
      ...documentRef.current,
      elements: [...documentRef.current.elements, element],
    });
    setSelectedIds([element.id]);
    setTool("select");
  }, [commit]);

  const updateSelectedStyle = useCallback(
    (patch: Partial<DrawingElement> & { fontSize?: number }) => {
      const ids = new Set(selectedIdsRef.current);
      commit({
        ...documentRef.current,
        elements: documentRef.current.elements.map((element) =>
          ids.has(element.id)
            ? ({ ...element, ...patch } as DrawingElement)
            : element,
        ),
      });
    },
    [commit],
  );

  const updateText = useCallback((id: string, text: string) => {
    setDocument((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === id && element.type === "text" ? { ...element, text } : element,
      ),
    }));
  }, []);

  const pointerDown = useCallback((point: Point, event: PointerEvent) => {
    pointerStartRef.current = point;
    const currentTool = toolRef.current;

    if (currentTool === "select") {
      const selected = selectedIdsRef.current;
      if (selected.length === 1) {
        const selectedElement = documentRef.current.elements.find(
          (element) => element.id === selected[0],
        );
        if (selectedElement) {
          const handle = hitTestHandle(selectedElement, point);
          if (handle) {
            dragRef.current = {
              kind: "resize",
              handle,
              origin: structuredClone(selectedElement),
            };
            return;
          }
        }
      }

      const hit = hitTestTopElement(documentRef.current.elements, point);
      if (hit) {
        const nextSelected = event.shiftKey
          ? selected.includes(hit.id)
            ? selected.filter((id) => id !== hit.id)
            : [...selected, hit.id]
          : selected.includes(hit.id)
            ? selected
            : [hit.id];
        setSelectedIds(nextSelected);
        setEditingTextId(null);
        dragRef.current = {
          kind: "move",
          start: point,
          origin: documentRef.current.elements.map((element) =>
            structuredClone(element),
          ),
        };
        return;
      }

      setSelectedIds([]);
      setEditingTextId(null);
      return;
    }

    if (currentTool === "text") {
      const element = createTextElement({
        x: point.x,
        y: point.y,
        width: 420,
        height: 90,
        text: "",
      });
      commit({
        ...documentRef.current,
        elements: [...documentRef.current.elements, element],
      });
      setSelectedIds([element.id]);
      setEditingTextId(element.id);
      setTool("select");
      return;
    }

    if (currentTool === "person") {
      const element = createPersonElement({
        x: point.x - 90,
        y: point.y - 180,
        width: 180,
        height: 360,
      });
      commit({
        ...documentRef.current,
        elements: [...documentRef.current.elements, element],
      });
      setSelectedIds([element.id]);
      setTool("select");
      return;
    }

    if (currentTool === "pencil") {
      const element = createPencilElement({
        x: point.x,
        y: point.y,
        points: [{ x: 0, y: 0 }],
      });
      setDocument({
        ...documentRef.current,
        elements: [...documentRef.current.elements, element],
      });
      dragRef.current = { kind: "pencil", id: element.id };
      return;
    }

    const created =
      currentTool === "rect"
        ? createRectElement({ x: point.x, y: point.y, width: MIN_CREATE, height: MIN_CREATE })
        : currentTool === "ellipse"
          ? createEllipseElement({
              x: point.x,
              y: point.y,
              width: MIN_CREATE,
              height: MIN_CREATE,
            })
          : createArrowElement({ x: point.x, y: point.y, width: 1, height: 1 });

    setDocument({
      ...documentRef.current,
      elements: [...documentRef.current.elements, created],
    });
    dragRef.current = { kind: "create", id: created.id, start: point };
    setSelectedIds([created.id]);
  }, [commit]);

  const pointerMove = useCallback((point: Point) => {
    const drag = dragRef.current;
    if (!drag) return;
    const shift = shiftKeyRef.current;

    if (drag.kind === "move") {
      const delta = {
        x: point.x - drag.start.x,
        y: point.y - drag.start.y,
      };
      setDocument({
        ...documentRef.current,
        elements: moveElements(
          drag.origin,
          new Set(selectedIdsRef.current),
          delta,
        ),
      });
      return;
    }

    if (drag.kind === "resize") {
      setDocument({
        ...documentRef.current,
        elements: documentRef.current.elements.map((element) =>
          element.id === drag.origin.id
            ? resizeElement({ ...drag.origin }, drag.handle, point, { shift })
            : element,
        ),
      });
      return;
    }

    if (drag.kind === "create") {
      const bounds =
        toolRef.current === "arrow"
          ? constrainArrow(drag.start, point, shift)
          : constrainRect(drag.start, point, shift);
      setDocument({
        ...documentRef.current,
        elements: documentRef.current.elements.map((element) =>
          element.id === drag.id ? { ...element, ...bounds } : element,
        ),
      });
      return;
    }

    setDocument({
      ...documentRef.current,
      elements: documentRef.current.elements.map((element) => {
        if (element.id !== drag.id) return element;
        if (element.type !== "pencil") return element;
        return {
          ...element,
          points: [
            ...element.points,
            { x: point.x - element.x, y: point.y - element.y },
          ],
        };
      }),
    });
  }, []);

  const pointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    pointerStartRef.current = null;
    if (!drag) return;

    if (drag.kind === "pencil") {
      const element = documentRef.current.elements.find(
        (item) => item.id === drag.id,
      ) as PencilElement | undefined;
      if (!element || element.points.length < 2) {
        setDocument({
          ...documentRef.current,
          elements: documentRef.current.elements.filter((item) => item.id !== drag.id),
        });
        return;
      }
      commit({
        ...documentRef.current,
        elements: documentRef.current.elements.map((item) =>
          item.id === drag.id && item.type === "pencil"
            ? normalizePencilElement(item)
            : item,
        ),
      });
      setSelectedIds([drag.id]);
      setTool("select");
      return;
    }

    if (drag.kind === "move") {
      const moved = selectedIdsRef.current.some((id) => {
        const origin = drag.origin.find((element) => element.id === id);
        const current = documentRef.current.elements.find(
          (element) => element.id === id,
        );
        return Boolean(
          origin &&
            current &&
            (origin.x !== current.x || origin.y !== current.y),
        );
      });
      if (moved) commit(documentRef.current);
      return;
    }

    if (drag.kind === "resize") {
      const current = documentRef.current.elements.find(
        (element) => element.id === drag.origin.id,
      );
      if (
        current &&
        (current.x !== drag.origin.x ||
          current.y !== drag.origin.y ||
          current.width !== drag.origin.width ||
          current.height !== drag.origin.height ||
          current.rotation !== drag.origin.rotation)
      ) {
        commit(documentRef.current);
      }
      return;
    }

    const created = documentRef.current.elements.find(
      (element) => element.id === drag.id,
    );
    if (
      !created ||
      (Math.abs(created.width) < MIN_CREATE &&
        Math.abs(created.height) < MIN_CREATE)
    ) {
      setDocument({
        ...documentRef.current,
        elements: documentRef.current.elements.filter(
          (element) => element.id !== drag.id,
        ),
      });
      setSelectedIds([]);
      setTool("select");
      return;
    }
    commit(documentRef.current);
    setTool("select");
  }, [commit]);

  const doubleClick = useCallback((point: Point) => {
    const hit = hitTestTopElement(documentRef.current.elements, point);
    if (hit?.type === "text") {
      setSelectedIds([hit.id]);
      setEditingTextId(hit.id);
      setTool("select");
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") setShiftKey(true);

      if (event.key === "Escape") {
        const dialogOpen = window.document.querySelector(
          '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
        );
        if (dialogOpen) return;
        event.preventDefault();
        event.stopPropagation();
        if (isTextTarget(event.target) && !editingTextIdRef.current) {
          (event.target as HTMLElement).blur();
        }
        handleEscape();
        return;
      }

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "c") {
        if (isTextTarget(event.target)) return;
        event.preventDefault();
        copySelected();
        return;
      }
      if (meta && event.key.toLowerCase() === "v") {
        if (isTextTarget(event.target)) return;
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (isTextTarget(event.target) || editingTextIdRef.current) return;
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (isTextTarget(event.target) || editingTextIdRef.current || meta) return;
      const toolByKey = {
        v: "select",
        t: "text",
        a: "arrow",
        r: "rect",
        o: "ellipse",
        p: "pencil",
      } as const;
      const key = event.key.toLowerCase();
      if (key in toolByKey) {
        event.preventDefault();
        setTool(toolByKey[key as keyof typeof toolByKey]);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") setShiftKey(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    copySelected,
    deleteSelected,
    duplicateSelected,
    handleEscape,
    pasteClipboard,
    redo,
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
    selectedIds,
    selectedElements,
    tool,
    setTool,
    editingTextId,
    isDirty,
    shiftKey,
    pointerDown,
    pointerMove,
    pointerUp,
    doubleClick,
    handleEscape,
    stopTextEditing,
    updateText,
    applyTemplate,
    insertImage,
    insertPerson,
    updateSelectedStyle,
    duplicateSelected,
    deleteSelected,
    undo,
    redo,
    loadDocument,
    markSaved,
    parseDrawingDocument,
  };
}

const MIN_CREATE = 4;
