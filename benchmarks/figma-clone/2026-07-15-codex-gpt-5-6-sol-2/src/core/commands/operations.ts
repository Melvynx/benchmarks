import {
  assertSceneInvariants,
  cloneSceneNode,
  createGroupNode,
  flattenScene,
  getAncestorIds,
  getContainerNode,
  getDescendantIds,
  getNode,
  getSiblingIds,
  isContainerNode,
  type CommonNodeChanges,
  type ContainerNode,
  type NodeId,
  type SceneDocument,
  type SceneNode,
} from '../model';
import { BatchCommand, PatchCommand } from './command';
import type { ScenePatch } from './patches';
import {
  getNodesBoundsInParent,
  transformNodeIntoSyntheticParent,
  transformNodeToParent,
  type NodeTransform,
} from './transform';

function equalIds(left: readonly NodeId[], right: readonly NodeId[]): boolean {
  return left.length === right.length && left.every((nodeId, index) => nodeId === right[index]);
}

function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) {
    throw new Error('Layer index must be finite');
  }
  return Math.min(Math.max(Math.trunc(index), 0), length);
}

function replaceContainerChildren(
  container: ContainerNode,
  childIds: readonly NodeId[],
): ContainerNode {
  if (container.type === 'frame') {
    return { ...cloneSceneNode(container), childIds: [...childIds] };
  }
  return { ...cloneSceneNode(container), childIds: [...childIds] };
}

function nodePatch(before: SceneNode | null, after: SceneNode | null, nodeId: NodeId): ScenePatch {
  return { type: 'node', nodeId, before, after };
}

function rootsPatch(before: readonly NodeId[], after: readonly NodeId[]): ScenePatch {
  return { type: 'root-order', before, after };
}

function containerChildrenPatch(container: ContainerNode, childIds: readonly NodeId[]): ScenePatch {
  return nodePatch(container, replaceContainerChildren(container, childIds), container.id);
}

function withPlacement(
  node: SceneNode,
  parentId: NodeId | null,
  transform?: NodeTransform,
): SceneNode {
  const placedNode = {
    ...cloneSceneNode(node),
    parentId,
    x: transform?.x ?? node.x,
    y: transform?.y ?? node.y,
    rotation: transform?.rotation ?? node.rotation,
  };
  return cloneSceneNode(placedNode);
}

function withCommonChanges<Node extends SceneNode>(node: Node, changes: CommonNodeChanges): Node {
  const changedNode = {
    ...cloneSceneNode(node),
    ...changes,
    id: node.id,
    parentId: node.parentId,
  };
  return cloneSceneNode(changedNode);
}

function getTopLevelSelection(scene: SceneDocument, nodeIds: readonly NodeId[]): readonly NodeId[] {
  const requested = new Set(nodeIds);
  const unique = [...requested];
  unique.forEach((nodeId) => getNode(scene, nodeId));
  const topLevelIds = new Set(
    unique.filter(
      (nodeId) => !getAncestorIds(scene, nodeId).some((ancestorId) => requested.has(ancestorId)),
    ),
  );
  return flattenScene(scene)
    .map((node) => node.id)
    .filter((nodeId) => topLevelIds.has(nodeId));
}

function assertUnchangedStructure(before: SceneNode, after: SceneNode): void {
  if (before.id !== after.id || before.type !== after.type || before.parentId !== after.parentId) {
    throw new Error(`Update for ${before.id} attempted to change structural identity`);
  }
  if (
    isContainerNode(before) &&
    isContainerNode(after) &&
    !equalIds(before.childIds, after.childIds)
  ) {
    throw new Error(`Update for ${before.id} attempted to change child structure`);
  }
}

function createStructuralPatches(
  scene: SceneDocument,
  rootIds: readonly NodeId[],
  parentChildren: ReadonlyMap<NodeId, readonly NodeId[]>,
): ScenePatch[] {
  const patches: ScenePatch[] = [];
  if (!equalIds(scene.rootIds, rootIds)) {
    patches.push(rootsPatch(scene.rootIds, rootIds));
  }
  for (const [parentId, childIds] of parentChildren) {
    const parent = getContainerNode(scene, parentId);
    if (!equalIds(parent.childIds, childIds)) {
      patches.push(containerChildrenPatch(parent, childIds));
    }
  }
  return patches;
}

