import type { EditorDocument, NodeId, SceneNode } from "../types/nodes";

export function getNode(document: EditorDocument, id: NodeId): SceneNode | null {
  return document.nodes[id] ?? null;
}

export function getChildren(document: EditorDocument, id: NodeId): SceneNode[] {
  const node = getNode(document, id);
  if (!node) return [];
  return node.children.map((childId) => document.nodes[childId]).filter((child): child is SceneNode => child !== undefined);
}

export function walk(document: EditorDocument, id = document.rootId): SceneNode[] {
  const node = getNode(document, id);
  if (!node) return [];
  return [node, ...node.children.flatMap((childId) => walk(document, childId))];
}

export function paintOrder(document: EditorDocument): SceneNode[] {
  return walk(document).filter((node) => node.id !== document.rootId && node.visible);
}

export function descendants(document: EditorDocument, id: NodeId): NodeId[] {
  const node = getNode(document, id);
  if (!node) return [];
  return node.children.flatMap((childId) => [childId, ...descendants(document, childId)]);
}

export function canReparent(document: EditorDocument, nodeId: NodeId, parentId: NodeId): boolean {
  if (nodeId === parentId) return false;
  return !descendants(document, nodeId).includes(parentId) && document.nodes[parentId]?.type === "frame";
}

export function updateNodes(document: EditorDocument, nodes: Record<NodeId, SceneNode>, selection = document.selection): EditorDocument {
  return { ...document, nodes: { ...document.nodes, ...nodes }, selection, updatedAt: new Date().toISOString() };
}

export function withoutNodes(document: EditorDocument, ids: readonly NodeId[]): EditorDocument {
  const remove = new Set(ids.flatMap((id) => [id, ...descendants(document, id)]));
  const nodes: Record<NodeId, SceneNode> = {};
  for (const node of Object.values(document.nodes)) {
    if (remove.has(node.id)) continue;
    nodes[node.id] = { ...node, children: node.children.filter((childId) => !remove.has(childId)) };
  }
  return { ...document, nodes, selection: document.selection.filter((id) => !remove.has(id)), updatedAt: new Date().toISOString() };
}

export function insertNode(document: EditorDocument, node: SceneNode, index?: number): EditorDocument {
  const parentId = node.parentId ?? document.rootId;
  const parent = document.nodes[parentId];
  if (!parent) return document;
  const nextChildren = [...parent.children];
  nextChildren.splice(index ?? nextChildren.length, 0, node.id);
  return {
    ...document,
    nodes: {
      ...document.nodes,
      [parentId]: { ...parent, children: nextChildren },
      [node.id]: node,
    },
    selection: [node.id],
    updatedAt: new Date().toISOString(),
  };
}

export function cloneSubtree(document: EditorDocument, sourceId: NodeId, idMap: Map<NodeId, NodeId>, offset: number): Record<NodeId, SceneNode> {
  const source = document.nodes[sourceId];
  if (!source) return {};
  const id = idMap.get(sourceId);
  if (!id) return {};
  const children = source.children.map((childId) => idMap.get(childId)).filter((childId): childId is NodeId => childId !== undefined);
  const cloned: Record<NodeId, SceneNode> = {
    [id]: {
      ...source,
      id,
      name: `${source.name} copy`,
      parentId: source.parentId ? idMap.get(source.parentId) ?? source.parentId : source.parentId,
      children,
      x: source.x + offset,
      y: source.y + offset,
    },
  };
  for (const childId of source.children) {
    Object.assign(cloned, cloneSubtree(document, childId, idMap, offset));
  }
  return cloned;
}
