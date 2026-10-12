import { aabbOfBox, unionAabb, type AABB } from "../geometry/bounds";
import { decompose, invert, localMatrix, mul, IDENTITY, type Matrix } from "../geometry/matrix";
import { createId } from "../ids";
import { createGroup } from "../scene/factory";
import type { GeometricNode, NodeId, SceneNode } from "../types";
import { isFrameLike, isGeometric } from "../types";
import type { Mutation } from "./mutation";

export function deleteSubtree(m: Mutation, id: NodeId): void {
  const page = m.page();
  const node = page.nodes[id];
  if (!node || node.type === "canvas") return;
  if (node.parentId) {
    m.remember(node.parentId);
    const parent = page.nodes[node.parentId];
    if (parent) parent.childIds = parent.childIds.filter((child) => child !== id);
  }
  const walk = (nid: NodeId) => {
    const current = page.nodes[nid];
    if (!current) return;
    m.remember(nid);
    for (const child of [...current.childIds]) walk(child);
    delete page.nodes[nid];
  };
  walk(id);
}

export function addNode(m: Mutation, node: SceneNode, parentId: NodeId, index?: number): void {
  const page = m.page();
  const parent = page.nodes[parentId];
  if (!parent) return;
  m.remember(parentId);
  m.remember(node.id);
  node.parentId = parentId;
  page.nodes[node.id] = node;
  const childIds = parent.childIds.filter((id) => id !== node.id);
  const at = index === undefined ? childIds.length : Math.max(0, Math.min(index, childIds.length));
  childIds.splice(at, 0, node.id);
  parent.childIds = childIds;
}

export function reparent(
  m: Mutation,
  id: NodeId,
  newParentId: NodeId,
  index: number,
  world: Matrix,
  newParentWorld: Matrix,
): void {
  const page = m.page();
  const node = page.nodes[id];
  if (!node || !isGeometric(node)) return;
  if (containsNode(page.nodes, id, newParentId)) return;
  const oldParentId = node.parentId;
  if (oldParentId) {
    m.remember(oldParentId);
    const oldParent = page.nodes[oldParentId];
    if (oldParent) oldParent.childIds = oldParent.childIds.filter((child) => child !== id);
  }
  const parent = page.nodes[newParentId];
  if (!parent) return;
  m.remember(newParentId);
  m.remember(id);
  node.parentId = newParentId;
  const childIds = parent.childIds.filter((child) => child !== id);
  childIds.splice(Math.max(0, Math.min(index, childIds.length)), 0, id);
  parent.childIds = childIds;
  const inv = invert(newParentWorld) ?? IDENTITY;
  const decomposed = decompose(mul(inv, world), node.width, node.height);
  node.x = decomposed.x;
  node.y = decomposed.y;
  node.rotation = decomposed.rotation;
}

function containsNode(nodes: Record<string, SceneNode>, ancestorId: string, maybeChild: string): boolean {
  let current: SceneNode | undefined = nodes[maybeChild];
  while (current) {
    if (current.id === ancestorId) return true;
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return false;
}

export function reflowGroups(m: Mutation, ids: NodeId[]): void {
  const page = m.page();
  const groups: NodeId[] = [];
  for (const id of ids) {
    let parentId = page.nodes[id]?.parentId ?? null;
    while (parentId) {
      const parent = page.nodes[parentId];
      if (!parent || parent.type !== "group") break;
      if (!groups.includes(parent.id)) groups.push(parent.id);
      parentId = parent.parentId;
    }
  }
  groups.sort((a, b) => depth(page.nodes, b) - depth(page.nodes, a));
  for (const groupId of groups) {
    const group = page.nodes[groupId];
    if (!group || group.type !== "group") continue;
    m.remember(groupId);
    const boxes: AABB[] = [];
    for (const childId of group.childIds) {
      const child = page.nodes[childId];
      if (!child || !isGeometric(child)) continue;
      boxes.push(aabbOfBox(localMatrix(child), Math.max(child.width, 0.01), Math.max(child.height, 0.01)));
    }
    const bounds = unionAabb(boxes);
    const dx = bounds.x - group.x;
    const dy = bounds.y - group.y;
    group.x = bounds.x;
    group.y = bounds.y;
    group.width = Math.max(1, bounds.width);
    group.height = Math.max(1, bounds.height);
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
      for (const childId of group.childIds) {
        m.remember(childId);
        const child = page.nodes[childId];
        if (child && isGeometric(child)) {
          child.x -= dx;
          child.y -= dy;
        }
      }
    }
  }
}

