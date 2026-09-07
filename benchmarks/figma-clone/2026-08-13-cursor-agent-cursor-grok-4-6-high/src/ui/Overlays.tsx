import { useEffect, useMemo, useState } from "react";
import { SHORTCUTS } from "../input/shortcuts";
import {
  addPage,
  booleanSelection,
  groupSelection,
  newFile,
  patchUi,
  seedStress,
  setTool,
} from "../core/store";
import { useEditor } from "./use-editor";

export function CommandPalette() {
  const open = useEditor((s) => s.ui.paletteOpen);
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const all = [
      { label: "Move tool", run: () => setTool("select") },
      { label: "Frame tool", run: () => setTool("frame") },
      { label: "Rectangle", run: () => setTool("rectangle") },
      { label: "Ellipse", run: () => setTool("ellipse") },
      { label: "Text", run: () => setTool("text") },
      { label: "Pen", run: () => setTool("pen") },
      { label: "Group selection", run: () => groupSelection() },
      { label: "New page", run: () => addPage() },
      { label: "New file", run: () => newFile() },
      { label: "Boolean union", run: () => booleanSelection("union") },
      { label: "Insert 1000 rectangles", run: () => seedStress(1000) },
      { label: "Play prototype", run: () => patchUi({ playMode: true }) },
    ];
    const qq = q.toLowerCase();
    return all.filter((i) => i.label.toLowerCase().includes(qq));
  }, [q]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={() => patchUi({ paletteOpen: false })}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Run a command" value={q} onChange={(e) => setQ(e.target.value)} />
        {items.map((i) => (
          <button
            key={i.label}
            className="palette-item"
            onClick={() => {
              i.run();
              patchUi({ paletteOpen: false });
            }}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ShortcutHelp() {
  const open = useEditor((s) => s.ui.helpOpen);
  useEffect(() => undefined, []);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={() => patchUi({ helpOpen: false })}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Shortcuts</h2>
        {SHORTCUTS.map((s) => (
          <div className="shortcut-row" key={s.label}>
            <span>{s.label}</span>
            <kbd>{s.keys}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
