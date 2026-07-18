import type { DesignDocument, NodeId, SceneNode } from "./types";

export interface EditorCommand {
  readonly label: string;
  apply(document: DesignDocument): DesignDocument;
  revert(document: DesignDocument): DesignDocument;
}

export interface GraphDelta {
  readonly before: Readonly<Record<NodeId, SceneNode>>;
  readonly after: Readonly<Record<NodeId, SceneNode>>;
  readonly added: Readonly<Record<NodeId, SceneNode>>;
  readonly removed: Readonly<Record<NodeId, SceneNode>>;
  readonly rootIdsBefore?: readonly NodeId[];
  readonly rootIdsAfter?: readonly NodeId[];
}

function commitDocument(document: DesignDocument, nodes: Readonly<Record<NodeId, SceneNode>>, rootIds: readonly NodeId[]): DesignDocument {
  return { ...document, nodes, rootIds, updatedAt: Date.now(), version: document.version + 1 };
}

function applyDelta(document: DesignDocument, delta: GraphDelta, direction: "forward" | "backward"): DesignDocument {
  const nodes: Record<NodeId, SceneNode> = { ...document.nodes };
  const deletions = direction === "forward" ? delta.removed : delta.added;
  const additions = direction === "forward" ? { ...delta.added, ...delta.after } : { ...delta.removed, ...delta.before };
  Object.keys(deletions).forEach((id) => delete nodes[id]);
  Object.assign(nodes, additions);
  const rootIds = direction === "forward" ? (delta.rootIdsAfter ?? document.rootIds) : (delta.rootIdsBefore ?? document.rootIds);
  return commitDocument(document, nodes, rootIds);
}

export function graphCommand(label: string, delta: GraphDelta): EditorCommand {
  return {
    label,
    apply: (document) => applyDelta(document, delta, "forward"),
    revert: (document) => applyDelta(document, delta, "backward"),
  };
}

export function batchCommand(label: string, commands: readonly EditorCommand[]): EditorCommand {
  return {
    label,
    apply: (document) => commands.reduce((current, command) => command.apply(current), document),
    revert: (document) => [...commands].reverse().reduce((current, command) => command.revert(current), document),
  };
}

export function patchNodesCommand(label: string, document: DesignDocument, patches: Readonly<Record<NodeId, Partial<SceneNode>>>): EditorCommand {
  const before: Record<NodeId, SceneNode> = {};
  const after: Record<NodeId, SceneNode> = {};
  Object.entries(patches).forEach(([id, patch]) => {
    const node = document.nodes[id];
    if (!node) return;
    before[id] = node;
    after[id] = { ...node, ...patch } as SceneNode;
  });
  return graphCommand(label, { before, after, added: {}, removed: {} });
}

export function addNodesCommand(label: string, document: DesignDocument, nodesToAdd: readonly SceneNode[]): EditorCommand {
  const added = Object.fromEntries(nodesToAdd.map((node) => [node.id, node]));
  const rootIdsAfter = [...document.rootIds, ...nodesToAdd.filter((node) => node.parentId === null).map((node) => node.id)];
  const before: Record<NodeId, SceneNode> = {};
  const after: Record<NodeId, SceneNode> = {};
  nodesToAdd.forEach((node) => {
    if (!node.parentId) return;
    const parent = document.nodes[node.parentId];
    if (!parent || !("children" in parent)) return;
    before[parent.id] = parent;
    after[parent.id] = { ...parent, children: [...parent.children, node.id] };
  });
  return graphCommand(label, { before, after, added, removed: {}, rootIdsBefore: document.rootIds, rootIdsAfter });
}

function collectDescendants(document: DesignDocument, ids: readonly NodeId[]): readonly NodeId[] {
  const result = new Set(ids);
  const visit = (id: NodeId): void => {
    const node = document.nodes[id];
    if (!node || !("children" in node)) return;
    node.children.forEach((childId) => {
      result.add(childId);
      visit(childId);
    });
  };
  ids.forEach(visit);
  return [...result];
}

