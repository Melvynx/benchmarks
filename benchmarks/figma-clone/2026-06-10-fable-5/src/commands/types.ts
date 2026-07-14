import type { NodeId, SceneNode } from '../scene/types';

/**
 * Mutations are expressed as serializable commands. Structural linkage
 * (parentId / childIds / rootIds) always travels through `update` / `roots`
 * entries, so `insert` and `remove` only add or delete node objects — one
 * unambiguous source of truth per field, which makes inversion trivial.
 */

export interface UpdateEntry {
  id: NodeId;
  before: Partial<SceneNode>;
  after: Partial<SceneNode>;
}

export interface UpdateCommand {
  kind: 'update';
  entries: UpdateEntry[];
}

export interface InsertCommand {
  kind: 'insert';
  nodes: SceneNode[];
}

export interface RemoveCommand {
  kind: 'remove';
  nodes: SceneNode[];
}

export interface RootsCommand {
  kind: 'roots';
  before: NodeId[];
  after: NodeId[];
}

export interface CompositeCommand {
  kind: 'composite';
  commands: DocCommand[];
}

export type DocCommand = UpdateCommand | InsertCommand | RemoveCommand | RootsCommand | CompositeCommand;

export interface HistoryEntry {
  command: DocCommand;
  label: string;
  time: number;
  mergeKey: string | null;
  selectionBefore: NodeId[];
  selectionAfter: NodeId[];
}
