import { create } from 'zustand';
import type { Attachment, ComposeMode, DraftFields } from '../types';

export interface ComposeWin {
  id: string;
  threadId: string;
  draftId: string;
  mode: ComposeMode;
  isNewThread: boolean;
  minimized: boolean;
  maximized: boolean;
  initial: DraftFields;
  focus?: 'to' | 'body' | 'subject';
}

export interface InlineReply {
  threadId: string;
  draftId: string;
  mode: ComposeMode;
  initial: DraftFields;
  key: string;
  passive?: boolean;
}

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
  action?: { label: string; run: () => void };
  duration?: number;
}

export interface ConfirmState {
  title?: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  alertOnly?: boolean;
  onConfirm: () => void;
}

export type MenuKind = 'labels' | 'move' | 'snooze';

export interface UIState {
  selected: string[];
  anchor: string | null;
  cursor: string | null;
  page: number;
  drawerOpen: boolean;
  composes: ComposeWin[];
  inline: InlineReply | null;
  toast: Toast | null;
  quickSettings: boolean;
  shortcutsOpen: boolean;
  labelDialog: { labelId?: string; applyTo?: string[] } | null;
  confirm: ConfirmState | null;
  preview: { attachments: Attachment[]; index: number } | null;
  menuRequest: { kind: MenuKind; nonce: number; target: 'list' | 'thread' } | null;
  searchFocus: number;
  advancedSearch: boolean;
  refreshing: boolean;
  mobileSearch: boolean;
  frozen: { key: string; ids: string[] } | null;
}

export const useUI = create<UIState>()(() => ({
  selected: [],
  anchor: null,
  cursor: null,
  page: 0,
  drawerOpen: false,
  composes: [],
  inline: null,
  toast: null,
  quickSettings: false,
  shortcutsOpen: false,
  labelDialog: null,
  confirm: null,
  preview: null,
  menuRequest: null,
  searchFocus: 0,
  advancedSearch: false,
  refreshing: false,
  mobileSearch: false,
  frozen: null,
}));

export const ui = {
  set: useUI.setState,
  get: useUI.getState,
};

let toastSeq = 0;
export function showToast(message: string, opts: Omit<Toast, 'id' | 'message'> = {}) {
  ui.set({ toast: { id: ++toastSeq, message, ...opts } });
}

export function hideToast() {
  ui.set({ toast: null });
}

export function confirmDialog(c: ConfirmState) {
  ui.set({ confirm: c });
}

export function clearSelection() {
  ui.set({ selected: [], anchor: null });
}
