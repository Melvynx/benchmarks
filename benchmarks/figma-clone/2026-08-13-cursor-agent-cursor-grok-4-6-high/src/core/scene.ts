import {
  aabbFromPoints,
  apply,
  distToSegment,
  ellipsePolygon,
  flattenPath,
  IDENTITY,
  inflateAABB,
  localCorners,
  mul,
  nodeAABB,
  nodeLocalMatrix,
  pointInEllipse,
  pointInPolygon,
  pointInRect,
  regularPolygon,
  starPolygon,
  unionAABB,
  type Box,
} from "./geometry";
import { isParent } from "./factories";
import type { AABB, Document, Mat2D, NodeId, Page, ParentNode, SceneNode, Vec2 } from "./types";

export function activePage(doc: Document): Page {
  const page = doc.pages.find((p) => p.id === doc.activePageId);
  if (page) return page;
  const fallback = doc.pages[0];
  if (!fallback) {
    throw new Error("Document has no pages");
  }
  return fallback;
}

export function getNode(doc: Document, id: NodeId): SceneNode | undefined {
  return doc.nodes[id];
}

export function requireNode(doc: Document, id: NodeId): SceneNode {
  const n = doc.nodes[id];
  if (!n) throw new Error(`Missing node ${id}`);
  return n;
}

export function parentOf(doc: Document, node: SceneNode): ParentNode | null {
  if (!node.parentId) return null;
  const p = doc.nodes[node.parentId];
  if (p && isParent(p)) return p;
  return null;
}

export function childIds(doc: Document, parentId: NodeId | null): NodeId[] {
  if (!parentId) return activePage(doc).children;
  const n = doc.nodes[parentId];
  if (n && isParent(n)) return n.children;
  return [];
}

export function ancestors(doc: Document, id: NodeId): SceneNode[] {
  const out: SceneNode[] = [];
  let cur = doc.nodes[id];
  const seen = new Set<NodeId>();
  while (cur?.parentId) {
    if (seen.has(cur.parentId)) break;
    seen.add(cur.parentId);
    const p = doc.nodes[cur.parentId];
    if (!p) break;
    out.push(p);
    cur = p;
  }
  return out;
}

export function isAncestor(doc: Document, maybeAncestor: NodeId, id: NodeId): boolean {
  return ancestors(doc, id).some((n) => n.id === maybeAncestor);
}

export function descendants(doc: Document, id: NodeId): NodeId[] {
  const n = doc.nodes[id];
  if (!n || !isParent(n)) return [];
  const out: NodeId[] = [];
  const walk = (pid: NodeId) => {
    const p = doc.nodes[pid];
    if (!p || !isParent(p)) return;
    for (const cid of p.children) {
      out.push(cid);
      walk(cid);
    }
  };
  walk(id);
  return out;
}

export function walkFrontToBack(doc: Document, visit: (node: SceneNode) => void): void {
  const walk = (ids: NodeId[]) => {
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i];
      if (!id) continue;
      const n = doc.nodes[id];
      if (!n || !n.visible) continue;
      visit(n);
      if (isParent(n)) walk(n.children);
    }
  };
  walk(activePage(doc).children);
}

export function walkBackToFront(doc: Document, visit: (node: SceneNode, depth: number) => void): void {
  const walk = (ids: NodeId[], depth: number) => {
    for (const id of ids) {
      const n = doc.nodes[id];
      if (!n || !n.visible) continue;
      visit(n, depth);
      if (isParent(n)) walk(n.children, depth + 1);
    }
  };
  walk(activePage(doc).children, 0);
}

export function worldMatrixOf(doc: Document, id: NodeId): Mat2D {
  const node = doc.nodes[id];
  if (!node) return IDENTITY;
  const local = nodeLocalMatrix(node);
  if (!node.parentId) return local;
  return mul(worldMatrixOf(doc, node.parentId), local);
}

export function parentWorldMatrix(doc: Document, id: NodeId): Mat2D {
  const node = doc.nodes[id];
  if (!node?.parentId) return IDENTITY;
  return worldMatrixOf(doc, node.parentId);
}

export function worldPoint(doc: Document, id: NodeId, local: Vec2): Vec2 {
  return apply(worldMatrixOf(doc, id), local);
}

export function worldAABB(doc: Document, id: NodeId): AABB {
  const node = doc.nodes[id];
  if (!node) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const m = worldMatrixOf(doc, id);
  return aabbFromPoints(localCorners(node.width, node.height).map((p) => apply(m, p)));
}

export function selectionAABB(doc: Document, ids: NodeId[]): AABB | null {
  let acc: AABB | null = null;
  for (const id of ids) {
    if (!doc.nodes[id]) continue;
    const b = worldAABB(doc, id);
    acc = acc ? unionAABB(acc, b) : b;
  }
  return acc;
}

export function allNodeIds(doc: Document): NodeId[] {
  const ids: NodeId[] = [];
  const walk = (list: NodeId[]) => {
    for (const id of list) {
      ids.push(id);
      const n = doc.nodes[id];
      if (n && isParent(n)) walk(n.children);
    }
  };
  walk(activePage(doc).children);
  return ids;
}

