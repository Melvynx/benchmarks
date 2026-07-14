import type { Rect } from '../geometry/rect';
import { rectUnionAll } from '../geometry/rect';
import type { Vec2 } from '../geometry/vec2';
import { getSceneIndex } from '../scene/sceneIndex';
import { clamp } from '../geometry/math';
import type { Viewport } from './store';
import { ZOOM_MAX, ZOOM_MIN, editorStore } from './store';

export function worldToScreen(v: Viewport, p: Vec2): Vec2 {
  return { x: p.x * v.zoom + v.panX, y: p.y * v.zoom + v.panY };
}

export function screenToWorld(v: Viewport, p: Vec2): Vec2 {
  return { x: (p.x - v.panX) / v.zoom, y: (p.y - v.panY) / v.zoom };
}

export function visibleWorldRect(v: Viewport, screenWidth: number, screenHeight: number): Rect {
  return {
    x: -v.panX / v.zoom,
    y: -v.panY / v.zoom,
    width: screenWidth / v.zoom,
    height: screenHeight / v.zoom,
  };
}

export function panBy(dxScreen: number, dyScreen: number): void {
  editorStore.setState((s) => ({
    viewport: { ...s.viewport, panX: s.viewport.panX + dxScreen, panY: s.viewport.panY + dyScreen },
  }));
}

/** Zoom keeping the world point under `screenPoint` stationary. */
export function zoomAt(screenPoint: Vec2, factor: number): void {
  editorStore.setState((s) => {
    const zoom = clamp(s.viewport.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    if (zoom === s.viewport.zoom) return s;
    const world = screenToWorld(s.viewport, screenPoint);
    return {
      viewport: {
        zoom,
        panX: screenPoint.x - world.x * zoom,
        panY: screenPoint.y - world.y * zoom,
      },
    };
  });
}

export function setZoom(zoom: number, screenCenter: Vec2): void {
  const state = editorStore.getState();
  const factor = clamp(zoom, ZOOM_MIN, ZOOM_MAX) / state.viewport.zoom;
  zoomAt(screenCenter, factor);
}

function canvasSize(): { width: number; height: number } {
  const el = document.getElementById('canvas-stage');
  return el ? { width: el.clientWidth, height: el.clientHeight } : { width: 1200, height: 800 };
}

export function zoomToRect(bounds: Rect, padding = 64): void {
  const { width, height } = canvasSize();
  if (bounds.width <= 0 && bounds.height <= 0) return;
  const zoom = clamp(
    Math.min((width - padding * 2) / Math.max(1, bounds.width), (height - padding * 2) / Math.max(1, bounds.height)),
    ZOOM_MIN,
    ZOOM_MAX,
  );
  editorStore.setState({
    viewport: {
      zoom,
      panX: width / 2 - (bounds.x + bounds.width / 2) * zoom,
      panY: height / 2 - (bounds.y + bounds.height / 2) * zoom,
    },
  });
}

export function zoomToFit(): void {
  const state = editorStore.getState();
  const index = getSceneIndex(state.doc);
  const all = rectUnionAll(
    state.doc.rootIds
      .map((id) => index.subtreeBounds.get(id))
      .filter((r): r is Rect => r !== undefined),
  );
  if (all) zoomToRect(all);
}

export function zoomToSelection(): void {
  const state = editorStore.getState();
  if (state.selection.length === 0) {
    zoomToFit();
    return;
  }
  const index = getSceneIndex(state.doc);
  const bounds = rectUnionAll(
    state.selection.map((id) => index.worldBounds.get(id)).filter((r): r is Rect => r !== undefined),
  );
  if (bounds) zoomToRect(bounds, 96);
}

export function zoom100(): void {
  const { width, height } = canvasSize();
  setZoom(1, { x: width / 2, y: height / 2 });
}

export function zoomStep(direction: 1 | -1): void {
  const { width, height } = canvasSize();
  zoomAt({ x: width / 2, y: height / 2 }, direction === 1 ? Math.SQRT2 : Math.SQRT1_2);
}
