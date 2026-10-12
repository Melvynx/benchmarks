import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { sceneSnapshot } from "../engine/export/export";
import { paintOverlay } from "../engine/render/overlay";
import { paintScene, setEditingText } from "../engine/render/paint";
import type { PointerInput } from "../engine/tools/controller";
import { createImage } from "../engine/scene/factory";
import { addNode } from "../engine/commands/actions";
import { useEditor, useEditorState, useTools } from "./context";

export function CanvasView() {
  const editor = useEditor();
  useEditorState("chrome");
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tools = useTools();
  const cursorSent = useRef(0);

  useEffect(() => {
    const scene = sceneRef.current;
    const overlay = overlayRef.current;
    if (!scene || !overlay) return;
    const draw = () => {
      const width = scene.clientWidth;
      const height = scene.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const pixelW = Math.max(1, Math.floor(width * dpr));
      const pixelH = Math.max(1, Math.floor(height * dpr));
      if (scene.width !== pixelW || scene.height !== pixelH) {
        scene.width = pixelW;
        scene.height = pixelH;
        overlay.width = pixelW;
        overlay.height = pixelH;
      }
      editor.setViewport(width, height, dpr);
      const ctx = scene.getContext("2d");
      const octx = overlay.getContext("2d");
      if (!ctx || !octx) return;
      const paintStart = performance.now();
      setEditingText(editor.editingTextId);
      paintScene(ctx, sceneSnapshot(editor), width, height);
      paintOverlay(octx, editor, width, height);
      const paint = performance.now() - paintStart;
      if (paint > 0.05) {
        const instant = Math.min(144, 1000 / paint);
        editor.fps = Math.round(editor.fps * 0.8 + instant * 0.2);
      }
    };
    editor.fps = 60;
    draw();
    const unsub = editor.onRender(draw);
    const resize = new ResizeObserver(draw);
    resize.observe(scene);
    const wrap = wrapRef.current;
    const wheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (event.ctrlKey || event.metaKey) editor.zoomAt(x, y, editor.camera.zoom * Math.exp(-event.deltaY * 0.0016));
      else editor.panBy(-event.deltaX, -event.deltaY);
    };
    wrap?.addEventListener("wheel", wheel, { passive: false });
    return () => {
      unsub();
      resize.disconnect();
      wrap?.removeEventListener("wheel", wheel);
    };
  }, [editor]);

  const input = (event: ReactPointerEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>, clicks = 1): PointerInput => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      button: event.button,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey || event.ctrlKey,
      clicks,
    };
  };

  return (
    <div
      ref={wrapRef}
      className="canvas-wrap"
      style={{ cursor: editor.ephemeral.cursor }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        tools.pointerDown(input(event, event.detail));
      }}
      onPointerMove={(event) => {
        const point = input(event);
        tools.pointerMove(point);
        const now = performance.now();
        if (now - cursorSent.current > 40) {
          cursorSent.current = now;
          editor.publishCursor(editor.screenToWorld(point.x, point.y));
        }
      }}
      onPointerUp={(event) => tools.pointerUp(input(event, event.detail))}
      onDoubleClick={(event) => tools.pointerDown(input(event, 2))}
      onContextMenu={(event) => {
        event.preventDefault();
        editor.contextMenu = { x: event.clientX, y: event.clientY };
        editor.touch("chrome");
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          const src = String(reader.result ?? "");
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          const world = editor.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
          const node = createImage(src, { x: world.x, y: world.y });
          editor.change("Place image", (m) => addNode(m, node, editor.page().rootId), "structure");
          editor.setSelection([node.id]);
        };
        reader.readAsDataURL(file);
      }}
    >
      <canvas ref={sceneRef} className="scene" />
      <canvas ref={overlayRef} className="overlay" />
      <TextEditor />
      <ContextMenu />
    </div>
  );
}

function TextEditor() {
  const { editor } = useEditorState("chrome");
  const id = editor.editingTextId;
  const node = id ? editor.node(id) : null;
  const geom = id ? editor.geomOf(id) : null;
  const world = id ? editor.world.get(id) : null;
  if (!id || node?.type !== "text" || !geom || !world) return null;
  const z = editor.camera.zoom;
  return (
    <textarea
      className="text-editor"
      autoFocus
      value={node.text}
      style={{
        transformOrigin: "0 0",
        transform: `matrix(${world.a * z}, ${world.b * z}, ${world.c * z}, ${world.d * z}, ${world.e * z + editor.camera.x}, ${world.f * z + editor.camera.y})`,
        width: Math.max(geom.width, 8),
        height: Math.max(geom.height, node.lineHeight),
        fontFamily: node.fontFamily,
        fontWeight: node.fontWeight,
        fontSize: node.fontSize,
        lineHeight: `${node.lineHeight}px`,
        letterSpacing: node.letterSpacing,
        textAlign: node.textAlign,
        color: "#16161a",
      }}
      onFocus={() => editor.beginGesture()}
      onChange={(event) => {
        const value = event.target.value;
        editor.gesture((m) => {
          m.update(id, (current) => {
            if (current.type === "text") current.text = value;
          });
        });
      }}
      onBlur={() => {
        editor.commitGesture("Edit text");
        editor.editingTextId = null;
        editor.requestRender();
      }}
    />
  );
}

function ContextMenu() {
  const { editor } = useEditorState("chrome");
  const menu = editor.contextMenu;
  if (!menu) return null;
  const item = (label: string, run: () => void) => (
    <button
      type="button"
      onClick={() => {
        run();
        editor.contextMenu = null;
        editor.touch("chrome");
      }}
    >
      {label}
    </button>
  );
  return (
    <div className="menu" style={{ left: menu.x, top: menu.y }}>
      {item("Copy", () => editor.copy())}
      {item("Paste", () => editor.paste())}
      {item("Duplicate", () => editor.duplicate())}
      {item("Delete", () => editor.deleteSelection())}
      {item("Group", () => editor.group())}
      {item("Ungroup", () => editor.ungroup())}
      {item("Bring forward", () => editor.arrange("forward"))}
      {item("Send backward", () => editor.arrange("backward"))}
      {item("Create component", () => editor.createComponent())}
      {item("Create instance", () => editor.createInstance())}
    </div>
  );
}
