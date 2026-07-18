import type { DrawingDocument } from "./drawing-document";
import { useCallback, useState } from "react";

type DrawingHistory = {
  past: DrawingDocument[];
  present: DrawingDocument;
  future: DrawingDocument[];
};

const HISTORY_LIMIT = 100;

export function useDrawingHistory(initialDocument: DrawingDocument) {
  const [history, setHistory] = useState<DrawingHistory>({
    past: [],
    present: initialDocument,
    future: [],
  });

  const commit = useCallback((next: DrawingDocument) => {
    setHistory((current) => {
      if (JSON.stringify(current.present) === JSON.stringify(next)) {
        return current;
      }

      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future.at(0);
      if (!next) return current;
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    document: history.present,
    commit,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
