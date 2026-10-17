import { create } from "zustand";

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  message: string;
  actions?: ToastAction[];
  duration?: number;
  undo?: () => void;
}

export interface ComposerWin {
  id: string;
  minimized: boolean;
  maximized: boolean;
  focusNonce: number;
}

export type MenuKey = "label" | "move" | "snooze" | null;
export type SidePanel = "calendar" | "tasks" | "contacts" | null;

interface UIState {
  selected: string[];
  focusedId: string | null;
  composers: ComposerWin[];
  toast: Toast | null;
  lastUndo: (() => void) | null;
  navOpen: boolean;
  navHover: boolean;
  quickSettings: boolean;
  shortcutsOpen: boolean;
  preview: { messageId: string; attachmentId: string } | null;
  searchInput: string;
  searchFocusNonce: number;
  menu: MenuKey;
  labelDialog: { labelId?: string; applyTo?: string[] } | null;
  linkWarning: string | null;
  sidePanel: SidePanel;
  online: boolean;
  dragCount: number;
  refreshing: boolean;
  mobileSearch: boolean;
  /** Message ids that should start expanded when a thread opens. */
  revealMessage: string | null;
  confirm: { title: string; body?: string; confirmLabel: string; danger?: boolean; onConfirm: () => void } | null;
  alert: { title: string; body: string } | null;
  signingOut: boolean;

  set: (patch: Partial<UIState>) => void;
  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  openComposer: (id: string) => void;
  closeComposer: (id: string) => void;
  updateComposer: (id: string, patch: Partial<ComposerWin>) => void;
  showToast: (t: Omit<Toast, "id">) => void;
  dismissToast: () => void;
}

let toastId = 0;

export const useUI = create<UIState>((set, get) => ({
  selected: [],
  focusedId: null,
  composers: [],
  toast: null,
  lastUndo: null,
  navOpen: false,
  navHover: false,
  quickSettings: false,
  shortcutsOpen: false,
  preview: null,
  searchInput: "",
  searchFocusNonce: 0,
  menu: null,
  labelDialog: null,
  linkWarning: null,
  sidePanel: null,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  dragCount: 0,
  refreshing: false,
  mobileSearch: false,
  revealMessage: null,
  confirm: null,
  alert: null,
  signingOut: false,

  set: (patch) => set(patch),
  select: (ids) => set({ selected: [...new Set(ids)] }),
  toggleSelect: (id) => {
    const s = get().selected;
    set({ selected: s.includes(id) ? s.filter((x) => x !== id) : [...s, id] });
  },
  clearSelection: () => set({ selected: [] }),
  openComposer: (id) => {
    const list = get().composers;
    const existing = list.find((c) => c.id === id);
    if (existing) {
      set({ composers: list.map((c) => (c.id === id ? { ...c, minimized: false, focusNonce: c.focusNonce + 1 } : c)) });
      return;
    }
    const max = typeof window !== "undefined" ? Math.max(1, Math.floor((window.innerWidth - 300) / 560)) : 3;
    const next = [...list.map((c, i) => (list.length - i >= max ? { ...c, minimized: true } : c)), { id, minimized: false, maximized: false, focusNonce: 1 }];
    set({ composers: next });
  },
  closeComposer: (id) => set({ composers: get().composers.filter((c) => c.id !== id) }),
  updateComposer: (id, patch) => set({ composers: get().composers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
  showToast: (t) => set({ toast: { ...t, id: ++toastId }, lastUndo: t.undo ?? get().lastUndo }),
  dismissToast: () => set({ toast: null }),
}));

export const ui = () => useUI.getState();
