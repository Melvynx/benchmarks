import type { AutoLayoutPadding, LayoutItemSettings, SceneNode } from '@/core/model/types';

import type { LayoutDirection } from './types';

export interface AxisPadding {
  readonly mainStart: number;
  readonly mainEnd: number;
  readonly crossStart: number;
  readonly crossEnd: number;
}

export interface AxisSize {
  readonly main: number;
  readonly cross: number;
}

export interface AxisLimits {
  readonly mainMin: number | null;
  readonly mainMax: number | null;
  readonly crossMin: number | null;
  readonly crossMax: number | null;
}

export function readAxisSize(node: SceneNode, direction: LayoutDirection): AxisSize {
  return direction === 'horizontal'
    ? { main: node.width, cross: node.height }
    : { main: node.height, cross: node.width };
}

export function readAxisLimits(
  layoutItem: LayoutItemSettings,
  direction: LayoutDirection,
): AxisLimits {
  return direction === 'horizontal'
    ? {
        mainMin: layoutItem.minWidth,
        mainMax: layoutItem.maxWidth,
        crossMin: layoutItem.minHeight,
        crossMax: layoutItem.maxHeight,
      }
    : {
        mainMin: layoutItem.minHeight,
        mainMax: layoutItem.maxHeight,
        crossMin: layoutItem.minWidth,
        crossMax: layoutItem.maxWidth,
      };
}

export function readAxisPadding(
  padding: AutoLayoutPadding,
  direction: LayoutDirection,
): AxisPadding {
  return direction === 'horizontal'
    ? {
        mainStart: padding.left,
        mainEnd: padding.right,
        crossStart: padding.top,
        crossEnd: padding.bottom,
      }
    : {
        mainStart: padding.top,
        mainEnd: padding.bottom,
        crossStart: padding.left,
        crossEnd: padding.right,
      };
}

export function writeAxisSize(
  node: SceneNode,
  direction: LayoutDirection,
  size: AxisSize,
): SceneNode {
  return direction === 'horizontal'
    ? { ...node, width: size.main, height: size.cross }
    : { ...node, width: size.cross, height: size.main };
}

export function writeAxisFrame(
  node: SceneNode,
  direction: LayoutDirection,
  main: number,
  cross: number,
  mainPosition: number,
  crossPosition: number,
): SceneNode {
  return direction === 'horizontal'
    ? { ...node, x: mainPosition, y: crossPosition, width: main, height: cross }
    : { ...node, x: crossPosition, y: mainPosition, width: cross, height: main };
}
