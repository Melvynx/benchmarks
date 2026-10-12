import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSeedData } from '../domain/seed';
import type { MailData } from '../domain/types';

export interface MailState {
  data: MailData;
  update: (fn: (data: MailData) => MailData) => void;
}

/** Entire mailbox persisted to localStorage so the app works offline and survives reloads. */
export const useMail = create<MailState>()(
  persist(
    (set) => ({
      data: createSeedData(Date.now()),
      update: (fn) => set((state) => ({ data: fn(state.data) })),
    }),
    {
      name: 'claude-haiku-mail:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ data: state.data }),
    },
  ),
);
