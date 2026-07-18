import { SCENE_SCHEMA_VERSION } from '@/core/model/types';

import type {
  AutoLayoutSettings,
  BlendMode,
  Constraints,
  CornerRadii,
  Effect,
  GradientStop,
  ImageCrop,
  ImageSource,
  LayoutItemSettings,
  Paint,
  RgbaColor,
  SceneDocument,
  SceneNode,
  Stroke,
} from '@/core/model/types';

export interface DocumentValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type DocumentValidationResult =
  | { readonly ok: true; readonly document: SceneDocument }
  | {
      readonly ok: false;
      readonly kind: 'invalid-data' | 'unsupported-version';
      readonly issue: DocumentValidationIssue;
    };

const NODE_TYPES = [
  'frame',
  'group',
  'rectangle',
  'ellipse',
  'line',
  'text',
  'image',
  'polygon',
  'star',
] as const;

const BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
] as const satisfies readonly BlendMode[];

/**
 * Guards the current schema and refuses unknown historical/future versions.
 * Version migrations intentionally require an explicit migration function before acceptance.
 */
export function migrateAndValidateSceneDocument(value: unknown): DocumentValidationResult {
  if (isRecord(value) && 'schemaVersion' in value && value.schemaVersion !== SCENE_SCHEMA_VERSION) {
    const received =
      typeof value.schemaVersion === 'number' ? String(value.schemaVersion) : 'non-numeric';
    return {
      ok: false,
      kind: 'unsupported-version',
      issue: {
        path: '$.schemaVersion',
        message: `Unsupported scene schema ${received}; this build supports schema ${SCENE_SCHEMA_VERSION}.`,
      },
    };
  }

  if (!isSceneDocumentShape(value)) {
    return {
      ok: false,
      kind: 'invalid-data',
      issue: {
        path: '$',
        message: 'The value does not conform to the current scene document schema.',
      },
    };
  }

  const structuralIssue = validateDocumentGraph(value);
  return structuralIssue === null
    ? { ok: true, document: value }
    : { ok: false, kind: 'invalid-data', issue: structuralIssue };
}

export function isSceneDocument(value: unknown): value is SceneDocument {
  return migrateAndValidateSceneDocument(value).ok;
}

function isSceneDocumentShape(value: unknown): value is SceneDocument {
  return (
    isRecord(value) &&
    value.schemaVersion === SCENE_SCHEMA_VERSION &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    isNodeRecord(value.nodes) &&
    isStringArray(value.rootIds) &&
    isNonNegativeInteger(value.revision) &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt) &&
    isColor(value.background)
  );
}

function isNodeRecord(value: unknown): value is Readonly<Record<string, SceneNode>> {
  return isRecord(value) && Object.values(value).every(isSceneNode);
}

function isSceneNode(value: unknown): value is SceneNode {
  if (!isRecord(value) || !isOneOf(value.type, NODE_TYPES) || !hasBaseNodeFields(value))
    return false;

  switch (value.type) {
    case 'frame':
      return (
        isStringArray(value.childIds) &&
        typeof value.clipContent === 'boolean' &&
        (value.autoLayout === null || isAutoLayout(value.autoLayout))
      );
    case 'group':
      return isStringArray(value.childIds);
    case 'rectangle':
      return true;
    case 'ellipse':
      return (
        isFiniteNumber(value.arcStart) &&
        isFiniteNumber(value.arcEnd) &&
        isUnitNumber(value.innerRadius)
      );
    case 'line':
      return (
        isPoint(value.start) &&
        isPoint(value.end) &&
        isStrokeCap(value.startCap) &&
        isStrokeCap(value.endCap)
      );
    case 'text':
      return (
        typeof value.content === 'string' &&
        typeof value.fontFamily === 'string' &&
        isFiniteNumber(value.fontWeight) &&
        isOneOf(value.fontStyle, ['normal', 'italic'] as const) &&
        isPositiveNumber(value.fontSize) &&
        isPositiveNumber(value.lineHeight) &&
        isFiniteNumber(value.letterSpacing) &&
        isOneOf(value.textAlign, ['left', 'center', 'right', 'justify'] as const) &&
        isOneOf(value.verticalAlign, ['top', 'center', 'bottom'] as const) &&
        isOneOf(value.textDecoration, ['none', 'underline', 'line-through'] as const) &&
        isOneOf(value.textCase, ['original', 'upper', 'lower', 'title'] as const) &&
        isOneOf(value.autoResize, ['none', 'width-and-height', 'height'] as const)
      );
    case 'image':
      return (
        isImageSource(value.source) &&
        isOneOf(value.fit, ['fill', 'fit', 'crop', 'tile'] as const) &&
        isImageCrop(value.crop) &&
        typeof value.smoothing === 'boolean'
      );
    case 'polygon':
      return isIntegerAtLeast(value.pointCount, 3);
    case 'star':
      return isIntegerAtLeast(value.pointCount, 3) && isUnitNumber(value.innerRadius);
  }
}

