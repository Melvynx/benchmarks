import type { BaseNodeProps, NodeId, SceneDocument, SceneNode } from './types';
import { childIdsOf, isContainer } from './types';
import { newId } from '../utils/id';

/**
 * A DraftDoc is a shallow copy of the document that mutation code is allowed
 * to edit. Node objects themselves are immutable — helpers always replace
 * them — so a gesture/commit can diff drafts against snapshots by reference.
 * (Alias kept distinct from SceneDocument to mark mutability at call sites.)
 */
export type DraftDoc = SceneDocument;

export function makeDraft(doc: SceneDocument): DraftDoc {
  return { nodes: { ...doc.nodes }, rootIds: [...doc.rootIds] };
}

export function getN(d: DraftDoc, id: NodeId): SceneNode | null {
  return d.nodes[id] ?? null;
}

export function mustN(d: DraftDoc, id: NodeId): SceneNode {
  const node = d.nodes[id];
  if (!node) throw new Error(`Draft node not found: ${id}`);
  return node;
}

/** Replace a node with a patched copy. Type-safe for narrowed nodes. */
export function patchNode<T extends SceneNode>(d: DraftDoc, node: T, patch: Partial<T>): T {
  const next = { ...node, ...patch };
  d.nodes[node.id] = next;
  return next;
}

/** Patch only shared base properties by id (works on any node type). */
export function patchBase(d: DraftDoc, id: NodeId, patch: Partial<BaseNodeProps>): void {
  const node = d.nodes[id];
  if (!node) return;
  d.nodes[id] = { ...node, ...patch };
}

function siblingsArray(d: DraftDoc, parentId: NodeId | null): NodeId[] {
  if (parentId === null) return d.rootIds;
  const parent = mustN(d, parentId);
  if (!isContainer(parent)) throw new Error(`Not a container: ${parentId}`);
  return [...parent.childIds];
}

function writeSiblings(d: DraftDoc, parentId: NodeId | null, ids: NodeId[]): void {
  if (parentId === null) {
    d.rootIds = ids;
  } else {
    const parent = mustN(d, parentId);
    if (!isContainer(parent)) throw new Error(`Not a container: ${parentId}`);
    d.nodes[parentId] = { ...parent, childIds: ids };
  }
}

/** Insert a node (already constructed, children linked) under a parent at index (-1 = append). */
export function addNode(d: DraftDoc, node: SceneNode, parentId: NodeId | null, index = -1): void {
  d.nodes[node.id] = node.parentId === parentId ? node : { ...node, parentId };
  const siblings = siblingsArray(d, parentId);
  const at = index < 0 || index > siblings.length ? siblings.length : index;
  siblings.splice(at, 0, node.id);
  writeSiblings(d, parentId, siblings);
}

/** Remove a node and its whole subtree from the draft. */
export function removeSubtree(d: DraftDoc, id: NodeId): void {
  const node = getN(d, id);
  if (!node) return;
  const siblings = siblingsArray(d, node.parentId);
  const at = siblings.indexOf(id);
  if (at >= 0) {
    siblings.splice(at, 1);
    writeSiblings(d, node.parentId, siblings);
  }
  const stack: NodeId[] = [id];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    const n = getN(d, current);
    if (!n) continue;
    stack.push(...childIdsOf(n));
    delete d.nodes[current];
  }
}

/**
 * Move a node to a new parent/index, keeping its local x/y untouched
 * (callers that need world-position preservation adjust coordinates first).
 */
export function moveNode(d: DraftDoc, id: NodeId, newParentId: NodeId | null, index: number): void {
  const node = mustN(d, id);
  const oldSiblings = siblingsArray(d, node.parentId);
  const oldIndex = oldSiblings.indexOf(id);
  if (oldIndex >= 0) {
    oldSiblings.splice(oldIndex, 1);
    writeSiblings(d, node.parentId, oldSiblings);
  }
  // Same-parent moves: account for the removal shifting indices.
  let at = index;
  if (node.parentId === newParentId && oldIndex >= 0 && oldIndex < index) at -= 1;
  const newSiblings = siblingsArray(d, newParentId);
  if (at < 0 || at > newSiblings.length) at = newSiblings.length;
  newSiblings.splice(at, 0, id);
  writeSiblings(d, newParentId, newSiblings);
  if (node.parentId !== newParentId) {
    patchBase(d, id, { parentId: newParentId });
  }
}

export interface ClonedSubtree {
  rootId: NodeId;
  nodes: SceneNode[];
}

/** Deep-clone a subtree with fresh ids. Does not insert into the draft. */
export function cloneSubtree(doc: SceneDocument, id: NodeId): ClonedSubtree | null {
  const source = doc.nodes[id];
  if (!source) return null;
  const nodes: SceneNode[] = [];

  const cloneRec = (nodeId: NodeId, parentId: NodeId | null): NodeId | null => {
    const node = doc.nodes[nodeId];
    if (!node) return null;
    const freshId = newId();
    const copy: SceneNode = structuredClone(node);
    copy.id = freshId;
    copy.parentId = parentId;
    if (isContainer(copy)) {
      const childClones: NodeId[] = [];
      for (const childId of copy.childIds) {
        const cloneId = cloneRec(childId, freshId);
        if (cloneId) childClones.push(cloneId);
      }
      copy.childIds = childClones;
    }
    nodes.push(copy);
    return freshId;
  };

  const rootId = cloneRec(id, source.parentId);
  if (!rootId) return null;
  return { rootId, nodes };
}