export function hitTestLocal(node: SceneNode, local: Vec2, strokeSlop: number): boolean {
  if (node.type === "ellipse") return pointInEllipse(local, node.width, node.height);
  if (node.type === "line") {
    return distToSegment(local, { x: 0, y: node.height / 2 }, { x: node.width, y: node.height / 2 }) <= Math.max(strokeSlop, node.strokes[0]?.thickness ?? 1);
  }
  if (node.type === "polygon") {
    return pointInPolygon(local, regularPolygon(node.sides, node.width, node.height));
  }
  if (node.type === "star") {
    return pointInPolygon(local, starPolygon(node.points, node.innerRatio, node.width, node.height));
  }
  if (node.type === "path") {
    const poly = flattenPath(node.points, node.closed);
    if (node.closed && node.fills.length > 0) return pointInPolygon(local, poly);
    const slop = Math.max(strokeSlop, 4);
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i];
      const b = poly[i + 1];
      if (a && b && distToSegment(local, a, b) <= slop) return true;
    }
    return false;
  }
  if (node.type === "text") return pointInRect(local, node.width, node.height);
  return pointInRect(local, node.width, node.height);
}

export function hitTestWorld(doc: Document, id: NodeId, world: Vec2, zoom: number): boolean {
  const node = doc.nodes[id];
  if (!node || !node.visible) return false;
  const m = worldMatrixOf(doc, id);
  const inv = applyInverseSafe(m, world);
  if (!inv) return false;
  const slop = 6 / zoom;
  const padded = inflateAABB({ minX: 0, minY: 0, maxX: node.width, maxY: node.height }, slop);
  if (inv.x < padded.minX || inv.y < padded.minY || inv.x > padded.maxX || inv.y > padded.maxY) {
    return false;
  }
  return hitTestLocal(node, inv, slop);
}

function applyInverseSafe(m: Mat2D, p: Vec2): Vec2 | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const a = m[3] * inv;
  const b = -m[1] * inv;
  const c = -m[2] * inv;
  const d = m[0] * inv;
  const e = (m[2] * m[5] - m[3] * m[4]) * inv;
  const f = (m[1] * m[4] - m[0] * m[5]) * inv;
  return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
}

export function pickTopNode(
  doc: Document,
  world: Vec2,
  zoom: number,
  opts: { ignoreLocked?: boolean; ignoreIds?: Set<NodeId> } = {},
): NodeId | null {
  let hit: NodeId | null = null;
  walkFrontToBack(doc, (node) => {
    if (hit) return;
    if (opts.ignoreIds?.has(node.id)) return;
    if (opts.ignoreLocked && node.locked) return;
    if (ancestors(doc, node.id).some((a) => !a.visible || (opts.ignoreLocked && a.locked))) return;
    if (hitTestWorld(doc, node.id, world, zoom)) hit = node.id;
  });
  return hit;
}

export function nodesInMarquee(doc: Document, marquee: AABB): NodeId[] {
  const hits: NodeId[] = [];
  const walk = (ids: NodeId[]) => {
    for (const id of ids) {
      const n = doc.nodes[id];
      if (!n || !n.visible || n.locked) continue;
      const b = worldAABB(doc, id);
      const contained =
        b.minX >= marquee.minX &&
        b.minY >= marquee.minY &&
        b.maxX <= marquee.maxX &&
        b.maxY <= marquee.maxY;
      if (contained) hits.push(id);
      else if (isParent(n)) walk(n.children);
    }
  };
  walk(activePage(doc).children);
  return hits;
}

export function selectableAncestorsLocked(doc: Document, id: NodeId): boolean {
  return ancestors(doc, id).some((a) => a.locked || !a.visible);
}

export function topLevelSelection(doc: Document, ids: NodeId[]): NodeId[] {
  const set = new Set(ids);
  return ids.filter((id) => !ancestors(doc, id).some((a) => set.has(a.id)));
}

export function nextName(doc: Document, prefix: string): string {
  let max = 0;
  for (const n of Object.values(doc.nodes)) {
    if (n.name === prefix) max = Math.max(max, 1);
    const m = n.name.match(new RegExp(`^${prefix} (\\d+)$`));
    if (m?.[1]) max = Math.max(max, Number(m[1]));
  }
  return max === 0 ? prefix : `${prefix} ${max + 1}`;
}

export function localBox(n: SceneNode): Box {
  return { x: n.x, y: n.y, width: n.width, height: n.height, rotation: n.rotation };
}

export function shapePolygon(node: SceneNode): Vec2[] {
  switch (node.type) {
    case "ellipse":
      return ellipsePolygon(node.width, node.height);
    case "polygon":
      return regularPolygon(node.sides, node.width, node.height);
    case "star":
      return starPolygon(node.points, node.innerRatio, node.width, node.height);
    case "path":
      return flattenPath(node.points, node.closed);
    case "line":
      return [
        { x: 0, y: node.height / 2 },
        { x: node.width, y: node.height / 2 },
      ];
    default:
      return localCorners(node.width, node.height);
  }
}

export function deepCloneSubtree(
  doc: Document,
  id: NodeId,
  idMap: Map<NodeId, NodeId>,
  makeId: () => NodeId,
): { root: SceneNode; extras: SceneNode[] } {
  const src = requireNode(doc, id);
  const newId = makeId();
  idMap.set(id, newId);
  const clone = structuredClone(src);
  clone.id = newId;
  const extras: SceneNode[] = [];
  if (isParent(clone) && isParent(src)) {
    clone.children = src.children.map((cid) => {
      const sub = deepCloneSubtree(doc, cid, idMap, makeId);
      sub.root.parentId = newId;
      extras.push(sub.root, ...sub.extras);
      return sub.root.id;
    });
  }
  return { root: clone, extras };
}

export function replaceChildList(parent: ParentNode | Page, children: NodeId[]): void {
  parent.children = children;
}

export function nodeAABBLocal(node: SceneNode): AABB {
  return nodeAABB(node);
}
