import { cloneSceneNode } from '@/core/model/clone';

import {
  readAxisLimits,
  readAxisPadding,
  readAxisSize,
  writeAxisFrame,
  writeAxisSize,
} from './axis';

import type { AutoLayoutSettings, FrameNode, SceneNode } from '@/core/model/types';
import type {
  ChildLayoutFrame,
  FrameLayoutResult,
  LayoutDirection,
  LayoutItem,
  LayoutLine,
  LayoutLineItem,
  SizeConstraint,
} from './types';

const MINIMUM_SIZE = 0.01;

function clampSize(value: number, minimum: number | null, maximum: number | null) {
  return Math.max(MINIMUM_SIZE, minimum ?? 0, Math.min(maximum ?? Number.POSITIVE_INFINITY, value));
}

function readSizing(
  node: SceneNode,
  direction: LayoutDirection,
): Pick<LayoutItem, 'mainSizing' | 'crossSizing'> {
  return direction === 'horizontal'
    ? {
        mainSizing: node.layoutItem.horizontalSizing,
        crossSizing: node.layoutItem.verticalSizing,
      }
    : {
        mainSizing: node.layoutItem.verticalSizing,
        crossSizing: node.layoutItem.horizontalSizing,
      };
}

function createLayoutItem(node: SceneNode, direction: LayoutDirection): LayoutItem {
  const intrinsic = readAxisSize(node, direction);
  const limits = readAxisLimits(node.layoutItem, direction);
  return {
    node,
    intrinsicMain: clampSize(intrinsic.main, limits.mainMin, limits.mainMax),
    intrinsicCross: clampSize(intrinsic.cross, limits.crossMin, limits.crossMax),
    ...limits,
    ...readSizing(node, direction),
    grow: Math.max(0, node.layoutItem.grow),
    alignSelf: node.layoutItem.alignSelf,
  };
}

function naturalLineItem(item: LayoutItem): LayoutLineItem {
  return {
    ...item,
    main: item.intrinsicMain,
    cross: item.intrinsicCross,
    mainPosition: 0,
    crossPosition: 0,
  };
}

function contentMainSize(items: readonly LayoutItem[], gap: number) {
  if (items.length === 0) return 0;
  return items.reduce((total, item) => total + item.intrinsicMain, 0) + gap * (items.length - 1);
}

function createLines(
  items: readonly LayoutItem[],
  availableMain: number,
  gap: number,
  canWrap: boolean,
): LayoutLine[] {
  if (items.length === 0) return [];
  const lines: LayoutLine[] = [];
  let current: LayoutLineItem[] = [];
  let occupied = 0;

  for (const item of items) {
    const next = naturalLineItem(item);
    const nextOccupied = occupied + (current.length > 0 ? gap : 0) + next.intrinsicMain;
    if (canWrap && current.length > 0 && nextOccupied > availableMain) {
      lines.push(createLine(current));
      current = [next];
      occupied = next.intrinsicMain;
      continue;
    }
    current.push(next);
    occupied = nextOccupied;
  }

  if (current.length > 0) lines.push(createLine(current));
  return lines;
}

function createLine(items: LayoutLineItem[]): LayoutLine {
  const naturalCross = items.reduce((largest, item) => Math.max(largest, item.intrinsicCross), 0);
  return { items, naturalCross, cross: naturalCross, crossPosition: 0 };
}

function flexWeight(item: LayoutLineItem) {
  if (item.mainSizing === 'fill') return item.grow > 0 ? item.grow : 1;
  return item.grow;
}

function prepareFlexBases(items: readonly LayoutLineItem[], canFlex: boolean) {
  for (const item of items) {
    const isFlexible = canFlex && flexWeight(item) > 0;
    const base =
      isFlexible && item.mainSizing === 'fill'
        ? (item.mainMin ?? MINIMUM_SIZE)
        : item.intrinsicMain;
    item.main = clampSize(base, item.mainMin, item.mainMax);
  }
}

