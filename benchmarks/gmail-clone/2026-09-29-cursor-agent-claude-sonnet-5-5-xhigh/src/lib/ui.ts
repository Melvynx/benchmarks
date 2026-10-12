import { create } from 'zustand';
import type { Attachment } from './types';
import { uid } from './text';

export interface ComposeWin {
  draftId: string;
  minimized: boolean;
  maximized: boolean;
}

export interface Toast {
  id: string;
  text: string;
  actions: { label: string; run: () => void }[];
  duration: number;
}

export interface ConfirmDialog {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

export interface UIState {
  selected: string[];
  anchor: string | null;
  cursor: string | null;
  compose: ComposeWin[];
  toasts: Toast[];
  drawerOpen: boolean;
  quickSettings: boolean;
  shortcutsHelp: boolean;
  labelDialog: { id?: string; applyTo?: string[] } | null;
  preview: { attachments: Attachment[]; index: number } | null;
  confirm: ConfirmDialog | null;
  mobileSearch: boolean;
  searchFocusNonce: number;
  refreshing: boolean;
  online: boolean;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setAnchor: (id: string | null) => void;
  setCursor: (id: string | null) => void;
  openCompose: (draftId: string) => void;
  closeComposeWindow: (draftId: string) => void;
  updateWin: (draftId: string, patch: Partial<ComposeWin>) => void;
  toast: (text: string, actions?: Toast['actions'], duration?: number) => string;
  dismissToast: (id: string) => void;
  set: (patch: Partial<UIState>) => void;
}

export const useUI = create<UIState>()((set, get) => ({
  selected: [],
  anchor: null,
  cursor: null,
  compose: [],
  toasts: [],
  drawerOpen: false,
  quickSettings: false,
  shortcutsHelp: false,
  labelDialog: null,
  preview: null,
  confirm: null,
  mobileSearch: false,
  searchFocusNonce: 0,
  refreshing: false,
  online: true,

  select: (ids) => set({ selected: ids }),
  toggleSelect: (id) =>
    set((s) => ({ selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id], anchor: id })),
  clearSelection: () => set({ selected: [], anchor: null }),
  setAnchor: (id) => set({ anchor: id }),
  setCursor: (id) => set({ cursor: id }),
  openCompose: (draftId) =>
    set((s) => {
      const existing = s.compose.find((c) => c.draftId === draftId);
      if (existing) return { compose: s.compose.map((c) => (c.draftId === draftId ? { ...c, minimized: false } : c)) };
      const next = [...s.compose, { draftId, minimized: false, maximized: false }];
      return { compose: next.length > 3 ? next.slice(next.length - 3) : next };
    }),
  closeComposeWindow: (draftId) => set((s) => ({ compose: s.compose.filter((c) => c.draftId !== draftId) })),
  updateWin: (draftId, patch) => set((s) => ({ compose: s.compose.map((c) => (c.draftId === draftId ? { ...c, ...patch } : c)) })),
  toast: (text, actions = [], duration = 6500) => {
    const id = uid('toast');
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, actions, duration }] }));
    if (duration > 0) {
      setTimeout(() => get().dismissToast(id), duration);
    }
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  set: (patch) => set(patch),
}));
