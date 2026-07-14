import type { SceneDocument, SceneNode } from '../scene/types';
import type { DocCommand, UpdateEntry } from './types';

/** Pure application of a command to a document. Returns a new document. */
export function applyCommand(doc: SceneDocument, cmd: DocCommand): SceneDocument {
  switch (cmd.kind) {
    case 'update': {
      const nodes = { ...doc.nodes };
      for (const entry of cmd.entries) {
        const node = nodes[entry.id];
        if (!node) continue;
        nodes[entry.id] = { ...node, ...entry.after } as SceneNode;
      }
      return { ...doc, nodes };
    }
    case 'insert': {
      const nodes = { ...doc.nodes };
      for (const node of cmd.nodes) nodes[node.id] = node;
      return { ...doc, nodes };
    }
    case 'remove': {
      const nodes = { ...doc.nodes };
      for (const node of cmd.nodes) delete nodes[node.id];
      return { ...doc, nodes };
    }
    case 'roots':
      return { ...doc, rootIds: [...cmd.after] };
    case 'composite': {
      let next = doc;
      for (const sub of cmd.commands) next = applyCommand(next, sub);
      return next;
    }
  }
}

export function invertCommand(cmd: DocCommand): DocCommand {
  switch (cmd.kind) {
    case 'update':
      return {
        kind: 'update',
        entries: cmd.entries.map((e) => ({ id: e.id, before: e.after, after: e.before })),
      };
    case 'insert':
      return { kind: 'remove', nodes: cmd.nodes };
    case 'remove':
      return { kind: 'insert', nodes: cmd.nodes };
    case 'roots':
      return { kind: 'roots', before: cmd.after, after: cmd.before };
    case 'composite':
      return { kind: 'composite', commands: [...cmd.commands].reverse().map(invertCommand) };
  }
}

/** Shallow per-field diff between two versions of a node. */
export function diffNodes(before: SceneNode, after: SceneNode): UpdateEntry | null {
  const beforePatch: Record<string, unknown> = {};
  const afterPatch: Record<string, unknown> = {};
  let changed = false;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const a = (before as unknown as Record<string, unknown>)[key];
    const b = (after as unknown as Record<string, unknown>)[key];
    if (!fieldEqual(a, b)) {
      beforePatch[key] = a;
      afterPatch[key] = b;
      changed = true;
    }
  }
  if (!changed) return null;
  return {
    id: before.id,
    before: beforePatch as Partial<SceneNode>,
    after: afterPatch as Partial<SceneNode>,
  };
}

/** Value equality good enough for node fields (primitives, plain arrays/objects). */
function fieldEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!fieldEqual(a[i], b[i])) return false;
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if (!fieldEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Diff two documents into a single command (or null when nothing changed).
 * Node objects are immutable across edits, so a reference check prunes the
 * scan and the field diff only runs on actually-replaced nodes.
 */
export function diffDocuments(before: SceneDocument, after: SceneDocument): DocCommand | null {
  const updates: UpdateEntry[] = [];
  const inserted: SceneNode[] = [];
  const removed: SceneNode[] = [];

  for (const id of Object.keys(after.nodes)) {
    const b = before.nodes[id];
    const a = after.nodes[id];
    if (!a) continue;
    if (!b) {
      inserted.push(a);
    } else if (b !== a) {
      const entry = diffNodes(b, a);
      if (entry) updates.push(entry);
    }
  }
  for (const id of Object.keys(before.nodes)) {
    const b = before.nodes[id];
    if (b && !after.nodes[id]) removed.push(b);
  }

  const commands: DocCommand[] = [];
  if (inserted.length > 0) commands.push({ kind: 'insert', nodes: inserted });
  if (updates.length > 0) commands.push({ kind: 'update', entries: updates });
  if (!sameIds(before.rootIds, after.rootIds)) {
    commands.push({ kind: 'roots', before: [...before.rootIds], after: [...after.rootIds] });
  }
  if (removed.length > 0) commands.push({ kind: 'remove', nodes: removed });

  if (commands.length === 0) return null;
  if (commands.length === 1) return commands[0] ?? null;
  return { kind: 'composite', commands };
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
