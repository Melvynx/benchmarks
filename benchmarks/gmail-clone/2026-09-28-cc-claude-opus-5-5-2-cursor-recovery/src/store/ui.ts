import { create } from 'zustand';
import type { Attachment, Contact } from '../data/types';
import { uid } from '../lib/format';

export interface ComposeWin {
  id: string;
  draftId: string;
  minimized: boolean;
  maximized: boolean;
}

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: string;
  message: string;
  actions?: ToastAction[];
  duration?: number;
}

export interface Notice {
  id: string;
  from: Contact;
  title: string;
  body: string;
  threadId: string;
}

export interface LabelDialogState {
  mode: 'create' | 'edit';
  labelId?: string;
  applyTo?: string[];
  /** Move the conversations into the new label (remove from Inbox) instead of just labelling. */
  move?: boolean;
  name?: string;
}

interface UIState {
  selected: Record<string, true>;
  selectAllMatching: boolean;
  anchorId: string | null;
  cursorId: string | null;
  page: number;
  composes: ComposeWin[];
  toast: Toast | null;
  notices: Notice[];
  navOpen: boolean;
  quickSettings: boolean;
  shortcutsHelp: boolean;
  viewer: { attachments: Attachment[]; index: number } | null;
  dragIds: string[] | null;
  searchFocused: boolean;
  labelDialog: LabelDialogState | null;
  signedOut: boolean;

  setSelected: (ids: string[], on: boolean) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setSelectAllMatching: (v: boolean) => void;
  setAnchor: (id: string | null) => void;
  setCursor: (id: string | null) => void;
  setPage: (p: number) => void;
  openCompose: (draftId: string) => void;
  closeCompose: (id: string) => void;
  closeComposeForDraft: (draftId: string) => void;
  patchCompose: (id: string, patch: Partial<ComposeWin>) => void;
  showToast: (message: string, actions?: ToastAction[], duration?: number) => void;
  dismissToast: (id?: string) => void;
  pushNotice: (n: Omit<Notice, 'id'>) => void;
  dismissNotice: (id: string) => void;
  set: (patch: Partial<UIState>) => void;
}

export const useUI = create<UIState>()((set, get) => ({
  selected: {},
  selectAllMatching: false,
  anchorId: null,
  cursorId: null,
  page: 0,
  composes: [],
  toast: null,
  notices: [],
  navOpen: false,
  quickSettings: false,
  shortcutsHelp: false,
  viewer: null,
  dragIds: null,
  searchFocused: false,
  labelDialog: null,
  signedOut: false,

  setSelected: (ids, on) => {
    const selected = { ...get().selected };
    for (const id of ids) {
      if (on) selected[id] = true;
      else delete selected[id];
    }
    set({ selected, selectAllMatching: on ? get().selectAllMatching : false });
  },
  toggleSelected: (id) => get().setSelected([id], !get().selected[id]),
  clearSelection: () => set({ selected: {}, selectAllMatching: false, anchorId: null }),
  setSelectAllMatching: (v) => set({ selectAllMatching: v }),
  setAnchor: (id) => set({ anchorId: id }),
  setCursor: (id) => set({ cursorId: id }),
  setPage: (p) => set({ page: p }),

  openCompose: (draftId) => {
    const existing = get().composes.find((c) => c.draftId === draftId);
    if (existing) {
      set({ composes: get().composes.map((c) => (c.id === existing.id ? { ...c, minimized: false } : c)) });
      return;
    }
    // Gmail keeps at most a handful of windows docked; the oldest collapses first.
    const composes = get().composes.map((c, i, arr) => (arr.length >= 2 && i < arr.length - 1 ? { ...c, minimized: true } : c));
    set({ composes: [...composes, { id: uid('cw'), draftId, minimized: false, maximized: false }].slice(-4) });
  },
  closeCompose: (id) => set({ composes: get().composes.filter((c) => c.id !== id) }),
  closeComposeForDraft: (draftId) => set({ composes: get().composes.filter((c) => c.draftId !== draftId) }),
  patchCompose: (id, patch) => set({ composes: get().composes.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),

  showToast: (message, actions, duration = 6000) => set({ toast: { id: uid('toast'), message, actions, duration } }),
  dismissToast: (id) => {
    if (!id || get().toast?.id === id) set({ toast: null });
  },
  pushNotice: (n) => set({ notices: [...get().notices, { ...n, id: uid('n') }].slice(-3) }),
  dismissNotice: (id) => set({ notices: get().notices.filter((n) => n.id !== id) }),
  set: (patch) => set(patch),
}));
