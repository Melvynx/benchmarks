import { hitTestTransformedShape } from '@/core/geometry/hit-test';
import { resolveAutoLayout } from '@/core/layout';
import {
  applyMatrixToPoint,
  composeMatrices,
  IDENTITY_MATRIX,
  invertMatrix,
  rotationMatrixDegrees,
  translationMatrix,
} from '@/core/geometry/matrix2d';
import {
  aabbContainsAabb,
  aabbsIntersect,
  aabbToRect,
  expandAabb,
  unionAabb,
} from '@/core/geometry/rect';
import { transformRectBounds, transformRectCorners } from '@/core/geometry/bounds';
import { SpatialGrid } from '@/core/spatial';
import { resolveGroupBounds } from '@/core/model/groupBounds';

import type { HitShape } from '@/core/geometry/hit-test';
import type { Matrix2D } from '@/core/geometry/matrix2d';
import type { AABB } from '@/core/geometry/rect';
import type { Vec2 } from '@/core/geometry/vec2';
import type { SceneDocument, SceneNode } from '@/core/model/types';
import type { SnapGuide } from './sessionTypes';

export interface RuntimeNode {
  readonly node: SceneNode;
  readonly worldMatrix: Matrix2D;
  readonly bounds: AABB;
  readonly order: number;
  readonly ancestorIds: readonly string[];
}

export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly guides: readonly SnapGuide[];
}

function isContainer(node: SceneNode) {
  return node.type === 'frame' || node.type === 'group';
}

function nodeMatrix(node: SceneNode) {
  return composeMatrices(translationMatrix(node.x, node.y), rotationMatrixDegrees(node.rotation));
}

function regularPolygonPoints(width: number, height: number, pointCount: number, innerRatio = 1) {
  const points: Vec2[] = [];
  const count = innerRatio < 1 ? pointCount * 2 : pointCount;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const radius = innerRatio < 1 && index % 2 === 1 ? innerRatio : 1;
    points.push({
      x: centerX + Math.cos(angle) * radiusX * radius,
      y: centerY + Math.sin(angle) * radiusY * radius,
    });
  }

  return points;
}

function toHitShape(node: SceneNode): HitShape {
  const rect = { x: 0, y: 0, width: node.width, height: node.height };
  switch (node.type) {
    case 'ellipse':
      return { kind: 'ellipse', rect };
    case 'line':
      return { kind: 'line', start: node.start, end: node.end, strokeWidth: maxStrokeWidth(node) };
    case 'polygon':
      return {
        kind: 'polygon',
        points: regularPolygonPoints(node.width, node.height, node.pointCount),
      };
    case 'star':
      return {
        kind: 'polygon',
        points: regularPolygonPoints(node.width, node.height, node.pointCount, node.innerRadius),
      };
    default:
      return { kind: 'rect', rect, cornerRadii: node.cornerRadii };
  }
}

function maxStrokeWidth(node: SceneNode) {
  return node.strokes.reduce(
    (largest, stroke) => (stroke.visible ? Math.max(largest, stroke.width) : largest),
    node.type === 'line' ? 1 : 0,
  );
}

function isNodeHit(runtimeNode: RuntimeNode, worldPoint: Vec2, tolerance: number) {
  const { node, worldMatrix } = runtimeNode;
  const hasVisibleFill = node.fills.some((fill) => fill.visible && fill.opacity > 0);
  return hitTestTransformedShape(worldPoint, toHitShape(node), worldMatrix, {
    fill: hasVisibleFill || node.type === 'text' || node.type === 'image' || isContainer(node),
    strokeWidth: maxStrokeWidth(node),
    tolerance,
  });
}

function isEffectivelyLocked(
  runtimeNode: RuntimeNode,
  runtimeNodes: ReadonlyMap<string, RuntimeNode>,
) {
  return (
    runtimeNode.node.locked ||
    runtimeNode.ancestorIds.some((ancestorId) => runtimeNodes.get(ancestorId)?.node.locked)
  );
}

function isPointInsideClips(
  worldPoint: Vec2,
  runtimeNode: RuntimeNode,
  runtimeNodes: ReadonlyMap<string, RuntimeNode>,
) {
  for (const ancestorId of runtimeNode.ancestorIds) {
    const ancestor = runtimeNodes.get(ancestorId);
    if (ancestor?.node.type !== 'frame' || !ancestor.node.clipContent) continue;
    const localPoint = applyMatrixToPoint(invertMatrix(ancestor.worldMatrix), worldPoint);
    if (
      localPoint.x < 0 ||
      localPoint.y < 0 ||
      localPoint.x > ancestor.node.width ||
      localPoint.y > ancestor.node.height
    ) {
      return false;
    }
  }
  return true;
}

