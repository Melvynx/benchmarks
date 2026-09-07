import { inflateAABB } from "./geometry";
import { SpatialIndex } from "./spatial-index";
import type { AABB, Guide, NodeId, Vec2 } from "./types";
import { SNAP_PX } from "./types";

export interface SnapBox {
  id: NodeId;
  aabb: AABB;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

export function snapMove(
  moving: AABB,
  candidates: SnapBox[],
  ignore: Set<NodeId>,
  zoom: number,
): SnapResult {
  const threshold = SNAP_PX / zoom;
  const mx = [moving.minX, (moving.minX + moving.maxX) / 2, moving.maxX];
  const my = [moving.minY, (moving.minY + moving.maxY) / 2, moving.maxY];
  let bestX = threshold + 1;
  let bestY = threshold + 1;
  let snapX: number | null = null;
  let snapY: number | null = null;

  for (const c of candidates) {
    if (ignore.has(c.id)) continue;
    const cx = [c.aabb.minX, (c.aabb.minX + c.aabb.maxX) / 2, c.aabb.maxX];
    const cy = [c.aabb.minY, (c.aabb.minY + c.aabb.maxY) / 2, c.aabb.maxY];
    for (const a of mx) {
      for (const b of cx) {
        const d = b - a;
        if (Math.abs(d) < Math.abs(bestX)) {
          bestX = d;
          snapX = b;
        }
      }
    }
    for (const a of my) {
      for (const b of cy) {
        const d = b - a;
        if (Math.abs(d) < Math.abs(bestY)) {
          bestY = d;
          snapY = b;
        }
      }
    }
  }

  const dx = Math.abs(bestX) <= threshold ? bestX : 0;
  const dy = Math.abs(bestY) <= threshold ? bestY : 0;
  const guides: Guide[] = [];
  if (dx !== 0 && snapX !== null) guides.push({ axis: "x", position: snapX, kind: "align" });
  if (dy !== 0 && snapY !== null) guides.push({ axis: "y", position: snapY, kind: "align" });

  const moved: AABB = {
    minX: moving.minX + dx,
    minY: moving.minY + dy,
    maxX: moving.maxX + dx,
    maxY: moving.maxY + dy,
  };

  for (const c of candidates) {
    if (ignore.has(c.id)) continue;
    const overlapX = moved.minX < c.aabb.maxX && moved.maxX > c.aabb.minX;
    const overlapY = moved.minY < c.aabb.maxY && moved.maxY > c.aabb.minY;
    if (overlapX && !overlapY) {
      const gap = moved.minY >= c.aabb.maxY ? moved.minY - c.aabb.maxY : c.aabb.minY - moved.maxY;
      if (gap >= 0 && gap < 240) {
        const x = (Math.max(moved.minX, c.aabb.minX) + Math.min(moved.maxX, c.aabb.maxX)) / 2;
        guides.push({
          axis: "x",
          position: x,
          kind: "distance",
          label: `${Math.round(gap)}`,
        });
      }
    }
    if (overlapY && !overlapX) {
      const gap = moved.minX >= c.aabb.maxX ? moved.minX - c.aabb.maxX : c.aabb.minX - moved.maxX;
      if (gap >= 0 && gap < 240) {
        const y = (Math.max(moved.minY, c.aabb.minY) + Math.min(moved.maxY, c.aabb.maxY)) / 2;
        guides.push({
          axis: "y",
          position: y,
          kind: "distance",
          label: `${Math.round(gap)}`,
        });
      }
    }
  }

  return { dx, dy, guides };
}

export function collectSnapBoxes(index: SpatialIndex, region: AABB, extra: SnapBox[]): SnapBox[] {
  const ids = index.query(inflateAABB(region, 400));
  const out: SnapBox[] = [...extra];
  for (const id of ids) {
    const aabb = index.getAABB(id);
    if (aabb) out.push({ id, aabb });
  }
  return out;
}

export function snapPoint(p: Vec2, candidates: SnapBox[], zoom: number): { x: number; y: number; guides: Guide[] } {
  const threshold = SNAP_PX / zoom;
  let dx = 0;
  let dy = 0;
  const guides: Guide[] = [];
  let bestX = threshold + 1;
  let bestY = threshold + 1;
  for (const c of candidates) {
    for (const x of [c.aabb.minX, (c.aabb.minX + c.aabb.maxX) / 2, c.aabb.maxX]) {
      const d = x - p.x;
      if (Math.abs(d) < Math.abs(bestX)) {
        bestX = d;
      }
    }
    for (const y of [c.aabb.minY, (c.aabb.minY + c.aabb.maxY) / 2, c.aabb.maxY]) {
      const d = y - p.y;
      if (Math.abs(d) < Math.abs(bestY)) {
        bestY = d;
      }
    }
  }
  if (Math.abs(bestX) <= threshold) {
    dx = bestX;
    guides.push({ axis: "x", position: p.x + dx, kind: "align" });
  }
  if (Math.abs(bestY) <= threshold) {
    dy = bestY;
    guides.push({ axis: "y", position: p.y + dy, kind: "align" });
  }
  return { x: p.x + dx, y: p.y + dy, guides };
}
