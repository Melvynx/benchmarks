import { clamp } from "../core/geometry";
import type { Camera, Vec2 } from "../core/types";
import { MAX_ZOOM, MIN_ZOOM, RULER_SIZE } from "../core/types";

export function screenToWorld(
  sx: number,
  sy: number,
  camera: Camera,
  viewW: number,
  viewH: number,
  rulers: boolean,
): Vec2 {
  const ox = rulers ? RULER_SIZE : 0;
  const oy = rulers ? RULER_SIZE : 0;
  const w = viewW - ox;
  const h = viewH - oy;
  return {
    x: (sx - ox - w / 2) / camera.zoom + camera.x,
    y: (sy - oy - h / 2) / camera.zoom + camera.y,
  };
}

export function worldToScreen(
  wx: number,
  wy: number,
  camera: Camera,
  viewW: number,
  viewH: number,
  rulers: boolean,
): Vec2 {
  const ox = rulers ? RULER_SIZE : 0;
  const oy = rulers ? RULER_SIZE : 0;
  const w = viewW - ox;
  const h = viewH - oy;
  return {
    x: (wx - camera.x) * camera.zoom + ox + w / 2,
    y: (wy - camera.y) * camera.zoom + oy + h / 2,
  };
}

export function zoomAt(
  camera: Camera,
  sx: number,
  sy: number,
  nextZoom: number,
  viewW: number,
  viewH: number,
  rulers: boolean,
): Camera {
  const before = screenToWorld(sx, sy, camera, viewW, viewH, rulers);
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const afterCam = { ...camera, zoom };
  const after = screenToWorld(sx, sy, afterCam, viewW, viewH, rulers);
  return {
    zoom,
    x: camera.x + before.x - after.x,
    y: camera.y + before.y - after.y,
  };
}

export function fitAABB(
  aabb: { minX: number; minY: number; maxX: number; maxY: number },
  viewW: number,
  viewH: number,
  rulers: boolean,
  padding = 64,
): Camera {
  const ox = rulers ? RULER_SIZE : 0;
  const oy = rulers ? RULER_SIZE : 0;
  const w = Math.max(1, viewW - ox - padding * 2);
  const h = Math.max(1, viewH - oy - padding * 2);
  const bw = Math.max(1, aabb.maxX - aabb.minX);
  const bh = Math.max(1, aabb.maxY - aabb.minY);
  const zoom = clamp(Math.min(w / bw, h / bh), MIN_ZOOM, MAX_ZOOM);
  return {
    zoom,
    x: (aabb.minX + aabb.maxX) / 2,
    y: (aabb.minY + aabb.maxY) / 2,
  };
}