function boundsFeatures(bounds: AABB, axis: 'x' | 'y') {
  return axis === 'x'
    ? [bounds.minX, (bounds.minX + bounds.maxX) / 2, bounds.maxX]
    : [bounds.minY, (bounds.minY + bounds.maxY) / 2, bounds.maxY];
}

function snapCorrectionLabel(correction: number) {
  const distance = Math.abs(correction);
  if (distance < 0.05) return null;
  const value = distance >= 10 ? Math.round(distance).toString() : distance.toFixed(1);
  return `Δ ${value} px`;
}

export class SceneRuntime {
  readonly #document: SceneDocument;
  readonly #runtimeNodes = new Map<string, RuntimeNode>();
  readonly #spatialIndex = new SpatialGrid();
  readonly #paintOrder: string[] = [];

  constructor(document: SceneDocument) {
    this.#document = resolveGroupBounds(resolveAutoLayout(document));
    this.#build();
  }

  get document() {
    return this.#document;
  }

  get nodeCount() {
    return this.#runtimeNodes.size;
  }

  get paintOrder() {
    return this.#paintOrder;
  }

  getRuntimeNode(id: string) {
    return this.#runtimeNodes.get(id) ?? null;
  }

  getNode(id: string) {
    return this.#document.nodes[id] ?? null;
  }

  getWorldMatrix(id: string) {
    return this.#runtimeNodes.get(id)?.worldMatrix ?? null;
  }

  getParentWorldMatrix(id: string) {
    const node = this.getNode(id);
    if (!node?.parentId) return IDENTITY_MATRIX;
    return this.getWorldMatrix(node.parentId) ?? IDENTITY_MATRIX;
  }

  getWorldBounds(id: string) {
    return this.#runtimeNodes.get(id)?.bounds ?? null;
  }

  getWorldCorners(id: string) {
    const runtimeNode = this.#runtimeNodes.get(id);
    if (!runtimeNode) return null;
    return transformRectCorners(
      { x: 0, y: 0, width: runtimeNode.node.width, height: runtimeNode.node.height },
      runtimeNode.worldMatrix,
    );
  }

  getSelectionBounds(ids: Iterable<string>) {
    let bounds: AABB | null = null;
    for (const id of ids) {
      const nodeBounds = this.getWorldBounds(id);
      if (!nodeBounds) continue;
      bounds = bounds ? unionAabb(bounds, nodeBounds) : nodeBounds;
    }
    return bounds;
  }

