import { colorToCss, GUIDE_PINK, SELECTION } from "../core/color";
import { apply, localCorners } from "../core/geometry";
import { worldAABB, worldMatrixOf } from "../core/scene";
import type { AABB, Camera, Document, Guide, Handle, NodeId, PathPoint, SceneNode, Vec2 } from "../core/types";
import { HANDLE_SIZE, ROTATE_HANDLE_OFFSET, RULER_SIZE } from "../core/types";
import { worldToScreen } from "../input/camera";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  doc: Document,
  camera: Camera,
  view: { width: number; height: number; rulers: boolean },
  opts: {
    selection: NodeId[];
    hoveredId: NodeId | null;
    marquee: AABB | null;
    lasso: Vec2[] | null;
    guides: Guide[];
    penDraft: PathPoint[] | null;
    prototypeFrom: NodeId | null;
    editingTextId: NodeId | null;
  },
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);

  const toS = (x: number, y: number) => worldToScreen(x, y, camera, view.width, view.height, view.rulers);

  if (opts.hoveredId && !opts.selection.includes(opts.hoveredId)) {
    strokeNode(ctx, doc, opts.hoveredId, toS, "rgba(13,153,255,0.55)", 1);
  }

  for (const id of opts.selection) {
    if (id === opts.editingTextId) continue;
    strokeNode(ctx, doc, id, toS, colorToCss(SELECTION), 1.5);
    drawHandles(ctx, doc, id, toS, camera.zoom);
  }

  if (opts.selection.length > 1) {
    const boxes = opts.selection.map((id) => worldAABB(doc, id));
    const minX = Math.min(...boxes.map((b) => b.minX));
    const minY = Math.min(...boxes.map((b) => b.minY));
    const maxX = Math.max(...boxes.map((b) => b.maxX));
    const maxY = Math.max(...boxes.map((b) => b.maxY));
    const a = toS(minX, minY);
    const b = toS(maxX, maxY);
    ctx.strokeStyle = "rgba(13,153,255,0.35)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.setLineDash([]);
  }

  for (const g of opts.guides) {
    ctx.strokeStyle = colorToCss(GUIDE_PINK);
    ctx.fillStyle = colorToCss(GUIDE_PINK);
    ctx.lineWidth = 1;
    if (g.axis === "x") {
      const p = toS(g.position, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, view.height);
      ctx.stroke();
    } else {
      const p = toS(0, g.position);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(view.width, p.y);
      ctx.stroke();
    }
    if (g.label) {
      const p = g.axis === "x" ? toS(g.position, camera.y) : toS(camera.x, g.position);
      ctx.font = "11px Inter, system-ui, sans-serif";
      const tw = ctx.measureText(g.label).width;
      ctx.fillStyle = colorToCss(GUIDE_PINK);
      ctx.fillRect(p.x - tw / 2 - 4, p.y - 8, tw + 8, 16);
      ctx.fillStyle = "#fff";
      ctx.fillText(g.label, p.x - tw / 2, p.y + 4);
    }
  }

  if (opts.marquee) {
    const a = toS(opts.marquee.minX, opts.marquee.minY);
    const b = toS(opts.marquee.maxX, opts.marquee.maxY);
    ctx.fillStyle = "rgba(13,153,255,0.12)";
    ctx.strokeStyle = colorToCss(SELECTION);
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }

  if (opts.lasso && opts.lasso.length > 1) {
    ctx.beginPath();
    opts.lasso.forEach((p, i) => {
      const s = toS(p.x, p.y);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(13,153,255,0.08)";
    ctx.strokeStyle = colorToCss(SELECTION);
    ctx.setLineDash([6, 4]);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (opts.penDraft && opts.penDraft.length) {
    ctx.strokeStyle = colorToCss(SELECTION);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    opts.penDraft.forEach((p, i) => {
      const s = toS(p.x, p.y);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
    for (const p of opts.penDraft) {
      const s = toS(p.x, p.y);
      ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
      ctx.strokeRect(s.x - 3, s.y - 3, 6, 6);
    }
  }

  for (const link of doc.prototypeLinks) {
    const from = doc.nodes[link.fromId];
    const to = doc.nodes[link.toId];
    if (!from || !to) continue;
    const a = worldAABB(doc, from.id);
    const b = worldAABB(doc, to.id);
    const p1 = toS((a.minX + a.maxX) / 2, (a.minY + a.maxY) / 2);
    const p2 = toS((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2);
    ctx.strokeStyle = "#7c5cbf";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo((p1.x + p2.x) / 2, p1.y, (p1.x + p2.x) / 2, p2.y, p2.x, p2.y);
    ctx.stroke();
  }

  for (const c of doc.comments) {
    if (c.resolved) continue;
    const s = toS(c.x, c.y);
    ctx.fillStyle = "#7c5cbf";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 10px Inter, system-ui";
    ctx.fillText("•", s.x - 3, s.y + 4);
  }

  if (view.rulers) drawRulers(ctx, camera, view, opts.selection, doc);
}

function strokeNode(
  ctx: CanvasRenderingContext2D,
  doc: Document,
  id: NodeId,
  toS: (x: number, y: number) => Vec2,
  color: string,
  width: number,
): void {
  const node = doc.nodes[id];
  if (!node) return;
  const m = worldMatrixOf(doc, id);
  const pts = localCorners(node.width, node.height).map((p) => {
    const w = apply(m, p);
    return toS(w.x, w.y);
  });
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function handleLocal(node: SceneNode, handle: Handle): Vec2 {
  const w = node.width;
  const h = node.height;
  switch (handle) {
    case "nw":
      return { x: 0, y: 0 };
    case "n":
      return { x: w / 2, y: 0 };
    case "ne":
      return { x: w, y: 0 };
    case "e":
      return { x: w, y: h / 2 };
    case "se":
      return { x: w, y: h };
    case "s":
      return { x: w / 2, y: h };
    case "sw":
      return { x: 0, y: h };
    case "w":
      return { x: 0, y: h / 2 };
  }
}

function drawHandles(
  ctx: CanvasRenderingContext2D,
  doc: Document,
  id: NodeId,
  toS: (x: number, y: number) => Vec2,
  _zoom: number,
): void {
  const node = doc.nodes[id];
  if (!node) return;
  const m = worldMatrixOf(doc, id);
  const hs = HANDLE_SIZE;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = colorToCss(SELECTION);
  ctx.lineWidth = 1;
  for (const handle of HANDLES) {
    const w = apply(m, handleLocal(node, handle));
    const s = toS(w.x, w.y);
    ctx.fillRect(s.x - hs / 2, s.y - hs / 2, hs, hs);
    ctx.strokeRect(s.x - hs / 2, s.y - hs / 2, hs, hs);
  }
  const top = apply(m, { x: node.width / 2, y: 0 });
  const topS = toS(top.x, top.y);
  const rot = { x: topS.x, y: topS.y - ROTATE_HANDLE_OFFSET };
  ctx.beginPath();
  ctx.moveTo(topS.x, topS.y);
  ctx.lineTo(rot.x, rot.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rot.x, rot.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function hitHandle(
  doc: Document,
  id: NodeId,
  screen: Vec2,
  camera: Camera,
  view: { width: number; height: number; rulers: boolean },
): Handle | "rotate" | null {
  const node = doc.nodes[id];
  if (!node) return null;
  const m = worldMatrixOf(doc, id);
  const toS = (x: number, y: number) => worldToScreen(x, y, camera, view.width, view.height, view.rulers);
  const slop = HANDLE_SIZE;
  for (const handle of HANDLES) {
    const w = apply(m, handleLocal(node, handle));
    const s = toS(w.x, w.y);
    if (Math.abs(s.x - screen.x) <= slop && Math.abs(s.y - screen.y) <= slop) return handle;
  }
  const top = apply(m, { x: node.width / 2, y: 0 });
  const topS = toS(top.x, top.y);
  const rot = { x: topS.x, y: topS.y - ROTATE_HANDLE_OFFSET };
  if (Math.hypot(rot.x - screen.x, rot.y - screen.y) <= 8) return "rotate";
  return null;
}

function drawRulers(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  view: { width: number; height: number; rulers: boolean },
  selection: NodeId[],
  doc: Document,
): void {
  const r = RULER_SIZE;
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, view.width, r);
  ctx.fillRect(0, 0, r, view.height);
  ctx.fillStyle = "#1f1f1f";
  ctx.fillRect(0, 0, r, r);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.lineTo(view.width, r);
  ctx.moveTo(r, 0);
  ctx.lineTo(r, view.height);
  ctx.stroke();

  const step = niceStep(50 / camera.zoom);
  const ox = r;
  const oy = r;
  const w = view.width - ox;
  const h = view.height - oy;
  const worldLeft = camera.x - w / 2 / camera.zoom;
  const worldTop = camera.y - h / 2 / camera.zoom;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "9px Inter, system-ui";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";

  const x0 = Math.floor(worldLeft / step) * step;
  ctx.beginPath();
  for (let x = x0; x < worldLeft + w / camera.zoom; x += step) {
    const s = worldToScreen(x, 0, camera, view.width, view.height, true);
    ctx.moveTo(s.x, r);
    ctx.lineTo(s.x, r - 6);
    ctx.fillText(String(Math.round(x)), s.x + 2, 12);
  }
  const y0 = Math.floor(worldTop / step) * step;
  for (let y = y0; y < worldTop + h / camera.zoom; y += step) {
    const s = worldToScreen(0, y, camera, view.width, view.height, true);
    ctx.moveTo(r, s.y);
    ctx.lineTo(r - 6, s.y);
    ctx.save();
    ctx.translate(10, s.y - 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(String(Math.round(y)), 0, 0);
    ctx.restore();
  }
  ctx.stroke();

  if (selection.length) {
    const b = worldAABB(doc, selection[0]!);
    ctx.fillStyle = "rgba(13,153,255,0.35)";
    const a = worldToScreen(b.minX, b.minY, camera, view.width, view.height, true);
    const c = worldToScreen(b.maxX, b.maxY, camera, view.width, view.height, true);
    ctx.fillRect(a.x, 0, Math.max(1, c.x - a.x), r);
    ctx.fillRect(0, a.y, r, Math.max(1, c.y - a.y));
  }
}

function niceStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  if (n < 2) return mag;
  if (n < 5) return 2 * mag;
  return 5 * mag;
}
