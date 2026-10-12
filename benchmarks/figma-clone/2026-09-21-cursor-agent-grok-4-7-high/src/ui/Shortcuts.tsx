import { useEditorState } from "./context";

const ROWS = [
  ["V", "Select"],
  ["F", "Frame"],
  ["R", "Rectangle"],
  ["O", "Ellipse"],
  ["L", "Line"],
  ["Y", "Polygon"],
  ["S", "Star"],
  ["P", "Pen"],
  ["T", "Text"],
  ["H", "Hand"],
  ["C", "Comment"],
  ["Space", "Pan"],
  ["⌘Z", "Undo"],
  ["⌘⇧Z", "Redo"],
  ["⌘C / V / X", "Copy, paste, cut"],
  ["⌘D", "Duplicate"],
  ["⌘A", "Select all"],
  ["⌘G", "Group"],
  ["⌘⇧G", "Ungroup"],
  ["⌘] / ⌘[", "Forward / backward"],
  ["⌘⇧] / ⌘⇧[", "Front / back"],
  ["Delete", "Delete"],
  ["Arrows", "Nudge 1px, shift 10px"],
  ["⌘0", "Zoom 100%"],
  ["⌘1", "Zoom to selection"],
  ["⌘/", "Shortcuts"],
  ["Esc", "Clear selection"],
];

export function Shortcuts() {
  const { editor } = useEditorState("chrome");
  if (!editor.showShortcuts && !editor.showVersions) return null;
  return (
    <div className="modal-back" onClick={() => { editor.showShortcuts = false; editor.showVersions = false; editor.touch(); }}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        {editor.showVersions ? (
          <>
            <h2>Versions</h2>
            {editor.versions.length === 0 && <p>No session versions yet. Save one from the File menu.</p>}
            {editor.versions.slice().reverse().map((version) => (
              <button key={version.id} type="button" className="style-row" onClick={() => { editor.restoreVersion(version.id); editor.showVersions = false; editor.touch(); }}>
                {version.label}
                <small>{new Date(version.at).toLocaleTimeString()}</small>
              </button>
            ))}
          </>
        ) : (
          <>
            <h2>Shortcuts</h2>
            <div className="shortcut-grid">
              {ROWS.map(([key, label]) => (
                <div key={key}>
                  <kbd>{key}</kbd>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
