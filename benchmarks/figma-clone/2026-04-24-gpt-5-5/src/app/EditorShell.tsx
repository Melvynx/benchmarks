import { useEffect } from "react";
import { activeDocument, serializeState, useEditorStore } from "../state/editorStore";
import { saveSerializedEditor } from "../persistence/storage";
import { CanvasViewport } from "../ui/CanvasViewport";
import { LayersPanel } from "../ui/LayersPanel";
import { PropertiesPanel } from "../ui/PropertiesPanel";
import { Toolbar } from "../ui/Toolbar";
import { DocumentTabs } from "../ui/DocumentTabs";
import { StatusBar } from "../ui/StatusBar";

export function EditorShell() {
  const state = useEditorStore();
  const document = activeDocument(state);

  useEffect(() => {
    saveSerializedEditor(serializeState(useEditorStore.getState()));
  }, [state.documents, state.activeDocumentId]);

  return (
    <div className="editor-shell">
      <Toolbar />
      <DocumentTabs />
      <main className="workspace">
        <LayersPanel document={document} />
        <CanvasViewport document={document} />
        <PropertiesPanel document={document} />
      </main>
      <StatusBar document={document} />
    </div>
  );
}
