import { describe, expect, it } from 'vitest';

import {
  applyMatrixToPoint,
  composeMatrices,
  rotationMatrixDegrees,
  translationMatrix,
} from '@/core/geometry/matrix2d';

import {
  createGroupNode,
  createRectangleNode,
  createSceneDocument,
  resolveGroupBounds,
} from './index';

function worldOrigin(
  group: { readonly x: number; readonly y: number; readonly rotation: number },
  child: { readonly x: number; readonly y: number; readonly rotation: number },
) {
  const matrix = composeMatrices(
    translationMatrix(group.x, group.y),
    rotationMatrixDegrees(group.rotation),
    translationMatrix(child.x, child.y),
    rotationMatrixDegrees(child.rotation),
  );
  return applyMatrixToPoint(matrix, { x: 0, y: 0 });
}

describe('resolveGroupBounds', () => {
  it('tightly normalizes a rotated group without changing child world geometry', () => {
    const child = createRectangleNode({
      id: 'child',
      parentId: 'group',
      x: 10,
      y: 20,
      width: 40,
      height: 30,
      rotation: 0,
    });
    const group = createGroupNode({
      id: 'group',
      x: 100,
      y: 50,
      width: 1,
      height: 1,
      rotation: 90,
      childIds: [child.id],
    });
    const beforeOrigin = worldOrigin(group, child);
    const resolved = resolveGroupBounds(
      createSceneDocument({ nodes: { [group.id]: group, [child.id]: child }, rootIds: [group.id] }),
    );
    const resolvedGroup = resolved.nodes[group.id];
    const resolvedChild = resolved.nodes[child.id];
    if (resolvedGroup?.type !== 'group' || !resolvedChild) throw new Error('Missing nodes');

    expect(resolvedGroup.x).toBeCloseTo(80);
    expect(resolvedGroup.y).toBeCloseTo(60);
    expect(resolvedGroup.width).toBeCloseTo(40);
    expect(resolvedGroup.height).toBeCloseTo(30);
    expect(resolvedChild.x).toBeCloseTo(0);
    expect(resolvedChild.y).toBeCloseTo(0);
    expect(worldOrigin(resolvedGroup, resolvedChild).x).toBeCloseTo(beforeOrigin.x, 8);
    expect(worldOrigin(resolvedGroup, resolvedChild).y).toBeCloseTo(beforeOrigin.y, 8);
  });

  it('recomputes enclosing bounds after a descendant geometry change', () => {
    const left = createRectangleNode({
      id: 'left',
      parentId: 'group',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
    });
    const right = createRectangleNode({
      id: 'right',
      parentId: 'group',
      x: 80,
      y: 30,
      width: 50,
      height: 10,
    });
    const group = createGroupNode({ id: 'group', childIds: [left.id, right.id] });
    const resolved = resolveGroupBounds(
      createSceneDocument({
        nodes: { [group.id]: group, [left.id]: left, [right.id]: right },
        rootIds: [group.id],
      }),
    );
    const resolvedGroup = resolved.nodes[group.id];
    if (resolvedGroup?.type !== 'group') throw new Error('Missing group');

    expect(resolvedGroup.width).toBe(130);
    expect(resolvedGroup.height).toBe(40);
  });
});
