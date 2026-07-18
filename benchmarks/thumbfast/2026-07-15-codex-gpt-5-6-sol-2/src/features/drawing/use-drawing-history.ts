import { useCallback, useState } from "react";
import type { DrawingDocument } from "./drawing-document";

const MAX_HISTORY_ENTRIES = 100;

type DrawingHistory = {
  past: DrawingDocument[];
  present: DrawingDocument;
  future: DrawingDocument[];
};

function documentsMatch(left: DrawingDocument, right: DrawingDocument) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useDrawingHistory(initialDocument: DrawingDocument) {
  const [history, setHistory] = useState<DrawingHistory>({
    past: [],
    present: initialDocument,
    future: [],
  });

  const preview = useCallback((document: DrawingDocument) => {
    setHistory((current) => ({ ...current, present: document }));
  }, []);

  const commitFrom = useCallback(
    (previous: DrawingDocument, next: DrawingDocument) => {
      if (documentsMatch(previous, next)) {
        setHistory((current) => ({ ...current, present: next }));
        return;
      }

      setHistory((current) => ({
        past: [...current.past, previous].slice(-MAX_HISTORY_ENTRIES),
        present: next,
        future: [],
      }));
    },
    [],
  );

  const commit = useCallback((next: DrawingDocument) => {
    setHistory((current) => {
      if (documentsMatch(current.present, next)) return current;

      return {
        past: [...current.past, current.present].slice(-MAX_HISTORY_ENTRIES),
        present: next,
        future: [],
      };
    });
  }, []);

  const commitWith = useCallback(
    (update: (document: DrawingDocument) => DrawingDocument) => {
      setHistory((current) => {
        const next = update(current.present);
        if (documentsMatch(current.present, next)) return current;

        return {
          past: [...current.past, current.present].slice(-MAX_HISTORY_ENTRIES),
          present: next,
          future: [],
        };
      });
    },
    [],
  );

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
        past: [...current.past, current.present].slice(-MAX_HISTORY_ENTRIES),
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((document: DrawingDocument) => {
    setHistory({ past: [], present: document, future: [] });
  }, []);

  return {
    document: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    preview,
    commit,
    commitWith,
    commitFrom,
    undo,
    redo,
    reset,
  };
}
