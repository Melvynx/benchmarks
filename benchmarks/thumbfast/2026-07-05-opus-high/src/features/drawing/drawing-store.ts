// Editor state for the drawing page. The document (an ordered element list)
// is the single source of truth; undo/redo are snapshots of that list.
//
// History discipline:
//  - Discrete actions (add/delete/paste/duplicate/style/template) call the
//    mutating helpers with `commit: true`, which snapshots the pre-change
//    state onto the undo stack.
//  - Continuous gestures (drag/resize/rotate) call `beginHistory()` once at
//    pointer-down, then mutate live via `setElements` (no commit) so a whole
//    drag is a single undo step.
//  - In-progress shape creation lives in `draft` (rendered but not committed)
//    and is only added to the document on pointer-up.

import { create } from "zustand";
import {
  DEFAULT_BACKGROUND,
  createEmptyDocument,
  serializeDocument,
  type DrawingDocument,
  type DrawingElement,
  type DrawingFontFamily,
  type DrawingTool,
} from "./drawing-document";
import {
  DEFAULT_STYLE,
  duplicateElements,
  type ElementStyle,
} from "./drawing-factory";

const HISTORY_LIMIT = 100;

export type StylePatch = Partial<ElementStyle>;

type DrawingState = {
  elements: DrawingElement[];
  selectedIds: string[];
  tool: DrawingTool;
  editingId: string | null;
  draft: DrawingElement | null;
  activeStyle: ElementStyle;
  background: string;
  isDirty: boolean;
  past: DrawingElement[][];
  future: DrawingElement[][];
  clipboard: DrawingElement[];

  // Tool / selection
  setTool: (tool: DrawingTool) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setEditingId: (id: string | null) => void;

  // Draft (in-progress creation)
  setDraft: (element: DrawingElement | null) => void;

  // History
  beginHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Mutations
  setElements: (elements: DrawingElement[]) => void;
  addElement: (element: DrawingElement, select?: boolean) => void;
  addElements: (elements: DrawingElement[], select?: boolean) => void;
  updateElement: (
    id: string,
    patch: Partial<DrawingElement>,
    commit?: boolean,
  ) => void;
  replaceElements: (
    updater: (elements: DrawingElement[]) => DrawingElement[],
    commit?: boolean,
  ) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  paste: () => void;
  bringToFront: () => void;
  sendToBack: () => void;

  // Style
  setActiveStyle: (patch: StylePatch) => void;
  applyStyleToSelection: (patch: StylePatch) => void;
  setBackground: (color: string) => void;

  // Lifecycle
  loadDocument: (document: DrawingDocument) => void;
  reset: () => void;
  markSaved: () => void;
  getDocument: () => DrawingDocument;
  getSerialized: () => string;
};

