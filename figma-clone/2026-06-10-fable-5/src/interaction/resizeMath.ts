import { decomposeToNode, invertM, mul, translation, type Mat2d } from '../geometry/mat2d';
import type { Rect } from '../geometry/rect';
import type { Vec2 } from '../geometry/vec2';
import type { HandleKind } from './handles';

export interface BoxPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

const MIN_SIZE = 0.01;

/**
 * Exact local-axis resize of a (possibly rotated, possibly nested) node.
 *
 * Everything happens in the node's gesture-start local frame: the pointer is
 * unprojected into that frame, the dragged edges follow it, and the new
 * placement is recovered by composing the start matrix with the local origin
 * shift — so the anchor (opposite corner/edge, or the center with Alt) stays
 * world-stationary no matter how the node or its ancestors are rotated.
 */
export function resizeRotatedBox(
  start: { width: number; height: number },
  startWorld: Mat2d,
  parentWorld: Mat2d,
  pointerWorld: Vec2,
  handle: HandleKind,
  options: { aspect: boolean; fromCenter: boolean },
): BoxPlacement {
  const inv = invertM(startWorld);
  const local: Vec2 = {
    x: inv.a * pointerWorld.x + inv.c * pointerWorld.y + inv.e,
    y: inv.b * pointerWorld.x + inv.d * pointerWorld.y + inv.f,
  };

  const w0 = Math.max(start.width, MIN_SIZE);
  const h0 = Math.max(start.height, MIN_SIZE);
  const movesLeft = handle.includes('w');
  const movesRight = handle.includes('e');
  const movesTop = handle.includes('n');
  const movesBottom = handle.includes('s');

  // New box in the start-local frame (original box occupies 0..w0 × 0..h0).
  let x0 = 0;
  let y0 = 0;
  let w = w0;
  let h = h0;

  if (movesLeft) {
    x0 = local.x;
    w = w0 - local.x;
  } else if (movesRight) {
    w = local.x;
  }
  if (movesTop) {
    y0 = local.y;
    h = h0 - local.y;
  } else if (movesBottom) {
    h = local.y;
  }

  if (options.fromCenter) {
    if (movesLeft || movesRight) {
      const grow = w - w0;
      w = w0 + grow * 2;
      x0 = movesLeft ? local.x : -grow;
    }
    if (movesTop || movesBottom) {
      const grow = h - h0;
      h = h0 + grow * 2;
      y0 = movesTop ? local.y : -grow;
    }
  }

  if (options.aspect) {
    const corner = (movesLeft || movesRight) && (movesTop || movesBottom);
    if (corner) {
      const scale = Math.max(Math.abs(w) / w0, Math.abs(h) / h0);
      const newW = scale * w0 * Math.sign(w || 1);
      const newH = scale * h0 * Math.sign(h || 1);
      if (movesLeft) x0 += w - newW;
      if (movesTop) y0 += h - newH;
      w = newW;
      h = newH;
    } else if (movesLeft || movesRight) {
      const scale = Math.abs(w) / w0;
      const newH = scale * h0;
      y0 = (h0 - newH) / 2;
      h = newH;
    } else {
      const scale = Math.abs(h) / h0;
      const newW = scale * w0;
      x0 = (w0 - newW) / 2;
      w = newW;
    }
  }

  // Normalize flips so width/height stay positive (the origin shift handles mirroring).
  if (w < 0) {
    x0 += w;
    w = -w;
  }
  if (h < 0) {
    y0 += h;
    h = -h;
  }
  w = Math.max(w, MIN_SIZE);
  h = Math.max(h, MIN_SIZE);

  // New world matrix = old ∘ shift; decompose back into the parent's frame.
  const newLocal = mul(invertM(parentWorld), mul(startWorld, translation(x0, y0)));
  const placed = decomposeToNode(newLocal, w, h);
  return { ...placed, width: w, height: h };
}

/**
 * Resize an axis-aligned rect (multi-selection box / draw gesture) with the
 * same edge semantics. Returns the new rect plus signed scale factors.
 */
export function resizeAlignedRect(
  start: Rect,
  pointerWorld: Vec2,
  handle: HandleKind,
  options: { aspect: boolean; fromCenter: boolean },
): { rect: Rect; sx: number; sy: number } {
  const placed = resizeRotatedBox(
    { width: start.width, height: start.height },
    translation(start.x, start.y),
    { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    pointerWorld,
    handle,
    options,
  );
  const rect: Rect = { x: placed.x, y: placed.y, width: placed.width, height: placed.height };
  // Signed scales for mirroring positions in group resize.
  const cx0 = start.x + start.width / 2;
  const anchorLeft = handle.includes('e') || !handle.includes('w');
  const sx = start.width < 1e-9 ? 1 : (rect.width / start.width) * flipSign(start, rect, 'x', anchorLeft);
  const cy0 = start.y + start.height / 2;
  const anchorTop = handle.includes('s') || !handle.includes('n');
  const sy = start.height < 1e-9 ? 1 : (rect.height / start.height) * flipSign(start, rect, 'y', anchorTop);
  void cx0;
  void cy0;
  return { rect, sx, sy };
}

function flipSign(start: Rect, next: Rect, axis: 'x' | 'y', anchorAtStart: boolean): number {
  // Detect mirroring: the anchored edge should not move; if the rect now sits
  // entirely on the other side of the anchor, the gesture crossed over.
  if (axis === 'x') {
    const anchor = anchorAtStart ? start.x : start.x + start.width;
    const center = next.x + next.width / 2;
    const startCenter = start.x + start.width / 2;
    return Math.sign((center - anchor) * (startCenter - anchor) || 1);
  }
  const anchor = anchorAtStart ? start.y : start.y + start.height;
  const center = next.y + next.height / 2;
  const startCenter = start.y + start.height / 2;
  return Math.sign((center - anchor) * (startCenter - anchor) || 1);
}
