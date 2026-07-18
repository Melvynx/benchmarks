import type {
  AutoLayoutSettings,
  FrameNode,
  LayoutItemSettings,
  SceneNode,
} from '@/core/model/types';

export type LayoutDirection = AutoLayoutSettings['direction'];

export interface SizeConstraint {
  readonly width: number | null;
  readonly height: number | null;
}

export interface LayoutItem {
  readonly node: SceneNode;
  readonly intrinsicMain: number;
  readonly intrinsicCross: number;
  readonly mainMin: number | null;
  readonly mainMax: number | null;
  readonly crossMin: number | null;
  readonly crossMax: number | null;
  readonly mainSizing: LayoutItemSettings['horizontalSizing'];
  readonly crossSizing: LayoutItemSettings['verticalSizing'];
  readonly grow: number;
  readonly alignSelf: LayoutItemSettings['alignSelf'];
}

export interface LayoutLineItem extends LayoutItem {
  main: number;
  cross: number;
  mainPosition: number;
  crossPosition: number;
}

export interface LayoutLine {
  readonly items: LayoutLineItem[];
  naturalCross: number;
  cross: number;
  crossPosition: number;
}

export interface ChildLayoutFrame {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface FrameLayoutResult {
  readonly frame: FrameNode;
  readonly children: readonly ChildLayoutFrame[];
}