function depth(nodes: Record<string, SceneNode>, id: string): number {
  let n = 0;
  let current = nodes[id];
  while (current?.parentId) {
    n += 1;
    current = nodes[current.parentId];
  }
  return n;
}

export function moveZ(
  m: Mutation,
  ids: NodeId[],
  direction: "forward" | "backward" | "front" | "back",
): void {
  const page = m.page();
  const byParent = new Map<NodeId, NodeId[]>();
  for (const id of ids) {
    const parentId = page.nodes[id]?.parentId;
    if (!parentId) continue;
    const list = byParent.get(parentId) ?? [];
    list.push(id);
    byParent.set(parentId, list);
  }
  for (const [parentId, selected] of byParent) {
    const parent = page.nodes[parentId];
    if (!parent) continue;
    m.remember(parentId);
    const selectedSet = new Set(selected);
    const next = parent.childIds.slice();
    if (direction === "front") {
      parent.childIds = [...next.filter((id) => !selectedSet.has(id)), ...next.filter((id) => selectedSet.has(id))];
    } else if (direction === "back") {
      parent.childIds = [...next.filter((id) => selectedSet.has(id)), ...next.filter((id) => !selectedSet.has(id))];
    } else if (direction === "forward") {
      for (let i = next.length - 2; i >= 0; i -= 1) {
        const a = next[i];
        const b = next[i + 1];
        if (a && b && selectedSet.has(a) && !selectedSet.has(b)) {
          next[i] = b;
          next[i + 1] = a;
        }
      }
      parent.childIds = next;
    } else {
      for (let i = 1; i < next.length; i += 1) {
        const a = next[i - 1];
        const b = next[i];
        if (a && b && selectedSet.has(b) && !selectedSet.has(a)) {
          next[i - 1] = b;
          next[i] = a;
        }
      }
      parent.childIds = next;
    }
  }
}

export function duplicateSelection(m: Mutation, ids: NodeId[], dx: number, dy: number): NodeId[] {
  const page = m.page();
  const roots = topmost(page.nodes, ids);
  const created: NodeId[] = [];
  for (const id of roots) {
    const cloned = cloneTree(page.nodes, id);
    if (!cloned) continue;
    const root = page.nodes[id];
    if (!root?.parentId || !isGeometric(cloned.root)) continue;
    cloned.root.x += dx;
    cloned.root.y += dy;
    cloned.root.name = `${cloned.root.name} copy`;
    for (const node of cloned.nodes) {
      m.remember(node.id);
      page.nodes[node.id] = node;
    }
    addExisting(m, cloned.root.id, root.parentId);
    created.push(cloned.root.id);
  }
  return created;
}

function addExisting(m: Mutation, id: NodeId, parentId: NodeId): void {
  const page = m.page();
  const parent = page.nodes[parentId];
  const node = page.nodes[id];
  if (!parent || !node) return;
  m.remember(parentId);
  node.parentId = parentId;
  parent.childIds = [...parent.childIds, id];
}

export function cloneTree(
  nodes: Record<NodeId, SceneNode>,
  id: NodeId,
): { root: GeometricNode; nodes: GeometricNode[] } | null {
  const source = nodes[id];
  if (!source || !isGeometric(source)) return null;
  const copies: GeometricNode[] = [];
  const walk = (nid: NodeId, parentId: NodeId | null): GeometricNode | null => {
    const current = nodes[nid];
    if (!current || !isGeometric(current)) return null;
    const copy = structuredClone(current);
    copy.id = createId(current.type);
    copy.parentId = parentId;
    copy.childIds = [];
    copies.push(copy);
    for (const childId of current.childIds) {
      const child = walk(childId, copy.id);
      if (child) copy.childIds.push(child.id);
    }
    return copy;
  };
  const root = walk(id, source.parentId);
  if (!root) return null;
  return { root, nodes: copies };
}

