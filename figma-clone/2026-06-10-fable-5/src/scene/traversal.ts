import type { NodeId, SceneDocument, SceneNode } from './types';
import { childIdsOf, isContainer } from './types';

export function getNode(doc: SceneDocument, id: NodeId): SceneNode | null {
  return doc.nodes[id] ?? null;
}

export function mustNode(doc: SceneDocument, id: NodeId): SceneNode {
  const node = doc.nodes[id];
  if (!node) throw new Error(`Node not found: ${id}`);
  return node;
}

/** Sibling list containing `id` (parent's childIds or rootIds). */
export function siblingIdsOf(doc: SceneDocument, id: NodeId): readonly NodeId[] {
  const node = getNode(doc, id);
  if (!node) return [];
  if (node.parentId === null) return doc.rootIds;
  const parent = getNode(doc, node.parentId);
  return parent ? childIdsOf(parent) : [];
}

export function indexInParent(doc: SceneDocument, id: NodeId): number {
  return siblingIdsOf(doc, id).indexOf(id);
}

/** Depth-first walk, children in paint order. Return false from `visit` to skip a subtree. */
export function visitTree(
  doc: SceneDocument,
  ids: readonly NodeId[],
  visit: (node: SceneNode, depth: number) => boolean | void,
  depth = 0,
): void {
  for (const id of ids) {
    const node = getNode(doc, id);
    if (!node) continue;
    const result = visit(node, depth);
    if (result === false) continue;
    if (isContainer(node)) visitTree(doc, node.childIds, visit, depth + 1);
  }
}

/** All descendant ids of `id` (not including `id`). */
export function descendantIds(doc: SceneDocument, id: NodeId): NodeId[] {
  const out: NodeId[] = [];
  const node = getNode(doc, id);
  if (!node) return out;
  visitTree(doc, childIdsOf(node), (n) => {
    out.push(n.id);
  });
  return out;
}

/** Ancestors of `id`, nearest first. */
export function ancestorIds(doc: SceneDocument, id: NodeId): NodeId[] {
  const out: NodeId[] = [];
  let current = getNode(doc, id);
  while (current && current.parentId !== null) {
    out.push(current.parentId);
    current = getNode(doc, current.parentId);
  }
  return out;
}

export function isAncestorOf(doc: SceneDocument, maybeAncestor: NodeId, id: NodeId): boolean {
  let current = getNode(doc, id);
  while (current && current.parentId !== null) {
    if (current.parentId === maybeAncestor) return true;
    current = getNode(doc, current.parentId);
  }
  return false;
}

/** Full paint-order list (bottom to top), respecting nesting. */
export function paintOrderIds(doc: SceneDocument): NodeId[] {
  const out: NodeId[] = [];
  visitTree(doc, doc.rootIds, (n) => {
    out.push(n.id);
  });
  return out;
}

/** True when the node or any ancestor is hidden. */
export function isEffectivelyHidden(doc: SceneDocument, id: NodeId): boolean {
  let current = getNode(doc, id);
  while (current) {
    if (!current.visible) return true;
    current = current.parentId === null ? null : getNode(doc, current.parentId);
  }
  return false;
}

/** True when the node or any ancestor is locked. */
export function isEffectivelyLocked(doc: SceneDocument, id: NodeId): boolean {
  let current = getNode(doc, id);
  while (current) {
    if (current.locked) return true;
    current = current.parentId === null ? null : getNode(doc, current.parentId);
  }
  return false;
}

/**
 * Reduce a selection to its top-most members: drop any id that has an
 * ancestor also present in the set. Keeps move/duplicate from double-applying.
 */
export function topLevelSelection(doc: SceneDocument, ids: readonly NodeId[]): NodeId[] {
  const set = new Set(ids);
  return ids.filter((id) => {
    let current = getNode(doc, id);
    while (current && current.parentId !== null) {
      if (set.has(current.parentId)) return false;
      current = getNode(doc, current.parentId);
    }
    return true;
  });
}

/** Map of id → index in paint order, for cheap z-order comparisons. */
export function paintOrderIndex(doc: SceneDocument): Map<NodeId, number> {
  const map = new Map<NodeId, number>();
  paintOrderIds(doc).forEach((id, i) => map.set(id, i));
  return map;
}
