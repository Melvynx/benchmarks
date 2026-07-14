import type { Viewport } from './types';
import type { Vec2 } from '../core/geometry/Vec2';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 64;

/** Canvas-pixel coords → world (page-local) coords. */
export const screenToWorld = (v: Viewport, p: Vec2): Vec2 => ({
  x: v.x + p.x / v.zoom,
  y: v.y + p.y / v.zoom,
});

export const worldToScreen = (v: Viewport, p: Vec2): Vec2 => ({
  x: (p.x - v.x) * v.zoom,
  y: (p.y - v.y) * v.zoom,
});

/** Zoom around a pivot (canvas pixel coords). */
export const zoomAt = (v: Viewport, pivotScreen: Vec2, nextZoom: number): Viewport => {
  const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  const worldPivot = screenToWorld(v, pivotScreen);
  // After zoom, we want worldPivot to still map to pivotScreen.
  // pivotScreen.x = (worldPivot.x - newX) * nz  =>  newX = worldPivot.x - pivotScreen.x / nz
  return {
    x: worldPivot.x - pivotScreen.x / nz,
    y: worldPivot.y - pivotScreen.y / nz,
    zoom: nz,
  };
};

export const fitRectToViewport = (
  rect: { x: number; y: number; width: number; height: number },
  canvas: { width: number; height: number },
  padding = 64,
): Viewport => {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0, zoom: 1 };
  }
  const zw = (canvas.width - padding * 2) / rect.width;
  const zh = (canvas.height - padding * 2) / rect.height;
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(zw, zh)));
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return {
    x: cx - canvas.width / 2 / z,
    y: cy - canvas.height / 2 / z,
    zoom: z,
  };
};
