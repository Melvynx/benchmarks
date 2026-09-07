import { clamp } from "../core/geometry";
import { activePage, allNodeIds, selectionAABB } from "../core/scene";
import {
  addImage,
  deleteSelection,
  duplicateSelection,
  getState,
  groupSelection,
  patchUi,
  redo,
  setCamera,
  setSelection,
  setTool,
  stack,
  undo,
  ungroupSelection,
  updateSelected,
  viewDocument,
} from "../core/store";
import type { Tool } from "../core/types";
import { MAX_ZOOM, MIN_ZOOM } from "../core/types";
import { fitAABB } from "./camera";

const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  h: "hand",
  f: "frame",
  r: "rectangle",
  o: "ellipse",
  l: "line",
  p: "pen",
  t: "text",
  y: "polygon",
  k: "comment",
  z: "zoom",
};

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function handleKeyDown(e: KeyboardEvent): void {
  if (isTypingTarget(e.target)) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    return;
  }
  const meta = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  const st = getState();

  if (e.key === "Escape") {
    e.preventDefault();
    patchUi({ paletteOpen: false, helpOpen: false, playMode: false, contextMenu: null });
    setTool("select");
    return;
  }
  if (meta && key === "/") {
    e.preventDefault();
    patchUi({ helpOpen: !st.ui.helpOpen });
    return;
  }
  if (meta && key === "k") {
    e.preventDefault();
    patchUi({ paletteOpen: !st.ui.paletteOpen });
    return;
  }
  if (meta && key === "z") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (meta && key === "a") {
    e.preventDefault();
    setSelection(allNodeIds(viewDocument()));
    return;
  }
  if (meta && key === "d") {
    e.preventDefault();
    duplicateSelection();
    return;
  }
  if (meta && key === "g") {
    e.preventDefault();
    if (e.shiftKey) ungroupSelection();
    else groupSelection();
    return;
  }
  if (meta && (e.key === "]" || e.key === "[")) {
    e.preventDefault();
    if (e.shiftKey) stack(e.key === "]" ? "front" : "back");
    else stack(e.key === "]" ? "forward" : "backward");
    return;
  }
  if (meta && (key === "c" || key === "x")) {
    e.preventDefault();
    const json = JSON.stringify(st.selection.map((id) => st.document.nodes[id]));
    void navigator.clipboard.writeText(json);
    if (key === "x") deleteSelection();
    return;
  }
  if (meta && key === "v") {
    e.preventDefault();
    void pasteClipboard();
    return;
  }
  if (key === "delete" || key === "backspace") {
    e.preventDefault();
    deleteSelection();
    return;
  }
  if (meta && key === "0") {
    e.preventDefault();
    setCamera({ ...st.camera, zoom: 1 });
    return;
  }
  if (meta && key === "1") {
    e.preventDefault();
    const doc = viewDocument();
    const aabb = st.selection.length
      ? selectionAABB(doc, st.selection)
      : selectionAABB(doc, activePage(doc).children);
    const wrap = document.querySelector(".canvas-wrap");
    if (aabb && wrap) {
      const r = wrap.getBoundingClientRect();
      setCamera(fitAABB(aabb, r.width, r.height, st.ui.rulers));
    }
    return;
  }
  if (meta && (key === "=" || key === "+")) {
    e.preventDefault();
    setCamera({ ...st.camera, zoom: clamp(st.camera.zoom * 1.25, MIN_ZOOM, MAX_ZOOM) });
    return;
  }
  if (meta && key === "-") {
    e.preventDefault();
    setCamera({ ...st.camera, zoom: clamp(st.camera.zoom / 1.25, MIN_ZOOM, MAX_ZOOM) });
    return;
  }
  if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    updateSelected((n) => {
      n.x += dx;
      n.y += dy;
    }, "Nudge");
    return;
  }
  if (!meta && TOOL_KEYS[key]) {
    e.preventDefault();
    setTool(TOOL_KEYS[key]!);
  }
}

async function pasteClipboard(): Promise<void> {
  const st = getState();
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      const src = await blobToDataUrl(blob);
      const img = new Image();
      img.onload = () => addImage(src, st.camera.x, st.camera.y, img.width, img.height);
      img.src = src;
      return;
    }
  } catch {
    duplicateSelection();
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const SHORTCUTS = [
  { keys: "V H F R O L P T", label: "Tools" },
  { keys: "⌘Z / ⌘⇧Z", label: "Undo / Redo" },
  { keys: "⌘C ⌘X ⌘V ⌘D", label: "Clipboard" },
  { keys: "⌘G / ⌘⇧G", label: "Group" },
  { keys: "⌘] ⌘[", label: "Reorder" },
  { keys: "⌘0 ⌘1", label: "Zoom" },
  { keys: "⌘/ ⌘K", label: "Help / Palette" },
] as const;
