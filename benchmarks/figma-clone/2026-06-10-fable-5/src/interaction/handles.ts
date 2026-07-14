import { radToDeg } from '../geometry/math';
import { rotationOf } from '../geometry/mat2d';
import type { Rect } from '../geometry/rect';
import { rectUnionAll } from '../geometry/rect';
import type { Vec2 } from '../geometry/vec2';
import { addV, distV, rotV, scaleV, subV } from '../geometry/vec2';
import { getSceneIndex } from '../scene/sceneIndex';
import { worldCorners } from '../scene/nodeGeometry';
import type { NodeId, SceneDocument } from '../scene/types';
import type { Viewport } from '../store/store';
import { worldToScreen } from '../store/viewport';

export type HandleKind = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const CORNER_HANDLES: readonly HandleKind[] = ['nw', 'ne', 'se', 'sw'];
export const EDGE_HANDLES: readonly HandleKind[] = ['n', 'e', 's', 'w'];

/**
 * The selection box: a rotated rectangle in world space. Single selections
 * inherit the node's world rotation; multi-selections are axis-aligned.
 */
export interface SelectionBox {
  center: Vec2;
  width: number;
  height: number;
  /** Radians, world space. */
  rotation: number;
}

export function getSelectionBox(doc: SceneDocument, ids: readonly NodeId[]): SelectionBox | null {
  if (ids.length === 0) return null;
  const index = getSceneIndex(doc);

  if (ids.length === 1) {
    const id = ids[0];
    const node = id ? doc.nodes[id] : undefined;
    const m = id ? index.worldMatrices.get(id) : undefined;
    if (!node || !m) return null;
    const rotation = rotationOf(m);
    const corners = worldCorners(doc, node);
    const center = scaleV(addV(corners[0], corners[2]), 0.5);
    return { center, width: node.width, height: node.height, rotation };
  }

  const bounds = rectUnionAll(
    ids.map((id) => index.worldBounds.get(id)).filter((r): r is Rect => r !== undefined),
  );
  if (!bounds) return null;
  return {
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
  };
}

export function selectionBoxToAABB(box: SelectionBox): Rect {
  const corners = boxCorners(box);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** World-space corners, clockwise from "nw" in the box's own frame. */
export function boxCorners(box: SelectionBox): [Vec2, Vec2, Vec2, Vec2] {
  const hw = box.width / 2;
  const hh = box.height / 2;
  return [
    addV(box.center, rotV({ x: -hw, y: -hh }, box.rotation)),
    addV(box.center, rotV({ x: hw, y: -hh }, box.rotation)),
    addV(box.center, rotV({ x: hw, y: hh }, box.rotation)),
    addV(box.center, rotV({ x: -hw, y: hh }, box.rotation)),
  ];
}

const HANDLE_OFFSETS: Record<HandleKind, Vec2> = {
  nw: { x: -0.5, y: -0.5 },
  n: { x: 0, y: -0.5 },
  ne: { x: 0.5, y: -0.5 },
  e: { x: 0.5, y: 0 },
  se: { x: 0.5, y: 0.5 },
  s: { x: 0, y: 0.5 },
  sw: { x: -0.5, y: 0.5 },
  w: { x: -0.5, y: 0 },
};

export function handleWorldPosition(box: SelectionBox, handle: HandleKind): Vec2 {
  const offset = HANDLE_OFFSETS[handle];
  return addV(box.center, rotV({ x: offset.x * box.width, y: offset.y * box.height }, box.rotation));
}

/** Angle (degrees, screen space) a resize cursor should take for a handle. */
export function handleCursorAngle(box: SelectionBox, handle: HandleKind): number {
  const base: Record<HandleKind, number> = { e: 0, w: 0, n: 90, s: 90, ne: 135, sw: 135, nw: 45, se: 45 };
  return base[handle] + radToDeg(box.rotation);
}

export interface HandleHit {
  type: 'resize' | 'rotate';
  handle: HandleKind;
}

const CORNER_TOLERANCE = 6;
const EDGE_TOLERANCE = 4;
const ROTATE_INNER = 6;
const ROTATE_OUTER = 18;

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = subV(b, a);
  const lengthSq = ab.x * ab.x + ab.y * ab.y;
  if (lengthSq === 0) return distV(p, a);
  let t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return distV(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

/**
 * Hit test the transform chrome in screen space: corner handles, edge
 * handles, then the invisible rotation ring just outside each corner.
 */
export function hitTestHandles(box: SelectionBox, screenPoint: Vec2, viewport: Viewport): HandleHit | null {
  const cornerScreens = new Map<HandleKind, Vec2>();
  for (const handle of [...CORNER_HANDLES, ...EDGE_HANDLES]) {
    cornerScreens.set(handle, worldToScreen(viewport, handleWorldPosition(box, handle)));
  }

  for (const handle of CORNER_HANDLES) {
    const p = cornerScreens.get(handle);
    if (p && distV(p, screenPoint) <= CORNER_TOLERANCE) return { type: 'resize', handle };
  }

  // Edge segments (between adjacent corners).
  const corners = boxCorners(box).map((c) => worldToScreen(viewport, c));
  const edges: Array<[HandleKind, Vec2, Vec2]> = [
    ['n', corners[0]!, corners[1]!],
    ['e', corners[1]!, corners[2]!],
    ['s', corners[2]!, corners[3]!],
    ['w', corners[3]!, corners[0]!],
  ];
  for (const [handle, a, b] of edges) {
    if (distToSegment(screenPoint, a, b) <= EDGE_TOLERANCE) return { type: 'resize', handle };
  }

  for (const handle of CORNER_HANDLES) {
    const p = cornerScreens.get(handle);
    if (!p) continue;
    const d = distV(p, screenPoint);
    if (d > ROTATE_INNER && d <= ROTATE_OUTER) return { type: 'rotate', handle };
  }
  return null;
}
