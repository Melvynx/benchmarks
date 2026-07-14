import type { DrawingDocument, DrawingElement } from "./drawing.schema";

export type DrawingTool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "freedraw"
  | "text";

export type EditorState = {
  doc: DrawingDocument;
  selectedIds: string[];
  tool: DrawingTool;
  editingTextId: string | null;
  past: DrawingDocument[];
  future: DrawingDocument[];
  /** Snapshot taken at gesture start; committed to history on gesture end. */
  gestureSnapshot: DrawingDocument | null;
  /** True when the document differs from the last saved version. */
  dirty: boolean;
};

export type EditorAction =
  | { type: "set-tool"; tool: DrawingTool }
  | { type: "select"; ids: string[]; additive?: boolean }
  | { type: "begin-gesture" }
  | { type: "update-doc"; doc: DrawingDocument }
  | { type: "commit-gesture" }
  | { type: "cancel-gesture" }
  | { type: "apply"; doc: DrawingDocument; select?: string[] }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "set-editing-text"; id: string | null }
  | { type: "mark-saved" }
  | { type: "load"; doc: DrawingDocument };

const HISTORY_LIMIT = 100;

export function createEditorState(doc: DrawingDocument): EditorState {
  return {
    doc,
    selectedIds: [],
    tool: "select",
    editingTextId: null,
    past: [],
    future: [],
    gestureSnapshot: null,
    dirty: false,
  };
}

function pushHistory(past: DrawingDocument[], doc: DrawingDocument) {
  return [...past.slice(-(HISTORY_LIMIT - 1)), doc];
}

function pruneSelection(state: EditorState): EditorState {
  const ids = new Set(state.doc.elements.map((element) => element.id));
  const selectedIds = state.selectedIds.filter((id) => ids.has(id));
  const editingTextId =
    state.editingTextId && ids.has(state.editingTextId)
      ? state.editingTextId
      : null;
  return { ...state, selectedIds, editingTextId };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "set-tool":
      return {
        ...state,
        tool: action.tool,
        editingTextId: null,
        ...(action.tool === "select" ? {} : { selectedIds: [] }),
      };

    case "select": {
      if (!action.additive) return { ...state, selectedIds: action.ids };
      const merged = new Set(state.selectedIds);
      for (const id of action.ids) {
        if (merged.has(id)) merged.delete(id);
        else merged.add(id);
      }
      return { ...state, selectedIds: [...merged] };
    }

    case "begin-gesture":
      return { ...state, gestureSnapshot: state.doc };

    case "update-doc":
      return { ...state, doc: action.doc };

    case "commit-gesture": {
      const snapshot = state.gestureSnapshot;
      if (!snapshot || snapshot === state.doc) {
        return { ...state, gestureSnapshot: null };
      }
      return pruneSelection({
        ...state,
        past: pushHistory(state.past, snapshot),
        future: [],
        gestureSnapshot: null,
        dirty: true,
      });
    }

    case "cancel-gesture": {
      const snapshot = state.gestureSnapshot;
      if (!snapshot) return state;
      return pruneSelection({
        ...state,
        doc: snapshot,
        gestureSnapshot: null,
      });
    }

    case "apply":
      if (action.doc === state.doc) return state;
      return pruneSelection({
        ...state,
        doc: action.doc,
        past: pushHistory(state.past, state.doc),
        future: [],
        selectedIds: action.select ?? state.selectedIds,
        dirty: true,
      });

    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return pruneSelection({
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        editingTextId: null,
        dirty: true,
      });
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return pruneSelection({
        ...state,
        doc: next,
        past: pushHistory(state.past, state.doc),
        future: rest,
        editingTextId: null,
        dirty: true,
      });
    }

    case "set-editing-text":
      return { ...state, editingTextId: action.id };

    case "mark-saved":
      return { ...state, dirty: false };

    case "load":
      return createEditorState(action.doc);

    default:
      return state;
  }
}

export function replaceElements(
  doc: DrawingDocument,
  updated: Map<string, DrawingElement>,
): DrawingDocument {
  return {
    ...doc,
    elements: doc.elements.map((element) => updated.get(element.id) ?? element),
  };
}

export function addElements(
  doc: DrawingDocument,
  elements: DrawingElement[],
): DrawingDocument {
  return { ...doc, elements: [...doc.elements, ...elements] };
}

export function removeElements(
  doc: DrawingDocument,
  ids: string[],
): DrawingDocument {
  const removed = new Set(ids);
  return {
    ...doc,
    elements: doc.elements.filter((element) => !removed.has(element.id)),
  };
}
