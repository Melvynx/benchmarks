import type { Mat2d } from '../geometry/mat2d';
import { IDENTITY, applyMxy, decomposeToNode, invertM, mul, nodeLocalMatrix } from '../geometry/mat2d';
import type { Rect } from '../geometry/rect';
import { boundsOfPoints } from '../geometry/rect';
import type { Vec2 } from '../geometry/vec2';
import type { DraftDoc } from './draft';
import { patchBase } from './draft';
import type { NodeId, SceneDocument, SceneNode } from './types';
import { getNode } from './traversal';

export function localMatrix(node: SceneNode): Mat2d {
  return nodeLocalMatrix(node.x, node.y, node.width, node.height, node.rotation);
}

/** Matrix mapping the node's own space → world (root) space. */
export function worldMatrix(doc: SceneDocument, id: NodeId): Mat2d {
  const chain: SceneNode[] = [];
  let current = getNode(doc, id);
  while (current) {
    chain.push(current);
    current = current.parentId === null ? null : getNode(doc, current.parentId);
  }
  let m = IDENTITY;
  for (let i = chain.length - 1; i >= 0; i--) {
    const node = chain[i];
    if (node) m = mul(m, localMatrix(node));
  }
  return m;
}

/** Matrix mapping the node's parent space → world space. */
export function parentWorldMatrix(doc: SceneDocument, id: NodeId): Mat2d {
  const node = getNode(doc, id);
  if (!node || node.parentId === null) return IDENTITY;
  return worldMatrix(doc, node.parentId);
}

/** The node's 4 corners in world space (clockwise from top-left). */
export function worldCorners(doc: SceneDocument, node: SceneNode): [Vec2, Vec2, Vec2, Vec2] {
  const m = worldMatrix(doc, node.id);
  return [
    applyMxy(m, 0, 0),
    applyMxy(m, node.width, 0),
    applyMxy(m, node.width, node.height),
    applyMxy(m, 0, node.height),
  ];
}

export function cornersWithMatrix(node: SceneNode, m: Mat2d): [Vec2, Vec2, Vec2, Vec2] {
  return [
    applyMxy(m, 0, 0),
    applyMxy(m, node.width, 0),
    applyMxy(m, node.width, node.height),
    applyMxy(m, 0, node.height),
  ];
}

/** Axis-aligned world bounds of the node's own box (not its children). */
export function worldAABB(doc: SceneDocument, node: SceneNode): Rect {
  return boundsOfPoints(worldCorners(doc, node));
}

export function selectionWorldBounds(doc: SceneDocument, ids: readonly NodeId[]): Rect | null {
  const points: Vec2[] = [];
  for (const id of ids) {
    const node = getNode(doc, id);
    if (!node) continue;
    points.push(...worldCorners(doc, node));
  }
  return points.length === 0 ? null : boundsOfPoints(points);
}

/**
 * Re-derive a node's (x, y, rotation) so that its own space maps through
 * `desiredWorld` while it lives under `newParentId`. Width/height unchanged.
 */
export function applyWorldPlacement(
  d: DraftDoc,
  id: NodeId,
  desiredWorld: Mat2d,
  newParentWorld: Mat2d,
): void {
  const node = d.nodes[id];
  if (!node) return;
  const local = mul(invertM(newParentWorld), desiredWorld);
  const { x, y, rotation } = decomposeToNode(local, node.width, node.height);
  patchBase(d, id, { x, y, rotation });
}

/**
 * Resize/re-origin a node to new local bounds `b` (expressed in the node's own
 * current space) without moving it in world space, shifting children back by
 * the origin delta. Used by group shrink-wrapping.
 */
export function rebaseLocalBounds(node: SceneNode, b: Rect): { x: number; y: number; width: number; height: number } {
  const oldLocal = localMatrix(node);
  // New local matrix must satisfy: M_new · (p - b.origin) = M_old · p
  const shifted = mul(oldLocal, { a: 1, b: 0, c: 0, d: 1, e: b.x, f: b.y });
  const { x, y } = decomposeToNode(shifted, b.width, b.height);
  return { x, y, width: b.width, height: b.height };
}

/** Local-space AABB of a child node inside its parent (parent coordinates). */
export function childBoundsInParent(node: SceneNode): Rect {
  const m = localMatrix(node);
  return boundsOfPoints([
    applyMxy(m, 0, 0),
    applyMxy(m, node.width, 0),
    applyMxy(m, node.width, node.height),
    applyMxy(m, 0, node.height),
  ]);
}
