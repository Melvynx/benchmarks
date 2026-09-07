import { useEditor } from "./use-editor";

export function StatusBar() {
  const status = useEditor((s) => s.status);
  const zoom = useEditor((s) => s.camera.zoom);
  const sel = useEditor((s) => s.selection.length);
  const tool = useEditor((s) => s.tool);
  return (
    <footer className="statusbar">
      <strong>{tool}</strong>
      <span>{status}</span>
      <span>{sel} selected</span>
      <span style={{ marginLeft: "auto" }}>{Math.round(zoom * 100)}%</span>
    </footer>
  );
}
