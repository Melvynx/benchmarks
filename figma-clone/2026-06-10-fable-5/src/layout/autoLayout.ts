import type { DraftDoc } from '../scene/draft';
import { getN, patchBase, patchNode } from '../scene/draft';
import { childBoundsInParent, rebaseLocalBounds } from '../scene/nodeGeometry';
import type { AutoLayout, FrameNode, NodeId, SceneNode, TextNode } from '../scene/types';
import { isContainer } from '../scene/types';
import { rectUnionAll } from '../geometry/rect';
import { measureTextNodeSize } from '../text/textLayout';

const EPS = 0.01;

/**
 * Derived-layout resolver. Runs after every document mutation (including
 * undo/redo): auto-layout frames position and size their children, hug
 * containers shrink to content, groups shrink-wrap to their children.
 * The pass is idempotent and iterates until it converges (≤3 rounds covers
 * text-reflow → hug-height → parent-hug chains).
 */
export function runLayout(d: DraftDoc): void {
  for (let round = 0; round < 3; round++) {
    let changed = false;
    for (const id of d.rootIds) changed = resolveSizesBottomUp(d, id) || changed;
    for (const id of d.rootIds) changed = placeChildrenTopDown(d, id) || changed;
    if (!changed) return;
  }
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS;
}

function setBounds(
  d: DraftDoc,
  node: SceneNode,
  next: { x?: number; y?: number; width?: number; height?: number },
): boolean {
  const patch: { x?: number; y?: number; width?: number; height?: number } = {};
  if (next.x !== undefined && !near(node.x, next.x)) patch.x = next.x;
  if (next.y !== undefined && !near(node.y, next.y)) patch.y = next.y;
  if (next.width !== undefined && !near(node.width, next.width)) patch.width = Math.max(0, next.width);
  if (next.height !== undefined && !near(node.height, next.height)) patch.height = Math.max(0, next.height);
  if (Object.keys(patch).length === 0) return false;
  patchBase(d, node.id, patch);
  return true;
}

function visibleChildren(d: DraftDoc, node: SceneNode): SceneNode[] {
  if (!isContainer(node)) return [];
  const out: SceneNode[] = [];
  for (const id of node.childIds) {
    const child = getN(d, id);
    if (child && child.visible) out.push(child);
  }
  return out;
}

function mainOf(layout: AutoLayout, node: SceneNode): number {
  return layout.direction === 'horizontal' ? node.width : node.height;
}

function crossOf(layout: AutoLayout, node: SceneNode): number {
  return layout.direction === 'horizontal' ? node.height : node.width;
}

function paddingMain(layout: AutoLayout): number {
  return layout.direction === 'horizontal'
    ? layout.paddingLeft + layout.paddingRight
    : layout.paddingTop + layout.paddingBottom;
}

function paddingCross(layout: AutoLayout): number {
  return layout.direction === 'horizontal'
    ? layout.paddingTop + layout.paddingBottom
    : layout.paddingLeft + layout.paddingRight;
}

function resolveSizesBottomUp(d: DraftDoc, id: NodeId): boolean {
  const node = getN(d, id);
  if (!node) return false;
  let changed = false;

  if (isContainer(node)) {
    for (const childId of node.childIds) changed = resolveSizesBottomUp(d, childId) || changed;
  }

  const fresh = getN(d, id);
  if (!fresh) return changed;

  if (fresh.type === 'text') {
    changed = applyTextAutosize(d, fresh) || changed;
    return changed;
  }

  if (fresh.type === 'group') {
    changed = shrinkwrapGroup(d, fresh.id) || changed;
    return changed;
  }

  if (fresh.type === 'frame' && fresh.layout) {
    const layout = fresh.layout;
    const children = visibleChildren(d, fresh);
    const sizingMain = layout.direction === 'horizontal' ? fresh.sizingX : fresh.sizingY;
    const sizingCross = layout.direction === 'horizontal' ? fresh.sizingY : fresh.sizingX;

    if (children.length > 0) {
      if (sizingMain === 'hug') {
        let total = paddingMain(layout) + layout.gap * (children.length - 1);
        for (const child of children) total += mainOf(layout, child);
        changed =
          setBounds(d, fresh, layout.direction === 'horizontal' ? { width: total } : { height: total }) || changed;
      }
      if (sizingCross === 'hug') {
        let maxCross = 0;
        for (const child of children) maxCross = Math.max(maxCross, crossOf(layout, child));
        const total = paddingCross(layout) + maxCross;
        changed =
          setBounds(d, fresh, layout.direction === 'horizontal' ? { height: total } : { width: total }) || changed;
      }
    }
  }
  return changed;
}

function applyTextAutosize(d: DraftDoc, node: TextNode): boolean {
  if (node.autoResize === 'none') return false;
  const size = measureTextNodeSize(node);
  return setBounds(d, node, { width: size.width, height: size.height });
}

function shrinkwrapGroup(d: DraftDoc, id: NodeId): boolean {
  const group = getN(d, id);
  if (!group || group.type !== 'group') return false;
  const children = visibleChildren(d, group);
  if (children.length === 0) return false;
  const union = rectUnionAll(children.map((c) => childBoundsInParent(c)));
  if (!union) return false;
  if (near(union.x, 0) && near(union.y, 0) && near(union.width, group.width) && near(union.height, group.height)) {
    return false;
  }
  const rebased = rebaseLocalBounds(group, union);
  patchBase(d, group.id, rebased);
  for (const child of children) {
    patchBase(d, child.id, { x: child.x - union.x, y: child.y - union.y });
  }
  return true;
}

