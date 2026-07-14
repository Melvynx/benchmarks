import type { AppState } from '../../state/types';
import { nodeWorldAABB, nodeWorldCorners, nodeWorldMatrix } from '../scene';
import { matApply } from '../geometry/Mat2D';
import type { Vec2 } from '../geometry/Vec2';

const ACCENT = '#0d99ff';
const HANDLE_FILL = '#ffffff';
const HOVER = '#0d99ff';

export interface OverlayOptions {
  zoom: number;
}

export const drawHoverOutline = (
  ctx: CanvasRenderingContext2D,
  state: AppState,
  opts: OverlayOptions,
): void => {
  const hoverId = state.transient.hoverId;
  if (!hoverId) return;
  if (state.selection.includes(hoverId)) return;
  const node = state.doc.nodes[hoverId];
  if (!node) return;
  const corners = nodeWorldCorners(state.doc, hoverId);
  ctx.save();
  ctx.strokeStyle = HOVER;
  ctx.lineWidth = 1 / opts.zoom;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
};

export const drawSelectionOutlines = (
  ctx: CanvasRenderingContext2D,
  state: AppState,
  opts: OverlayOptions,
): void => {
  const { selection } = state;
  if (selection.length === 0) return;

  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1 / opts.zoom;
  for (const id of selection) {
    const node = state.doc.nodes[id];
    if (!node) continue;
    const corners = nodeWorldCorners(state.doc, id);
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
};

const HANDLE_SIZE = 7;
const ROT_HANDLE_OFFSET = 20;

export interface Handle {
  kind: 'corner' | 'edge' | 'rotation';
  pos: Vec2; // world
  cursor?: string;
  ax: -1 | 0 | 1;
  ay: -1 | 0 | 1;
}

/** For single-selection: compute the 8 resize handles in world space, plus rotation handle. */
export const computeSelectionHandles = (
  state: AppState,
): { handles: Handle[]; corners: Vec2[] } | null => {
  const { selection } = state;
  if (selection.length === 0) return null;

  // If single rotated node: use node-local bounds rotated
  if (selection.length === 1) {
    const id = selection[0]!;
    const node = state.doc.nodes[id];
    if (!node) return null;
    const corners = nodeWorldCorners(state.doc, id);
    const handles: Handle[] = [
      { kind: 'corner', pos: corners[0], ax: -1, ay: -1, cursor: 'nwse-resize' },
      { kind: 'corner', pos: corners[1], ax: 1, ay: -1, cursor: 'nesw-resize' },
      { kind: 'corner', pos: corners[2], ax: 1, ay: 1, cursor: 'nwse-resize' },
      { kind: 'corner', pos: corners[3], ax: -1, ay: 1, cursor: 'nesw-resize' },
      {
        kind: 'edge',
        pos: midpoint(corners[0], corners[1]),
        ax: 0,
        ay: -1,
        cursor: 'ns-resize',
      },
      {
        kind: 'edge',
        pos: midpoint(corners[1], corners[2]),
        ax: 1,
        ay: 0,
        cursor: 'ew-resize',
      },
      {
        kind: 'edge',
        pos: midpoint(corners[2], corners[3]),
        ax: 0,
        ay: 1,
        cursor: 'ns-resize',
      },
      {
        kind: 'edge',
        pos: midpoint(corners[3], corners[0]),
        ax: -1,
        ay: 0,
        cursor: 'ew-resize',
      },
    ];
    return { handles, corners };
  }

  // Multi-selection: AABB
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of selection) {
    const aabb = nodeWorldAABB(state.doc, id);
    if (aabb.width === 0 && aabb.height === 0) continue;
    minX = Math.min(minX, aabb.x);
    minY = Math.min(minY, aabb.y);
    maxX = Math.max(maxX, aabb.x + aabb.width);
    maxY = Math.max(maxY, aabb.y + aabb.height);
  }
  if (!isFinite(minX)) return null;
  const corners: Vec2[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  const handles: Handle[] = [
    { kind: 'corner', pos: corners[0]!, ax: -1, ay: -1, cursor: 'nwse-resize' },
    { kind: 'corner', pos: corners[1]!, ax: 1, ay: -1, cursor: 'nesw-resize' },
    { kind: 'corner', pos: corners[2]!, ax: 1, ay: 1, cursor: 'nwse-resize' },
    { kind: 'corner', pos: corners[3]!, ax: -1, ay: 1, cursor: 'nesw-resize' },
    {
      kind: 'edge',
      pos: midpoint(corners[0]!, corners[1]!),
      ax: 0,
      ay: -1,
      cursor: 'ns-resize',
    },
    {
      kind: 'edge',
      pos: midpoint(corners[1]!, corners[2]!),
      ax: 1,
      ay: 0,
      cursor: 'ew-resize',
    },
    {
      kind: 'edge',
      pos: midpoint(corners[2]!, corners[3]!),
      ax: 0,
      ay: 1,
      cursor: 'ns-resize',
    },
    {
      kind: 'edge',
      pos: midpoint(corners[3]!, corners[0]!),
      ax: -1,
      ay: 0,
      cursor: 'ew-resize',
    },
  ];
  return { handles, corners };
};

const midpoint = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const drawSelectionHandles = (
  ctx: CanvasRenderingContext2D,
  state: AppState,
  opts: OverlayOptions,
): void => {
  const info = computeSelectionHandles(state);
  if (!info) return;
  const { handles } = info;
  const s = HANDLE_SIZE / opts.zoom;
  ctx.save();
  // draw AABB/rotated box outline (for multi-selection, corners are axis-aligned; for single-selection they follow rotation)
  for (const h of handles) {
    if (h.kind === 'rotation') continue;
    ctx.fillStyle = HANDLE_FILL;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1 / opts.zoom;
    ctx.beginPath();
    ctx.rect(h.pos.x - s / 2, h.pos.y - s / 2, s, s);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
};

/** Rotation handle is "off the top" of selection (single node). */
export const computeRotationHandle = (state: AppState, zoom: number): Vec2 | null => {
  if (state.selection.length !== 1) return null;
  const id = state.selection[0]!;
  const node = state.doc.nodes[id];
  if (!node) return null;
  // Take midpoint of top edge in local and transform, then extend outward by 20px / zoom.
  const m = nodeWorldMatrix(state.doc, id);
  const mid = matApply(m, { x: node.width / 2, y: 0 });
  const dir = matApply(m, { x: node.width / 2, y: -1 });
  const vx = dir.x - mid.x;
  const vy = dir.y - mid.y;
  const len = Math.hypot(vx, vy);
  if (len < 1e-6) return null;
  const k = ROT_HANDLE_OFFSET / zoom / len;
  return { x: mid.x + vx * k, y: mid.y + vy * k };
};

export const drawMarquee = (
  ctx: CanvasRenderingContext2D,
  state: AppState,
  opts: OverlayOptions,
): void => {
  const { marquee } = state.transient;
  if (!marquee) return;
  ctx.save();
  ctx.fillStyle = 'rgba(13, 153, 255, 0.08)';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1 / opts.zoom;
  ctx.fillRect(marquee.x, marquee.y, marquee.width, marquee.height);
  ctx.strokeRect(marquee.x, marquee.y, marquee.width, marquee.height);
  ctx.restore();
};

export const drawSmartGuides = (
  ctx: CanvasRenderingContext2D,
  state: AppState,
  opts: OverlayOptions,
): void => {
  const { guides, badges } = state.transient.guides;
  ctx.save();
  ctx.strokeStyle = '#ff3b81';
  ctx.lineWidth = 1 / opts.zoom;
  for (const g of guides) {
    ctx.beginPath();
    if (g.orientation === 'vertical') {
      ctx.moveTo(g.position, g.from);
      ctx.lineTo(g.position, g.to);
    } else {
      ctx.moveTo(g.from, g.position);
      ctx.lineTo(g.to, g.position);
    }
    ctx.stroke();
  }
  // Badges
  for (const b of badges) {
    drawBadge(ctx, b.x, b.y, Math.round(b.value).toString(), opts.zoom);
  }
  ctx.restore();
};

const drawBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  zoom: number,
): void => {
  const paddingX = 4 / zoom;
  const paddingY = 2 / zoom;
  const fontSize = 10 / zoom;
  ctx.font = `${fontSize}px Inter`;
  const m = ctx.measureText(text);
  const w = m.width + paddingX * 2;
  const h = fontSize + paddingY * 2;
  ctx.save();
  ctx.fillStyle = '#ff3b81';
  ctx.beginPath();
  const r = 2 / zoom;
  const rx = x - w / 2;
  const ry = y - h / 2;
  ctx.moveTo(rx + r, ry);
  ctx.lineTo(rx + w - r, ry);
  ctx.arcTo(rx + w, ry, rx + w, ry + r, r);
  ctx.lineTo(rx + w, ry + h - r);
  ctx.arcTo(rx + w, ry + h, rx + w - r, ry + h, r);
  ctx.lineTo(rx + r, ry + h);
  ctx.arcTo(rx, ry + h, rx, ry + h - r, r);
  ctx.lineTo(rx, ry + r);
  ctx.arcTo(rx, ry, rx + r, ry, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.restore();
};
