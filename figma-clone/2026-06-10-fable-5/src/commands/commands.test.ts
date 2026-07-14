import { describe, expect, it } from 'vitest';
import type { SceneDocument, SceneNode } from '../scene/types';
import { applyCommand, diffDocuments, invertCommand } from './apply';
import { History } from './history';
import type { DocCommand } from './types';

function makeNode(id: string, x: number): SceneNode {
  return {
    id,
    type: 'rect',
    name: `Rect ${id}`,
    parentId: null,
    x,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    fills: [],
    strokes: [],
    strokeWeight: 1,
    strokeAlign: 'inside',
    strokeDash: 0,
    strokeGap: 0,
    effects: [],
    sizingX: 'fixed',
    sizingY: 'fixed',
    cornerRadius: { tl: 0, tr: 0, br: 0, bl: 0 },
  };
}

function docWith(...nodes: SceneNode[]): SceneDocument {
  return {
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    rootIds: nodes.map((n) => n.id),
  };
}

describe('diffDocuments', () => {
  it('returns null when nothing changed', () => {
    const doc = docWith(makeNode('a', 0));
    expect(diffDocuments(doc, doc)).toBeNull();
  });

  it('produces an update command with minimal patches', () => {
    const before = docWith(makeNode('a', 0));
    const after: SceneDocument = {
      ...before,
      nodes: { a: { ...before.nodes['a']!, x: 50 } as SceneNode },
    };
    const cmd = diffDocuments(before, after);
    expect(cmd).toEqual({
      kind: 'update',
      entries: [{ id: 'a', before: { x: 0 }, after: { x: 50 } }],
    });
  });

  it('captures inserts, removals and root reorder as a composite', () => {
    const a = makeNode('a', 0);
    const b = makeNode('b', 10);
    const c = makeNode('c', 20);
    const before = docWith(a, b);
    const after: SceneDocument = { nodes: { a, c }, rootIds: ['c', 'a'] };
    const cmd = diffDocuments(before, after);
    expect(cmd?.kind).toBe('composite');
  });

  it('round-trips: apply(invert(cmd)) restores the original document', () => {
    const a = makeNode('a', 0);
    const b = makeNode('b', 10);
    const before = docWith(a, b);
    const after: SceneDocument = {
      nodes: { a: { ...a, x: 99 } as SceneNode, c: makeNode('c', 5) },
      rootIds: ['c', 'a'],
    };
    const cmd = diffDocuments(before, after);
    expect(cmd).not.toBeNull();
    const applied = applyCommand(before, cmd as DocCommand);
    expect(applied.rootIds).toEqual(['c', 'a']);
    expect(applied.nodes['a']?.x).toBe(99);
    expect(applied.nodes['b']).toBeUndefined();

    const restored = applyCommand(applied, invertCommand(cmd as DocCommand));
    expect(restored.rootIds).toEqual(before.rootIds);
    expect(restored.nodes['a']?.x).toBe(0);
    expect(restored.nodes['b']).toBeDefined();
    expect(restored.nodes['c']).toBeUndefined();
  });
});

describe('History', () => {
  const update = (x0: number, x1: number): DocCommand => ({
    kind: 'update',
    entries: [{ id: 'a', before: { x: x0 }, after: { x: x1 } }],
  });

  const entry = (cmd: DocCommand, time: number, mergeKey: string | null) => ({
    command: cmd,
    label: 'Move',
    time,
    mergeKey,
    selectionBefore: [],
    selectionAfter: [],
  });

  it('merges rapid same-key edits into one undo step', () => {
    const history = new History();
    history.push(entry(update(0, 10), 0, 'pos:x'));
    history.push(entry(update(10, 20), 100, 'pos:x'));
    const top = history.popUndo();
    expect(top?.command).toEqual(update(0, 20));
    expect(history.canUndo).toBe(false);
  });

  it('does not merge across the time window or different keys', () => {
    const history = new History();
    history.push(entry(update(0, 10), 0, 'pos:x'));
    history.push(entry(update(10, 20), 5000, 'pos:x'));
    history.popUndo();
    expect(history.canUndo).toBe(true);
  });

  it('clears the redo stack on new edits', () => {
    const history = new History();
    history.push(entry(update(0, 10), 0, null));
    history.popUndo();
    expect(history.canRedo).toBe(true);
    history.push(entry(update(0, 5), 10, null));
    expect(history.canRedo).toBe(false);
  });
});
