import { Plus } from "lucide-react";
import { useEditorStore } from "../state/editorStore";

export function DocumentTabs() {
  const documents = useEditorStore((state) => state.documents);
  const activeDocumentId = useEditorStore((state) => state.activeDocumentId);
  const setActiveDocument = useEditorStore((state) => state.setActiveDocument);
  const newDocument = useEditorStore((state) => state.newDocument);
  return (
    <nav className="document-tabs" aria-label="Documents">
      {documents.map((document) => (
        <button key={document.id} className={document.id === activeDocumentId ? "tab active" : "tab"} onClick={() => setActiveDocument(document.id)}>
          {document.name}
        </button>
      ))}
      <button className="icon-button compact" title="New document" onClick={newDocument}>
        <Plus size={15} />
      </button>
    </nav>
  );
}
