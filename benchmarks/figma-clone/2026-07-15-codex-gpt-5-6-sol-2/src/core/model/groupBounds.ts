import { transformRectBounds } from '@/core/geometry/bounds';
import { rotationMatrixDegrees } from '@/core/geometry/matrix2d';
import { unionAabb } from '@/core/geometry/rect';

import { cloneSceneNode } from './clone';

import type { AABB } from '@/core/geometry/rect';
import type { GroupNode, SceneDocument, SceneNode } from './types';

const EPSILON = 1e-9;

function normalize(value: number) {
  return Math.abs(value) < EPSILON ? 0 : value;
}

function sameNumber(left: number, right: number) {
  return Math.abs(left - right) < EPSILON;
}

function localMatrix(node: SceneNode) {
  const rotation = rotationMatrixDegrees(node.rotation);
  return { ...rotation, e: node.x, f: node.y };
}

function childBoundsInGroup(nodes: Readonly<Record<string, SceneNode>>, group: GroupNode) {
  let bounds: AABB | null = null;
  for (const childId of group.childIds) {
    const child = nodes[childId];
    if (!child) continue;
    const childBounds = transformRectBounds(
      { x: 0, y: 0, width: child.width, height: child.height },
      localMatrix(child),
    );
    bounds = bounds === null ? childBounds : unionAabb(bounds, childBounds);
  }
  return bounds;
}

/**
 * Normalizes groups to tightly enclose their direct descendants while preserving
 * every descendant's world geometry. A group has no painted geometry of its own,
 * so stale serialized width/height values must never participate in selection,
 * fitting, or hit testing.
 *
 * The returned document is immutable. Empty groups retain their authored bounds,
 * which gives callers a predictable recovery surface while a group is being built.
 */
export function resolveGroupBounds(document: SceneDocument): SceneDocument {
  if (!Object.values(document.nodes).some((node) => node.type === 'group')) return document;

  const nodes: Record<string, SceneNode> = { ...document.nodes };

  const visit = (id: string) => {
    const source = nodes[id];
    if (!source) return;

    if (source.type === 'frame' || source.type === 'group') {
      for (const childId of source.childIds) visit(childId);
    }
    const group = nodes[id];
    if (group?.type !== 'group') return;

    const bounds = childBoundsInGroup(nodes, group);
    if (!bounds) return;

    const offsetX = normalize(bounds.minX);
    const offsetY = normalize(bounds.minY);
    const targetWidth = normalize(bounds.maxX - bounds.minX);
    const targetHeight = normalize(bounds.maxY - bounds.minY);
    const rotation = rotationMatrixDegrees(group.rotation);
    const translatedX = normalize(group.x + rotation.a * offsetX + rotation.c * offsetY);
    const translatedY = normalize(group.y + rotation.b * offsetX + rotation.d * offsetY);
    const needsGroupUpdate =
      !sameNumber(group.x, translatedX) ||
      !sameNumber(group.y, translatedY) ||
      !sameNumber(group.width, targetWidth) ||
      !sameNumber(group.height, targetHeight);

    if (needsGroupUpdate) {
      nodes[group.id] = cloneSceneNode({
        ...group,
        x: translatedX,
        y: translatedY,
        width: targetWidth,
        height: targetHeight,
      });
    }

    if (offsetX === 0 && offsetY === 0) return;
    for (const childId of group.childIds) {
      const child = nodes[childId];
      if (!child) continue;
      nodes[childId] = cloneSceneNode({
        ...child,
        x: normalize(child.x - offsetX),
        y: normalize(child.y - offsetY),
      });
    }
  };

  for (const rootId of document.rootIds) visit(rootId);
  return { ...document, nodes };
}
