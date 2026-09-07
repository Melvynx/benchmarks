import { useEffect, useRef, useState } from "react";
import { pickTopNode } from "../core/scene";
import {
  addImage,
  getState,
  setCameraLive,
  setEditingText,
  setHovered,
  setSelection,
  setTool,
  subscribe,
  updateSelected,
  viewDocument,
} from "../core/store";
import type { NodeId, Vec2 } from "../core/types";
import { screenToWorld, zoomAt } from "../input/camera";
import { drawOverlay, hitHandle } from "../render/overlay-renderer";
import { drawScene, preloadImage } from "../render/scene-renderer";
import { beginPointer, endPointer, movePointer, type Gesture } from "./canvas-gestures";
import { useEditor } from "./use-editor";
import { resizeCursor } from "../core/geometry";

export function CanvasView() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<Gesture>({ kind: "none" });
  const space = useRef(false);
  const [textEdit, setTextEdit] = useState<{ id: NodeId; value: string } | null>(null);
  const editingTextId = useEditor((s) => s.editingTextId);
  const tool = useEditor((s) => s.tool);

  useEffect(() => {
    const scene = sceneRef.current;
    const overlay = overlayRef.current;
    const wrap = wrapRef.current;
    if (!scene || !overlay || !wrap) return;
    let raf = 0;
    let running = true;
    const loop = () => {
      if (!running) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      for (const c of [scene, overlay]) {
        if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
          c.width = Math.floor(w * dpr);
          c.height = Math.floor(h * dpr);
          c.style.width = `${w}px`;
          c.style.height = `${h}px`;
        }
      }
      const sctx = scene.getContext("2d");
      const octx = overlay.getContext("2d");
      if (sctx && octx) {
        sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const st = getState();
        const doc = viewDocument();
        const view = { width: w, height: h, rulers: st.ui.rulers, grid: st.ui.grid, pixelPreview: false };
        drawScene(sctx, doc, st.camera, view);
        drawOverlay(octx, doc, st.camera, view, {
          selection: st.selection,
          hoveredId: st.hoveredId,
          marquee: st.marquee,
          lasso: st.lasso,
          guides: st.guides,
          penDraft: st.penDraft,
          prototypeFrom: st.prototypeFrom,
          editingTextId: st.editingTextId,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const unsub = subscribe(() => undefined);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      unsub();
    };
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const st = getState();
      if (e.ctrlKey || e.metaKey) {
        setCameraLive(zoomAt(st.camera, screen.x, screen.y, st.camera.zoom * (e.deltaY > 0 ? 0.92 : 1.08), rect.width, rect.height, st.ui.rulers));
      } else {
        setCameraLive({
          ...st.camera,
          x: st.camera.x + e.deltaX / st.camera.zoom,
          y: st.camera.y + e.deltaY / st.camera.zoom,
        });
      }
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") space.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") space.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      wrap.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const local = (e: { clientX: number; clientY: number }) => {
    const wrap = wrapRef.current!;
    const rect = wrap.getBoundingClientRect();
    const screen: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const st = getState();
    const world = screenToWorld(screen.x, screen.y, st.camera, rect.width, rect.height, st.ui.rulers);
    return { screen, world, w: rect.width, h: rect.height, rulers: st.ui.rulers };
  };

  return (
    <div
      ref={wrapRef}
      className="canvas-wrap"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const p = local(e);
        beginPointer(
          gesture,
          p.world,
          p.screen,
          { width: p.w, height: p.h, rulers: p.rulers },
          { shift: e.shiftKey, alt: e.altKey, space: space.current, button: e.button },
          (id, value) => setTextEdit({ id, value }),
        );
      }}
      onPointerMove={(e) => {
        const p = local(e);
        if (gesture.current.kind === "none") {
          const st = getState();
          const doc = viewDocument();
          const hit = pickTopNode(doc, p.world, st.camera.zoom);
          setHovered(hit);
          let cursor = toolCursor(tool, space.current);
          if (st.tool === "select" && st.selection.length === 1) {
            const hid = hitHandle(doc, st.selection[0]!, p.screen, st.camera, {
              width: p.w,
              height: p.h,
              rulers: p.rulers,
            });
            if (hid === "rotate") cursor = "grab";
            else if (hid) {
              const n = doc.nodes[st.selection[0]!];
              if (n) cursor = resizeCursor(hid, n.rotation);
            }
          }
          e.currentTarget.style.cursor = cursor;
          return;
        }
        movePointer(gesture, p.world, p.screen, { shift: e.shiftKey, alt: e.altKey });
      }}
      onPointerUp={(e) => endPointer(gesture, e.shiftKey)}
      onDoubleClick={(e) => {
        const p = local(e);
        const st = getState();
        const hit = pickTopNode(viewDocument(), p.world, st.camera.zoom);
        const node = hit ? viewDocument().nodes[hit] : undefined;
        if (node?.type === "text") {
          setSelection([hit!]);
          setEditingText(hit!);
          setTextEdit({ id: hit!, value: node.characters });
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const p = local(e);
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          const src = String(reader.result);
          const img = new Image();
          img.onload = () => addImage(src, p.world.x, p.world.y, img.width, img.height);
          img.src = src;
          preloadImage(src);
        };
        reader.readAsDataURL(file);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={sceneRef} className="canvas-scene" />
      <canvas ref={overlayRef} className="canvas-overlay" />
      {textEdit && editingTextId && (
        <textarea
          className="text-editor"
          autoFocus
          value={textEdit.value}
          onChange={(ev) => setTextEdit({ ...textEdit, value: ev.target.value })}
          onBlur={() => {
            updateSelected((n) => {
              if (n.type === "text") n.characters = textEdit.value;
            }, "Edit text");
            setEditingText(null);
            setTextEdit(null);
            setTool("select");
          }}
          onKeyDown={(ev) => {
            if (ev.key === "Escape") ev.currentTarget.blur();
          }}
        />
      )}
    </div>
  );
}

function toolCursor(tool: string, spaceDown: boolean): string {
  if (spaceDown || tool === "hand") return "grab";
  if (tool === "text") return "text";
  if (tool === "zoom") return "zoom-in";
  if (tool === "select") return "default";
  return "crosshair";
}
