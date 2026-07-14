import { cloneDocument } from "./drawing.document";
import type { DrawingDocument } from "./drawing.types";

const MAX_HISTORY = 100;

export type DrawingHistory = {
  past: DrawingDocument[];
  present: DrawingDocument;
  future: DrawingDocument[];
};

export function createHistory(present: DrawingDocument): DrawingHistory {
  return {
    past: [],
    present: cloneDocument(present),
    future: [],
  };
}

export function commitHistory(
  history: DrawingHistory,
  next: DrawingDocument,
): DrawingHistory {
  return {
    past: [...history.past, cloneDocument(history.present)].slice(-MAX_HISTORY),
    present: cloneDocument(next),
    future: [],
  };
}

export function replacePresent(
  history: DrawingHistory,
  next: DrawingDocument,
): DrawingHistory {
  return {
    ...history,
    present: cloneDocument(next),
  };
}

export function undoHistory(history: DrawingHistory): DrawingHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: cloneDocument(previous),
    future: [cloneDocument(history.present), ...history.future],
  };
}

export function redoHistory(history: DrawingHistory): DrawingHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, cloneDocument(history.present)],
    present: cloneDocument(next),
    future: history.future.slice(1),
  };
}

export function canUndo(history: DrawingHistory) {
  return history.past.length > 0;
}

export function canRedo(history: DrawingHistory) {
  return history.future.length > 0;
}
