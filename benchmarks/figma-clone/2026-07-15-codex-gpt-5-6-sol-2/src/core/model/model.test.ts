import { describe, expect, it } from 'vitest';

import {
  assertSceneInvariants,
  cloneSceneDocument,
  createEllipseNode,
  createFrameNode,
  createGroupNode,
  createImageNode,
  createLineNode,
  createPolygonNode,
  createRectangleNode,
  createSceneDocument,
  createStarNode,
  createTextNode,
  flattenScene,
  getAncestorIds,
  getDescendantIds,
  serializeScene,
  validateSceneInvariants,
  type SceneDocument,
} from './index';

function createNestedScene(): SceneDocument {
  const rectangle = createRectangleNode({
    id: 'rectangle',
    parentId: 'group',
    name: 'Nested rectangle',
  });
  const group = createGroupNode({
    id: 'group',
    parentId: 'frame',
    childIds: [rectangle.id],
  });
  const frame = createFrameNode({
    id: 'frame',
    childIds: [group.id],
  });
  return createSceneDocument({
    nodes: { frame, group, rectangle },
    rootIds: [frame.id],
  });
}

describe('scene model', () => {
  it('provides complete defaults for every discriminated node type', () => {
    const nodes = [
      createFrameNode(),
      createGroupNode(),
      createRectangleNode(),
      createEllipseNode(),
      createLineNode(),
      createTextNode(),
      createImageNode({
        source: {
          kind: 'data-url',
          uri: 'data:image/png;base64,AA==',
          mimeType: 'image/png',
          intrinsicWidth: 1,
          intrinsicHeight: 1,
        },
      }),
      createPolygonNode(),
      createStarNode(),
    ];

    expect(nodes.map((node) => node.type)).toEqual([
      'frame',
      'group',
      'rectangle',
      'ellipse',
      'line',
      'text',
      'image',
      'polygon',
      'star',
    ]);
    expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
    nodes.forEach((node) => {
      expect(node.opacity).toBe(1);
      expect(node.effects).toEqual([]);
      expect(node.cornerRadii.topLeft).toBe(0);
    });
  });

  it('validates and traverses a normalized scene in tree order', () => {
    const scene = createNestedScene();
    expect(validateSceneInvariants(scene)).toEqual([]);
    expect(flattenScene(scene).map((node) => node.id)).toEqual(['frame', 'group', 'rectangle']);
    expect(getAncestorIds(scene, 'rectangle')).toEqual(['group', 'frame']);
    expect(getDescendantIds(scene, 'frame')).toEqual(['group', 'rectangle']);
  });

  it('reports broken parent links and unreachable cycles without recursing forever', () => {
    const groupA = createGroupNode({
      id: 'a',
      parentId: 'b',
      childIds: ['b'],
    });
    const groupB = createGroupNode({
      id: 'b',
      parentId: 'a',
      childIds: ['a'],
    });
    const invalid = createSceneDocument({ nodes: { a: groupA, b: groupB } });
    const violations = validateSceneInvariants(invalid);

    expect(violations.some((issue) => issue.code === 'orphan')).toBe(true);
    expect(violations.some((issue) => issue.code === 'cycle')).toBe(true);
    expect(() => assertSceneInvariants(invalid)).toThrow(/unreachable/);
  });

  it('deep-clones every mutable collection and remains JSON serializable', () => {
    const scene = createNestedScene();
    const clone = cloneSceneDocument(scene);
    const frame = clone.nodes.frame;
    const sourceFrame = scene.nodes.frame;

    expect(clone).toEqual(scene);
    expect(clone).not.toBe(scene);
    expect(frame).not.toBe(sourceFrame);
    if (frame?.type !== 'frame' || sourceFrame?.type !== 'frame') {
      throw new Error('Expected frame nodes');
    }
    expect(frame.childIds).not.toBe(sourceFrame.childIds);
    expect(JSON.parse(serializeScene(clone))).toEqual(clone);
  });
});
