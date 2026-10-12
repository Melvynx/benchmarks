import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface ToastStore {
  toast: Toast | null;
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>()((set) => ({
  toast: null,
  show: (toast) => set({ toast: { ...toast, id: nextId++ } }),
  dismiss: () => set({ toast: null }),
}));

export const showToast = (toast: Omit<Toast, 'id'>) => useToastStore.getState().show(toast);
