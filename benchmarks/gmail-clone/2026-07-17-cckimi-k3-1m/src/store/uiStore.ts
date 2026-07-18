import { create } from 'zustand';

export type DialogKind = 'shortcuts' | 'settings' | 'label' | null;

interface UiState {
  sidebarOpen: boolean; // mobile drawer
  sidebarCollapsed: boolean; // desktop icon rail
  dialog: DialogKind;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleCollapse: () => void;
  openDialog: (d: Exclude<DialogKind, null>) => void;
  closeDialog: () => void;
}

export const useUi = create<UiState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  dialog: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openDialog: (d) => set({ dialog: d }),
  closeDialog: () => set({ dialog: null }),
}));