function assertCommandScene(scene: SceneDocument): void {
  assertSceneInvariants(scene);
}

export interface CreateNodePlacement {
  readonly parentId?: NodeId | null;
  readonly index?: number;
}

export function createNodeCommand(
  scene: SceneDocument,
  node: SceneNode,
  placement: CreateNodePlacement = {},
): PatchCommand {
  assertCommandScene(scene);
  if (scene.nodes[node.id] !== undefined) {
    throw new Error(`Cannot create duplicate node ${node.id}`);
  }
  if (isContainerNode(node) && node.childIds.length > 0) {
    throw new Error(
      'createNodeCommand only accepts empty containers; use structural commands for subtrees',
    );
  }
  const parentId = placement.parentId === undefined ? node.parentId : placement.parentId;
  const createdNode = withPlacement(node, parentId);
  const patches: ScenePatch[] = [nodePatch(null, createdNode, node.id)];
  if (parentId === null) {
    const index = clampIndex(placement.index ?? scene.rootIds.length, scene.rootIds.length);
    const rootIds = [...scene.rootIds];
    rootIds.splice(index, 0, node.id);
    patches.push(rootsPatch(scene.rootIds, rootIds));
  } else {
    const parent = getContainerNode(scene, parentId);
    const index = clampIndex(placement.index ?? parent.childIds.length, parent.childIds.length);
    const childIds = [...parent.childIds];
    childIds.splice(index, 0, node.id);
    patches.push(containerChildrenPatch(parent, childIds));
  }
  return new PatchCommand(`Create ${node.name}`, patches);
}

export function createUpdateNodesCommand(
  scene: SceneDocument,
  replacements: readonly SceneNode[],
  label = replacements.length === 1 ? 'Update layer' : 'Update layers',
): PatchCommand {
  assertCommandScene(scene);
  const seen = new Set<NodeId>();
  const patches = replacements.map((replacement) => {
    if (seen.has(replacement.id)) {
      throw new Error(`Node ${replacement.id} was updated more than once`);
    }
    seen.add(replacement.id);
    const before = getNode(scene, replacement.id);
    assertUnchangedStructure(before, replacement);
    return nodePatch(before, cloneSceneNode(replacement), replacement.id);
  });
  return new PatchCommand(label, patches);
}

export function createSetNodePropertiesCommand(
  scene: SceneDocument,
  nodeIds: readonly NodeId[],
  changes: CommonNodeChanges,
  label = nodeIds.length === 1 ? 'Update layer' : 'Update layers',
): PatchCommand {
  const replacements = [...new Set(nodeIds)].map((nodeId) =>
    withCommonChanges(getNode(scene, nodeId), changes),
  );
  return createUpdateNodesCommand(scene, replacements, label);
}

export function createDeleteNodesCommand(
  scene: SceneDocument,
  nodeIds: readonly NodeId[],
): PatchCommand {
  assertCommandScene(scene);
  const topLevelIds = getTopLevelSelection(scene, nodeIds);
  if (topLevelIds.length === 0) {
    throw new Error('Delete requires at least one node');
  }
  const topLevelSet = new Set(topLevelIds);
  const parentChildren = new Map<NodeId, readonly NodeId[]>();
  const rootIds = scene.rootIds.filter((nodeId) => !topLevelSet.has(nodeId));
  for (const nodeId of topLevelIds) {
    const node = getNode(scene, nodeId);
    if (node.parentId !== null && !parentChildren.has(node.parentId)) {
      const parent = getContainerNode(scene, node.parentId);
      parentChildren.set(
        parent.id,
        parent.childIds.filter((childId) => !topLevelSet.has(childId)),
      );
    }
  }
  const deletedIds = new Set<NodeId>();
  for (const nodeId of topLevelIds) {
    deletedIds.add(nodeId);
    getDescendantIds(scene, nodeId).forEach((descendantId) => deletedIds.add(descendantId));
  }
  const patches = createStructuralPatches(scene, rootIds, parentChildren);
  for (const nodeId of deletedIds) {
    patches.push(nodePatch(getNode(scene, nodeId), null, nodeId));
  }
  return new PatchCommand(
    topLevelIds.length === 1 ? 'Delete layer' : `Delete ${topLevelIds.length} layers`,
    patches,
  );
}

