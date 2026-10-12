import { create } from "zustand";
import type { Attachment, Contact } from "./types";
import { uid } from "./utils";

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

export interface ComposeState {
  key: string;
  messageId?: string;
  threadId?: string;
  mode: ComposeMode;
  to: Contact[];
  cc: Contact[];
  bcc: Contact[];
  subject: string;
  html: string;
  quote?: string;
  attachments: Attachment[];
  showCc: boolean;
  showBcc: boolean;
  minimized: boolean;
  maximized: boolean;
  inline: boolean;
  savedAt?: number;
  saving?: boolean;
  /** Bumped when html is replaced programmatically so the editor re-syncs. */
  rev: number;
}

export interface Toast {
  id: string;
  message: string;
  action?: { label: string; run: () => void };
  secondary?: { label: string; run: () => void };
  duration?: number;
  busy?: boolean;
}

export type Dialog =
  | { type: "shortcuts" }
  | { type: "createLabel"; applyTo?: string[] }
  | { type: "editLabel"; id: string }
  | { type: "confirm"; title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void }
  | { type: "attachment"; attachments: Attachment[]; index: number; sender?: string }
  | { type: "original"; messageId: string }
  | { type: "datetime"; title: string; initial: number; onPick: (ts: number) => void };

interface UIState {
  selected: string[];
  anchor?: string;
  focusedId?: string;
  page: number;
  composes: ComposeState[];
  toast: Toast | null;
  dialog: Dialog | null;
  settingsOpen: boolean;
  navOpen: boolean;
  now: number;
  undo: (() => void) | null;
  visibleIds: string[];

  setVisibleIds: (ids: string[]) => void;
  setSelected: (ids: string[], anchor?: string) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setFocused: (id?: string) => void;
  setPage: (p: number) => void;

  openCompose: (init?: Partial<ComposeState>) => string;
  updateCompose: (key: string, patch: Partial<ComposeState>) => void;
  closeCompose: (key: string) => void;

  showToast: (t: Omit<Toast, "id">, undo?: () => void) => void;
  dismissToast: () => void;
  openDialog: (d: Dialog) => void;
  closeDialog: () => void;
  setSettingsOpen: (v: boolean) => void;
  setNavOpen: (v: boolean) => void;
  setNow: (n: number) => void;
}

export const useUI = create<UIState>()((set, get) => ({
  selected: [],
  page: 0,
  composes: [],
  toast: null,
  dialog: null,
  settingsOpen: false,
  navOpen: false,
  now: Date.now(),
  undo: null,
  visibleIds: [],

  setVisibleIds: (visibleIds) => set({ visibleIds }),
  setSelected: (ids, anchor) => set({ selected: ids, anchor: anchor ?? get().anchor }),
  toggleSelected: (id) =>
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
      anchor: id,
    })),
  clearSelection: () => set({ selected: [], anchor: undefined }),
  setFocused: (id) => set({ focusedId: id }),
  setPage: (page) => set({ page }),

  openCompose: (init) => {
    const existing = init?.messageId && get().composes.find((c) => c.messageId === init.messageId);
    if (existing) {
      set((s) => ({
        composes: s.composes.map((c) => (c.key === existing.key ? { ...c, minimized: false } : c)),
      }));
      return existing.key;
    }
    const key = uid("compose");
    const compose: ComposeState = {
      mode: "new",
      to: [],
      cc: [],
      bcc: [],
      subject: "",
      html: "",
      attachments: [],
      showCc: false,
      showBcc: false,
      minimized: false,
      maximized: false,
      inline: false,
      rev: 0,
      ...init,
      key,
    };
    set((s) => {
      let list = s.composes;
      if (compose.inline) list = list.filter((c) => !(c.inline && c.threadId === compose.threadId));
      const floating = list.filter((c) => !c.inline);
      if (!compose.inline && floating.length >= 3) {
        const oldest = floating[0];
        list = list.map((c) => (c.key === oldest.key ? { ...c, minimized: true } : c));
      }
      return { composes: [...list, compose] };
    });
    return key;
  },
  updateCompose: (key, patch) =>
    set((s) => ({ composes: s.composes.map((c) => (c.key === key ? { ...c, ...patch } : c)) })),
  closeCompose: (key) => set((s) => ({ composes: s.composes.filter((c) => c.key !== key) })),

  showToast: (t, undo) => set({ toast: { ...t, id: uid("toast") }, undo: undo ?? null }),
  dismissToast: () => set({ toast: null }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setNavOpen: (navOpen) => set({ navOpen }),
  setNow: (now) => set({ now }),
}));
