import { describe, expect, it } from 'vitest';

import { createFrameNode, createRectangleNode, createSceneDocument } from '@/core/model';

import { SceneRuntime } from './sceneRuntime';

import type { SceneNode } from '@/core/model';

describe('SceneRuntime dense-scene behavior', () => {
  it('indexes, culls, and hit-tests a 1,500-node scene', () => {
    const columns = 50;
    const rows = 30;
    const nodes: Record<string, SceneNode> = {};
    const rootIds: string[] = [];

    for (let index = 0; index < columns * rows; index += 1) {
      const id = `rectangle:dense-${index}`;
      const node = createRectangleNode({
        id,
        name: `Dense rectangle ${index + 1}`,
        x: (index % columns) * 24,
        y: Math.floor(index / columns) * 24,
        width: 16,
        height: 16,
      });
      nodes[id] = node;
      rootIds.push(id);
    }

    const runtime = new SceneRuntime(createSceneDocument({ nodes, rootIds }));
    const visible = runtime.getVisibleRuntimeNodes({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    });

    expect(runtime.nodeCount).toBe(1_500);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(100);
    expect(runtime.hitTest({ x: 8, y: 8 }, 0)?.id).toBe('rectangle:dense-0');
    expect(runtime.hitTest({ x: 1_184, y: 704 }, 0)?.id).toBe('rectangle:dense-1499');
  });

  it('reports the smart-guide correction as a distance badge', () => {
    const source = createRectangleNode({ id: 'rectangle:source', width: 20, height: 20 });
    const target = createRectangleNode({
      id: 'rectangle:target',
      x: 100,
      width: 20,
      height: 20,
    });
    const runtime = new SceneRuntime(
      createSceneDocument({
        nodes: { [source.id]: source, [target.id]: target },
        rootIds: [source.id, target.id],
      }),
    );

    const result = runtime.snapMove(new Set([source.id]), 78, 0, 1);

    expect(result.x).toBe(80);
    expect(result.guides.some((guide) => guide.label === 'Δ 2.0 px')).toBe(true);
  });

  it('treats descendants of a locked container as locked for spatial interaction', () => {
    const child = createRectangleNode({
      id: 'rectangle:locked-child',
      parentId: 'frame:locked-parent',
      x: 20,
      y: 20,
      width: 40,
      height: 40,
    });
    const frame = createFrameNode({
      id: 'frame:locked-parent',
      locked: true,
      childIds: [child.id],
      width: 100,
      height: 100,
    });
    const runtime = new SceneRuntime(
      createSceneDocument({
        nodes: { [frame.id]: frame, [child.id]: child },
        rootIds: [frame.id],
      }),
    );

    expect(runtime.hitTest({ x: 40, y: 40 }, 0)).toBeNull();
    expect(runtime.getNodesInBounds({ minX: 0, minY: 0, maxX: 100, maxY: 100 })).toEqual([]);
  });
});