export function createDeleteNodeCommand(scene: SceneDocument, nodeId: NodeId): PatchCommand {
  return createDeleteNodesCommand(scene, [nodeId]);
}

export function createReorderNodeCommand(
  scene: SceneDocument,
  nodeId: NodeId,
  targetIndex: number,
): PatchCommand {
  assertCommandScene(scene);
  const node = getNode(scene, nodeId);
  const siblings = [...getSiblingIds(scene, nodeId)];
  const currentIndex = siblings.indexOf(nodeId);
  siblings.splice(currentIndex, 1);
  siblings.splice(clampIndex(targetIndex, siblings.length), 0, nodeId);
  const patch =
    node.parentId === null
      ? rootsPatch(scene.rootIds, siblings)
      : containerChildrenPatch(getContainerNode(scene, node.parentId), siblings);
  return new PatchCommand(`Reorder ${node.name}`, [patch]);
}

export interface ReparentOptions {
  readonly index?: number;
  readonly preserveWorldPosition?: boolean;
}

export function createReparentNodesCommand(
  scene: SceneDocument,
  nodeIds: readonly NodeId[],
  parentId: NodeId | null,
  options: ReparentOptions = {},
): PatchCommand {
  assertCommandScene(scene);
  const movingIds = getTopLevelSelection(scene, nodeIds);
  if (movingIds.length === 0) {
    throw new Error('Reparent requires at least one node');
  }
  if (parentId !== null) {
    getContainerNode(scene, parentId);
    const invalidTarget = movingIds.some(
      (nodeId) => nodeId === parentId || getAncestorIds(scene, parentId).includes(nodeId),
    );
    if (invalidTarget) {
      throw new Error('A node cannot be reparented into itself or its descendants');
    }
  }

  const movingSet = new Set(movingIds);
  let rootIds = scene.rootIds.filter((nodeId) => !movingSet.has(nodeId));
  const parentChildren = new Map<NodeId, readonly NodeId[]>();
  for (const nodeId of movingIds) {
    const currentParentId = getNode(scene, nodeId).parentId;
    if (currentParentId !== null && !parentChildren.has(currentParentId)) {
      const currentParent = getContainerNode(scene, currentParentId);
      parentChildren.set(
        currentParentId,
        currentParent.childIds.filter((childId) => !movingSet.has(childId)),
      );
    }
  }

  if (parentId === null) {
    const index = clampIndex(options.index ?? rootIds.length, rootIds.length);
    rootIds = [...rootIds.slice(0, index), ...movingIds, ...rootIds.slice(index)];
  } else {
    const parent = getContainerNode(scene, parentId);
    const current =
      parentChildren.get(parentId) ?? parent.childIds.filter((id) => !movingSet.has(id));
    const index = clampIndex(options.index ?? current.length, current.length);
    parentChildren.set(parentId, [
      ...current.slice(0, index),
      ...movingIds,
      ...current.slice(index),
    ]);
  }

  const patches = createStructuralPatches(scene, rootIds, parentChildren);
  for (const nodeId of movingIds) {
    const node = getNode(scene, nodeId);
    const shouldTransform = options.preserveWorldPosition !== false && node.parentId !== parentId;
    const transform = shouldTransform ? transformNodeToParent(scene, nodeId, parentId) : undefined;
    patches.push(nodePatch(node, withPlacement(node, parentId, transform), nodeId));
  }
  return new PatchCommand(
    movingIds.length === 1 ? 'Reparent layer' : `Reparent ${movingIds.length} layers`,
    patches,
  );
}

export interface GroupNodesOptions {
  readonly id?: NodeId;
  readonly name?: string;
}

