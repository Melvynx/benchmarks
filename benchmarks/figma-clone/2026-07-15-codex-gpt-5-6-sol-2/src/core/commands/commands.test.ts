import { describe, expect, it } from 'vitest';

import {
  assertSceneInvariants,
  createFrameNode,
  createRectangleNode,
  createSceneDocument,
  getNode,
  type SceneDocument,
} from '../model';
import {
  CommandHistory,
  createBatchCommand,
  createDeleteNodeCommand,
  createGroupNodesCommand,
  createNodeCommand,
  createReorderNodeCommand,
  createReparentNodesCommand,
  createSetNodePropertiesCommand,
  createUngroupNodeCommand,
} from './index';

function createTwoLayerScene(): SceneDocument {
  const first = createRectangleNode({ id: 'first', x: 20, y: 30 });
  const second = createRectangleNode({ id: 'second', x: 240, y: 80, rotation: 15 });
  return createSceneDocument({
    nodes: { first, second },
    rootIds: [first.id, second.id],
  });
}

describe('operation-level commands', () => {
  it('creates, updates, undoes, and redoes without document snapshots', () => {
    const history = new CommandHistory();
    const rectangle = createRectangleNode({ id: 'created' });
    let scene = createSceneDocument();
    const create = createNodeCommand(scene, rectangle);

    expect(create.patches.map((patch) => patch.type)).toEqual(['node', 'root-order']);
    scene = history.execute(scene, create);
    const update = createSetNodePropertiesCommand(scene, [rectangle.id], { x: 90, opacity: 0.6 });
    scene = history.execute(scene, update);
    expect(getNode(scene, rectangle.id).x).toBe(90);

    scene = history.undo(scene);
    expect(getNode(scene, rectangle.id).x).toBe(0);
    scene = history.undo(scene);
    expect(scene.nodes[rectangle.id]).toBeUndefined();
    scene = history.redo(scene);
    scene = history.redo(scene);
    expect(getNode(scene, rectangle.id).opacity).toBe(0.6);
    expect(history.getState().undoDepth).toBe(2);
  });

  it('deletes and restores an entire normalized subtree', () => {
    const child = createRectangleNode({ id: 'child', parentId: 'frame' });
    const frame = createFrameNode({ id: 'frame', childIds: [child.id] });
    const initial = createSceneDocument({
      nodes: { frame, child },
      rootIds: [frame.id],
    });
    const command = createDeleteNodeCommand(initial, frame.id);
    const deleted = command.execute(initial);

    expect(Object.keys(deleted.nodes)).toEqual([]);
    expect(deleted.rootIds).toEqual([]);
    const restored = command.undo(deleted);
    expect(restored.rootIds).toEqual([frame.id]);
    expect(getNode(restored, child.id).parentId).toBe(frame.id);
    assertSceneInvariants(restored);
  });

  it('reorders and reparents layers while maintaining both sides of every link', () => {
    const child = createRectangleNode({ id: 'child', x: 25, y: 35 });
    const frame = createFrameNode({ id: 'frame', x: 500, y: 120, childIds: [] });
    let scene = createSceneDocument({
      nodes: { child, frame },
      rootIds: [child.id, frame.id],
    });
    scene = createReorderNodeCommand(scene, child.id, 1).execute(scene);
    expect(scene.rootIds).toEqual([frame.id, child.id]);

    const reparent = createReparentNodesCommand(scene, [child.id], frame.id);
    const nested = reparent.execute(scene);
    const nestedFrame = getNode(nested, frame.id);
    expect(nested.rootIds).toEqual([frame.id]);
    expect(nestedFrame.type === 'frame' ? nestedFrame.childIds : []).toEqual([child.id]);
    expect(getNode(nested, child.id).parentId).toBe(frame.id);
    assertSceneInvariants(nested);

    const restored = reparent.undo(nested);
    expect(getNode(restored, child.id).x).toBeCloseTo(25, 8);
    expect(getNode(restored, child.id).y).toBeCloseTo(35, 8);
  });

  it('groups rotated layers and ungroups them without visual transform drift', () => {
    const initial = createTwoLayerScene();
    const groupCommand = createGroupNodesCommand(initial, ['first', 'second'], {
      id: 'selection-group',
    });
    const grouped = groupCommand.execute(initial);
    const group = getNode(grouped, 'selection-group');
    expect(group.type).toBe('group');
    expect(getNode(grouped, 'first').parentId).toBe(group.id);
    assertSceneInvariants(grouped);

    const ungrouped = createUngroupNodeCommand(grouped, group.id).execute(grouped);
    for (const nodeId of ['first', 'second']) {
      expect(getNode(ungrouped, nodeId).x).toBeCloseTo(getNode(initial, nodeId).x, 8);
      expect(getNode(ungrouped, nodeId).y).toBeCloseTo(getNode(initial, nodeId).y, 8);
      expect(getNode(ungrouped, nodeId).rotation).toBeCloseTo(getNode(initial, nodeId).rotation, 8);
    }
    expect(ungrouped.nodes[group.id]).toBeUndefined();
  });

  it('executes sequential commands as one history entry', () => {
    const history = new CommandHistory();
    const first = createRectangleNode({ id: 'first' });
    const second = createRectangleNode({ id: 'second' });
    const initial = createSceneDocument();
    const createFirst = createNodeCommand(initial, first);
    const afterFirst = createFirst.execute(initial);
    const createSecond = createNodeCommand(afterFirst, second);
    const batch = createBatchCommand('Create pair', [createFirst, createSecond]);

    const created = history.execute(initial, batch);
    expect(created.rootIds).toEqual([first.id, second.id]);
    expect(history.getState().undoDepth).toBe(1);
    const undone = history.undo(created);
    expect(undone.rootIds).toEqual([]);
  });

  it('enforces a 200-entry minimum and caps retained history', () => {
    expect(() => new CommandHistory(199)).toThrow(/at least 200/);
    const history = new CommandHistory(200);
    const rectangle = createRectangleNode({ id: 'layer' });
    let scene = createSceneDocument({ nodes: { layer: rectangle }, rootIds: [rectangle.id] });
    for (let index = 0; index < 205; index += 1) {
      const command = createSetNodePropertiesCommand(scene, [rectangle.id], { x: index + 1 });
      scene = history.execute(scene, command);
    }
    expect(history.getState().undoDepth).toBe(200);
  });
});
