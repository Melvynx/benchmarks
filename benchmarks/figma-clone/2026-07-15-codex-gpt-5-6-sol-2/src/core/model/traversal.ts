import type { ContainerNode, NodeId, SceneDocument, SceneNode } from './types';

export function isContainerNode(node: SceneNode): node is ContainerNode {
  return node.type === 'frame' || node.type === 'group';
}

export function getNode(scene: SceneDocument, nodeId: NodeId): SceneNode {
  const node = scene.nodes[nodeId];
  if (node === undefined) {
    throw new Error(`Scene node ${nodeId} does not exist`);
  }
  return node;
}

export function getContainerNode(scene: SceneDocument, nodeId: NodeId): ContainerNode {
  const node = getNode(scene, nodeId);
  if (!isContainerNode(node)) {
    throw new Error(`Scene node ${nodeId} is not a container`);
  }
  return node;
}

export interface TraverseContext {
  readonly depth: number;
  readonly parentId: NodeId | null;
  readonly index: number;
}

export type SceneVisitor = (node: SceneNode, context: TraverseContext) => void;

export function traverseScene(
  scene: SceneDocument,
  visitor: SceneVisitor,
  startIds: readonly NodeId[] = scene.rootIds,
): void {
  const visited = new Set<NodeId>();

  function visit(nodeId: NodeId, parentId: NodeId | null, depth: number, index: number): void {
    if (visited.has(nodeId)) {
      return;
    }
    const node = scene.nodes[nodeId];
    if (node === undefined) {
      return;
    }
    visited.add(nodeId);
    visitor(node, { depth, parentId, index });
    if (isContainerNode(node)) {
      node.childIds.forEach((childId, childIndex) => {
        visit(childId, node.id, depth + 1, childIndex);
      });
    }
  }

  startIds.forEach((nodeId, index) => {
    const parentId = scene.nodes[nodeId]?.parentId ?? null;
    visit(nodeId, parentId, 0, index);
  });
}

export interface FlattenSceneOptions {
  readonly includeHidden?: boolean;
  readonly startIds?: readonly NodeId[];
}

export function flattenScene(
  scene: SceneDocument,
  options: FlattenSceneOptions = {},
): readonly SceneNode[] {
  const flattened: SceneNode[] = [];
  traverseScene(
    scene,
    (node) => {
      if (options.includeHidden !== false || node.visible) {
        flattened.push(node);
      }
    },
    options.startIds ?? scene.rootIds,
  );
  return flattened;
}

export function getAncestorIds(scene: SceneDocument, nodeId: NodeId): readonly NodeId[] {
  const ancestors: NodeId[] = [];
  const seen = new Set<NodeId>([nodeId]);
  let parentId = getNode(scene, nodeId).parentId;
  while (parentId !== null && !seen.has(parentId)) {
    ancestors.push(parentId);
    seen.add(parentId);
    parentId = scene.nodes[parentId]?.parentId ?? null;
  }
  return ancestors;
}

export function getDescendantIds(scene: SceneDocument, nodeId: NodeId): readonly NodeId[] {
  const node = getNode(scene, nodeId);
  if (!isContainerNode(node)) {
    return [];
  }
  const descendants: NodeId[] = [];
  traverseScene(
    scene,
    (descendant) => {
      if (descendant.id !== nodeId) {
        descendants.push(descendant.id);
      }
    },
    [nodeId],
  );
  return descendants;
}

export function isDescendantOf(
  scene: SceneDocument,
  nodeId: NodeId,
  possibleAncestorId: NodeId,
): boolean {
  return getAncestorIds(scene, nodeId).includes(possibleAncestorId);
}

export function getSiblingIds(scene: SceneDocument, nodeId: NodeId): readonly NodeId[] {
  const node = getNode(scene, nodeId);
  return node.parentId === null ? scene.rootIds : getContainerNode(scene, node.parentId).childIds;
}

export function getNodeDepth(scene: SceneDocument, nodeId: NodeId): number {
  return getAncestorIds(scene, nodeId).length;
}
