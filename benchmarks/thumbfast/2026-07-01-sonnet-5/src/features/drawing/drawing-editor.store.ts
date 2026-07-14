import { create } from "zustand";
import type { DrawingTool } from "./drawing.types";

const MAX_HISTORY = 100;

type DrawingEditorState = {
  tool: DrawingTool;
  setTool: (tool: DrawingTool) => void;

  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;

  zoom: number;
  setZoom: (zoom: number) => void;

  history: string[];
  historyIndex: number;
  isDirty: boolean;
  resetHistory: (initialJson: string) => void;
  pushHistory: (json: string) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => string | null;
  redo: () => string | null;

  resetSession: () => void;
};

export const useDrawingEditorStore = create<DrawingEditorState>()(
  (set, get) => ({
    tool: "select",
    setTool: (tool) => set({ tool }),

    selectedIds: [],
    setSelectedIds: (ids) => set({ selectedIds: ids }),

    zoom: 1,
    setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.1, zoom)) }),

    history: [],
    historyIndex: -1,
    isDirty: false,

    resetHistory: (initialJson) =>
      set({ history: [initialJson], historyIndex: 0, isDirty: false }),

    pushHistory: (json) => {
      const state = get();
      if (state.history[state.historyIndex] === json) return;

      const truncated = state.history.slice(0, state.historyIndex + 1);
      truncated.push(json);
      const overflow = truncated.length - MAX_HISTORY;
      const nextHistory = overflow > 0 ? truncated.slice(overflow) : truncated;

      set({
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
        isDirty: true,
      });
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    undo: () => {
      const state = get();
      if (state.historyIndex <= 0) return null;
      const nextIndex = state.historyIndex - 1;
      set({ historyIndex: nextIndex, isDirty: true });
      return state.history[nextIndex];
    },

    redo: () => {
      const state = get();
      if (state.historyIndex >= state.history.length - 1) return null;
      const nextIndex = state.historyIndex + 1;
      set({ historyIndex: nextIndex, isDirty: true });
      return state.history[nextIndex];
    },

    resetSession: () =>
      set({
        tool: "select",
        selectedIds: [],
        zoom: 1,
        history: [],
        historyIndex: -1,
        isDirty: false,
      }),
  }),
);
