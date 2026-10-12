import { useEffect } from "react";
import type { ToolId } from "../engine/types";
import { useEditor, useTools } from "./context";

export function useShortcuts(): void {
  const editor = useEditor();
  const tools = useTools();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === " " && !typing) {
        editor.spaceDown = true;
        event.preventDefault();
        return;
      }
      if (typing && event.key !== "Escape") return;
      const meta = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        tools.keyDown("Escape", event.shiftKey);
        editor.showShortcuts = false;
        editor.contextMenu = null;
        editor.touch();
        return;
      }
      if (!meta && !event.altKey && event.key.length === 1) {
        const tool = toolFromKey(event.key);
        if (tool) {
          editor.setTool(tool);
          event.preventDefault();
          return;
        }
      }
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "c") { event.preventDefault(); editor.copy(); return; }
      if (meta && event.key.toLowerCase() === "x") { event.preventDefault(); editor.cut(); return; }
      if (meta && event.key.toLowerCase() === "v") { event.preventDefault(); editor.paste(); return; }
      if (meta && event.key.toLowerCase() === "d") { event.preventDefault(); editor.duplicate(); return; }
      if (meta && event.key.toLowerCase() === "a") { event.preventDefault(); editor.selectAll(); return; }
      if (meta && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) editor.ungroup();
        else editor.group();
        return;
      }
      if (meta && event.key === "]") { event.preventDefault(); editor.arrange(event.shiftKey ? "front" : "forward"); return; }
      if (meta && event.key === "[") { event.preventDefault(); editor.arrange(event.shiftKey ? "back" : "backward"); return; }
      if (meta && event.key === "0") { event.preventDefault(); editor.zoom100(); return; }
      if (meta && event.key === "1") { event.preventDefault(); editor.zoomToFit(editor.selection); return; }
      if (meta && event.key === "/") { event.preventDefault(); editor.showShortcuts = !editor.showShortcuts; editor.touch(); return; }
      if (meta && (event.key === "=" || event.key === "+")) { event.preventDefault(); editor.zoomBy(1.1); return; }
      if (meta && event.key === "-") { event.preventDefault(); editor.zoomBy(1 / 1.1); return; }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        editor.deleteSelection();
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        tools.keyDown(event.key, event.shiftKey);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") editor.spaceDown = false;
    };
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            const src = String(reader.result ?? "");
            const world = editor.screenToWorld(editor.viewport.width / 2, editor.viewport.height / 2);
            void import("../engine/scene/factory").then(({ createImage }) => {
              void import("../engine/commands/actions").then(({ addNode }) => {
                const node = createImage(src, { x: world.x - 120, y: world.y - 90 });
                editor.change("Paste image", (m) => addNode(m, node, editor.page().rootId), "structure");
                editor.setSelection([node.id]);
              });
            });
          };
          reader.readAsDataURL(file);
          event.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("paste", onPaste);
    };
  }, [editor, tools]);
}

function toolFromKey(key: string): ToolId | null {
  const map: Record<string, ToolId> = {
    v: "select",
    f: "frame",
    r: "rectangle",
    o: "ellipse",
    l: "line",
    y: "polygon",
    s: "star",
    p: "pen",
    t: "text",
    h: "hand",
    c: "comment",
  };
  return map[key.toLowerCase()] ?? null;
}
