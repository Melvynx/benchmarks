import { describe, expect, it, vi } from 'vitest';

import {
  cloneSceneNode,
  createFrameNode,
  createGroupNode,
  createRectangleNode,
  createSceneDocument,
} from '@/core/model';

import { EditorStore } from './EditorStore';

describe('EditorStore notification lanes', () => {
  it('keeps high-frequency canvas updates away from UI subscribers', () => {
    const node = createRectangleNode({ id: 'rectangle:one' });
    const store = new EditorStore(
      createSceneDocument({ nodes: { [node.id]: node }, rootIds: [node.id] }),
    );
    const renderListener = vi.fn();
    const uiListener = vi.fn();
    store.subscribe(renderListener);
    store.subscribeUi(uiListener);

    store.setCamera({ x: 10, y: 20, zoom: 2 });
    store.setRenderPreview(new Map([[node.id, { x: 24 }]]));
    store.setCursorWorld(12, 16);

    expect(renderListener).toHaveBeenCalledTimes(3);
    expect(uiListener).not.toHaveBeenCalled();

    store.setTool('rectangle');
    expect(renderListener).toHaveBeenCalledTimes(4);
    expect(uiListener).toHaveBeenCalledTimes(1);
  });

  it('prevents property mutations through a locked ancestor', () => {
    const child = createRectangleNode({
      id: 'rectangle:child',
      parentId: 'frame:locked',
      x: 20,
    });
    const frame = createFrameNode({
      id: 'frame:locked',
      locked: true,
      childIds: [child.id],
    });
    const store = new EditorStore(
      createSceneDocument({
        nodes: { [frame.id]: frame, [child.id]: child },
        rootIds: [frame.id],
      }),
    );

    const changed = store.updateNodes([cloneSceneNode({ ...child, x: 200 })], 'Move child');

    expect(changed).toBe(false);
    expect(store.document.nodes[child.id]?.x).toBe(20);
  });

  it('keeps group geometry tight through descendant edits, undo, and redo', () => {
    const child = createRectangleNode({
      id: 'rectangle:child',
      parentId: 'group:one',
      x: 10,
      y: 20,
      width: 40,
      height: 30,
    });
    const group = createGroupNode({
      id: 'group:one',
      x: 100,
      y: 50,
      rotation: 90,
      childIds: [child.id],
    });
    const store = new EditorStore(
      createSceneDocument({
        nodes: { [group.id]: group, [child.id]: child },
        rootIds: [group.id],
      }),
    );
    const normalizedChild = store.document.nodes[child.id];
    const normalizedGroup = store.document.nodes[group.id];
    if (!normalizedChild || normalizedGroup?.type !== 'group') {
      throw new Error('Expected normalized group scene');
    }
    expect(normalizedGroup.width).toBe(40);

    store.updateNodes([cloneSceneNode({ ...normalizedChild, width: 80 })], 'Resize child');
    expect(store.document.nodes[group.id]?.width).toBe(80);

    store.undo();
    expect(store.document.nodes[group.id]?.width).toBe(40);

    store.redo();
    expect(store.document.nodes[group.id]?.width).toBe(80);
  });
});
