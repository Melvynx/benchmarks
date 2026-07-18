import { describe, expect, it } from 'vitest';

import {
  createDefaultAutoLayout,
  createFrameNode,
  createRectangleNode,
  createSceneDocument,
} from '@/core/model/factories';
import { SceneRuntime } from '@/editor/sceneRuntime';

import { resolveAutoLayout } from './resolveAutoLayout';

import type {
  AutoLayoutSettings,
  FrameNode,
  LayoutItemSettings,
  RectangleNode,
  SceneDocument,
  SceneNode,
} from '@/core/model/types';

const DEFAULT_LAYOUT_ITEM: LayoutItemSettings = {
  positioning: 'auto',
  horizontalSizing: 'fixed',
  verticalSizing: 'fixed',
  grow: 0,
  alignSelf: 'auto',
  minWidth: null,
  maxWidth: null,
  minHeight: null,
  maxHeight: null,
};

function rectangle(
  id: string,
  parentId: string,
  width: number,
  height: number,
  layoutItem: Partial<LayoutItemSettings> = {},
): RectangleNode {
  return createRectangleNode({
    id,
    parentId,
    width,
    height,
    layoutItem: { ...DEFAULT_LAYOUT_ITEM, ...layoutItem },
  });
}

function frame(
  id: string,
  childIds: readonly string[],
  settings: Partial<AutoLayoutSettings> = {},
  size: { readonly width: number; readonly height: number } = { width: 300, height: 100 },
): FrameNode {
  const defaults = createDefaultAutoLayout();
  return createFrameNode({
    id,
    width: size.width,
    height: size.height,
    childIds,
    autoLayout: {
      ...defaults,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      gap: 10,
      ...settings,
    },
  });
}

function documentWith(root: FrameNode, descendants: readonly SceneNode[]): SceneDocument {
  return createSceneDocument({
    id: 'document:layout-test',
    rootIds: [root.id],
    nodes: Object.fromEntries([root, ...descendants].map((node) => [node.id, node])),
  });
}

function resolve(root: FrameNode, descendants: readonly SceneNode[]) {
  return resolveAutoLayout(documentWith(root, descendants));
}