function distributePositiveSpace(items: readonly LayoutLineItem[], freeSpace: number) {
  let remaining = freeSpace;
  let flexible = items.filter((item) => flexWeight(item) > 0);

  while (remaining > MINIMUM_SIZE && flexible.length > 0) {
    const totalWeight = flexible.reduce((total, item) => total + flexWeight(item), 0);
    const constrained = flexible.filter((item) => {
      if (item.mainMax === null) return false;
      const allocation = (remaining * flexWeight(item)) / totalWeight;
      return item.main + allocation > item.mainMax;
    });

    if (constrained.length === 0) {
      for (const item of flexible) {
        item.main += (remaining * flexWeight(item)) / totalWeight;
      }
      return;
    }

    for (const item of constrained) {
      const maximum = item.mainMax ?? item.main;
      remaining -= Math.max(0, maximum - item.main);
      item.main = maximum;
    }
    const constrainedIds = new Set(constrained.map((item) => item.node.id));
    flexible = flexible.filter((item) => !constrainedIds.has(item.node.id));
  }
}

function resolveMainSizes(line: LayoutLine, availableMain: number, gap: number, canFlex: boolean) {
  prepareFlexBases(line.items, canFlex);
  const gaps = Math.max(0, line.items.length - 1) * gap;
  const occupied = line.items.reduce((total, item) => total + item.main, gaps);
  if (canFlex && availableMain > occupied) {
    distributePositiveSpace(line.items, availableMain - occupied);
  }
}

function mainAlignmentOffset(alignment: AutoLayoutSettings['primaryAlignment'], remaining: number) {
  if (alignment === 'center') return remaining / 2;
  if (alignment === 'end') return remaining;
  return 0;
}

function positionMainAxis(
  line: LayoutLine,
  availableMain: number,
  gap: number,
  alignment: AutoLayoutSettings['primaryAlignment'],
) {
  const occupied = line.items.reduce((total, item) => total + item.main, 0);
  const normalGaps = Math.max(0, line.items.length - 1) * gap;
  const remaining = Math.max(0, availableMain - occupied - normalGaps);
  const spacing =
    alignment === 'space-between' && line.items.length > 1
      ? gap + remaining / (line.items.length - 1)
      : gap;
  let cursor = mainAlignmentOffset(alignment, remaining);

  for (const item of line.items) {
    item.mainPosition = cursor;
    cursor += item.main + spacing;
  }
}

function totalLineCross(lines: readonly LayoutLine[], counterGap: number) {
  if (lines.length === 0) return 0;
  return (
    lines.reduce((total, line) => total + line.naturalCross, 0) + counterGap * (lines.length - 1)
  );
}

function lineCollectionOffset(
  alignment: AutoLayoutSettings['counterAlignment'],
  remaining: number,
) {
  if (alignment === 'center') return remaining / 2;
  if (alignment === 'end') return remaining;
  return 0;
}

function sizeAndPositionLines(
  lines: readonly LayoutLine[],
  availableCross: number,
  counterGap: number,
  alignment: AutoLayoutSettings['counterAlignment'],
  isWrapped: boolean,
) {
  if (!isWrapped && lines.length === 1) {
    const line = lines[0];
    if (!line) return;
    line.cross = availableCross;
    line.crossPosition = 0;
    return;
  }

  const naturalTotal = totalLineCross(lines, counterGap);
  const remaining = Math.max(0, availableCross - naturalTotal);
  const stretchPerLine = alignment === 'stretch' && lines.length > 0 ? remaining / lines.length : 0;
  let cursor = lineCollectionOffset(alignment, remaining);

  for (const line of lines) {
    line.cross = line.naturalCross + stretchPerLine;
    line.crossPosition = cursor;
    cursor += line.cross + counterGap;
  }
}

function effectiveCounterAlignment(
  item: LayoutLineItem,
  frameAlignment: AutoLayoutSettings['counterAlignment'],
) {
  const alignment = item.alignSelf === 'auto' ? frameAlignment : item.alignSelf;
  return alignment === 'baseline' ? 'start' : alignment;
}

function positionCrossAxis(
  lines: readonly LayoutLine[],
  frameAlignment: AutoLayoutSettings['counterAlignment'],
) {
  for (const line of lines) {
    for (const item of line.items) {
      const alignment = effectiveCounterAlignment(item, frameAlignment);
      const shouldStretch = item.crossSizing === 'fill' || alignment === 'stretch';
      item.cross = clampSize(
        shouldStretch ? line.cross : item.intrinsicCross,
        item.crossMin,
        item.crossMax,
      );
      const remaining = Math.max(0, line.cross - item.cross);
      item.crossPosition =
        line.crossPosition +
        (alignment === 'center' ? remaining / 2 : alignment === 'end' ? remaining : 0);
    }
  }
}

