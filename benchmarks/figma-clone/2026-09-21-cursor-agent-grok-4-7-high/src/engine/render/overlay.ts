import { niceStep } from "./paint";
import type { Editor } from "../editor";
import { apply, localMatrix } from "../geometry/matrix";
import { handles, type HandleId } from "../geometry/resize";

const RULER = 22;

export function paintOverlay(
  ctx: CanvasRenderingContext2D,
  editor: Editor,
  width: number,
  height: number,
): void {
  const dpr = editor.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawGuides(ctx, editor, width, height);
  drawSnap(ctx, editor);
  drawDraft(ctx, editor);
  drawHover(ctx, editor);
  drawSelection(ctx, editor);
  drawMarquee(ctx, editor);
  drawPen(ctx, editor);
  drawComments(ctx, editor);
  drawPeers(ctx, editor);
  drawLabel(ctx, editor);
  drawRulers(ctx, editor, width, height);
  if (editor.objectCount === 0 && !editor.ephemeral.draft) drawEmpty(ctx, width, height);
}

function drawGuides(ctx: CanvasRenderingContext2D, editor: Editor, width: number, height: number): void {
  ctx.save();
  ctx.strokeStyle = "rgba(76, 125, 255, 0.85)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  for (const guide of editor.page().guides) {
    ctx.beginPath();
    if (guide.axis === "x") {
      const x = guide.offset * editor.camera.zoom + editor.camera.x;
      ctx.moveTo(x, RULER);
      ctx.lineTo(x, height);
    } else {
      const y = guide.offset * editor.camera.zoom + editor.camera.y;
      ctx.moveTo(RULER, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawSnap(ctx: CanvasRenderingContext2D, editor: Editor): void {
  ctx.save();
  ctx.strokeStyle = "#ff3d9a";
  ctx.fillStyle = "#ff3d9a";
  ctx.lineWidth = 1;
  for (const line of editor.ephemeral.snapLines) {
    ctx.beginPath();
    if (line.axis === "x") {
      const x = line.at * editor.camera.zoom + editor.camera.x;
      const y1 = line.start * editor.camera.zoom + editor.camera.y;
      const y2 = line.end * editor.camera.zoom + editor.camera.y;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    } else {
      const y = line.at * editor.camera.zoom + editor.camera.y;
      const x1 = line.start * editor.camera.zoom + editor.camera.x;
      const x2 = line.end * editor.camera.zoom + editor.camera.x;
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
    }
    ctx.stroke();
    if (line.label) {
      const sx = line.axis === "x" ? line.at * editor.camera.zoom + editor.camera.x : ((line.start + line.end) / 2) * editor.camera.zoom + editor.camera.x;
      const sy = line.axis === "y" ? line.at * editor.camera.zoom + editor.camera.y : ((line.start + line.end) / 2) * editor.camera.zoom + editor.camera.y;
      badge(ctx, line.label, sx + 8, sy - 8);
    }
  }
  ctx.restore();
}

function drawDraft(ctx: CanvasRenderingContext2D, editor: Editor): void {
  const draft = editor.ephemeral.draft;
  if (!draft || !editor.ephemeral.draftParent) return;
  const parent = editor.ephemeral.draftParent;
  const parentWorld = parent === editor.page().rootId ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : editor.world.get(parent);
  if (!parentWorld) return;
  const matrix = localMatrix(draft);
  const world = {
    a: parentWorld.a * matrix.a + parentWorld.c * matrix.b,
    b: parentWorld.b * matrix.a + parentWorld.d * matrix.b,
    c: parentWorld.a * matrix.c + parentWorld.c * matrix.d,
    d: parentWorld.b * matrix.c + parentWorld.d * matrix.d,
    e: parentWorld.a * matrix.e + parentWorld.c * matrix.f + parentWorld.e,
    f: parentWorld.b * matrix.e + parentWorld.d * matrix.f + parentWorld.f,
  };
  ctx.save();
  ctx.strokeStyle = "#4c7dff";
  ctx.fillStyle = "rgba(76, 125, 255, 0.12)";
  ctx.lineWidth = 1.25;
  const corners = [apply(world, 0, 0), apply(world, draft.width, 0), apply(world, draft.width, draft.height), apply(world, 0, draft.height)].map((p) => editor.worldToScreen(p.x, p.y));
  ctx.beginPath();
  corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHover(ctx: CanvasRenderingContext2D, editor: Editor): void {
  const id = editor.ephemeral.hoverId;
  if (!id || editor.selection.includes(id)) return;
  strokeWorld(ctx, editor, id, "rgba(76, 125, 255, 0.7)", 1);
}

function drawSelection(ctx: CanvasRenderingContext2D, editor: Editor): void {
  if (!editor.selection.length) return;
  if (editor.selection.length === 1) {
    const id = editor.selection[0];
    if (!id) return;
    const node = editor.node(id);
    strokeWorld(ctx, editor, id, "#4c7dff", 1.5);
    if (node && (node.type === "frame" || node.type === "instance" || node.type === "group")) {
      const geom = editor.geomOf(id);
      const world = editor.world.get(id);
      if (geom && world) {
        const anchor = editor.worldToScreen(...pair(apply(world, 0, 0)));
        label(ctx, node.name, anchor.x, anchor.y - 18, node.type === "frame" && node.isComponent ? "#7c5cff" : "#4c7dff");
      }
    }
    drawHandles(ctx, editor, id);
    return;
  }
  const box = selectionAabb(editor);
  if (!box) return;
  const x = box.x * editor.camera.zoom + editor.camera.x;
  const y = box.y * editor.camera.zoom + editor.camera.y;
  const w = box.width * editor.camera.zoom;
  const h = box.height * editor.camera.zoom;
  ctx.save();
  ctx.strokeStyle = "#4c7dff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  for (const handle of handles()) {
    const point = handlePointBox(box, handle);
    const screen = editor.worldToScreen(point.x, point.y);
    handleDot(ctx, screen.x, screen.y);
  }
  ctx.restore();
}

function drawHandles(ctx: CanvasRenderingContext2D, editor: Editor, id: string): void {
  const geom = editor.geomOf(id);
  const world = editor.world.get(id);
  if (!geom || !world) return;
  ctx.save();
  for (const handle of handles()) {
    const local = handleLocal(handle, geom.width, geom.height);
    const screen = editor.worldToScreen(...pair(apply(world, local.x, local.y)));
    handleDot(ctx, screen.x, screen.y);
  }
  const top = apply(world, geom.width / 2, 0);
  const knob = apply(world, geom.width / 2, -28 / editor.camera.zoom);
  const a = editor.worldToScreen(top.x, top.y);
  const b = editor.worldToScreen(knob.x, knob.y);
  ctx.strokeStyle = "#4c7dff";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMarquee(ctx: CanvasRenderingContext2D, editor: Editor): void {
  const box = editor.ephemeral.marquee;
  if (!box) return;
  const x = box.x * editor.camera.zoom + editor.camera.x;
  const y = box.y * editor.camera.zoom + editor.camera.y;
  const w = box.width * editor.camera.zoom;
  const h = box.height * editor.camera.zoom;
  ctx.save();
  ctx.fillStyle = "rgba(76, 125, 255, 0.12)";
  ctx.strokeStyle = "#4c7dff";
  ctx.setLineDash(editor.ephemeral.marqueeMode === "intersect" ? [4, 3] : []);
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawPen(ctx: CanvasRenderingContext2D, editor: Editor): void {
  const pen = editor.ephemeral.pen;
  if (!pen || pen.points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = "#4c7dff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  pen.points.forEach((point, index) => {
    const s = editor.worldToScreen(point.x, point.y);
    if (index === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  if (pen.cursor) {
    const s = editor.worldToScreen(pen.cursor.x, pen.cursor.y);
    ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();
  for (const point of pen.points) {
    const s = editor.worldToScreen(point.x, point.y);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawComments(ctx: CanvasRenderingContext2D, editor: Editor): void {
  for (const comment of editor.page().comments) {
    if (comment.resolved) continue;
    const s = editor.worldToScreen(comment.x, comment.y);
    ctx.save();
    ctx.fillStyle = "#ffb020";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1c22";
    ctx.font = "600 10px IBM Plex Sans, sans-serif";
    ctx.fillText("●", s.x - 3, s.y + 3);
    ctx.restore();
  }
}

function drawPeers(ctx: CanvasRenderingContext2D, editor: Editor): void {
  ctx.save();
  ctx.font = "500 11px IBM Plex Sans, sans-serif";
  for (const peer of editor.ephemeral.peers) {
    const s = editor.worldToScreen(peer.x, peer.y);
    ctx.fillStyle = "#ff3d9a";
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + 8, s.y + 14);
    ctx.lineTo(s.x + 3, s.y + 11);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, editor: Editor): void {
  const text = editor.ephemeral.sizeLabel;
  if (!text) return;
  badge(ctx, text, 28, 32);
}

function drawRulers(ctx: CanvasRenderingContext2D, editor: Editor, width: number, height: number): void {
  const step = niceStep(editor.camera.zoom);
  ctx.save();
  ctx.fillStyle = "#1c1c22";
  ctx.fillRect(0, 0, width, RULER);
  ctx.fillRect(0, 0, RULER, height);
  ctx.fillStyle = "#2a2a33";
  ctx.fillRect(0, 0, RULER, RULER);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "10px IBM Plex Sans, sans-serif";
  ctx.beginPath();
  const left = -editor.camera.x / editor.camera.zoom;
  const right = (width - editor.camera.x) / editor.camera.zoom;
  for (let x = Math.floor(left / step) * step; x <= right; x += step) {
    const sx = x * editor.camera.zoom + editor.camera.x;
    ctx.moveTo(sx, RULER);
    ctx.lineTo(sx, 12);
    if (sx > RULER) ctx.fillText(String(Math.round(x)), sx + 3, 11);
  }
  const top = -editor.camera.y / editor.camera.zoom;
  const bottom = (height - editor.camera.y) / editor.camera.zoom;
  for (let y = Math.floor(top / step) * step; y <= bottom; y += step) {
    const sy = y * editor.camera.zoom + editor.camera.y;
    ctx.moveTo(RULER, sy);
    ctx.lineTo(12, sy);
    if (sy > RULER) ctx.fillText(String(Math.round(y)), 2, sy - 3);
  }
  ctx.stroke();
  ctx.restore();
}

function drawEmpty(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.fillStyle = "rgba(28, 28, 34, 0.72)";
  ctx.font = "500 13px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Frame  F    Rectangle  R    Ellipse  O    Text  T    Pen  P", width / 2, height / 2);
  ctx.restore();
}

function strokeWorld(ctx: CanvasRenderingContext2D, editor: Editor, id: string, color: string, width: number): void {
  const points = editor.outlinePoints(id).map((point) => editor.worldToScreen(point.x, point.y));
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function selectionAabb(editor: Editor): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of editor.selection) {
    const box = editor.aabb.get(id);
    if (!box) continue;
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function handleLocal(handle: HandleId, w: number, h: number): { x: number; y: number } {
  const map: Record<HandleId, { x: number; y: number }> = {
    nw: { x: 0, y: 0 },
    n: { x: w / 2, y: 0 },
    ne: { x: w, y: 0 },
    e: { x: w, y: h / 2 },
    se: { x: w, y: h },
    s: { x: w / 2, y: h },
    sw: { x: 0, y: h },
    w: { x: 0, y: h / 2 },
  };
  return map[handle];
}

function handlePointBox(box: { x: number; y: number; width: number; height: number }, handle: HandleId): { x: number; y: number } {
  const local = handleLocal(handle, box.width, box.height);
  return { x: box.x + local.x, y: box.y + local.y };
}

function handleDot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#4c7dff";
  ctx.lineWidth = 1.25;
  ctx.fillRect(x - 4, y - 4, 8, 8);
  ctx.strokeRect(x - 4, y - 4, 8, 8);
  ctx.restore();
}

function badge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.save();
  ctx.font = "600 11px IBM Plex Sans, sans-serif";
  const width = ctx.measureText(text).width + 10;
  ctx.fillStyle = "#ff3d9a";
  ctx.fillRect(x, y, width, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + 5, y + 13);
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.save();
  ctx.font = "500 11px IBM Plex Sans, sans-serif";
  const width = ctx.measureText(text).width + 10;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, 16);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + 5, y + 12);
  ctx.restore();
}

function pair(point: { x: number; y: number }): [number, number] {
  return [point.x, point.y];
}