function pushPast(state: DrawingState): DrawingElement[][] {
  const next = [...state.past, state.elements];
  if (next.length > HISTORY_LIMIT) next.shift();
  return next;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  elements: [],
  selectedIds: [],
  tool: "select",
  editingId: null,
  draft: null,
  activeStyle: { ...DEFAULT_STYLE },
  background: DEFAULT_BACKGROUND,
  isDirty: false,
  past: [],
  future: [],
  clipboard: [],

  setTool: (tool) =>
    set((state) => ({
      tool,
      // Leaving select mode clears selection; entering keeps it.
      selectedIds: tool === "select" ? state.selectedIds : [],
      editingId: null,
    })),

  setSelection: (ids) => {
    const style = deriveStyleFromSelection(
      get().elements,
      ids,
      get().activeStyle,
    );
    set({ selectedIds: ids, activeStyle: style });
  },

  toggleSelection: (id) =>
    set((state) => {
      const selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter((value) => value !== id)
        : [...state.selectedIds, id];
      return {
        selectedIds,
        activeStyle: deriveStyleFromSelection(
          state.elements,
          selectedIds,
          state.activeStyle,
        ),
      };
    }),

  clearSelection: () => set({ selectedIds: [], editingId: null }),

  selectAll: () =>
    set((state) => ({ selectedIds: state.elements.map((el) => el.id) })),

  setEditingId: (id) => set({ editingId: id }),

  setDraft: (element) => set({ draft: element }),

  beginHistory: () => set((state) => ({ past: pushPast(state), future: [] })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const validIds = new Set(previous.map((el) => el.id));
      return {
        elements: previous,
        past: state.past.slice(0, -1),
        future: [...state.future, state.elements],
        selectedIds: state.selectedIds.filter((id) => validIds.has(id)),
        editingId: null,
        draft: null,
        isDirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[state.future.length - 1];
      const validIds = new Set(next.map((el) => el.id));
      return {
        elements: next,
        future: state.future.slice(0, -1),
        past: [...state.past, state.elements],
        selectedIds: state.selectedIds.filter((id) => validIds.has(id)),
        editingId: null,
        draft: null,
        isDirty: true,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  setElements: (elements) => set({ elements, isDirty: true }),

  addElement: (element, select = true) =>
    set((state) => ({
      past: pushPast(state),
      future: [],
      elements: [...state.elements, element],
      selectedIds: select ? [element.id] : state.selectedIds,
      draft: null,
      isDirty: true,
    })),

  addElements: (elements, select = true) =>
    set((state) => ({
      past: pushPast(state),
      future: [],
      elements: [...state.elements, ...elements],
      selectedIds: select ? elements.map((el) => el.id) : state.selectedIds,
      isDirty: true,
    })),

  updateElement: (id, patch, commit = false) =>
    set((state) => ({
      ...(commit ? { past: pushPast(state), future: [] } : {}),
      elements: state.elements.map((element) =>
        element.id === id
          ? ({ ...element, ...patch } as DrawingElement)
          : element,
      ),
      isDirty: true,
    })),

  replaceElements: (updater, commit = false) =>
    set((state) => ({
      ...(commit ? { past: pushPast(state), future: [] } : {}),
      elements: updater(state.elements),
      isDirty: true,
    })),

  deleteSelected: () =>
    set((state) => {
      if (state.selectedIds.length === 0) return state;
      const remove = new Set(state.selectedIds);
      return {
        past: pushPast(state),
        future: [],
        elements: state.elements.filter((element) => !remove.has(element.id)),
        selectedIds: [],
        editingId: null,
        isDirty: true,
      };
    }),

  duplicateSelected: () =>
    set((state) => {
      const selected = state.elements.filter((element) =>
        state.selectedIds.includes(element.id),
      );
      if (selected.length === 0) return state;
      const copies = duplicateElements(selected);
      return {
        past: pushPast(state),
        future: [],
        elements: [...state.elements, ...copies],
        selectedIds: copies.map((element) => element.id),
        isDirty: true,
      };
    }),

  copySelected: () =>
    set((state) => ({
      clipboard: state.elements.filter((element) =>
        state.selectedIds.includes(element.id),
      ),
    })),

  cutSelected: () => {
    const state = get();
    const selected = state.elements.filter((element) =>
      state.selectedIds.includes(element.id),
    );
    if (selected.length === 0) return;
    set({
      clipboard: selected,
      past: pushPast(state),
      future: [],
      elements: state.elements.filter(
        (element) => !state.selectedIds.includes(element.id),
      ),
      selectedIds: [],
      editingId: null,
      isDirty: true,
    });
  },

  paste: () =>
    set((state) => {
      if (state.clipboard.length === 0) return state;
      const copies = duplicateElements(state.clipboard, 28, 28);
      // Keep the clipboard's origin stable but advance it so repeated pastes
      // cascade instead of stacking.
      return {
        past: pushPast(state),
        future: [],
        elements: [...state.elements, ...copies],
        selectedIds: copies.map((element) => element.id),
        clipboard: copies,
        isDirty: true,
      };
    }),

  bringToFront: () =>
    set((state) => {
      const selected = new Set(state.selectedIds);
      if (selected.size === 0) return state;
      const kept = state.elements.filter((el) => !selected.has(el.id));
      const moved = state.elements.filter((el) => selected.has(el.id));
      return {
        past: pushPast(state),
        future: [],
        elements: [...kept, ...moved],
        isDirty: true,
      };
    }),

  sendToBack: () =>
    set((state) => {
      const selected = new Set(state.selectedIds);
      if (selected.size === 0) return state;
      const kept = state.elements.filter((el) => !selected.has(el.id));
      const moved = state.elements.filter((el) => selected.has(el.id));
      return {
        past: pushPast(state),
        future: [],
        elements: [...moved, ...kept],
        isDirty: true,
      };
    }),

  setActiveStyle: (patch) =>
    set((state) => ({ activeStyle: { ...state.activeStyle, ...patch } })),

  applyStyleToSelection: (patch) =>
    set((state) => {
      const activeStyle = { ...state.activeStyle, ...patch };
      if (state.selectedIds.length === 0) return { activeStyle };
      const selected = new Set(state.selectedIds);
      return {
        activeStyle,
        past: pushPast(state),
        future: [],
        elements: state.elements.map((element) =>
          selected.has(element.id)
            ? applyStyleToElement(element, patch)
            : element,
        ),
        isDirty: true,
      };
    }),

  setBackground: (color) =>
    set((state) => ({
      background: color,
      isDirty: true,
      past: pushPast(state),
      future: [],
    })),

  loadDocument: (document) =>
    set({
      elements: document.elements,
      background: document.background,
      selectedIds: [],
      editingId: null,
      draft: null,
      tool: "select",
      past: [],
      future: [],
      isDirty: false,
    }),

  reset: () =>
    set({
      ...createBlankState(),
    }),

  markSaved: () => set({ isDirty: false }),

  getDocument: () => {
    const state = get();
    return {
      ...createEmptyDocument(),
      background: state.background,
      elements: state.elements,
    };
  },

  getSerialized: () => {
    const state = get();
    return serializeDocument({
      ...createEmptyDocument(),
      background: state.background,
      elements: state.elements,
    });
  },
}));

function createBlankState() {
  return {
    elements: [] as DrawingElement[],
    selectedIds: [] as string[],
    tool: "select" as DrawingTool,
    editingId: null as string | null,
    draft: null as DrawingElement | null,
    activeStyle: { ...DEFAULT_STYLE },
    background: DEFAULT_BACKGROUND,
    isDirty: false,
    past: [] as DrawingElement[][],
    future: [] as DrawingElement[][],
    clipboard: [] as DrawingElement[],
  };
}

function applyStyleToElement(
  element: DrawingElement,
  patch: StylePatch,
): DrawingElement {
  switch (element.type) {
    case "rectangle":
    case "ellipse":
      return {
        ...element,
        ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}),
        ...(patch.fill !== undefined ? { fill: patch.fill } : {}),
        ...(patch.strokeWidth !== undefined
          ? { strokeWidth: patch.strokeWidth }
          : {}),
        ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
      };
    case "freedraw":
    case "arrow":
      return {
        ...element,
        ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}),
        ...(patch.strokeWidth !== undefined
          ? { strokeWidth: patch.strokeWidth }
          : {}),
        ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
      };
    case "text":
      return {
        ...element,
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize } : {}),
        ...(patch.fontFamily !== undefined
          ? { fontFamily: patch.fontFamily as DrawingFontFamily }
          : {}),
        ...(patch.fontWeight !== undefined
          ? { fontWeight: patch.fontWeight }
          : {}),
        ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
      };
    case "placeholder":
      return {
        ...element,
        ...(patch.stroke !== undefined ? { color: patch.stroke } : {}),
        ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
      };
    case "image":
      return {
        ...element,
        ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
      };
    default:
      return element;
  }
}

/** Reflect the first selected element's style into the properties panel. */
function deriveStyleFromSelection(
  elements: DrawingElement[],
  selectedIds: string[],
  current: ElementStyle,
): ElementStyle {
  const first = elements.find((element) => selectedIds.includes(element.id));
  if (!first) return current;
  const next = { ...current };
  if ("stroke" in first) next.stroke = first.stroke;
  if ("fill" in first) next.fill = first.fill;
  if ("strokeWidth" in first) next.strokeWidth = first.strokeWidth;
  if (first.type === "text") {
    next.color = first.color;
    next.fontSize = first.fontSize;
    next.fontFamily = first.fontFamily;
    next.fontWeight = first.fontWeight;
  }
  next.opacity = first.opacity;
  return next;
}
