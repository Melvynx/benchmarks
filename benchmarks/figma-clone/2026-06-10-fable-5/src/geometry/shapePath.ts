import type { SceneNode } from '../scene/types';

/**
 * Path2D builders for every node geometry, in the node's own coordinate
 * space ([0..w] × [0..h]). Shared by the renderer, hit testing, and effects
 * so the three can never disagree about a shape's outline.
 */

export function roundedRectPath(w: number, h: number, tl: number, tr: number, br: number, bl: number): Path2D {
  const path = new Path2D();
  // Clamp radii so adjacent corners never overlap (CSS-style normalization).
  const k = Math.min(
    1,
    w / Math.max(1e-6, tl + tr),
    w / Math.max(1e-6, bl + br),
    h / Math.max(1e-6, tl + bl),
    h / Math.max(1e-6, tr + br),
  );
  const rtl = Math.max(0, tl * k);
  const rtr = Math.max(0, tr * k);
  const rbr = Math.max(0, br * k);
  const rbl = Math.max(0, bl * k);
  if (rtl === 0 && rtr === 0 && rbr === 0 && rbl === 0) {
    path.rect(0, 0, w, h);
    return path;
  }
  path.moveTo(rtl, 0);
  path.lineTo(w - rtr, 0);
  path.arcTo(w, 0, w, rtr, rtr);
  path.lineTo(w, h - rbr);
  path.arcTo(w, h, w - rbr, h, rbr);
  path.lineTo(rbl, h);
  path.arcTo(0, h, 0, h - rbl, rbl);
  path.lineTo(0, rtl);
  path.arcTo(0, 0, rtl, 0, rtl);
  path.closePath();
  return path;
}

export function ellipsePath(w: number, h: number): Path2D {
  const path = new Path2D();
  path.ellipse(w / 2, h / 2, Math.max(0, w / 2), Math.max(0, h / 2), 0, 0, Math.PI * 2);
  return path;
}

export function linePath(w: number): Path2D {
  const path = new Path2D();
  path.moveTo(0, 0);
  path.lineTo(w, 0);
  return path;
}

/** Regular polygon inscribed in the w×h box, first vertex pointing up. */
export function polygonPath(w: number, h: number, points: number): Path2D {
  const path = new Path2D();
  const cx = w / 2;
  const cy = h / 2;
  const n = Math.max(3, Math.round(points));
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const px = cx + cx * Math.cos(angle);
    const py = cy + cy * Math.sin(angle);
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.closePath();
  return path;
}

export function starPath(w: number, h: number, points: number, innerRatio: number): Path2D {
  const path = new Path2D();
  const cx = w / 2;
  const cy = h / 2;
  const n = Math.max(3, Math.round(points));
  const ratio = Math.max(0.01, Math.min(1, innerRatio));
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 1 : ratio;
    const angle = -Math.PI / 2 + (i * Math.PI) / n;
    const px = cx + cx * r * Math.cos(angle);
    const py = cy + cy * r * Math.sin(angle);
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.closePath();
  return path;
}

/**
 * Geometry outline for a node, optionally inflated by `outset` (used for
 * shadow spread and outside strokes). Inflation is exact for rects/ellipses
 * and approximated by center-scaling for polygons/stars.
 */
export function nodePath(node: SceneNode, outset = 0): Path2D {
  const w = node.width + outset * 2;
  const h = node.height + outset * 2;
  let path: Path2D;
  switch (node.type) {
    case 'frame':
    case 'rect': {
      const r = node.cornerRadius;
      path = roundedRectPath(
        w,
        h,
        r.tl + (r.tl > 0 ? outset : 0),
        r.tr + (r.tr > 0 ? outset : 0),
        r.br + (r.br > 0 ? outset : 0),
        r.bl + (r.bl > 0 ? outset : 0),
      );
      break;
    }
    case 'group':
    case 'text':
      path = roundedRectPath(w, h, 0, 0, 0, 0);
      break;
    case 'ellipse':
      path = ellipsePath(w, h);
      break;
    case 'line':
      path = linePath(node.width);
      return path; // lines are never inflated
    case 'polygon':
      path = polygonPath(w, h, node.pointCount);
      break;
    case 'star':
      path = starPath(w, h, node.pointCount, node.innerRatio);
      break;
  }
  if (outset !== 0) {
    const shifted = new Path2D();
    shifted.addPath(path, new DOMMatrix([1, 0, 0, 1, -outset, -outset]));
    return shifted;
  }
  return path;
}
