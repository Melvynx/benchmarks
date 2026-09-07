import { downloadText, exportJson, exportSvg } from "../core/export";
import {
  duplicateFile,
  getState,
  importJson,
  newFile,
  openFile,
  patchUi,
  removeFile,
  renameFile,
  setCamera,
  viewDocument,
} from "../core/store";
import { useEditor } from "./use-editor";

export function TopBar() {
  const name = useEditor((s) => s.document.name);
  const zoom = useEditor((s) => s.camera.zoom);
  const docs = useEditor((s) => s.documents);
  const id = useEditor((s) => s.document.id);

  return (
    <header className="topbar">
      <div className="brand">Cursor Grok 4.6</div>
      <input
        className="file-name"
        value={name}
        aria-label="File name"
        onChange={(e) => renameFile(e.target.value)}
      />
      <select
        aria-label="Open file"
        value={id}
        onChange={(e) => openFile(e.target.value)}
      >
        {docs.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <button className="btn" onClick={() => newFile()}>New</button>
      <button className="btn" onClick={() => duplicateFile()}>Duplicate</button>
      <button className="btn danger" onClick={() => removeFile(id)}>Delete file</button>
      <button
        className="btn"
        onClick={() => {
          const doc = viewDocument();
          downloadText(`${doc.name}.json`, exportJson(doc), "application/json");
        }}
      >
        Export JSON
      </button>
      <button
        className="btn"
        onClick={() => {
          const doc = viewDocument();
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const svg = exportSvg(doc, getState().selection, (font, text) => {
            if (!ctx) return text.length * 8;
            ctx.font = font;
            return ctx.measureText(text).width;
          });
          downloadText(`${doc.name}.svg`, svg, "image/svg+xml");
        }}
      >
        Export SVG
      </button>
      <button
        className="btn"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/json";
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            void file.text().then((t) => {
              importJson(t);
            });
          };
          input.click();
        }}
      >
        Import
      </button>
      <div className="topbar-actions">
        <button className="btn" onClick={() => patchUi({ helpOpen: true })}>Shortcuts</button>
        <button className="btn" onClick={() => patchUi({ paletteOpen: true })}>Commands</button>
        <button className="btn primary" onClick={() => patchUi({ playMode: true })}>Play</button>
        <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
        <button className="btn" onClick={() => setCamera({ ...getState().camera, zoom: 1 })}>100%</button>
      </div>
    </header>
  );
}
