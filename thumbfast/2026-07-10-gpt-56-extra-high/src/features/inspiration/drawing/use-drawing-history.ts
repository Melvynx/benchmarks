import { useCallback, useMemo, useRef, useState } from "react";
import { documentsEqual, type DrawingDocument } from "./drawing-document";

const HISTORY_LIMIT = 120;

type DrawingHistory = {
  past: DrawingDocument[];
  present: DrawingDocument;
  future: DrawingDocument[];
  saved: DrawingDocument;
};

type DrawingUpdater =
  | DrawingDocument
  | ((document: DrawingDocument) => DrawingDocument);

function resolveUpdate(
  current: DrawingDocument,
  update: DrawingUpdater,
): DrawingDocument {
  return typeof update === "function" ? update(current) : update;
}

export function useDrawingHistory(initialDocument: DrawingDocument) {
  const initialHistory = useMemo<DrawingHistory>(
    () => ({
      past: [],
      present: initialDocument,
      future: [],
      saved: initialDocument,
    }),
    [initialDocument],
  );
  const historyRef = useRef(initialHistory);
  const documentRef = useRef(initialDocument);
  const [history, setHistory] = useState(initialHistory);

  const writeHistory = useCallback((next: DrawingHistory) => {
    historyRef.current = next;
    documentRef.current = next.present;
    setHistory(next);
  }, []);

  const commit = useCallback(
    (update: DrawingUpdater) => {
      const current = historyRef.current;
      const nextDocument = resolveUpdate(current.present, update);
      if (documentsEqual(current.present, nextDocument)) return;
      writeHistory({
        ...current,
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: nextDocument,
        future: [],
      });
    },
    [writeHistory],
  );

  const preview = useCallback(
    (update: DrawingUpdater) => {
      const current = historyRef.current;
      const nextDocument = resolveUpdate(current.present, update);
      if (documentsEqual(current.present, nextDocument)) return;
      writeHistory({ ...current, present: nextDocument });
    },
    [writeHistory],
  );

  const commitGesture = useCallback(
    (before: DrawingDocument) => {
      const current = historyRef.current;
      if (documentsEqual(before, current.present)) return;
      writeHistory({
        ...current,
        past: [...current.past, before].slice(-HISTORY_LIMIT),
        future: [],
      });
    },
    [writeHistory],
  );

  const cancelGesture = useCallback(
    (before: DrawingDocument) => {
      const current = historyRef.current;
      writeHistory({ ...current, present: before });
    },
    [writeHistory],
  );

  const undo = useCallback(() => {
    const current = historyRef.current;
    const previous = current.past.at(-1);
    if (!previous) return;
    writeHistory({
      ...current,
      past: current.past.slice(0, -1),
      present: previous,
      future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
    });
  }, [writeHistory]);

  const redo = useCallback(() => {
    const current = historyRef.current;
    if (current.future.length === 0) return;
    const [next, ...future] = current.future;
    writeHistory({
      ...current,
      past: [...current.past, current.present].slice(-HISTORY_LIMIT),
      present: next,
      future,
    });
  }, [writeHistory]);

  const markSaved = useCallback(
    (savedDocument: DrawingDocument) => {
      const current = historyRef.current;
      writeHistory({ ...current, saved: savedDocument });
    },
    [writeHistory],
  );

  return {
    document: history.present,
    documentRef,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    isDirty: !documentsEqual(history.present, history.saved),
    commit,
    preview,
    commitGesture,
    cancelGesture,
    undo,
    redo,
    markSaved,
  };
}
