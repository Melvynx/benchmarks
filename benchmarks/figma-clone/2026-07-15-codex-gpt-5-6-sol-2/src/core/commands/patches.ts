import {
  assertSceneInvariants,
  cloneSceneNode,
  type NodeId,
  type SceneDocument,
  type SceneNode,
} from '../model';

export interface NodeScenePatch {
  readonly type: 'node';
  readonly nodeId: NodeId;
  readonly before: SceneNode | null;
  readonly after: SceneNode | null;
}

export interface RootOrderScenePatch {
  readonly type: 'root-order';
  readonly before: readonly NodeId[];
  readonly after: readonly NodeId[];
}

export type ScenePatch = NodeScenePatch | RootOrderScenePatch;
export type PatchDirection = 'forward' | 'backward';

export class CommandConflictError extends Error {
  readonly patch: ScenePatch;

  constructor(message: string, patch: ScenePatch) {
    super(message);
    this.name = 'CommandConflictError';
    this.patch = patch;
  }
}

export function cloneScenePatch(patch: ScenePatch): ScenePatch {
  if (patch.type === 'root-order') {
    return {
      type: 'root-order',
      before: [...patch.before],
      after: [...patch.after],
    };
  }
  return {
    type: 'node',
    nodeId: patch.nodeId,
    before: patch.before === null ? null : cloneSceneNode(patch.before),
    after: patch.after === null ? null : cloneSceneNode(patch.after),
  };
}

function nodeFingerprint(node: SceneNode | null): string {
  return JSON.stringify(node);
}

function equalNode(left: SceneNode | null, right: SceneNode | null): boolean {
  return nodeFingerprint(left) === nodeFingerprint(right);
}

function equalOrder(left: readonly NodeId[], right: readonly NodeId[]): boolean {
  return left.length === right.length && left.every((nodeId, index) => nodeId === right[index]);
}

function assertPatchPrecondition(
  nodes: Readonly<Record<NodeId, SceneNode>>,
  rootIds: readonly NodeId[],
  patch: ScenePatch,
  direction: PatchDirection,
): void {
  if (patch.type === 'root-order') {
    const expected = direction === 'forward' ? patch.before : patch.after;
    if (!equalOrder(rootIds, expected)) {
      throw new CommandConflictError('Root order changed since the command was created', patch);
    }
    return;
  }
  const current = nodes[patch.nodeId] ?? null;
  const expected = direction === 'forward' ? patch.before : patch.after;
  if (!equalNode(current, expected)) {
    throw new CommandConflictError(
      `Node ${patch.nodeId} changed since the command was created`,
      patch,
    );
  }
}

function applyPatch(
  nodes: Record<NodeId, SceneNode>,
  rootIds: NodeId[],
  patch: ScenePatch,
  direction: PatchDirection,
): NodeId[] {
  assertPatchPrecondition(nodes, rootIds, patch, direction);
  if (patch.type === 'root-order') {
    const value = direction === 'forward' ? patch.after : patch.before;
    return [...value];
  }
  const value = direction === 'forward' ? patch.after : patch.before;
  if (value === null) {
    Reflect.deleteProperty(nodes, patch.nodeId);
  } else {
    nodes[patch.nodeId] = cloneSceneNode(value);
  }
  return rootIds;
}

export function applyScenePatches(
  scene: SceneDocument,
  patches: readonly ScenePatch[],
  direction: PatchDirection,
): SceneDocument {
  const nodes: Record<NodeId, SceneNode> = { ...scene.nodes };
  let rootIds = [...scene.rootIds];
  const orderedPatches = direction === 'forward' ? patches : [...patches].reverse();
  for (const patch of orderedPatches) {
    rootIds = applyPatch(nodes, rootIds, patch, direction);
  }
  const result: SceneDocument = {
    ...scene,
    nodes,
    rootIds,
    revision: scene.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  assertSceneInvariants(result);
  return result;
}
