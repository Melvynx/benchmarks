import { useReducer } from "react";

import type { DrawingDocument } from "./drawing-document";
import { serializeDrawingDocument } from "./drawing-document";

const MAX_HISTORY_LENGTH = 100;

type DrawingHistoryState = {
  past: DrawingDocument[];
  present: DrawingDocument;
  future: DrawingDocument[];
};

type DrawingHistoryAction =
  | { type: "commit"; document: DrawingDocument }
  | { type: "transient"; document: DrawingDocument }
  | { type: "commit-transient"; baseline: DrawingDocument }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; document: DrawingDocument };

function documentsMatch(first: DrawingDocument, second: DrawingDocument) {
  return serializeDrawingDocument(first) === serializeDrawingDocument(second);
}

function appendHistory(history: DrawingDocument[], document: DrawingDocument) {
  return [...history, document].slice(-MAX_HISTORY_LENGTH);
}

function historyReducer(
  state: DrawingHistoryState,
  action: DrawingHistoryAction,
): DrawingHistoryState {
  switch (action.type) {
    case "commit":
      if (documentsMatch(state.present, action.document)) return state;
      return {
        past: appendHistory(state.past, state.present),
        present: action.document,
        future: [],
      };
    case "transient":
      return { ...state, present: action.document };
    case "commit-transient":
      if (documentsMatch(action.baseline, state.present)) return state;
      return {
        past: appendHistory(state.past, action.baseline),
        present: state.present,
        future: [],
      };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        past: appendHistory(state.past, state.present),
        present: next,
        future: state.future.slice(1),
      };
    }
    case "reset":
      return { past: [], present: action.document, future: [] };
  }
}

export function useDrawingHistory(initialDocument: DrawingDocument) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialDocument,
    future: [],
  });

  return {
    document: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit: (document: DrawingDocument) =>
      dispatch({ type: "commit", document }),
    setTransient: (document: DrawingDocument) =>
      dispatch({ type: "transient", document }),
    commitTransient: (baseline: DrawingDocument) =>
      dispatch({ type: "commit-transient", baseline }),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    reset: (document: DrawingDocument) =>
      dispatch({ type: "reset", document }),
  };
}
