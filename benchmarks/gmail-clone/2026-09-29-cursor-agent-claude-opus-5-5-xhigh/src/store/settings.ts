import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category } from '../types';
import type { InboxType } from '../lib/mailbox';

export type Theme = 'light' | 'dark' | 'system';
export type Density = 'default' | 'comfortable' | 'compact';
export type ReadingPane = 'none' | 'right' | 'below';
export type SwipeAction = 'archive' | 'trash' | 'read' | 'star' | 'none';

export interface Settings {
  theme: Theme;
  density: Density;
  readingPane: ReadingPane;
  paneSize: number;
  inboxType: InboxType;
  categories: Exclude<Category, 'primary'>[];
  pageSize: number;
  undoSeconds: number;
  shortcuts: boolean;
  hoverActions: boolean;
  importanceMarkers: boolean;
  snippets: boolean;
  autoAdvance: 'list' | 'newer' | 'older';
  defaultReply: 'reply' | 'replyAll';
  signature: string;
  displayName: string;
  avatarColor: string;
  simulateActivity: boolean;
  swipeLeft: SwipeAction;
  swipeRight: SwipeAction;
  sidebarCollapsed: boolean;
  recentSearches: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  density: 'default',
  readingPane: 'none',
  paneSize: 42,
  inboxType: 'default',
  categories: ['promotions', 'social', 'updates'],
  pageSize: 50,
  undoSeconds: 10,
  shortcuts: true,
  hoverActions: true,
  importanceMarkers: true,
  snippets: true,
  autoAdvance: 'list',
  defaultReply: 'reply',
  signature: 'Alex Rivera<br>Product Design Lead · Lumen Labs',
  displayName: 'Alex Rivera',
  avatarColor: '#7b3fa0',
  simulateActivity: true,
  swipeLeft: 'archive',
  swipeRight: 'archive',
  sidebarCollapsed: false,
  recentSearches: [],
};

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  addRecentSearch: (q: string) => void;
  resetSettings: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      addRecentSearch: (q) =>
        set((s) => ({ recentSearches: [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, 6) })),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'opus-mail-settings', version: 1 },
  ),
);
