// Global keyboard shortcuts for the drawing editor. Installed while the editor
// is mounted. Text-editing and form fields are respected: when the user is
// typing, only Escape (handled by the textarea itself) applies.

import { useEffect } from "react";
import type { DrawingTool } from "./drawing-document";
import { useDrawingStore } from "./drawing-store";

const TOOL_KEYS: Partial<Record<string, DrawingTool>> = {
  v: "select",
  r: "rectangle",
  o: "ellipse",
  a: "arrow",
  t: "text",
  p: "freedraw",
  s: "placeholder",
};

function isFormElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useDrawingShortcuts({ onSave }: { onSave: () => void }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const store = useDrawingStore.getState();
      const mod = event.metaKey || event.ctrlKey;

      // Save works everywhere.
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
        return;
      }

      // While editing text, let the textarea own the keyboard.
      if (store.editingId) return;

      // Escape: defocus / clear selection / return to select tool. Never let it
      // bubble up to close the page.
      if (event.key === "Escape") {
        if (isFormElement(event.target)) {
          (event.target as HTMLElement).blur();
        } else if (store.selectedIds.length > 0) {
          store.clearSelection();
        } else if (store.tool !== "select") {
          store.setTool("select");
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Don't hijack typing in inputs (search boxes, name field, etc.).
      if (isFormElement(event.target)) return;

      if (mod) {
        const key = event.key.toLowerCase();
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) store.redo();
          else store.undo();
          return;
        }
        if (key === "y") {
          event.preventDefault();
          store.redo();
          return;
        }
        if (key === "c") {
          store.copySelected();
          return;
        }
        if (key === "x") {
          store.cutSelected();
          return;
        }
        if (key === "v") {
          store.paste();
          return;
        }
        if (key === "d") {
          event.preventDefault();
          store.duplicateSelected();
          return;
        }
        if (key === "a") {
          event.preventDefault();
          store.selectAll();
          return;
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (store.selectedIds.length > 0) {
          event.preventDefault();
          store.deleteSelected();
        }
        return;
      }

      const tool = TOOL_KEYS[event.key.toLowerCase()];
      if (tool) {
        event.preventDefault();
        store.setTool(tool);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);
}
