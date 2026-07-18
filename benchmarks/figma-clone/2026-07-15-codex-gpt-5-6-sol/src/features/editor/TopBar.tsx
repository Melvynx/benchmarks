import { useRef, useState } from "react";

import { exportJson, exportPng, exportSvg, readDocumentFile } from "../../core/export";
import { editorStore, useEditorStore } from "../../core/store";
import { IconButton } from "../../ui/Controls";
import { Icon } from "../../ui/Icon";

export function TopBar() {
  const document = useEditorStore((state) => state.document);
  const selection = useEditorStore((state) => state.selection);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const [menuOpen, setMenuOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const selectedForExport = selection.length ? selection : undefined;
  return (
    <header className="topbar">
      <div className="brand-block"><button className="brand-menu" aria-label="Main menu" onClick={() => setMenuOpen(!menuOpen)}><span className="brand-mark">G</span></button><h1>GPT-5.6 Sol</h1></div>
      <div className="history-controls"><IconButton disabled={!canUndo} icon="undo" label="Undo ⌘Z" onClick={editorStore.undo} /><IconButton disabled={!canRedo} icon="redo" label="Redo ⇧⌘Z" onClick={editorStore.redo} /></div>
      <div className="file-block"><button className="file-name">{document.name}</button><span className="save-status"><span /> Saved locally</span></div>
      <div className="top-actions">
        <div className="collaborators"><span>ML</span><span>AK</span><button aria-label="Invite collaborator"><Icon name="plus" size={13} /></button></div>
        <button className="ghost-action" onClick={() => editorStore.toast("Present mode opened")}><Icon name="play" size={15} /> Present</button>
        <button className="share-button" onClick={() => editorStore.toast("Share link copied to clipboard")}><Icon name="share" size={15} /> Share</button>
      </div>
      {menuOpen ? (
        <div className="main-menu" onMouseLeave={() => setMenuOpen(false)}>
          <div className="menu-title">File</div>
          <button onClick={() => { editorStore.newDocument(); setMenuOpen(false); }}><span>New design</span><kbd>⌘N</kbd></button>
          <button onClick={() => importRef.current?.click()}><span>Import JSON…</span><kbd>⇧⌘I</kbd></button>
          <button onClick={() => exportJson(document)}><span>Save local copy</span><kbd>⌘S</kbd></button>
          <div className="menu-separator" />
          <button onClick={() => exportSvg(document, selectedForExport)}><span>Export as SVG</span><kbd>⇧⌘E</kbd></button>
          <button onClick={() => void exportPng(document, selectedForExport).catch((error: unknown) => editorStore.toast(error instanceof Error ? error.message : "Export failed"))}><span>Export as PNG</span><kbd>⌘E</kbd></button>
          <div className="menu-separator" />
          <button onClick={() => editorStore.toast("Version history is saved every 20 edits")}><span>Show version history</span><kbd>⌥⌘S</kbd></button>
        </div>
      ) : null}
      <input ref={importRef} accept="application/json,.json" hidden type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readDocumentFile(file).then((value) => editorStore.importDocument(value)).catch((error: unknown) => editorStore.toast(error instanceof Error ? error.message : "Invalid document")); }} />
    </header>
  );
}