export function createGroupNodesCommand(
  scene: SceneDocument,
  nodeIds: readonly NodeId[],
  options: GroupNodesOptions = {},
): PatchCommand {
  assertCommandScene(scene);
  const selected = getTopLevelSelection(scene, nodeIds);
  if (selected.length === 0) {
    throw new Error('Group requires at least one node');
  }
  const firstSelectedId = selected[0];
  if (firstSelectedId === undefined) {
    throw new Error('Group selection unexpectedly became empty');
  }
  const parentId = getNode(scene, firstSelectedId).parentId;
  if (selected.some((nodeId) => getNode(scene, nodeId).parentId !== parentId)) {
    throw new Error('Grouped nodes must share the same parent');
  }
  const siblings = parentId === null ? scene.rootIds : getContainerNode(scene, parentId).childIds;
  const selectedSet = new Set(selected);
  const orderedSelection = siblings.filter((nodeId) => selectedSet.has(nodeId));
  const firstSelectedIndex = Math.min(
    ...orderedSelection.map((nodeId) => siblings.indexOf(nodeId)),
  );
  const insertionIndex = siblings
    .slice(0, firstSelectedIndex)
    .filter((nodeId) => !selectedSet.has(nodeId)).length;
  const bounds = getNodesBoundsInParent(scene, orderedSelection);
  const group = createGroupNode({
    ...(options.id === undefined ? {} : { id: options.id }),
    name: options.name ?? 'Group',
    parentId,
    childIds: orderedSelection,
    ...bounds,
  });
  if (scene.nodes[group.id] !== undefined) {
    throw new Error(`Cannot create duplicate group ${group.id}`);
  }
  const nextSiblings = siblings.filter((nodeId) => !selectedSet.has(nodeId));
  nextSiblings.splice(insertionIndex, 0, group.id);
  const patches: ScenePatch[] = [nodePatch(null, group, group.id)];
  if (parentId === null) {
    patches.push(rootsPatch(scene.rootIds, nextSiblings));
  } else {
    patches.push(containerChildrenPatch(getContainerNode(scene, parentId), nextSiblings));
  }
  for (const nodeId of orderedSelection) {
    const node = getNode(scene, nodeId);
    const transform = transformNodeIntoSyntheticParent(scene, nodeId, group);
    patches.push(nodePatch(node, withPlacement(node, group.id, transform), nodeId));
  }
  return new PatchCommand(`Group ${orderedSelection.length} layers`, patches);
}

export function createUngroupNodeCommand(scene: SceneDocument, groupId: NodeId): PatchCommand {
  assertCommandScene(scene);
  const node = getNode(scene, groupId);
  if (node.type !== 'group') {
    throw new Error(`Node ${groupId} is not a group`);
  }
  const siblings = [...getSiblingIds(scene, groupId)];
  const groupIndex = siblings.indexOf(groupId);
  siblings.splice(groupIndex, 1, ...node.childIds);
  const patches: ScenePatch[] = [];
  if (node.parentId === null) {
    patches.push(rootsPatch(scene.rootIds, siblings));
  } else {
    patches.push(containerChildrenPatch(getContainerNode(scene, node.parentId), siblings));
  }
  for (const childId of node.childIds) {
    const child = getNode(scene, childId);
    const transform = transformNodeToParent(scene, childId, node.parentId);
    patches.push(nodePatch(child, withPlacement(child, node.parentId, transform), childId));
  }
  patches.push(nodePatch(node, null, groupId));
  return new PatchCommand(`Ungroup ${node.name}`, patches);
}

export function createUngroupNodesCommand(
  scene: SceneDocument,
  groupIds: readonly NodeId[],
): BatchCommand {
  if (groupIds.length === 0) {
    throw new Error('Ungroup requires at least one group');
  }
  let workingScene = scene;
  const commands = groupIds.map((groupId) => {
    const command = createUngroupNodeCommand(workingScene, groupId);
    workingScene = command.execute(workingScene);
    return command;
  });
  return new BatchCommand(
    groupIds.length === 1 ? 'Ungroup layer' : `Ungroup ${groupIds.length} layers`,
    commands,
  );
}
