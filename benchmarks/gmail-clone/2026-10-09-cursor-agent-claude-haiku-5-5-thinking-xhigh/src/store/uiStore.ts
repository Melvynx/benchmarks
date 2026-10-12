import { create } from 'zustand';
import type { Category } from '../domain/types';
import { uid } from '../lib/ids';

export interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

export interface ConfirmState {
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface FloatingMenu {
  kind: 'snooze' | 'labels';
  ids: string[];
  x: number;
  y: number;
}

export interface PendingReply {
  threadId: string;
  mode: 'reply' | 'replyAll';
  nonce: number;
}

export type SidebarMode = 'expanded' | 'rail';

interface UIState {
  toasts: ToastItem[];
  composeIds: string[];
  minimizedIds: string[];
  maximizedId: string | null;
  selected: string[];
  focusedId: string | null;
  page: number;
  category: Category;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  confirm: ConfirmState | null;
  drawerOpen: boolean;
  sidebarMode: SidebarMode;
  menu: FloatingMenu | null;
  pendingReply: PendingReply | null;
  refreshing: boolean;
  toast: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => void;
  dismissToast: (id: string) => void;
  openCompose: (id: string) => void;
  closeCompose: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  setFocusedId: (id: string | null) => void;
  setPage: (page: number) => void;
  setCategory: (category: Category) => void;
  setSettingsOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  ask: (confirm: ConfirmState) => void;
  closeConfirm: () => void;
  setDrawerOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openMenu: (menu: FloatingMenu) => void;
  closeMenu: () => void;
  requestReply: (threadId: string, mode: 'reply' | 'replyAll') => void;
  consumeReply: () => void;
  setRefreshing: (refreshing: boolean) => void;
}

export const useUI = create<UIState>()((set, get) => ({
  toasts: [],
  composeIds: [],
  minimizedIds: [],
  maximizedId: null,
  selected: [],
  focusedId: null,
  page: 0,
  category: 'primary',
  settingsOpen: false,
  shortcutsOpen: false,
  confirm: null,
  drawerOpen: false,
  sidebarMode: typeof window !== 'undefined' && window.innerWidth >= 1100 ? 'expanded' : 'rail',
  menu: null,
  pendingReply: null,
  refreshing: false,

  toast: (t) => {
    const id = uid('toast');
    const duration = t.duration ?? 6000;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id, duration }] }));
    window.setTimeout(() => get().dismissToast(id), duration);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openCompose: (id) =>
    set((s) => ({
      composeIds: [...s.composeIds.filter((x) => x !== id), id].slice(-3),
      minimizedIds: s.minimizedIds.filter((x) => x !== id),
    })),
  closeCompose: (id) =>
    set((s) => ({
      composeIds: s.composeIds.filter((x) => x !== id),
      minimizedIds: s.minimizedIds.filter((x) => x !== id),
      maximizedId: s.maximizedId === id ? null : s.maximizedId,
    })),
  toggleMinimize: (id) =>
    set((s) => ({
      minimizedIds: s.minimizedIds.includes(id)
        ? s.minimizedIds.filter((x) => x !== id)
        : [...s.minimizedIds, id],
      maximizedId: s.maximizedId === id ? null : s.maximizedId,
    })),
  toggleMaximize: (id) =>
    set((s) => ({
      maximizedId: s.maximizedId === id ? null : id,
      minimizedIds: s.minimizedIds.filter((x) => x !== id),
    })),

  setSelected: (ids) => set({ selected: Array.from(new Set(ids)) }),
  toggleSelected: (id) =>
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    })),
  setFocusedId: (id) => set({ focusedId: id }),
  setPage: (page) => set({ page }),
  setCategory: (category) => set({ category, page: 0 }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  ask: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarMode: s.sidebarMode === 'expanded' ? 'rail' : 'expanded' })),
  openMenu: (menu) => set({ menu }),
  closeMenu: () => set({ menu: null }),
  requestReply: (threadId, mode) => set({ pendingReply: { threadId, mode, nonce: Date.now() } }),
  consumeReply: () => set({ pendingReply: null }),
  setRefreshing: (refreshing) => set({ refreshing }),
}));
