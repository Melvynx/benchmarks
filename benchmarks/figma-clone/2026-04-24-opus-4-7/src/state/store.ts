import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  produceWithPatches,
  applyPatches,
  enablePatches,
  type Patch,
  type Draft,
} from 'immer';
import type { AppState, ToolId, Viewport } from './types';
import type { Document, NodeId, SceneNode } from '../core/scene';
import { createEmptyDocument } from '../core/scene';
import { History, type HistoryEntry } from '../core/commands';

enablePatches();

/** Default initial state. */
const initialState = (): AppState => ({
  doc: createEmptyDocument(),
  selection: [],
  tool: 'select',
  previousTool: 'select',
  viewport: { x: 0, y: 0, zoom: 1 },
  transient: {
    editingTextId: null,
    marquee: null,
    hoverId: null,
    guides: { guides: [], badges: [] },
    isPanning: false,
    tempTool: null,
    pendingImage: null,
  },
  clipboard: null,
  fileName: 'Untitled',
  showGrid: true,
  showRulers: true,
  showUI: true,
  leftPanelOpen: true,
  rightPanelOpen: true,
  historyUndoCount: 0,
  historyRedoCount: 0,
});

/** Global history. Owned by the store module. */
export const history = new History({ maxEntries: 300 });

type Store = AppState & {
  /** Run a mutation and record it in history. */
  mutate: (label: string, recipe: (draft: Draft<Document>) => void) => void;
  /** Run a mutation WITHOUT recording (used for internal/non-undoable state). */
  apply: (recipe: (draft: Draft<AppState>) => void) => void;
  /** Atomic mutation that groups successive calls with the same label into a single history entry. */
  mutateCoalesced: (label: string, recipe: (draft: Draft<Document>) => void) => void;
  /** Undo / redo. */
  undo: () => void;
  redo: () => void;
  /** Replace the doc entirely (loads from file; clears history). */
  replaceDoc: (doc: Document) => void;
  /** Reset everything. */
  reset: () => void;
};

let lastCoalesceLabel: string | null = null;
let lastCoalesceTime = 0;
const COALESCE_WINDOW_MS = 400;

export const useStore = create<Store>()(
  subscribeWithSelector((set, get) => ({
    ...initialState(),

    mutate: (label, recipe) => {
      const current = get().doc;
      const [next, patches, inverse] = produceWithPatches(current, recipe);
      if (patches.length === 0) return;
      const entry: HistoryEntry = {
        label,
        timestamp: performance.now(),
        patches: patches as Patch[],
        inversePatches: inverse as Patch[],
      };
      history.commit(entry);
      lastCoalesceLabel = null;
      set({
        doc: next,
        historyUndoCount: history.stats().undo,
        historyRedoCount: history.stats().redo,
      });
    },

    mutateCoalesced: (label, recipe) => {
      const current = get().doc;
      const [next, patches, inverse] = produceWithPatches(current, recipe);
      if (patches.length === 0) return;
      const now = performance.now();
      const canCoalesce =
        lastCoalesceLabel === label && now - lastCoalesceTime < COALESCE_WINDOW_MS;
      const entry: HistoryEntry = {
        label,
        timestamp: now,
        patches: patches as Patch[],
        inversePatches: inverse as Patch[],
      };
      if (canCoalesce) {
        history.appendToTop(entry);
      } else {
        history.commit(entry);
      }
      lastCoalesceLabel = label;
      lastCoalesceTime = now;
      set({
        doc: next,
        historyUndoCount: history.stats().undo,
        historyRedoCount: history.stats().redo,
      });
    },

    apply: (recipe) => {
      const [next] = produceWithPatches(get() as AppState, (draft) => {
        recipe(draft);
      });
      set(next);
    },

    undo: () => {
      const entry = history.undo();
      if (!entry) return;
      const next = applyPatches(get().doc, entry.inversePatches);
      set({
        doc: next,
        // Clear some transient that might dangle
        selection: get().selection.filter((id) => next.nodes[id]),
        transient: {
          ...get().transient,
          editingTextId:
            get().transient.editingTextId && next.nodes[get().transient.editingTextId!]
              ? get().transient.editingTextId
              : null,
          marquee: null,
        },
        historyUndoCount: history.stats().undo,
        historyRedoCount: history.stats().redo,
      });
      lastCoalesceLabel = null;
    },

    redo: () => {
      const entry = history.redo();
      if (!entry) return;
      const next = applyPatches(get().doc, entry.patches);
      set({
        doc: next,
        historyUndoCount: history.stats().undo,
        historyRedoCount: history.stats().redo,
      });
      lastCoalesceLabel = null;
    },

    replaceDoc: (doc) => {
      history.clear();
      set({
        doc,
        selection: [],
        transient: initialState().transient,
        historyUndoCount: 0,
        historyRedoCount: 0,
      });
    },

    reset: () => {
      history.clear();
      set({
        ...initialState(),
      });
    },
  })),
);

/** Convenience helpers wrapping the store. */
export const getDoc = (): Document => useStore.getState().doc;
export const getNode = (id: NodeId): SceneNode | undefined => useStore.getState().doc.nodes[id];
export const getSelection = (): NodeId[] => useStore.getState().selection;
export const getViewport = (): Viewport => useStore.getState().viewport;
export const getTool = (): ToolId => useStore.getState().tool;

export const setSelection = (ids: NodeId[]): void => {
  useStore.setState({ selection: ids });
};

export const setTool = (t: ToolId): void => {
  const prev = useStore.getState().tool;
  if (prev === t) return;
  useStore.setState({ tool: t, previousTool: prev });
};

export const setViewport = (v: Viewport): void => {
  useStore.setState({ viewport: v });
};