function hasBaseNodeFields(value: Readonly<Record<string, unknown>>): boolean {
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    (value.parentId === null || typeof value.parentId === 'string') &&
    typeof value.visible === 'boolean' &&
    typeof value.locked === 'boolean' &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isNonNegativeNumber(value.width) &&
    isNonNegativeNumber(value.height) &&
    isFiniteNumber(value.rotation) &&
    isUnitNumber(value.opacity) &&
    isOneOf(value.blendMode, BLEND_MODES) &&
    isCornerRadii(value.cornerRadii) &&
    Array.isArray(value.fills) &&
    value.fills.every(isPaint) &&
    Array.isArray(value.strokes) &&
    value.strokes.every(isStroke) &&
    Array.isArray(value.effects) &&
    value.effects.every(isEffect) &&
    isConstraints(value.constraints) &&
    isLayoutItem(value.layoutItem)
  );
}

function isPaint(value: unknown): value is Paint {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.visible !== 'boolean' ||
    !isUnitNumber(value.opacity) ||
    !isOneOf(value.blendMode, BLEND_MODES)
  ) {
    return false;
  }

  switch (value.type) {
    case 'solid':
      return isColor(value.color);
    case 'linear-gradient':
      return isPoint(value.start) && isPoint(value.end) && isGradientStops(value.stops);
    case 'radial-gradient':
      return (
        isPoint(value.center) &&
        isPoint(value.radius) &&
        isPoint(value.focalPoint) &&
        isGradientStops(value.stops)
      );
    default:
      return false;
  }
}

function isGradientStops(value: unknown): value is readonly GradientStop[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((stop) => isRecord(stop) && isUnitNumber(stop.position) && isColor(stop.color))
  );
}

function isStroke(value: unknown): value is Stroke {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.visible === 'boolean' &&
    isPaint(value.paint) &&
    isNonNegativeNumber(value.width) &&
    isOneOf(value.align, ['inside', 'center', 'outside'] as const) &&
    isStrokeCap(value.cap) &&
    isOneOf(value.join, ['miter', 'round', 'bevel'] as const) &&
    Array.isArray(value.dash) &&
    value.dash.every(isNonNegativeNumber) &&
    isNonNegativeNumber(value.miterLimit)
  );
}

function isEffect(value: unknown): value is Effect {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.visible !== 'boolean')
    return false;
  switch (value.type) {
    case 'drop-shadow':
    case 'inner-shadow':
      return (
        isColor(value.color) &&
        isPoint(value.offset) &&
        isNonNegativeNumber(value.blur) &&
        isFiniteNumber(value.spread) &&
        isOneOf(value.blendMode, BLEND_MODES)
      );
    case 'layer-blur':
    case 'background-blur':
      return isNonNegativeNumber(value.radius);
    default:
      return false;
  }
}

function isCornerRadii(value: unknown): value is CornerRadii {
  return (
    isRecord(value) &&
    isNonNegativeNumber(value.topLeft) &&
    isNonNegativeNumber(value.topRight) &&
    isNonNegativeNumber(value.bottomRight) &&
    isNonNegativeNumber(value.bottomLeft)
  );
}

function isConstraints(value: unknown): value is Constraints {
  return (
    isRecord(value) &&
    isOneOf(value.horizontal, ['left', 'right', 'left-right', 'center', 'scale'] as const) &&
    isOneOf(value.vertical, ['top', 'bottom', 'top-bottom', 'center', 'scale'] as const)
  );
}

function isLayoutItem(value: unknown): value is LayoutItemSettings {
  return (
    isRecord(value) &&
    isOneOf(value.positioning, ['auto', 'absolute'] as const) &&
    isLayoutSizing(value.horizontalSizing) &&
    isLayoutSizing(value.verticalSizing) &&
    isNonNegativeNumber(value.grow) &&
    isOneOf(value.alignSelf, ['auto', 'start', 'center', 'end', 'stretch'] as const) &&
    isNullableNonNegativeNumber(value.minWidth) &&
    isNullableNonNegativeNumber(value.maxWidth) &&
    isNullableNonNegativeNumber(value.minHeight) &&
    isNullableNonNegativeNumber(value.maxHeight)
  );
}

function isAutoLayout(value: unknown): value is AutoLayoutSettings {
  return (
    isRecord(value) &&
    isOneOf(value.direction, ['horizontal', 'vertical'] as const) &&
    isNonNegativeNumber(value.gap) &&
    isRecord(value.padding) &&
    isNonNegativeNumber(value.padding.top) &&
    isNonNegativeNumber(value.padding.right) &&
    isNonNegativeNumber(value.padding.bottom) &&
    isNonNegativeNumber(value.padding.left) &&
    isOneOf(value.primaryAlignment, ['start', 'center', 'end', 'space-between'] as const) &&
    isOneOf(value.counterAlignment, ['start', 'center', 'end', 'baseline', 'stretch'] as const) &&
    typeof value.wrap === 'boolean' &&
    isNonNegativeNumber(value.counterAxisGap) &&
    isLayoutSizing(value.horizontalSizing) &&
    isLayoutSizing(value.verticalSizing) &&
    typeof value.reverse === 'boolean'
  );
}