export function removeNodesCommand(label: string, document: DesignDocument, ids: readonly NodeId[]): EditorCommand {
  const allIds = collectDescendants(document, ids);
  const removed: Record<NodeId, SceneNode> = {};
  allIds.forEach((id) => {
    const node = document.nodes[id];
    if (node) removed[id] = node;
  });
  const rootIdsAfter = document.rootIds.filter((id) => !allIds.includes(id));
  const before: Record<NodeId, SceneNode> = {};
  const after: Record<NodeId, SceneNode> = {};
  Object.values(document.nodes).forEach((node) => {
    if (!("children" in node) || !node.children.some((id) => allIds.includes(id))) return;
    before[node.id] = node;
    after[node.id] = { ...node, children: node.children.filter((id) => !allIds.includes(id)) };
  });
  return graphCommand(label, { before, after, added: {}, removed, rootIdsBefore: document.rootIds, rootIdsAfter });
}

export function duplicateNodesCommand(document: DesignDocument, ids: readonly NodeId[]): { command: EditorCommand; ids: readonly NodeId[] } {
  const idMap = new Map<NodeId, NodeId>();
  const duplicate = (id: NodeId, parentOverride?: NodeId | null): SceneNode | null => {
    const source = document.nodes[id];
    if (!source) return null;
    const duplicateId = idMap.get(id) ?? crypto.randomUUID();
    idMap.set(id, duplicateId);
    const parentId = parentOverride === undefined ? source.parentId : parentOverride;
    if ("children" in source) {
      const children = source.children.map((childId) => {
        const childDuplicateId = crypto.randomUUID();
        idMap.set(childId, childDuplicateId);
        return childDuplicateId;
      });
      return { ...source, id: duplicateId, name: `${source.name} copy`, x: source.x + 20, y: source.y + 20, parentId, children };
    }
    return { ...source, id: duplicateId, name: `${source.name} copy`, x: source.x + 20, y: source.y + 20, parentId };
  };
  const created: SceneNode[] = [];
  const visit = (id: NodeId, parentOverride?: NodeId | null): void => {
    const copy = duplicate(id, parentOverride);
    if (!copy) return;
    created.push(copy);
    const source = document.nodes[id];
    if (!source || !("children" in source) || !("children" in copy)) return;
    source.children.forEach((childId, index) => visit(childId, copy.id));
  };
  ids.forEach((id) => visit(id));
  const newRootIds = ids.flatMap((id) => (idMap.get(id) ? [idMap.get(id) as string] : []));
  return { command: addNodesCommand("Duplicate", document, created), ids: newRootIds };
}

export class CommandHistory {
  readonly #limit: number;
  #undoStack: EditorCommand[] = [];
  #redoStack: EditorCommand[] = [];

  constructor(limit = 150) {
    this.#limit = limit;
  }

  execute(command: EditorCommand, document: DesignDocument): DesignDocument {
    const next = command.apply(document);
    this.#undoStack = [...this.#undoStack, command].slice(-this.#limit);
    this.#redoStack = [];
    return next;
  }

  undo(document: DesignDocument): DesignDocument {
    const command = this.#undoStack.at(-1);
    if (!command) return document;
    this.#undoStack = this.#undoStack.slice(0, -1);
    this.#redoStack = [...this.#redoStack, command];
    return command.revert(document);
  }

  redo(document: DesignDocument): DesignDocument {
    const command = this.#redoStack.at(-1);
    if (!command) return document;
    this.#redoStack = this.#redoStack.slice(0, -1);
    this.#undoStack = [...this.#undoStack, command];
    return command.apply(document);
  }

  get canUndo(): boolean { return this.#undoStack.length > 0; }
  get canRedo(): boolean { return this.#redoStack.length > 0; }
  get label(): string | null { return this.#undoStack.at(-1)?.label ?? null; }
}
