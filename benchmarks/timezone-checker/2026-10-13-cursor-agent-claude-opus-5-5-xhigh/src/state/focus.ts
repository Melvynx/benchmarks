import { create } from "zustand";

interface FocusState {
  /** Reference hours currently emphasised across the grid (hovered column or summary window). */
  hours: ReadonlySet<number>;
  focus: (hours: readonly number[]) => void;
  clear: () => void;
}

const EMPTY: ReadonlySet<number> = new Set();

export const useFocus = create<FocusState>()((set) => ({
  hours: EMPTY,
  focus: (hours) => set({ hours: new Set(hours) }),
  clear: () => set((state) => (state.hours.size ? { hours: EMPTY } : state)),
}));
