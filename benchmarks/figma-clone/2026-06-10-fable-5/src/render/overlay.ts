import { boxCorners, getSelectionBox, CORNER_HANDLES, handleWorldPosition } from '../interaction/handles';
import type { Rect } from '../geometry/rect';
import { rectUnionAll } from '../geometry/rect';
import type { Vec2 } from '../geometry/vec2';
import { getSceneIndex } from '../scene/sceneIndex';
import { worldCorners } from '../scene/nodeGeometry';
import type { NodeId, SceneDocument } from '../scene/types';
import { roundTo } from '../geometry/math';
import type { EditorState } from '../store/store';
import { worldToScreen } from '../store/viewport';
import { computeFrameLabels, FRAME_LABEL_FONT } from './frameLabels';
import { drawRulers } from './rulers';

export const ACCENT = '#0D99FF';
export const SNAP_PINK = '#FF2BB3';

/** Everything non-document: hover, selection chrome, guides, badges, rulers. */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  width: number,
  height: number,
): void {
  const { doc, viewport, selection } = state;

  drawFrameLabels(ctx, state, width, height);

  // Hover highlight.
  if (
    state.hoverId &&
    state.tool === 'select' &&
    !state.activeGesture &&
    !selection.includes(state.hoverId) &&
    state.editingTextId === null
  ) {
    drawNodeOutline(ctx, doc, state, state.hoverId, ACCENT, 2);
  }

  // Drop target while dragging into a frame.
  if (state.dropTargetId) {
    drawNodeOutline(ctx, doc, state, state.dropTargetId, ACCENT, 2.5);
  }

  // Per-node selection outlines.
  for (const id of selection) {
    if (id === state.editingTextId) continue;
    drawNodeOutline(ctx, doc, state, id, ACCENT, 1);
  }

  // Selection box + handles.
  const box = getSelectionBox(doc, selection);
  if (box && state.editingTextId === null && state.tool === 'select') {
    const corners = boxCorners(box).map((c) => worldToScreen(viewport, c));
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1;
    strokePolygon(ctx, corners);

    if (state.activeGesture !== 'rotate') {
      for (const handle of CORNER_HANDLES) {
        const p = worldToScreen(viewport, handleWorldPosition(box, handle));
        drawHandleSquare(ctx, p, box.rotation);
      }
    }
    drawSizeBadge(ctx, state, box, corners);
  }

  // Rotation HUD.
  if (state.rotationHud !== null && box) {
    const p = worldToScreen(viewport, box.center);
    drawBadge(ctx, `${roundTo(state.rotationHud, 1)}°`, p.x, p.y - (box.height * viewport.zoom) / 2 - 28, ACCENT);
  }

  // Marquee.
  if (state.marquee) {
    const a = worldToScreen(viewport, { x: state.marquee.x, y: state.marquee.y });
    const w = state.marquee.width * viewport.zoom;
    const h = state.marquee.height * viewport.zoom;
    ctx.fillStyle = 'rgba(13, 153, 255, 0.08)';
    ctx.strokeStyle = 'rgba(13, 153, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.fillRect(a.x, a.y, w, h);
    ctx.strokeRect(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5, Math.round(w), Math.round(h));
  }

  // Smart-guide lines + distance badges.
  if (state.snap) {
    ctx.strokeStyle = SNAP_PINK;
    ctx.lineWidth = 1;
    for (const guide of state.snap.guides) {
      ctx.beginPath();
      if (guide.axis === 'x') {
        const x = Math.round(guide.position * viewport.zoom + viewport.panX) + 0.5;
        ctx.moveTo(x, guide.from * viewport.zoom + viewport.panY);
        ctx.lineTo(x, guide.to * viewport.zoom + viewport.panY);
      } else {
        const y = Math.round(guide.position * viewport.zoom + viewport.panY) + 0.5;
        ctx.moveTo(guide.from * viewport.zoom + viewport.panX, y);
        ctx.lineTo(guide.to * viewport.zoom + viewport.panX, y);
      }
      ctx.stroke();
    }
    for (const label of state.snap.labels) {
      const p = worldToScreen(viewport, label);
      drawBadge(ctx, label.text, p.x, p.y, SNAP_PINK);
    }
  }

  // Alt-hover measurements.
  if (state.measuring && state.hoverId && selection.length > 0 && !selection.includes(state.hoverId)) {
    drawMeasurements(ctx, state);
  }

  if (state.showRulers) {
    const index = getSceneIndex(doc);
    const selectionBounds = rectUnionAll(
      selection.map((id) => index.worldBounds.get(id)).filter((r): r is Rect => r !== undefined),
    );
    drawRulers(ctx, viewport, width, height, selectionBounds);
  }
}

