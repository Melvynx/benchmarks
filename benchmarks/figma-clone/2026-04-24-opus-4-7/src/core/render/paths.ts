import type { Rect } from '../geometry/Rect';
import type { Vec2 } from '../geometry/Vec2';
import { radiusToIndividual, type CornerRadius, type PolygonNode } from '../scene';

/** Rounded rect path with per-corner radius. Draws in a Path2D. */
export const roundedRectPath = (path: Path2D, rect: Rect, radius: CornerRadius): void => {
  const { tl, tr, br, bl } = radiusToIndividual(radius);
  const { x, y, width: w, height: h } = rect;
  const maxR = Math.min(w, h) / 2;
  const rtl = Math.min(tl, maxR);
  const rtr = Math.min(tr, maxR);
  const rbr = Math.min(br, maxR);
  const rbl = Math.min(bl, maxR);
  path.moveTo(x + rtl, y);
  path.lineTo(x + w - rtr, y);
  path.arcTo(x + w, y, x + w, y + rtr, rtr);
  path.lineTo(x + w, y + h - rbr);
  path.arcTo(x + w, y + h, x + w - rbr, y + h, rbr);
  path.lineTo(x + rbl, y + h);
  path.arcTo(x, y + h, x, y + h - rbl, rbl);
  path.lineTo(x, y + rtl);
  path.arcTo(x, y, x + rtl, y, rtl);
  path.closePath();
};

/** Ellipse path inscribed in rect. */
export const ellipsePath = (path: Path2D, rect: Rect): void => {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  path.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
};

/** Polygon / star path in local space bounds of rect. */
export const polygonPath = (path: Path2D, rect: Rect, n: number, starRatio: number | null): void => {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  const pts = starRatio !== null ? n * 2 : n;
  for (let i = 0; i < pts; i++) {
    const angle = -Math.PI / 2 + (i / pts) * Math.PI * 2;
    const r = starRatio !== null && i % 2 === 1 ? starRatio : 1;
    const x = cx + Math.cos(angle) * rx * r;
    const y = cy + Math.sin(angle) * ry * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
};

export const polygonPoints = (rect: Rect, n: number, starRatio: number | null): Vec2[] => {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  const pts = starRatio !== null ? n * 2 : n;
  const out: Vec2[] = [];
  for (let i = 0; i < pts; i++) {
    const angle = -Math.PI / 2 + (i / pts) * Math.PI * 2;
    const r = starRatio !== null && i % 2 === 1 ? starRatio : 1;
    out.push({ x: cx + Math.cos(angle) * rx * r, y: cy + Math.sin(angle) * ry * r });
  }
  return out;
};

export const polygonNodePath = (path: Path2D, rect: Rect, n: PolygonNode): void =>
  polygonPath(path, rect, n.pointCount, n.starRatio);

export const linePath = (path: Path2D, from: Vec2, to: Vec2): void => {
  path.moveTo(from.x, from.y);
  path.lineTo(to.x, to.y);
};