export function topmost(nodes: Record<NodeId, SceneNode>, ids: NodeId[]): NodeId[] {
  const set = new Set(ids);
  return ids.filter((id) => {
    let parentId = nodes[id]?.parentId ?? null;
    while (parentId) {
      if (set.has(parentId)) return false;
      parentId = nodes[parentId]?.parentId ?? null;
    }
    return true;
  });
}

export function groupNodes(m: Mutation, ids: NodeId[], boxes: AABB[]): NodeId | null {
  const page = m.page();
  const nodes = ids
    .map((id) => page.nodes[id])
    .filter((node): node is GeometricNode => !!node && isGeometric(node));
  if (!nodes.length) return null;
  const parentId = nodes[0]?.parentId;
  if (!parentId || nodes.some((node) => node.parentId !== parentId)) return null;
  const parent = page.nodes[parentId];
  if (!parent) return null;
  const bounds = unionAabb(boxes);
  const group = createGroup({
    x: bounds.x,
    y: bounds.y,
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height),
    parentId,
  });
  const selected = new Set(ids);
  const ordered = parent.childIds.filter((id) => selected.has(id));
  const front = ordered[ordered.length - 1];
  const frontIndex = front ? parent.childIds.indexOf(front) : parent.childIds.length;
  const removedBefore = parent.childIds.slice(0, frontIndex).filter((id) => selected.has(id)).length;
  m.remember(parentId);
  parent.childIds = parent.childIds.filter((id) => !selected.has(id));
  for (const node of nodes) {
    m.remember(node.id);
    node.parentId = group.id;
    node.x -= bounds.x;
    node.y -= bounds.y;
    group.childIds.push(node.id);
  }
  m.remember(group.id);
  page.nodes[group.id] = group;
  const at = Math.max(0, frontIndex - removedBefore);
  parent.childIds = [...parent.childIds.slice(0, at), group.id, ...parent.childIds.slice(at)];
  return group.id;
}

export function ungroupNode(m: Mutation, id: NodeId): NodeId[] {
  const page = m.page();
  const group = page.nodes[id];
  if (!group || group.type !== "group" || !group.parentId) return [];
  const parent = page.nodes[group.parentId];
  if (!parent) return [];
  const index = parent.childIds.indexOf(group.id);
  m.remember(parent.id);
  m.remember(group.id);
  const groupMatrix = localMatrix(group);
  const released: NodeId[] = [];
  parent.childIds = parent.childIds.filter((child) => child !== group.id);
  group.childIds.forEach((childId, offset) => {
    const child = page.nodes[childId];
    if (!child || !isGeometric(child)) return;
    m.remember(childId);
    const decomposed = decompose(mul(groupMatrix, localMatrix(child)), child.width, child.height);
    child.x = decomposed.x;
    child.y = decomposed.y;
    child.rotation = decomposed.rotation;
    child.parentId = parent.id;
    parent.childIds.splice(index + offset, 0, childId);
    released.push(childId);
  });
  delete page.nodes[group.id];
  return released;
}

const SYNC_COMMON = [
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "opacity",
  "visible",
  "locked",
  "cornerRadius",
  "fills",
  "strokes",
  "effects",
  "constraintH",
  "constraintV",
  "layoutSizingH",
  "layoutSizingV",
  "layoutPositioning",
  "prototypeTargetId",
] as const;

export function syncInstances(m: Mutation, componentId: NodeId): void {
  const page = m.page();
  const master = page.nodes[componentId];
  if (!master || master.type !== "frame" || !master.isComponent) return;
  for (const node of Object.values(page.nodes)) {
    if (node.type === "instance" && node.componentId === componentId) {
      syncPair(m, master, node);
    }
  }
}

