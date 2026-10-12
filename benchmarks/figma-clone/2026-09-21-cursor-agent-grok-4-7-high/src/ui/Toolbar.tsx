import { useState } from "react";
import type { ToolId } from "../engine/types";
import { exportPNG, exportSVG } from "../engine/export/export";
import { useEditorState } from "./context";

const TOOLS: { id: ToolId; label: string; key: string }[] = [
  { id: "select", label: "Move", key: "V" },
  { id: "frame", label: "Frame", key: "F" },
  { id: "rectangle", label: "Rectangle", key: "R" },
  { id: "ellipse", label: "Ellipse", key: "O" },
  { id: "line", label: "Line", key: "L" },
  { id: "polygon", label: "Polygon", key: "Y" },
  { id: "star", label: "Star", key: "S" },
  { id: "pen", label: "Pen", key: "P" },
  { id: "text", label: "Text", key: "T" },
  { id: "hand", label: "Hand", key: "H" },
  { id: "comment", label: "Comment", key: "C" },
];

export function Toolbar() {
  const { editor } = useEditorState("chrome");
  const [menu, setMenu] = useState<string | null>(null);
  const zoom = Math.round(editor.camera.zoom * 100);
  return (
    <header className="toolbar">
      <h1>Grok 4.7</h1>
      <input
        className="doc-name"
        aria-label="Document name"
        value={editor.doc.name}
        onChange={(event) => editor.renameDocument(event.target.value)}
      />
      <div className="tools">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={editor.tool === tool.id ? "tool on" : "tool"}
            title={`${tool.label} (${tool.key})`}
            onClick={() => editor.setTool(tool.id)}
          >
            <ToolIcon id={tool.id} />
          </button>
        ))}
      </div>
      <div className="toolbar-actions">
        <button type="button" className="quiet" onClick={() => editor.undo()} disabled={!editor.canUndo} title="Undo">
          Undo
        </button>
        <button type="button" className="quiet" onClick={() => editor.redo()} disabled={!editor.canRedo} title="Redo">
          Redo
        </button>
        <button type="button" className="quiet" onClick={() => setMenu(menu === "file" ? null : "file")}>
          File
        </button>
        <button type="button" className="quiet" onClick={() => setMenu(menu === "object" ? null : "object")}>
          Object
        </button>
        <button type="button" className="zoom" onClick={() => editor.zoom100()} title="Zoom 100%">
          {zoom}%
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            editor.playFrameId =
              editor.selection.find((id) => editor.node(id)?.type === "frame") ??
              editor.order.find((id) => editor.node(id)?.type === "frame") ??
              null;
            if (!editor.playFrameId) editor.notify("Add a frame to play a prototype.");
            editor.touch();
          }}
        >
          Play
        </button>
      </div>
      {menu === "file" && (
        <div className="menu pop">
          <button type="button" onClick={() => { editor.newDocument(); setMenu(null); }}>New document</button>
          {editor.documentIndex().map((doc) => (
            <button key={doc.id} type="button" onClick={() => { editor.openDocument(doc.id); setMenu(null); }}>{doc.name}</button>
          ))}
          <button type="button" onClick={() => downloadText(`${editor.doc.name}.json`, editor.exportJSON())}>Export JSON</button>
          <label className="file-btn">
            Import JSON
            <input type="file" accept="application/json" onChange={(event) => readJson(event, editor)} />
          </label>
          <button type="button" onClick={() => void exportPNG(editor)}>Export PNG</button>
          <button type="button" onClick={() => exportSVG(editor)}>Export SVG</button>
          <button type="button" onClick={() => { editor.saveVersion(); setMenu(null); }}>Save version</button>
          <button type="button" onClick={() => { editor.showVersions = true; editor.touch(); setMenu(null); }}>Version history</button>
        </div>
      )}
      {menu === "object" && (
        <div className="menu pop object-menu">
          <button type="button" onClick={() => editor.group()}>Group</button>
          <button type="button" onClick={() => editor.ungroup()}>Ungroup</button>
          <button type="button" onClick={() => editor.boolean("union")}>Union</button>
          <button type="button" onClick={() => editor.boolean("subtract")}>Subtract</button>
          <button type="button" onClick={() => editor.boolean("intersect")}>Intersect</button>
          <button type="button" onClick={() => editor.boolean("exclude")}>Exclude</button>
          <button type="button" onClick={() => editor.createComponent()}>Create component</button>
          <button type="button" onClick={() => editor.createInstance()}>Create instance</button>
          <button type="button" onClick={() => editor.detachInstance()}>Detach instance</button>
          <button type="button" onClick={() => editor.insertStress()}>Insert 1,200 rectangles</button>
          <button type="button" onClick={() => { editor.showShortcuts = true; editor.touch(); setMenu(null); }}>Keyboard shortcuts</button>
        </div>
      )}
    </header>
  );
}

function readJson(event: React.ChangeEvent<HTMLInputElement>, editor: { importJSON: (raw: string) => void; notify: (m: string) => void }): void {
  const file = event.target.files?.[0];
  if (!file) return;
  file.text().then((raw) => {
    try {
      editor.importJSON(raw);
    } catch {
      editor.notify("That file is not a document.");
    }
  }).catch(() => editor.notify("Could not read that file."));
}

function downloadText(name: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function ToolIcon({ id }: { id: ToolId }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4 };
  if (id === "select") return <svg {...common}><path d="M3 2.5 12.5 8 8 9.2 6.2 13.5Z" /></svg>;
  if (id === "frame") return <svg {...common}><path d="M3 5.5V3h2.5M13 5.5V3h-2.5M3 10.5V13h2.5M13 10.5V13h-2.5" /></svg>;
  if (id === "rectangle") return <svg {...common}><rect x="2.5" y="3.5" width="11" height="9" rx="1" /></svg>;
  if (id === "ellipse") return <svg {...common}><ellipse cx="8" cy="8" rx="5.5" ry="4.2" /></svg>;
  if (id === "line") return <svg {...common}><path d="M3 13 13 3" /></svg>;
  if (id === "polygon") return <svg {...common}><path d="M8 2.5 13.2 6.4 11.2 13H4.8L2.8 6.4Z" /></svg>;
  if (id === "star") return <svg {...common}><path d="M8 2.2 9.6 6h4l-3.2 2.4 1.2 3.9L8 10.2 4.4 12.3 5.6 8.4 2.4 6h4Z" /></svg>;
  if (id === "pen") return <svg {...common}><path d="M3 13.2 4.2 9.6 11 2.8l2.2 2.2-6.8 6.8Z" /></svg>;
  if (id === "text") return <svg {...common}><path d="M3.5 3.5h9M8 3.5v9M5.8 12.5h4.4" /></svg>;
  if (id === "hand") return <svg {...common}><path d="M6 8.5V4.2a1 1 0 0 1 2 0V8M8 7.2V3.6a1 1 0 0 1 2 0V8M10 7.6V5a1 1 0 0 1 2 0v4.2c0 2.4-1.4 4.3-4 4.3-2.2 0-3.5-1.2-4.2-2.6L3 8.8a1 1 0 0 1 1.6-1.1L6 8.5" /></svg>;
  return <svg {...common}><path d="M5 3.5h5l1 2.2V12a1 1 0 0 1-1 1H5.2a1 1 0 0 1-1-1.2L5 3.5Z" /></svg>;
}
