import { editorStore, useEditorStore } from "../../core/store";
import { Icon } from "../../ui/Icon";

export function StatusBar() {
  const viewport = useEditorStore((state) => state.viewport);
  const selection = useEditorStore((state) => state.selection);
  const zoom = Math.round(viewport.zoom * 100);
  return (
    <div className="status-bar">
      <button aria-label="Zoom out" onClick={() => editorStore.setViewport({ ...viewport, zoom: viewport.zoom / 1.2 })}>−</button>
      <button className="zoom-value" onClick={() => window.dispatchEvent(new Event("editor-fit-all"))}>{zoom}%</button>
      <button aria-label="Zoom in" onClick={() => editorStore.setViewport({ ...viewport, zoom: viewport.zoom * 1.2 })}>+</button>
      <span className="status-divider" />
      <span>{selection.length ? `${selection.length} selected` : "Ready"}</span>
      <button className="help-button" aria-label="Help" onClick={() => window.dispatchEvent(new Event("editor-shortcuts"))}><Icon name="help" size={16} /></button>
    </div>
  );
}
