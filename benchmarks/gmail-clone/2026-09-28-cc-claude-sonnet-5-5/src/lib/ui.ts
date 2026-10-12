import { useSyncExternalStore } from 'react';
import type { Address, Attachment } from './types';
import { uid } from './mail';

export interface Toast {
  id: string;
  message: string;
  actions: { label: string; run: () => void }[];
  duration: number;
  tone?: 'default' | 'error';
}

export interface ComposeSeed {
  to?: Address[];
  cc?: Address[];
  bcc?: Address[];
  subject?: string;
  html?: string;
  quoteHtml?: string;
  attachments?: Attachment[];
  replyToMessageId?: string;
}

export interface ComposeWin {
  id: string;
  draftId: string;
  threadId: string;
  mode: 'new' | 'reply' | 'replyAll' | 'forward';
  minimized: boolean;
  maximized: boolean;
  /** Reply windows render inline in the open conversation until popped out. */
  popped?: boolean;
  seed?: ComposeSeed;
}

export type Dialog =
  | { kind: 'confirm'; title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void }
  | { kind: 'alert'; title: string; body: string }
  | { kind: 'shortcuts' }
  | { kind: 'label'; labelId?: string; applyToIds?: string[] }
  | { kind: 'snooze'; ids: string[] }
  | { kind: 'schedule'; onPick: (ts: number) => void }
  | { kind: 'attachment'; threadId: string; messageId: string; attachmentId: string }
  | { kind: 'link'; onInsert: (text: string, url: string) => void; initialText: string };

export interface UIState {
  now: number;
  selection: { keys: string[]; allInView: boolean };
  cursor: string | null;
  toasts: Toast[];
  composes: ComposeWin[];
  drawerOpen: boolean;
  dialog: Dialog | null;
  lastUndo: (() => void) | null;
  /** Row key focused by keyboard navigation in the message list. */
  searchFocusTick: number;
}

let ui: UIState = {
  now: Date.now(),
  selection: { keys: [], allInView: false },
  cursor: null,
  toasts: [],
  composes: [],
  drawerOpen: false,
  dialog: null,
  lastUndo: null,
  searchFocusTick: 0,
};

const listeners = new Set<() => void>();

export function getUI(): UIState {
  return ui;
}

export function setUI(patch: Partial<UIState> | ((u: UIState) => Partial<UIState>)) {
  const p = typeof patch === 'function' ? patch(ui) : patch;
  ui = { ...ui, ...p };
  listeners.forEach((l) => l());
}

export function useUI(): UIState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    getUI,
    getUI,
  );
}

/* ---------- toasts ---------- */

const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function toast(
  message: string,
  opts: { actions?: { label: string; run: () => void }[]; duration?: number; tone?: 'default' | 'error' } = {},
): string {
  const id = uid('toast');
  const duration = opts.duration ?? (opts.actions?.length ? 7000 : 4000);
  const t: Toast = { id, message, actions: opts.actions ?? [], duration, tone: opts.tone };
  setUI((u) => ({ toasts: [...u.toasts.slice(-2), t] }));
  toastTimers.set(
    id,
    setTimeout(() => dismissToast(id), duration),
  );
  return id;
}

export function dismissToast(id: string) {
  const timer = toastTimers.get(id);
  if (timer) clearTimeout(timer);
  toastTimers.delete(id);
  setUI((u) => ({ toasts: u.toasts.filter((t) => t.id !== id) }));
}

export function pauseToast(id: string) {
  const timer = toastTimers.get(id);
  if (timer) clearTimeout(timer);
  toastTimers.delete(id);
}

export function resumeToast(id: string, ms = 3000) {
  if (toastTimers.has(id)) return;
  toastTimers.set(
    id,
    setTimeout(() => dismissToast(id), ms),
  );
}

/* ---------- selection ---------- */

export function clearSelection() {
  if (ui.selection.keys.length || ui.selection.allInView) setUI({ selection: { keys: [], allInView: false } });
}

export function setSelection(keys: string[], allInView = false) {
  setUI({ selection: { keys, allInView } });
}

export function toggleSelected(key: string) {
  const cur = ui.selection.keys;
  const keys = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
  setUI({ selection: { keys, allInView: false } });
}

/* ---------- compose windows ---------- */

export function openCompose(opts: {
  mode?: ComposeWin['mode'];
  threadId?: string;
  draftId?: string;
  seed?: ComposeSeed;
}): string {
  const existing = opts.draftId ? ui.composes.find((c) => c.draftId === opts.draftId) : undefined;
  if (existing) {
    setUI((u) => ({
      composes: u.composes.map((c) => (c.id === existing.id ? { ...c, minimized: false } : c)),
    }));
    return existing.id;
  }
  const win: ComposeWin = {
    id: uid('win'),
    draftId: opts.draftId ?? uid('m'),
    threadId: opts.threadId ?? uid('t'),
    mode: opts.mode ?? 'new',
    minimized: false,
    maximized: false,
    seed: opts.seed,
  };
  setUI((u) => {
    const next = [...u.composes, win];
    // Keep at most three expanded windows: minimise the oldest extras.
    let open = next.filter((c) => !c.minimized).length;
    const adjusted = next.map((c) => {
      if (open > 3 && !c.minimized && c.id !== win.id) {
        open--;
        return { ...c, minimized: true };
      }
      return c;
    });
    return { composes: adjusted };
  });
  return win.id;
}

export function updateCompose(id: string, patch: Partial<ComposeWin>) {
  setUI((u) => ({ composes: u.composes.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
}

export function closeCompose(id: string) {
  setUI((u) => ({ composes: u.composes.filter((c) => c.id !== id) }));
}

export function openDialog(d: Dialog) {
  setUI({ dialog: d });
}

export function closeDialog() {
  setUI({ dialog: null });
}

export function confirmDialog(opts: { title: string; body: string; confirmLabel: string; danger?: boolean }, onConfirm: () => void) {
  openDialog({ kind: 'confirm', ...opts, onConfirm });
}
