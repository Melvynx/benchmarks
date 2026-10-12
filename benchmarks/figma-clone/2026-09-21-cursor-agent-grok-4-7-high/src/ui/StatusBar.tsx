import { useEffect, useState } from "react";
import { useEditor } from "./context";

export function StatusBar() {
  const editor = useEditor();
  const [fps, setFps] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setFps(editor.fps);
      setZoom(Math.round(editor.camera.zoom * 100));
      setCount(editor.objectCount);
    }, 300);
    return () => window.clearInterval(timer);
  }, [editor]);
  return (
    <footer className="status">
      <span>{editor.selection.length ? `${editor.selection.length} selected` : "Nothing selected"}</span>
      <span>{count} objects</span>
      <span>{zoom}%</span>
      <span>{fps} fps</span>
    </footer>
  );
}