function placeChildrenTopDown(d: DraftDoc, id: NodeId): boolean {
  const node = getN(d, id);
  if (!node) return false;
  let changed = false;

  if (node.type === 'frame' && node.layout) {
    changed = placeAutoLayoutChildren(d, node, node.layout) || changed;
  }

  const fresh = getN(d, id);
  if (fresh && isContainer(fresh)) {
    for (const childId of fresh.childIds) changed = placeChildrenTopDown(d, childId) || changed;
  }
  return changed;
}

function placeAutoLayoutChildren(d: DraftDoc, frame: FrameNode, layout: AutoLayout): boolean {
  const children = visibleChildren(d, frame);
  if (children.length === 0) return false;
  let changed = false;

  const horizontal = layout.direction === 'horizontal';
  const frameMain = horizontal ? frame.width : frame.height;
  const frameCross = horizontal ? frame.height : frame.width;
  const padStart = horizontal ? layout.paddingLeft : layout.paddingTop;
  const padCrossStart = horizontal ? layout.paddingTop : layout.paddingLeft;
  const innerMain = frameMain - paddingMain(layout);
  const innerCross = frameCross - paddingCross(layout);

  // Resolve fill sizes on the main axis: split leftover space equally.
  const fillChildren = children.filter((c) => (horizontal ? c.sizingX : c.sizingY) === 'fill');
  let fixedTotal = 0;
  for (const child of children) {
    if (!fillChildren.includes(child)) fixedTotal += mainOf(layout, child);
  }
  const gapsTotal = layout.gap * (children.length - 1);
  const leftover = Math.max(0, innerMain - fixedTotal - gapsTotal);
  const fillMain = fillChildren.length > 0 ? leftover / fillChildren.length : 0;

  for (const child of fillChildren) {
    changed = setBounds(d, child, horizontal ? { width: fillMain } : { height: fillMain }) || changed;
  }

  // Cross-axis fill stretches to the inner box.
  for (const child of children) {
    const crossSizing = horizontal ? child.sizingY : child.sizingX;
    if (crossSizing === 'fill') {
      changed = setBounds(d, child, horizontal ? { height: innerCross } : { width: innerCross }) || changed;
    }
  }

  // Re-read children (objects may have been replaced) and re-measure wrapped text.
  const placed = visibleChildren(d, frame);
  for (const child of placed) {
    if (child.type === 'text' && child.autoResize === 'height') {
      changed = applyTextAutosize(d, child) || changed;
    }
  }

  const finalChildren = visibleChildren(d, frame);
  let contentMain = layout.gap * (finalChildren.length - 1);
  for (const child of finalChildren) contentMain += mainOf(layout, child);

  let cursor = padStart;
  let extraGap = 0;
  if (layout.alignMain === 'center') cursor = padStart + (innerMain - contentMain) / 2;
  else if (layout.alignMain === 'end') cursor = padStart + (innerMain - contentMain);
  else if (layout.alignMain === 'space-between' && finalChildren.length > 1) {
    extraGap = Math.max(0, innerMain - contentMain) / (finalChildren.length - 1);
  }

  for (const child of finalChildren) {
    const crossSize = crossOf(layout, child);
    let crossPos = padCrossStart;
    if (layout.alignCross === 'center') crossPos = padCrossStart + (innerCross - crossSize) / 2;
    else if (layout.alignCross === 'end') crossPos = padCrossStart + (innerCross - crossSize);

    changed = setBounds(d, child, horizontal ? { x: cursor, y: crossPos } : { x: crossPos, y: cursor }) || changed;
    // Layout owns child placement; clear any rotation drift is intentionally NOT done —
    // rotated children keep their rotation, positioned by their unrotated box.
    cursor += mainOf(layout, child) + layout.gap + extraGap;
  }
  return changed;
}

/** Reorder helper used while dragging a child inside its auto-layout parent. */
export function autoLayoutInsertionIndex(
  d: DraftDoc,
  frame: FrameNode,
  layout: AutoLayout,
  pointInFrame: { x: number; y: number },
  draggedId: NodeId,
): number {
  const children = visibleChildren(d, frame).filter((c) => c.id !== draggedId);
  const horizontal = layout.direction === 'horizontal';
  const pointer = horizontal ? pointInFrame.x : pointInFrame.y;
  let index = 0;
  for (const child of children) {
    const mid = horizontal ? child.x + child.width / 2 : child.y + child.height / 2;
    if (pointer > mid) index++;
  }
  return index;
}

/** Swap a frame's layout axes content positions are derived, so toggling direction is safe. */
export function toggledDirection(layout: AutoLayout): AutoLayout {
  return { ...layout, direction: layout.direction === 'horizontal' ? 'vertical' : 'horizontal' };
}

/** Patch a frame's layout, creating the frame copy through the draft. */
export function patchFrameLayout(d: DraftDoc, frame: FrameNode, layout: Partial<AutoLayout>): void {
  if (!frame.layout) return;
  patchNode(d, frame, { layout: { ...frame.layout, ...layout } });
}