function isImageSource(value: unknown): value is ImageSource {
  return (
    isRecord(value) &&
    isOneOf(value.kind, ['data-url', 'remote-url', 'blob-url'] as const) &&
    typeof value.uri === 'string' &&
    typeof value.mimeType === 'string' &&
    isPositiveNumber(value.intrinsicWidth) &&
    isPositiveNumber(value.intrinsicHeight)
  );
}

function isImageCrop(value: unknown): value is ImageCrop {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isNonNegativeNumber(value.width) &&
    isNonNegativeNumber(value.height)
  );
}

function isColor(value: unknown): value is RgbaColor {
  return (
    isRecord(value) &&
    isUnitNumber(value.r) &&
    isUnitNumber(value.g) &&
    isUnitNumber(value.b) &&
    isUnitNumber(value.a)
  );
}

function isPoint(value: unknown): value is { readonly x: number; readonly y: number } {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function validateDocumentGraph(document: SceneDocument): DocumentValidationIssue | null {
  const rootIds = new Set<string>();
  for (const [index, rootId] of document.rootIds.entries()) {
    if (rootIds.has(rootId))
      return { path: `$.rootIds[${index}]`, message: `Duplicate root node '${rootId}'.` };
    rootIds.add(rootId);
    const root = document.nodes[rootId];
    if (!root)
      return { path: `$.rootIds[${index}]`, message: `Root node '${rootId}' does not exist.` };
    if (root.parentId !== null)
      return {
        path: `$.nodes.${rootId}.parentId`,
        message: 'Root nodes must have a null parentId.',
      };
  }

  for (const [recordId, node] of Object.entries(document.nodes)) {
    if (isUnsafeRecordKey(recordId)) {
      return {
        path: `$.nodes.${recordId}`,
        message: 'Reserved object-property names cannot be used as node ids.',
      };
    }
    if (recordId !== node.id)
      return { path: `$.nodes.${recordId}.id`, message: 'Node record keys must equal node ids.' };
    if (node.parentId === null) {
      if (!rootIds.has(node.id))
        return {
          path: `$.nodes.${node.id}.parentId`,
          message: 'Parentless nodes must appear in rootIds.',
        };
      continue;
    }

    const parent = document.nodes[node.parentId];
    if (!parent)
      return {
        path: `$.nodes.${node.id}.parentId`,
        message: `Parent '${node.parentId}' does not exist.`,
      };
    if (parent.type !== 'frame' && parent.type !== 'group') {
      return {
        path: `$.nodes.${node.id}.parentId`,
        message: 'A node parent must be a frame or group.',
      };
    }
    if (!parent.childIds.includes(node.id)) {
      return {
        path: `$.nodes.${node.id}.parentId`,
        message: 'The parent childIds array does not reference this node.',
      };
    }
  }

  for (const node of Object.values(document.nodes)) {
    if (node.type !== 'frame' && node.type !== 'group') continue;
    const uniqueChildren = new Set<string>();
    for (const [index, childId] of node.childIds.entries()) {
      if (uniqueChildren.has(childId))
        return {
          path: `$.nodes.${node.id}.childIds[${index}]`,
          message: `Duplicate child '${childId}'.`,
        };
      uniqueChildren.add(childId);
      const child = document.nodes[childId];
      if (!child)
        return {
          path: `$.nodes.${node.id}.childIds[${index}]`,
          message: `Child '${childId}' does not exist.`,
        };
      if (child.parentId !== node.id)
        return {
          path: `$.nodes.${node.id}.childIds[${index}]`,
          message: `Child '${childId}' points to a different parent.`,
        };
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): DocumentValidationIssue | null => {
    if (visiting.has(nodeId))
      return { path: `$.nodes.${nodeId}`, message: 'The scene graph contains a cycle.' };
    if (visited.has(nodeId)) return null;
    visiting.add(nodeId);
    const node = document.nodes[nodeId];
    if (node?.type === 'frame' || node?.type === 'group') {
      for (const childId of node.childIds) {
        const issue = visit(childId);
        if (issue) return issue;
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return null;
  };

  for (const rootId of document.rootIds) {
    const issue = visit(rootId);
    if (issue) return issue;
  }
  if (visited.size !== Object.keys(document.nodes).length) {
    return { path: '$.nodes', message: 'The document contains an unreachable node or cycle.' };
  }
  return null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isUnsafeRecordKey(value: string): boolean {
  return value === '__proto__' || value === 'prototype' || value === 'constructor';
}

function isOneOf<const Value extends string>(
  value: unknown,
  options: readonly Value[],
): value is Value {
  return typeof value === 'string' && options.some((option) => option === value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isUnitNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

function isIntegerAtLeast(value: unknown, minimum: number): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= minimum;
}

function isNullableNonNegativeNumber(value: unknown): value is number | null {
  return value === null || isNonNegativeNumber(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isStrokeCap(value: unknown): boolean {
  return isOneOf(value, ['none', 'round', 'square', 'arrow', 'triangle'] as const);
}

function isLayoutSizing(value: unknown): boolean {
  return isOneOf(value, ['fixed', 'hug', 'fill'] as const);
}
