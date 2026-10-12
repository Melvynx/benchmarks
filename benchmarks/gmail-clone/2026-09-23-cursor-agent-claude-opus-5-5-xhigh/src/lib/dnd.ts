import { act } from "./actions";
import type { FolderId } from "./types";
import { useMail } from "./store";

export const DND_TYPE = "application/x-mail-threads";

export function startThreadDrag(e: React.DragEvent, ids: string[]) {
  e.dataTransfer.setData(DND_TYPE, JSON.stringify(ids));
  e.dataTransfer.effectAllowed = "move";
  const ghost = document.createElement("div");
  ghost.textContent = ids.length === 1 ? "Move 1 conversation" : `Move ${ids.length} conversations`;
  Object.assign(ghost.style, {
    position: "fixed",
    top: "-100px",
    left: "0",
    padding: "8px 14px",
    borderRadius: "8px",
    background: "#0b57d0",
    color: "#fff",
    font: "500 13px Roboto, sans-serif",
    boxShadow: "0 2px 6px rgba(0,0,0,.3)",
  });
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, -12, -12);
  window.setTimeout(() => ghost.remove(), 0);
}

export function hasThreadData(e: React.DragEvent) {
  return Array.from(e.dataTransfer.types).includes(DND_TYPE);
}

export function readThreadData(e: React.DragEvent): string[] {
  try {
    return JSON.parse(e.dataTransfer.getData(DND_TYPE) || "[]");
  } catch {
    return [];
  }
}

export type DropTarget = { kind: "folder"; id: FolderId } | { kind: "label"; id: string };

export function canDropOn(t: DropTarget) {
  if (t.kind === "label") return true;
  return ["inbox", "starred", "important", "spam", "trash"].includes(t.id);
}

export function dropOn(t: DropTarget, ids: string[], currentLabel?: string) {
  if (!ids.length) return;
  if (t.kind === "label") return act.moveToLabel(ids, t.id, currentLabel);
  switch (t.id) {
    case "inbox":
      return act.moveToInbox(ids);
    case "starred":
      useMail.getState().setStarred(ids, true);
      return;
    case "important":
      return act.setImportant(ids, true);
    case "spam":
      return act.spam(ids);
    case "trash":
      return act.trash(ids);
  }
}