describe('resolveAutoLayout', () => {
  it('preserves document identity when no frame uses auto-layout', () => {
    const root = createFrameNode({ id: 'root', autoLayout: null, childIds: [] });
    const source = documentWith(root, []);

    expect(resolveAutoLayout(source)).toBe(source);
  });

  it('places horizontal children with padding, gap, and counter-axis centering', () => {
    const first = rectangle('first', 'root', 40, 20);
    const second = rectangle('second', 'root', 60, 30);
    const root = frame('root', [first.id, second.id], { counterAlignment: 'center' });

    const result = resolve(root, [first, second]);

    expect(result.nodes[first.id]).toMatchObject({ x: 10, y: 40, width: 40, height: 20 });
    expect(result.nodes[second.id]).toMatchObject({ x: 60, y: 35, width: 60, height: 30 });
  });

  it('supports center, end, and space-between primary alignment', () => {
    const first = rectangle('first', 'root', 40, 20);
    const second = rectangle('second', 'root', 60, 20);

    const centered = resolve(frame('root', [first.id, second.id], { primaryAlignment: 'center' }), [
      first,
      second,
    ]);
    const ended = resolve(frame('root', [first.id, second.id], { primaryAlignment: 'end' }), [
      first,
      second,
    ]);
    const spaced = resolve(
      frame('root', [first.id, second.id], { primaryAlignment: 'space-between' }),
      [first, second],
    );

    expect(centered.nodes[first.id]?.x).toBe(95);
    expect(ended.nodes[first.id]?.x).toBe(180);
    expect(spaced.nodes[first.id]?.x).toBe(10);
    expect(spaced.nodes[second.id]?.x).toBe(230);
  });

  it('applies the same alignment rules on a vertical main axis', () => {
    const first = rectangle('first', 'root', 20, 40);
    const second = rectangle('second', 'root', 30, 60);
    const root = frame(
      'root',
      [first.id, second.id],
      { direction: 'vertical', primaryAlignment: 'end', counterAlignment: 'center' },
      { width: 100, height: 300 },
    );

    const result = resolve(root, [first, second]);

    expect(result.nodes.first).toMatchObject({ x: 40, y: 180, width: 20, height: 40 });
    expect(result.nodes.second).toMatchObject({ x: 35, y: 230, width: 30, height: 60 });
  });

  it('reverses visual order without changing the persisted child order', () => {
    const first = rectangle('first', 'root', 40, 20);
    const second = rectangle('second', 'root', 60, 20);
    const source = documentWith(frame('root', [first.id, second.id], { reverse: true }), [
      first,
      second,
    ]);

    const result = resolveAutoLayout(source);

    expect(result.nodes[second.id]?.x).toBe(10);
    expect(result.nodes[first.id]?.x).toBe(80);
    expect(result.nodes.root).toMatchObject({ childIds: ['first', 'second'] });
    expect(source.nodes[first.id]?.x).toBe(0);
    expect(source.nodes[second.id]?.x).toBe(0);
  });

  it('allocates remaining space to fill and weighted grow children', () => {
    const fixed = rectangle('fixed', 'root', 50, 20);
    const fill = rectangle('fill', 'root', 30, 20, { horizontalSizing: 'fill' });
    const fillResult = resolve(frame('root', [fixed.id, fill.id]), [fixed, fill]);

    expect(fillResult.nodes[fill.id]).toMatchObject({ x: 70, width: 220 });

    const firstGrow = rectangle('grow-1', 'grow-root', 50, 20, { grow: 1 });
    const secondGrow = rectangle('grow-2', 'grow-root', 50, 20, { grow: 2 });
    const growResult = resolve(frame('grow-root', [firstGrow.id, secondGrow.id]), [
      firstGrow,
      secondGrow,
    ]);

    expect(growResult.nodes[firstGrow.id]?.width).toBeCloseTo(106.666_667);
    expect(growResult.nodes[secondGrow.id]?.width).toBeCloseTo(163.333_333);
  });

  it('redistributes fill space when a child reaches its maximum size', () => {
    const constrained = rectangle('constrained', 'root', 30, 20, {
      horizontalSizing: 'fill',
      maxWidth: 80,
    });
    const remaining = rectangle('remaining', 'root', 30, 20, { horizontalSizing: 'fill' });

    const result = resolve(frame('root', [constrained.id, remaining.id]), [constrained, remaining]);

    expect(result.nodes.constrained).toMatchObject({ x: 10, width: 80 });
    expect(result.nodes.remaining).toMatchObject({ x: 100, width: 190 });
  });

  it('wraps children into deterministic lines with a counter-axis gap', () => {
    const children = [
      rectangle('first', 'root', 50, 20),
      rectangle('second', 'root', 50, 20),
      rectangle('third', 'root', 50, 20),
    ];
    const root = frame(
      'root',
      children.map((child) => child.id),
      { wrap: true, counterAxisGap: 5 },
      { width: 140, height: 100 },
    );

    const result = resolve(root, children);

    expect(result.nodes.first).toMatchObject({ x: 10, y: 10 });
    expect(result.nodes.second).toMatchObject({ x: 70, y: 10 });
    expect(result.nodes.third).toMatchObject({ x: 10, y: 35 });
  });

  it('hugs auto-positioned contents on both axes', () => {
    const first = rectangle('first', 'root', 40, 20);
    const second = rectangle('second', 'root', 60, 30);
    const root = frame('root', [first.id, second.id], {
      horizontalSizing: 'hug',
      verticalSizing: 'hug',
      padding: { top: 8, right: 10, bottom: 8, left: 10 },
    });

    const result = resolve(root, [first, second]);

    expect(result.nodes.root).toMatchObject({ width: 130, height: 46 });
    expect(result.nodes.second).toMatchObject({ x: 60, y: 8 });
  });

  it('stretches counter-axis fill children and honors per-child alignment overrides', () => {
    const stretch = rectangle('stretch', 'root', 40, 20, { verticalSizing: 'fill' });
    const ending = rectangle('ending', 'root', 40, 20, { alignSelf: 'end' });
    const result = resolve(frame('root', [stretch.id, ending.id]), [stretch, ending]);

    expect(result.nodes.stretch).toMatchObject({ y: 10, height: 80 });
    expect(result.nodes.ending).toMatchObject({ y: 70, height: 20 });
  });

  it('excludes absolute children from placement and hug measurement', () => {
    const auto = rectangle('auto', 'root', 40, 20);
    const absolute = createRectangleNode({
      ...rectangle('absolute', 'root', 200, 100, { positioning: 'absolute' }),
      x: 123,
      y: 77,
    });
    const root = frame('root', [auto.id, absolute.id], {
      horizontalSizing: 'hug',
      verticalSizing: 'hug',
    });

    const result = resolve(root, [auto, absolute]);

    expect(result.nodes.root).toMatchObject({ width: 60, height: 40 });
    expect(result.nodes.absolute).toMatchObject({ x: 123, y: 77, width: 200, height: 100 });
  });

  it('propagates a parent fill allocation through a nested auto-layout frame', () => {
    const grandchild = rectangle('grandchild', 'nested', 40, 20, { horizontalSizing: 'fill' });
    const nested = createFrameNode({
      ...frame(
        'nested',
        [grandchild.id],
        { horizontalSizing: 'hug', verticalSizing: 'hug' },
        { width: 60, height: 40 },
      ),
      parentId: 'root',
      layoutItem: { ...DEFAULT_LAYOUT_ITEM, horizontalSizing: 'fill' },
    });
    const root = frame('root', [nested.id]);

    const result = resolve(root, [nested, grandchild]);

    expect(result.nodes.nested).toMatchObject({ x: 10, y: 10, width: 280, height: 40 });
    expect(result.nodes.grandchild).toMatchObject({ x: 10, y: 10, width: 260, height: 20 });
  });

  it('provides the same derived geometry to runtime bounds and hit testing', () => {
    const child = rectangle('child', 'root', 40, 20);
    const source = documentWith(frame('root', [child.id]), [child]);

    const runtime = new SceneRuntime(source);

    expect(runtime.document.nodes.child).toMatchObject({ x: 10, y: 10 });
    expect(runtime.getWorldBounds(child.id)).toMatchObject({
      minX: 10,
      minY: 10,
      maxX: 50,
      maxY: 30,
    });
    expect(runtime.hitTest({ x: 20, y: 20 }, 0)?.id).toBe(child.id);
    expect(source.nodes.child).toMatchObject({ x: 0, y: 0 });
  });
});