function syncPair(m: Mutation, master: GeometricNode, instance: GeometricNode): void {
  const page = m.page();
  m.remember(instance.id);
  const overridden = new Set(instance.overriddenKeys);
  for (const key of SYNC_COMMON) {
    if (overridden.has(key)) continue;
    copyField(master, instance, key);
  }
  if (isFrameLike(master) && isFrameLike(instance)) {
    for (const key of [
      "clip",
      "layoutMode",
      "itemSpacing",
      "padding",
      "primaryAlign",
      "counterAlign",
      "primarySizing",
      "counterSizing",
    ] as const) {
      if (!overridden.has(key)) copyField(master, instance, key);
    }
  }
  copySpecific(master, instance, overridden);
  const masterChildren = master.childIds
    .map((id) => page.nodes[id])
    .filter((node): node is GeometricNode => !!node && isGeometric(node));
  for (const masterChild of masterChildren) {
    const existing = instance.childIds
      .map((id) => page.nodes[id])
      .find((node) => node && isGeometric(node) && node.masterNodeId === masterChild.id);
    if (existing && isGeometric(existing)) syncPair(m, masterChild, existing);
    else {
      const cloned = cloneTree(page.nodes, masterChild.id);
      if (!cloned) continue;
      stampMaster(cloned.nodes, masterChild.id, page.nodes);
      cloned.root.parentId = instance.id;
      for (const node of cloned.nodes) {
        m.remember(node.id);
        page.nodes[node.id] = node;
      }
      m.remember(instance.id);
      instance.childIds = [...instance.childIds, cloned.root.id];
    }
  }
}

function stampMaster(copies: GeometricNode[], masterRootId: NodeId, source: Record<string, SceneNode>): void {
  const sourceRoot = source[masterRootId];
  if (!sourceRoot) return;
  const pairs: [SceneNode, GeometricNode][] = [];
  const walk = (src: SceneNode, copy: GeometricNode) => {
    pairs.push([src, copy]);
    src.childIds.forEach((childId, index) => {
      const child = source[childId];
      const copyChildId = copy.childIds[index];
      const copyChild = copies.find((node) => node.id === copyChildId);
      if (child && copyChild) walk(child, copyChild);
    });
  };
  const rootCopy = copies.find((node) => node.parentId === null || !copies.some((other) => other.id === node.parentId));
  if (rootCopy) walk(sourceRoot, rootCopy);
  for (const [src, copy] of pairs) copy.masterNodeId = src.id;
}

function copyField(master: GeometricNode, instance: GeometricNode, key: string): void {
  const source = master as GeometricNode & Record<string, unknown>;
  const target = instance as GeometricNode & Record<string, unknown>;
  const value = source[key];
  if (value === undefined) return;
  target[key] = structuredClone(value);
}

function copySpecific(master: GeometricNode, instance: GeometricNode, overridden: Set<string>): void {
  if (master.type === "text" && instance.type === "text") {
    if (!overridden.has("text")) instance.text = master.text;
    if (!overridden.has("fontFamily")) instance.fontFamily = master.fontFamily;
    if (!overridden.has("fontWeight")) instance.fontWeight = master.fontWeight;
    if (!overridden.has("fontSize")) instance.fontSize = master.fontSize;
    if (!overridden.has("lineHeight")) instance.lineHeight = master.lineHeight;
    if (!overridden.has("letterSpacing")) instance.letterSpacing = master.letterSpacing;
    if (!overridden.has("textAlign")) instance.textAlign = master.textAlign;
    if (!overridden.has("textAutoResize")) instance.textAutoResize = master.textAutoResize;
  }
  if (master.type === "polygon" && instance.type === "polygon" && !overridden.has("sides")) instance.sides = master.sides;
  if (master.type === "star" && instance.type === "star") {
    if (!overridden.has("points")) instance.points = master.points;
    if (!overridden.has("innerRatio")) instance.innerRatio = master.innerRatio;
  }
  if (master.type === "image" && instance.type === "image" && !overridden.has("src")) instance.src = master.src;
  if (master.type === "vector" && instance.type === "vector") {
    if (!overridden.has("closed")) instance.closed = master.closed;
    if (!overridden.has("contours")) instance.contours = structuredClone(master.contours);
  }
}
