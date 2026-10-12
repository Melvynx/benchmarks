import { createContext, useContext, useSyncExternalStore } from "react";
import type { Editor } from "../engine/editor";
import type { ToolController } from "../engine/tools/controller";

export const EditorContext = createContext<Editor | null>(null);
export const ToolsContext = createContext<ToolController | null>(null);

export function useTools(): ToolController {
  const tools = useContext(ToolsContext);
  if (!tools) throw new Error("Tools missing");
  return tools;
}

export function useEditor(): Editor {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error("Editor missing");
  return editor;
}

export function useEditorState(channel: "chrome" | "structure" = "chrome"): { editor: Editor; version: number } {
  const editor = useEditor();
  const version = useSyncExternalStore(
    channel === "structure" ? editor.subscribeStructure : editor.subscribeChrome,
    channel === "structure" ? editor.getStructureVersion : editor.getChromeVersion,
    channel === "structure" ? editor.getStructureVersion : editor.getChromeVersion,
  );
  return { editor, version };
}
