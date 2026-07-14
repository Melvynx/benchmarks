import { newId } from '../utils/id';
import { rgba, type RGBA } from '../utils/color';
import type {
  AutoLayout,
  BaseNodeProps,
  CornerRadius,
  EllipseNode,
  FrameNode,
  GradientPaint,
  GroupNode,
  LineNode,
  Paint,
  PolygonNode,
  RectNode,
  SceneDocument,
  ShadowEffect,
  SolidPaint,
  StarNode,
  TextNode,
} from './types';

export function solidPaint(color: RGBA, opacity = 1): SolidPaint {
  return { type: 'solid', enabled: true, opacity, color };
}

export function linearGradient(stops: GradientPaint['stops'], angle = 90): GradientPaint {
  return { type: 'gradient-linear', enabled: true, opacity: 1, stops, angle };
}

export function radialGradient(stops: GradientPaint['stops']): GradientPaint {
  return { type: 'gradient-radial', enabled: true, opacity: 1, stops, angle: 0 };
}

export function dropShadow(partial?: Partial<Omit<ShadowEffect, 'type'>>): ShadowEffect {
  return {
    type: 'drop-shadow',
    enabled: true,
    color: rgba(0, 0, 0, 0.25),
    offsetX: 0,
    offsetY: 4,
    blur: 12,
    spread: 0,
    ...partial,
  };
}

export function uniformRadius(r: number): CornerRadius {
  return { tl: r, tr: r, br: r, bl: r };
}

interface BaseOverrides extends Partial<Omit<BaseNodeProps, 'id'>> {
  fills?: Paint[];
  strokes?: Paint[];
}

function base(name: string, overrides: BaseOverrides = {}): BaseNodeProps {
  return {
    id: newId(),
    name,
    parentId: null,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    fills: [solidPaint(rgba(217, 217, 217))],
    strokes: [],
    strokeWeight: 1,
    strokeAlign: 'inside',
    strokeDash: 0,
    strokeGap: 0,
    effects: [],
    sizingX: 'fixed',
    sizingY: 'fixed',
    ...overrides,
  };
}

export function createRect(overrides: BaseOverrides & Partial<Pick<RectNode, 'cornerRadius'>> = {}): RectNode {
  const { cornerRadius, ...rest } = overrides;
  return { ...base('Rectangle', rest), type: 'rect', cornerRadius: cornerRadius ?? uniformRadius(0) };
}

export function createEllipse(overrides: BaseOverrides = {}): EllipseNode {
  return { ...base('Ellipse', overrides), type: 'ellipse' };
}

export function createLine(overrides: BaseOverrides = {}): LineNode {
  return {
    ...base('Line', {
      height: 0,
      fills: [],
      strokes: [solidPaint(rgba(255, 255, 255))],
      strokeAlign: 'center',
      ...overrides,
    }),
    type: 'line',
  };
}

export function createPolygon(overrides: BaseOverrides & Partial<Pick<PolygonNode, 'pointCount'>> = {}): PolygonNode {
  const { pointCount, ...rest } = overrides;
  return { ...base('Polygon', rest), type: 'polygon', pointCount: pointCount ?? 3 };
}

export function createStar(
  overrides: BaseOverrides & Partial<Pick<StarNode, 'pointCount' | 'innerRatio'>> = {},
): StarNode {
  const { pointCount, innerRatio, ...rest } = overrides;
  return { ...base('Star', rest), type: 'star', pointCount: pointCount ?? 5, innerRatio: innerRatio ?? 0.382 };
}

export function createFrame(
  overrides: BaseOverrides &
    Partial<Pick<FrameNode, 'clipsContent' | 'cornerRadius' | 'layout' | 'childIds'>> = {},
): FrameNode {
  const { clipsContent, cornerRadius, layout, childIds, ...rest } = overrides;
  return {
    ...base('Frame', { fills: [solidPaint(rgba(255, 255, 255))], ...rest }),
    type: 'frame',
    childIds: childIds ?? [],
    clipsContent: clipsContent ?? true,
    cornerRadius: cornerRadius ?? uniformRadius(0),
    layout: layout ?? null,
  };
}

export function createGroup(overrides: BaseOverrides & { childIds?: string[] } = {}): GroupNode {
  const { childIds, ...rest } = overrides;
  return { ...base('Group', { fills: [], ...rest }), type: 'group', childIds: childIds ?? [] };
}

export function createText(overrides: BaseOverrides & Partial<Omit<TextNode, keyof BaseNodeProps | 'type'>> = {}): TextNode {
  const {
    characters,
    fontFamily,
    fontWeight,
    fontSize,
    lineHeightPx,
    letterSpacing,
    textAlign,
    textAlignVertical,
    autoResize,
    ...rest
  } = overrides;
  return {
    ...base('Text', { fills: [solidPaint(rgba(255, 255, 255))], width: 1, height: 16, ...rest }),
    type: 'text',
    characters: characters ?? '',
    fontFamily: fontFamily ?? 'Inter',
    fontWeight: fontWeight ?? 400,
    fontSize: fontSize ?? 16,
    lineHeightPx: lineHeightPx ?? null,
    letterSpacing: letterSpacing ?? 0,
    textAlign: textAlign ?? 'left',
    textAlignVertical: textAlignVertical ?? 'top',
    autoResize: autoResize ?? 'width',
  };
}

export function defaultAutoLayout(direction: AutoLayout['direction'] = 'vertical'): AutoLayout {
  return {
    direction,
    gap: 10,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    alignMain: 'start',
    alignCross: 'start',
  };
}

/** Unique "Rectangle 4"-style name for a freshly created node. */
export function uniqueName(doc: SceneDocument, baseName: string): string {
  let max = 0;
  const prefix = baseName + ' ';
  for (const id of Object.keys(doc.nodes)) {
    const node = doc.nodes[id];
    if (!node) continue;
    if (node.name === baseName) max = Math.max(max, 1);
    else if (node.name.startsWith(prefix)) {
      const n = Number(node.name.slice(prefix.length));
      if (Number.isInteger(n)) max = Math.max(max, n);
    }
  }
  return max === 0 ? baseName : `${baseName} ${max + 1}`;
}