function drawNodeOutline(
  ctx: CanvasRenderingContext2D,
  doc: SceneDocument,
  state: EditorState,
  id: NodeId,
  color: string,
  lineWidth: number,
): void {
  const node = doc.nodes[id];
  if (!node) return;
  const corners = worldCorners(doc, node).map((c) => worldToScreen(state.viewport, c));
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  strokePolygon(ctx, corners);
}

function strokePolygon(ctx: CanvasRenderingContext2D, points: readonly Vec2[]): void {
  if (points.length === 0) return;
  ctx.beginPath();
  const first = points[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p) ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();
}

const HANDLE_SIZE = 8;

function drawHandleSquare(ctx: CanvasRenderingContext2D, p: Vec2, rotation: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rotation);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1;
  ctx.fillRect(-HANDLE_SIZE / 2, -HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  ctx.strokeRect(-HANDLE_SIZE / 2 + 0.5, -HANDLE_SIZE / 2 + 0.5, HANDLE_SIZE - 1, HANDLE_SIZE - 1);
  ctx.restore();
}

function drawBadge(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, bg: string): void {
  ctx.save();
  ctx.font = '600 10px Inter, sans-serif';
  const w = ctx.measureText(text).width + 12;
  const h = 17;
  ctx.fillStyle = bg;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 3.5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSizeBadge(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  box: { width: number; height: number },
  corners: readonly Vec2[],
): void {
  const bottom = corners.reduce((max, c) => Math.max(max, c.y), -Infinity);
  const cx = corners.reduce((sum, c) => sum + c.x, 0) / corners.length;
  const text = `${roundTo(box.width)} × ${roundTo(box.height)}`;
  drawBadge(ctx, text, cx, bottom + 16, ACCENT);
  void state;
}

function drawFrameLabels(ctx: CanvasRenderingContext2D, state: EditorState, width: number, height: number): void {
  const labels = computeFrameLabels(state.doc, state.viewport, width, height);
  ctx.save();
  ctx.font = FRAME_LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const label of labels) {
    const active = state.selection.includes(label.id) || state.hoverId === label.id;
    ctx.fillStyle = active ? ACCENT : 'rgba(255, 255, 255, 0.45)';
    ctx.fillText(label.text, label.rect.x, label.rect.y + label.rect.height / 2, Math.max(40, label.rect.width));
  }
  ctx.restore();
}

/** Alt-hover: pink distance lines between the selection and the hovered node. */
function drawMeasurements(ctx: CanvasRenderingContext2D, state: EditorState): void {
  const index = getSceneIndex(state.doc);
  const sel = rectUnionAll(
    state.selection.map((id) => index.worldBounds.get(id)).filter((r): r is Rect => r !== undefined),
  );
  const hover = state.hoverId ? index.worldBounds.get(state.hoverId) : null;
  if (!sel || !hover) return;
  const v = state.viewport;

  const drawSegment = (a: Vec2, b: Vec2, label: string): void => {
    const sa = worldToScreen(v, a);
    const sb = worldToScreen(v, b);
    ctx.strokeStyle = SNAP_PINK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.stroke();
    drawBadge(ctx, label, (sa.x + sb.x) / 2, (sa.y + sb.y) / 2 - 10, SNAP_PINK);
  };

  // Horizontal gap.
  const midY = overlapMid(sel.y, sel.y + sel.height, hover.y, hover.y + hover.height) ?? sel.y + sel.height / 2;
  if (hover.x >= sel.x + sel.width) {
    const gap = hover.x - (sel.x + sel.width);
    if (gap > 0.4) drawSegment({ x: sel.x + sel.width, y: midY }, { x: hover.x, y: midY }, String(Math.round(gap)));
  } else if (hover.x + hover.width <= sel.x) {
    const gap = sel.x - (hover.x + hover.width);
    if (gap > 0.4) drawSegment({ x: hover.x + hover.width, y: midY }, { x: sel.x, y: midY }, String(Math.round(gap)));
  }
  // Vertical gap.
  const midX = overlapMid(sel.x, sel.x + sel.width, hover.x, hover.x + hover.width) ?? sel.x + sel.width / 2;
  if (hover.y >= sel.y + sel.height) {
    const gap = hover.y - (sel.y + sel.height);
    if (gap > 0.4) drawSegment({ x: midX, y: sel.y + sel.height }, { x: midX, y: hover.y }, String(Math.round(gap)));
  } else if (hover.y + hover.height <= sel.y) {
    const gap = sel.y - (hover.y + hover.height);
    if (gap > 0.4) drawSegment({ x: midX, y: hover.y + hover.height }, { x: midX, y: sel.y }, String(Math.round(gap)));
  }
}

function overlapMid(a0: number, a1: number, b0: number, b1: number): number | null {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return lo < hi ? (lo + hi) / 2 : null;
}
