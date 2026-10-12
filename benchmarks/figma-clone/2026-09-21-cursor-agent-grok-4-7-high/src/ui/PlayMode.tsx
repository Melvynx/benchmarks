import { useEffect, useRef } from "react";
import { sceneSnapshot } from "../engine/export/export";
import { paintScene } from "../engine/render/paint";
import { isGeometric } from "../engine/types";
import { useEditorState } from "./context";

export function PlayMode() {
  const { editor } = useEditorState("chrome");
  const ref = useRef<HTMLCanvasElement>(null);
  const frameId = editor.playFrameId;
  useEffect(() => {
    const canvas = ref.current;
    const frame = frameId ? editor.node(frameId) : null;
    const box = frameId ? editor.aabb.get(frameId) : null;
    if (!canvas || !frame || !box || frame.type !== "frame") return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pad = 48;
    const zoom = Math.min((width - pad) / Math.max(box.width, 1), (height - pad) / Math.max(box.height, 1));
    const snap = sceneSnapshot(editor);
    snap.camera = {
      x: (width - box.width * zoom) / 2 - box.x * zoom,
      y: (height - box.height * zoom) / 2 - box.y * zoom,
      zoom,
    };
    snap.dpr = dpr;
    paintScene(ctx, snap, width, height, { grid: false });
  }, [editor, frameId]);
  if (!frameId) return null;
  return (
    <div className="play">
      <header>
        <strong>Prototype</strong>
        <button type="button" onClick={() => { editor.playFrameId = null; editor.touch(); }}>Close</button>
      </header>
      <canvas
        ref={ref}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const box = editor.aabb.get(frameId);
          if (!box) return;
          const width = rect.width;
          const height = rect.height;
          const pad = 48;
          const zoom = Math.min((width - pad) / Math.max(box.width, 1), (height - pad) / Math.max(box.height, 1));
          const cam = {
            x: (width - box.width * zoom) / 2 - box.x * zoom,
            y: (height - box.height * zoom) / 2 - box.y * zoom,
            zoom,
          };
          const world = { x: (event.clientX - rect.left - cam.x) / cam.zoom, y: (event.clientY - rect.top - cam.y) / cam.zoom };
          let current = editor.hitDeep(world);
          while (current) {
            const node = editor.node(current);
            if (node && isGeometric(node) && node.prototypeTargetId) {
              editor.playFrameId = node.prototypeTargetId;
              editor.touch();
              return;
            }
            current = node?.parentId ?? null;
          }
        }}
      />
    </div>
  );
}