function isForcedOnAxis(
  constraint: SizeConstraint,
  direction: LayoutDirection,
  axis: 'main' | 'cross',
) {
  if (direction === 'horizontal')
    return axis === 'main' ? constraint.width !== null : constraint.height !== null;
  return axis === 'main' ? constraint.height !== null : constraint.width !== null;
}

function frameAxisSizing(settings: AutoLayoutSettings, direction: LayoutDirection) {
  return direction === 'horizontal'
    ? { main: settings.horizontalSizing, cross: settings.verticalSizing }
    : { main: settings.verticalSizing, cross: settings.horizontalSizing };
}

function constrainFrame(frame: FrameNode, constraint: SizeConstraint) {
  return cloneSceneNode({
    ...frame,
    width: constraint.width ?? frame.width,
    height: constraint.height ?? frame.height,
  });
}

function toChildFrames(
  lines: readonly LayoutLine[],
  direction: LayoutDirection,
  mainStart: number,
  crossStart: number,
): ChildLayoutFrame[] {
  return lines.flatMap((line) =>
    line.items.map((item) => {
      const node = writeAxisFrame(
        item.node,
        direction,
        item.main,
        item.cross,
        mainStart + item.mainPosition,
        crossStart + item.crossPosition,
      );
      return { id: node.id, x: node.x, y: node.y, width: node.width, height: node.height };
    }),
  );
}

export function layoutFrame(
  sourceFrame: FrameNode,
  children: readonly SceneNode[],
  constraint: SizeConstraint,
): FrameLayoutResult {
  const settings = sourceFrame.autoLayout;
  if (!settings) return { frame: constrainFrame(sourceFrame, constraint), children: [] };

  const frame = constrainFrame(sourceFrame, constraint);
  const direction = settings.direction;
  const padding = readAxisPadding(settings.padding, direction);
  const sizing = frameAxisSizing(settings, direction);
  const initialFrameSize = readAxisSize(frame, direction);
  const isMainHug = sizing.main === 'hug' && !isForcedOnAxis(constraint, direction, 'main');
  const isCrossHug = sizing.cross === 'hug' && !isForcedOnAxis(constraint, direction, 'cross');
  const autoChildren = children
    .filter((child) => child.layoutItem.positioning === 'auto')
    .map((child) => createLayoutItem(child, direction));
  const orderedChildren = settings.reverse ? autoChildren.toReversed() : autoChildren;
  const initialInnerMain = Math.max(0, initialFrameSize.main - padding.mainStart - padding.mainEnd);
  const naturalMain = contentMainSize(orderedChildren, settings.gap);
  const innerMain = isMainHug ? naturalMain : initialInnerMain;
  const lines = createLines(orderedChildren, innerMain, settings.gap, settings.wrap && !isMainHug);

  for (const line of lines) {
    resolveMainSizes(line, innerMain, settings.gap, !isMainHug);
    positionMainAxis(line, innerMain, settings.gap, settings.primaryAlignment);
  }

  const naturalCross = totalLineCross(lines, settings.counterAxisGap);
  const initialInnerCross = Math.max(
    0,
    initialFrameSize.cross - padding.crossStart - padding.crossEnd,
  );
  const innerCross = isCrossHug ? naturalCross : initialInnerCross;
  sizeAndPositionLines(
    lines,
    innerCross,
    settings.counterAxisGap,
    settings.counterAlignment,
    settings.wrap,
  );
  positionCrossAxis(lines, settings.counterAlignment);

  const resolvedFrame = writeAxisSize(frame, direction, {
    main: innerMain + padding.mainStart + padding.mainEnd,
    cross: innerCross + padding.crossStart + padding.crossEnd,
  });
  if (resolvedFrame.type !== 'frame') {
    throw new Error('Auto-layout can only resolve frame nodes.');
  }
  return {
    frame: cloneSceneNode(resolvedFrame),
    children: toChildFrames(lines, direction, padding.mainStart, padding.crossStart),
  };
}
