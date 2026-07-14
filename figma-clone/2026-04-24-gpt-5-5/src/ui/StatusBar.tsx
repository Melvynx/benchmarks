import { activeDocument, useEditorStore } from "../state/editorStore";
import type { EditorDocument } from "../types/nodes";

type Props = Readonly<{ document: EditorDocument }>;

export function StatusBar({ document }: Props) {
  const viewport = useEditorStore((state) => state.viewport);
  const historyPast = useEditorStore((state) => state.historyPast);
  const stateDocument = useEditorStore(activeDocument);
  return (
    <footer className="statusbar">
      <span>{document.selection.length} selected</span>
      <span>{Object.keys(stateDocument.nodes).length - 1} layers</span>
      <span>{Math.round(viewport.zoom * 100)}%</span>
      <span>{historyPast.at(-1)?.label ?? "Saved locally"}</span>
    </footer>
  );
}
