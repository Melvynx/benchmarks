import { makeId } from "../scene/factory";
import { cloneSubtree, insertNode, updateNodes, withoutNodes } from "../scene/graph";
import type { EditorDocument, NodeId, SceneNode } from "../types/nodes";

export type Command = Readonly<{
  label: string;
  apply(document: EditorDocument): EditorDocument;
  revert(document: EditorDocument): EditorDocument;
}>;

export type NodePatch = Partial<{
  name: string;
  parentId: NodeId | null;
  children: readonly NodeId[];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blendMode: SceneNode["blendMode"];
  constraints: SceneNode["constraints"];
  fills: SceneNode["fills"];
  strokes: SceneNode["strokes"];
  effects: SceneNode["effects"];
  clip: boolean;
  autoLayout: Extract<SceneNode, { type: "frame" }>["autoLayout"];
  cornerRadius: Extract<SceneNode, { type: "frame" | "rectangle" | "image" }>["cornerRadius"];
  text: string;
  fontFamily: Extract<SceneNode, { type: "text" }>["fontFamily"];
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  align: Extract<SceneNode, { type: "text" }>["align"];
  verticalAlign: Extract<SceneNode, { type: "text" }>["verticalAlign"];
  points: Extract<SceneNode, { type: "line" }>["points"];
  sides: number;
  star: boolean;
  innerRadius: number;
  src: string;
  fit: Extract<SceneNode, { type: "image" }>["fit"];
}>;

export function updateNodeCommand(label: string, nodeId: NodeId, before: NodePatch, after: NodePatch): Command {
  return {
    label,
    apply(document) {
      const node = document.nodes[nodeId];
      return node ? updateNodes(document, { [nodeId]: { ...node, ...after } }) : document;
    },
    revert(document) {
      const node = document.nodes[nodeId];
      return node ? updateNodes(document, { [nodeId]: { ...node, ...before } }) : document;
    },
  };
}

export function updateManyCommand(label: string, before: Record<NodeId, NodePatch>, after: Record<NodeId, NodePatch>): Command {
  return {
    label,
    apply(document) {
      return patchMany(document, after);
    },
    revert(document) {
      return patchMany(document, before);
    },
  };
}

export function insertCommand(node: SceneNode, index?: number): Command {
  return {
    label: `Insert ${node.type}`,
    apply(document) {
      return insertNode(document, node, index);
    },
    revert(document) {
      return withoutNodes(document, [node.id]);
    },
  };
}

export function deleteCommand(ids: readonly NodeId[], snapshot: Record<NodeId, SceneNode>): Command {
  return {
    label: "Delete",
    apply(document) {
      return withoutNodes(document, ids);
    },
    revert(document) {
      const nodes = { ...document.nodes, ...snapshot };
      for (const node of Object.values(snapshot)) {
        if (node.parentId && nodes[node.parentId]) {
          const parent = nodes[node.parentId];
          if (!parent.children.includes(node.id)) {
            nodes[node.parentId] = { ...parent, children: [...parent.children, node.id] };
          }
        }
      }
      return { ...document, nodes, selection: ids, updatedAt: new Date().toISOString() };
    },
  };
}

export function duplicateCommand(ids: readonly NodeId[], offset = 32): Command {
  let clones: Record<NodeId, SceneNode> | null = null;
  let cloneIds: NodeId[] = [];
  return {
    label: "Duplicate",
    apply(document) {
      if (!clones) {
        const idsWithDescendants = new Set<NodeId>();
        for (const id of ids) {
          collectIds(document, id, idsWithDescendants);
        }
        const idMap = new Map<NodeId, NodeId>();
        for (const id of idsWithDescendants) idMap.set(id, makeId("node"));
        clones = {};
        cloneIds = ids.map((id) => idMap.get(id)).filter((id): id is NodeId => id !== undefined);
        for (const id of ids) Object.assign(clones, cloneSubtree(document, id, idMap, offset));
      }
      const nodes = { ...document.nodes };
      for (const node of Object.values(clones)) nodes[node.id] = node;
      for (const id of cloneIds) {
        const node = nodes[id];
        if (node?.parentId && nodes[node.parentId]) {
          const parent = nodes[node.parentId];
          nodes[node.parentId] = { ...parent, children: [...parent.children, id] };
        }
      }
      return { ...document, nodes, selection: cloneIds, updatedAt: new Date().toISOString() };
    },
    revert(document) {
      return withoutNodes(document, cloneIds);
    },
  };
}

export function reorderCommand(parentId: NodeId, before: readonly NodeId[], after: readonly NodeId[]): Command {
  return {
    label: "Reorder layers",
    apply(document) {
      const parent = document.nodes[parentId];
      return parent ? updateNodes(document, { [parentId]: { ...parent, children: after } }) : document;
    },
    revert(document) {
      const parent = document.nodes[parentId];
      return parent ? updateNodes(document, { [parentId]: { ...parent, children: before } }) : document;
    },
  };
}

export function groupCommand(ids: readonly NodeId[], frame: SceneNode): Command {
  const before: Record<NodeId, NodePatch> = {};
  return {
    label: "Group",
    apply(document) {
      const parentId = frame.parentId ?? document.rootId;
      const parent = document.nodes[parentId];
      const nodes = { ...document.nodes, [frame.id]: { ...frame, children: ids } };
      for (const id of ids) {
        const node = document.nodes[id];
        if (node) {
          before[id] = { parentId: node.parentId };
          nodes[id] = { ...node, parentId: frame.id };
        }
      }
      if (parent) {
        nodes[parentId] = { ...parent, children: [...parent.children.filter((id) => !ids.includes(id)), frame.id] };
      }
      return { ...document, nodes, selection: [frame.id], updatedAt: new Date().toISOString() };
    },
    revert(document) {
      const nodes = { ...document.nodes };
      const parentId = frame.parentId ?? document.rootId;
      const parent = nodes[parentId];
      if (parent) nodes[parentId] = { ...parent, children: parent.children.filter((id) => id !== frame.id) };
      delete nodes[frame.id];
      for (const id of ids) {
        const node = nodes[id];
        const patch = before[id];
        if (node && patch) nodes[id] = { ...node, ...patch };
      }
      return { ...document, nodes, selection: ids, updatedAt: new Date().toISOString() };
    },
  };
}

function patchMany(document: EditorDocument, patches: Record<NodeId, NodePatch>): EditorDocument {
  const nodes: Record<NodeId, SceneNode> = {};
  for (const [id, patch] of Object.entries(patches)) {
    const node = document.nodes[id];
    if (node) nodes[id] = { ...node, ...patch };
  }
  return updateNodes(document, nodes);
}

function collectIds(document: EditorDocument, id: NodeId, output: Set<NodeId>): void {
  const node = document.nodes[id];
  if (!node) return;
  output.add(id);
  for (const childId of node.children) collectIds(document, childId, output);
}
