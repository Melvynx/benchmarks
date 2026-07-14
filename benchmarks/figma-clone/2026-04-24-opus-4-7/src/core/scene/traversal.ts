import type { Document, NodeId, SceneNode } from './types';
import { isFrame } from './types';
import {
  matIdentity,
  matMul,
  matTranslate,
  matRotate,
  matApply,
  type Mat2D,
} from '../geometry/Mat2D';
import { rectTransformAABB, type Rect, rectUnion } from '../geometry/Rect';

/** The parent-chain of a node, root→self. */
export const pathToNode = (doc: Document, id: NodeId): NodeId[] => {
  const path: NodeId[] = [];
  let cur: NodeId | null = id;
  while (cur !== null) {
    path.unshift(cur);
    const node: SceneNode | undefined = doc.nodes[cur];
    cur = node ? node.parentId : null;
  }
  return path;
};

/** The parent-local transform of a node (around its center). */
export const nodeLocalMatrix = (n: SceneNode): Mat2D => {
  // translate to node.x,y then rotate around center
  const cx = n.width / 2;
  const cy = n.height / 2;
  // T(x+cx, y+cy) * R(rotation) * T(-cx, -cy)
  let m = matTranslate(n.x + cx, n.y + cy);
  if (n.rotation !== 0) m = matMul(m, matRotate(n.rotation));
  m = matMul(m, matTranslate(-cx, -cy));
  return m;
};

/** The absolute (page-local) transform of a node. */
export const nodeWorldMatrix = (doc: Document, id: NodeId): Mat2D => {
  const chain = pathToNode(doc, id);
  let m = matIdentity();
  for (const nid of chain) {
    const n = doc.nodes[nid];
    if (!n) continue;
    m = matMul(m, nodeLocalMatrix(n));
  }
  return m;
};

/** Absolute AABB in page coordinates. */
export const nodeWorldAABB = (doc: Document, id: NodeId): Rect => {
  const n = doc.nodes[id];
  if (!n) return { x: 0, y: 0, width: 0, height: 0 };
  const m = nodeWorldMatrix(doc, id);
  return rectTransformAABB({ x: 0, y: 0, width: n.width, height: n.height }, m);
};

/** Get world position of 4 corners. */
export const nodeWorldCorners = (
  doc: Document,
  id: NodeId,
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] => {
  const n = doc.nodes[id]!;
  const m = nodeWorldMatrix(doc, id);
  return [
    matApply(m, { x: 0, y: 0 }),
    matApply(m, { x: n.width, y: 0 }),
    matApply(m, { x: n.width, y: n.height }),
    matApply(m, { x: 0, y: n.height }),
  ];
};

/** Visit all descendants of a node (depth-first). */
export const walkDescendants = (
  doc: Document,
  id: NodeId,
  visit: (n: SceneNode, depth: number) => void,
  depth = 0,
): void => {
  const n = doc.nodes[id];
  if (!n) return;
  visit(n, depth);
  if (isFrame(n)) {
    for (const cid of n.children) {
      walkDescendants(doc, cid, visit, depth + 1);
    }
  }
};

/** Walk from the current page's roots. */
export const walkTree = (doc: Document, visit: (n: SceneNode, depth: number) => void): void => {
  const page = doc.pages[doc.currentPageId];
  if (!page) return;
  for (const cid of page.children) walkDescendants(doc, cid, visit);
};

/** Descendants including self, as ids. */
export const descendantIds = (doc: Document, id: NodeId): NodeId[] => {
  const out: NodeId[] = [];
  walkDescendants(doc, id, (n) => out.push(n.id));
  return out;
};

/** Union world AABB of many nodes. */
export const unionWorldAABB = (doc: Document, ids: NodeId[]): Rect | null => {
  let bounds: Rect | null = null;
  for (const id of ids) {
    const b = nodeWorldAABB(doc, id);
    bounds = bounds ? rectUnion(bounds, b) : b;
  }
  return bounds;
};

/** True if `ancestorId` is an ancestor (or equal) of `id`. */
export const isAncestor = (doc: Document, ancestorId: NodeId, id: NodeId): boolean => {
  let cur: NodeId | null = id;
  while (cur !== null) {
    if (cur === ancestorId) return true;
    const n: SceneNode | undefined = doc.nodes[cur];
    cur = n ? n.parentId : null;
  }
  return false;
};

/** Children of a node/page in display order (back → front, matches array order). */
export const getChildrenIds = (doc: Document, parentId: NodeId | null): NodeId[] => {
  if (parentId === null) {
    const page = doc.pages[doc.currentPageId];
    return page ? page.children : [];
  }
  const parent = doc.nodes[parentId];
  if (parent && isFrame(parent)) return parent.children;
  return [];
};

/** Get siblings from parent's children. */
export const getSiblings = (doc: Document, id: NodeId): NodeId[] => {
  const n = doc.nodes[id];
  if (!n) return [];
  return getChildrenIds(doc, n.parentId);
};
