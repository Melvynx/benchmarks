import { createContext, useContext } from "react";

export interface UI {
  openCreateLabel: (applyTo?: string[]) => void;
  openEditLabel: (id: string) => void;
  openShortcuts: () => void;
  openQuickSettings: () => void;
  openPreview: (attachmentId: string, threadId?: string) => void;
  isMobile: boolean;
  focusSearch: () => void;
}

export const UICtx = createContext<UI>(null!);
export const useUI = () => useContext(UICtx);