  hitTest(worldPoint: Vec2, tolerance: number, ignoredIds: ReadonlySet<string> = new Set()) {
    const candidates = this.#spatialIndex.queryPoint(worldPoint.x, worldPoint.y, tolerance);
    for (const candidate of candidates) {
      if (ignoredIds.has(candidate.id)) continue;
      const runtimeNode = this.#runtimeNodes.get(candidate.id);
      if (
        !runtimeNode ||
        isEffectivelyLocked(runtimeNode, this.#runtimeNodes) ||
        !runtimeNode.node.visible
      )
        continue;
      if (!isPointInsideClips(worldPoint, runtimeNode, this.#runtimeNodes)) continue;
      if (isNodeHit(runtimeNode, worldPoint, tolerance)) return runtimeNode.node;
    }
    return null;
  }

  getNodesInBounds(bounds: AABB, containmentOnly = false) {
    return this.#spatialIndex
      .query(bounds)
      .filter(({ id }) => {
        const runtimeNode = this.#runtimeNodes.get(id);
        if (
          !runtimeNode ||
          isEffectivelyLocked(runtimeNode, this.#runtimeNodes) ||
          !runtimeNode.node.visible
        )
          return false;
        return containmentOnly
          ? aabbContainsAabb(bounds, runtimeNode.bounds)
          : aabbsIntersect(bounds, runtimeNode.bounds);
      })
      .map(({ id }) => id);
  }

  snapMove(
    ids: ReadonlySet<string>,
    proposedX: number,
    proposedY: number,
    zoom: number,
  ): SnapResult {
    const selectionBounds = this.getSelectionBounds(ids);
    if (!selectionBounds) return { x: proposedX, y: proposedY, guides: [] };

    const movedBounds = {
      minX: selectionBounds.minX + proposedX,
      minY: selectionBounds.minY + proposedY,
      maxX: selectionBounds.maxX + proposedX,
      maxY: selectionBounds.maxY + proposedY,
    };
    const threshold = 6 / zoom;
    const candidates = this.#spatialIndex
      .query(expandAabb(movedBounds, Math.max(160 / zoom, threshold)))
      .filter(({ id }) => {
        if (ids.has(id)) return false;
        const candidate = this.#runtimeNodes.get(id);
        // A selected container moves with its descendants. They must never become
        // snap targets for the very gesture that moves them.
        return !candidate?.ancestorIds.some((ancestorId) => ids.has(ancestorId));
      });

    let bestX: {
      readonly correction: number;
      readonly position: number;
      readonly bounds: AABB;
    } | null = null;
    let bestY: {
      readonly correction: number;
      readonly position: number;
      readonly bounds: AABB;
    } | null = null;

    for (const candidate of candidates) {
      const targetBounds = this.#runtimeNodes.get(candidate.id)?.bounds;
      if (!targetBounds) continue;
      for (const sourceX of boundsFeatures(movedBounds, 'x')) {
        for (const targetX of boundsFeatures(targetBounds, 'x')) {
          const correction = targetX - sourceX;
          if (Math.abs(correction) > threshold) continue;
          if (!bestX || Math.abs(correction) < Math.abs(bestX.correction)) {
            bestX = { correction, position: targetX, bounds: targetBounds };
          }
        }
      }
      for (const sourceY of boundsFeatures(movedBounds, 'y')) {
        for (const targetY of boundsFeatures(targetBounds, 'y')) {
          const correction = targetY - sourceY;
          if (Math.abs(correction) > threshold) continue;
          if (!bestY || Math.abs(correction) < Math.abs(bestY.correction)) {
            bestY = { correction, position: targetY, bounds: targetBounds };
          }
        }
      }
    }

    const guides: SnapGuide[] = [];
    if (bestX) {
      const label = snapCorrectionLabel(bestX.correction);
      guides.push({
        axis: 'x',
        position: bestX.position,
        start: Math.min(movedBounds.minY, bestX.bounds.minY),
        end: Math.max(movedBounds.maxY, bestX.bounds.maxY),
        ...(label ? { label } : {}),
      });
    }
    if (bestY) {
      const label = snapCorrectionLabel(bestY.correction);
      guides.push({
        axis: 'y',
        position: bestY.position,
        start: Math.min(movedBounds.minX, bestY.bounds.minX),
        end: Math.max(movedBounds.maxX, bestY.bounds.maxX),
        ...(label ? { label } : {}),
      });
    }

    return {
      x: proposedX + (bestX?.correction ?? 0),
      y: proposedY + (bestY?.correction ?? 0),
      guides,
    };
  }

  getVisibleRuntimeNodes(viewportBounds?: AABB): readonly RuntimeNode[] {
    if (!viewportBounds) {
      return this.#paintOrder
        .map((id) => this.#runtimeNodes.get(id))
        .filter((node): node is RuntimeNode => node !== undefined);
    }
    const visibleIds = new Set(this.#spatialIndex.query(viewportBounds).map(({ id }) => id));
    return this.#paintOrder
      .filter((id) => visibleIds.has(id))
      .map((id) => this.#runtimeNodes.get(id))
      .filter((node): node is RuntimeNode => node !== undefined);
  }

  #build() {
    let order = 0;
    const visit = (
      id: string,
      parentMatrix: Matrix2D,
      ancestorIds: readonly string[],
      isAncestorVisible: boolean,
    ) => {
      const node = this.#document.nodes[id];
      if (!node) return;
      const worldMatrix = composeMatrices(parentMatrix, nodeMatrix(node));
      const bounds = transformRectBounds(
        { x: 0, y: 0, width: node.width, height: node.height },
        worldMatrix,
      );
      const isVisible = isAncestorVisible && node.visible;
      const runtimeNode = { node, worldMatrix, bounds, order, ancestorIds } satisfies RuntimeNode;
      this.#runtimeNodes.set(id, runtimeNode);
      this.#paintOrder.push(id);
      if (isVisible) this.#spatialIndex.insert({ id, order, ...bounds });
      order += 1;

      if (!isContainer(node)) return;
      const nextAncestors = [...ancestorIds, id];
      for (const childId of node.childIds) visit(childId, worldMatrix, nextAncestors, isVisible);
    };

    for (const rootId of this.#document.rootIds) visit(rootId, IDENTITY_MATRIX, [], true);
  }
}

export function boundsToRect(bounds: AABB) {
  return aabbToRect(bounds);
}
