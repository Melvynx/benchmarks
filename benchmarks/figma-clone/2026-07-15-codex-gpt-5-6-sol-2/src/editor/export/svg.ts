import { transformRectBounds } from '@/core/geometry/bounds';
import {
  applyMatrixToPoint,
  composeMatrices,
  IDENTITY_MATRIX,
  matrixScaleFactors,
  rotationMatrixDegrees,
  translationMatrix,
} from '@/core/geometry/matrix2d';
import { aabbFromPoints, expandAabb, intersectAabb, unionAabb } from '@/core/geometry/rect';
import type { Matrix2D } from '@/core/geometry/matrix2d';
import type { AABB } from '@/core/geometry/rect';
import type { Vec2 } from '@/core/geometry/vec2';
import type {
  Effect,
  ImageNode,
  Paint,
  RgbaColor,
  SceneDocument,
  SceneNode,
  Stroke,
  TextNode,
} from '@/core/model/types';
import { migrateAndValidateSceneDocument } from '@/editor/persistence/schema';

import { downloadBlob, sanitizeDownloadFilename } from './download';
import { DocumentExportError, exportFailure, exportSuccess } from './errors';
import type { ExportOperationResult } from './errors';

export interface SvgExportOptions {
  /** Defaults to every root. Descendants are removed when an ancestor is also selected. */
  readonly nodeIds?: readonly string[];
  readonly padding?: number;
  readonly includeBackground?: boolean;
}

export interface SvgExportResult {
  readonly svg: string;
  readonly bounds: AABB;
  readonly width: number;
  readonly height: number;
  readonly warnings: readonly string[];
}

interface SerializationContext {
  readonly definitions: string[];
  readonly warnings: Set<string>;
  nextDefinitionId: number;
}

interface PaintReference {
  readonly value: string;
  readonly opacity: number;
  readonly blendMode: string;
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

export function serializeSceneDocumentSvg(
  document: SceneDocument,
  options: SvgExportOptions = {},
): ExportOperationResult<SvgExportResult> {
  const validation = migrateAndValidateSceneDocument(document);
  if (!validation.ok) {
    return exportFailure(
      new DocumentExportError(
        'invalid-document',
        `${validation.issue.path}: ${validation.issue.message}`,
      ),
    );
  }

  const selectedRoots = resolveExportRoots(document, options.nodeIds);
  if (selectedRoots.length === 0) {
    return exportFailure(
      new DocumentExportError('empty-selection', 'There are no visible nodes to export.'),
    );
  }

  const worldMatrices = new Map<string, Matrix2D>();
  let contentBounds: AABB | null = null;
  for (const nodeId of selectedRoots) {
    const worldMatrix = getWorldMatrix(document, nodeId, worldMatrices);
    const nodeBounds = getSubtreeBounds(document, nodeId, worldMatrix);
    if (nodeBounds)
      contentBounds = contentBounds ? unionAabb(contentBounds, nodeBounds) : nodeBounds;
  }
  if (!contentBounds) {
    return exportFailure(
      new DocumentExportError(
        'empty-selection',
        'The selected nodes do not have exportable bounds.',
      ),
    );
  }

  const padding = Math.max(0, options.padding ?? 0);
  const bounds = expandAabb(contentBounds, padding);
  const width = Math.max(0.01, bounds.maxX - bounds.minX);
  const height = Math.max(0.01, bounds.maxY - bounds.minY);
  const context: SerializationContext = {
    definitions: [],
    warnings: new Set<string>(),
    nextDefinitionId: 1,
  };

  const nodeMarkup = selectedRoots
    .map((nodeId) =>
      serializeNodeTree(document, nodeId, getWorldMatrix(document, nodeId, worldMatrices), context),
    )
    .join('');
  const background =
    (options.includeBackground ?? false)
      ? `<rect x="${formatNumber(bounds.minX)}" y="${formatNumber(bounds.minY)}" width="${formatNumber(width)}" height="${formatNumber(height)}" ${solidColorAttributes(document.background, 1, 'fill')}/>`
      : '';
  const definitions =
    context.definitions.length > 0 ? `<defs>${context.definitions.join('')}</defs>` : '';
  const svg = `${XML_HEADER}<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${formatNumber(width)}" height="${formatNumber(height)}" viewBox="${formatNumber(bounds.minX)} ${formatNumber(bounds.minY)} ${formatNumber(width)} ${formatNumber(height)}"><title>${escapeXml(document.name)}</title>${definitions}${background}${nodeMarkup}</svg>`;

  return exportSuccess({
    svg,
    bounds,
    width,
    height,
    warnings: [...context.warnings],
  });
}

/** Alias matching the editor command vocabulary. */
export const exportDocumentToSvg = serializeSceneDocumentSvg;

export function createSceneDocumentSvgBlob(
  document: SceneDocument,
  options: SvgExportOptions = {},
): ExportOperationResult<Blob> {
  const serialized = serializeSceneDocumentSvg(document, options);
  return serialized.ok
    ? exportSuccess(new Blob([serialized.value.svg], { type: 'image/svg+xml;charset=utf-8' }))
    : serialized;
}

export function downloadSceneDocumentSvg(
  document: SceneDocument,
  options: SvgExportOptions = {},
  filename = `${document.name}.svg`,
): ExportOperationResult<void> {
  const blob = createSceneDocumentSvgBlob(document, options);
  return blob.ok
    ? downloadBlob(blob.value, sanitizeDownloadFilename(filename, 'document.svg'))
    : blob;
}

function resolveExportRoots(
  document: SceneDocument,
  requested: readonly string[] | undefined,
): string[] {
  const source = requested ?? document.rootIds;
  const unique = [...new Set(source)].filter((id) => document.nodes[id]?.visible === true);
  const selected = new Set(unique);
  return unique.filter((id) => {
    let parentId = document.nodes[id]?.parentId ?? null;
    while (parentId !== null) {
      if (selected.has(parentId)) return false;
      parentId = document.nodes[parentId]?.parentId ?? null;
    }
    return true;
  });
}

function getWorldMatrix(
  document: SceneDocument,
  nodeId: string,
  cache: Map<string, Matrix2D>,
): Matrix2D {
  const cached = cache.get(nodeId);
  if (cached) return cached;
  const node = document.nodes[nodeId];
  if (!node) return IDENTITY_MATRIX;
  const parentWorld = node.parentId
    ? getWorldMatrix(document, node.parentId, cache)
    : IDENTITY_MATRIX;
  const world = composeMatrices(parentWorld, nodeLocalMatrix(node));
  cache.set(nodeId, world);
  return world;
}

function nodeLocalMatrix(node: SceneNode): Matrix2D {
  return composeMatrices(translationMatrix(node.x, node.y), rotationMatrixDegrees(node.rotation));
}

function getSubtreeBounds(
  document: SceneDocument,
  nodeId: string,
  worldMatrix: Matrix2D,
): AABB | null {
  const node = document.nodes[nodeId];
  if (!node?.visible) return null;

  let bounds = node.type === 'group' ? null : getNodeVisualBounds(node, worldMatrix);
  if (node.type === 'frame' || node.type === 'group') {
    let childBounds: AABB | null = null;
    for (const childId of node.childIds) {
      const child = document.nodes[childId];
      if (!child) continue;
      const candidate = getSubtreeBounds(
        document,
        childId,
        composeMatrices(worldMatrix, nodeLocalMatrix(child)),
      );
      if (candidate) childBounds = childBounds ? unionAabb(childBounds, candidate) : candidate;
    }
    if (childBounds && node.type === 'frame' && node.clipContent) {
      const frameBounds = transformRectBounds(
        { x: 0, y: 0, width: node.width, height: node.height },
        worldMatrix,
      );
      childBounds = intersectAabb(childBounds, frameBounds);
    }
    if (childBounds) bounds = bounds ? unionAabb(bounds, childBounds) : childBounds;
  }
  return bounds;
}

function getNodeVisualBounds(node: SceneNode, worldMatrix: Matrix2D): AABB {
  const base =
    node.type === 'line'
      ? aabbFromPoints([
          applyMatrixToPoint(worldMatrix, node.start),
          applyMatrixToPoint(worldMatrix, node.end),
        ])
      : transformRectBounds({ x: 0, y: 0, width: node.width, height: node.height }, worldMatrix);
  const scales = matrixScaleFactors(worldMatrix);
  const scale = Math.max(scales.x, scales.y);
  const strokeExpansion =
    node.strokes.reduce(
      (maximum, stroke) => (stroke.visible ? Math.max(maximum, stroke.width * scale) : maximum),
      0,
    ) / 2;
  const effectExpansion = node.effects.reduce((maximum, effect) => {
    if (!effect.visible) return maximum;
    if (effect.type === 'layer-blur' || effect.type === 'background-blur') {
      return Math.max(maximum, effect.radius * 2 * scale);
    }
    return Math.max(
      maximum,
      (Math.abs(effect.offset.x) +
        Math.abs(effect.offset.y) +
        effect.blur * 2 +
        Math.abs(effect.spread)) *
        scale,
    );
  }, 0);
  return expandAabb(base, strokeExpansion + effectExpansion);
}

function serializeNodeTree(
  document: SceneDocument,
  nodeId: string,
  transform: Matrix2D,
  context: SerializationContext,
): string {
  const node = document.nodes[nodeId];
  if (!node?.visible) return '';

  const filterId = createEffectFilter(node.effects, node.id, context);
  const groupAttributes = [
    `data-node-id="${escapeAttribute(node.id)}"`,
    `data-node-name="${escapeAttribute(node.name)}"`,
    `transform="${matrixToSvg(transform)}"`,
    node.opacity < 1 ? `opacity="${formatNumber(clamp01(node.opacity))}"` : '',
    node.blendMode !== 'normal' ? `style="mix-blend-mode:${escapeAttribute(node.blendMode)}"` : '',
    filterId ? `filter="url(#${filterId})"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  let self = '';
  if (node.type === 'text') self = serializeText(node, context);
  else if (node.type === 'image') self = serializeImage(node, context);
  else if (node.type !== 'group') self = serializePaintedShape(node, context);

  let children = '';
  if (node.type === 'frame' || node.type === 'group') {
    children = node.childIds
      .map((childId) => {
        const child = document.nodes[childId];
        return child ? serializeNodeTree(document, childId, nodeLocalMatrix(child), context) : '';
      })
      .join('');
    if (children && node.type === 'frame' && node.clipContent) {
      const clipId = nextDefinitionId(context, `frame-clip-${node.id}`);
      context.definitions.push(
        `<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${geometryElement(node, '')}</clipPath>`,
      );
      children = `<g clip-path="url(#${clipId})">${children}</g>`;
    }
  }

  return `<g ${groupAttributes}>${self}${children}</g>`;
}

function serializePaintedShape(node: SceneNode, context: SerializationContext): string {
  const fills =
    node.type === 'line'
      ? ''
      : node.fills
          .filter((paint) => paint.visible && paint.opacity > 0)
          .map((paint) => {
            const reference = createPaintReference(paint, node.width, node.height, context);
            const attributes = `${paintAttributes(reference, 'fill')} stroke="none" fill-rule="evenodd"`;
            return geometryElement(node, attributes);
          })
          .join('');
  return fills + serializeShapeStrokes(node, context);
}

function serializeShapeStrokes(node: SceneNode, context: SerializationContext): string {
  if (
    node.type === 'line' &&
    (node.startCap === 'arrow' ||
      node.startCap === 'triangle' ||
      node.endCap === 'arrow' ||
      node.endCap === 'triangle')
  ) {
    context.warnings.add('Line endpoint arrows and triangles are exported without markers.');
  }
  return node.strokes
    .filter((stroke) => stroke.visible && stroke.width > 0 && stroke.paint.visible)
    .map((stroke) => {
      if (stroke.align !== 'center') {
        context.warnings.add(
          'SVG stroke alignment is centered; inside/outside strokes are approximated.',
        );
      }
      if (stroke.cap === 'arrow' || stroke.cap === 'triangle') {
        context.warnings.add('Arrow and triangle stroke caps are exported as butt caps.');
      }
      const reference = createPaintReference(stroke.paint, node.width, node.height, context);
      return geometryElement(node, strokeAttributes(stroke, reference));
    })
    .join('');
}

function serializeText(node: TextNode, context: SerializationContext): string {
  if (node.textAlign === 'justify') {
    context.warnings.add('Justified text is exported with start alignment.');
  }
  if (node.autoResize !== 'width-and-height') {
    context.warnings.add(
      'SVG text preserves explicit line breaks but does not reproduce canvas font-metric wrapping.',
    );
  }
  const content = applyTextCase(node.content, node.textCase);
  const lines = content.split(/\r?\n/);
  const lineHeight = node.lineHeight <= 4 ? node.fontSize * node.lineHeight : node.lineHeight;
  const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
  const y =
    node.verticalAlign === 'center'
      ? (node.height - blockHeight) / 2
      : node.verticalAlign === 'bottom'
        ? node.height - blockHeight
        : 0;
  const x =
    node.textAlign === 'center' ? node.width / 2 : node.textAlign === 'right' ? node.width : 0;
  const anchor =
    node.textAlign === 'center' ? 'middle' : node.textAlign === 'right' ? 'end' : 'start';
  const common = `x="${formatNumber(x)}" y="${formatNumber(y)}" font-family="${escapeAttribute(node.fontFamily)}" font-size="${formatNumber(node.fontSize)}" font-weight="${formatNumber(node.fontWeight)}" font-style="${node.fontStyle}" text-anchor="${anchor}" dominant-baseline="text-before-edge" letter-spacing="${formatNumber(node.letterSpacing)}" text-decoration="${node.textDecoration}" xml:space="preserve"`;
  const textBody = lines
    .map(
      (line, index) =>
        `<tspan x="${formatNumber(x)}" dy="${index === 0 ? 0 : formatNumber(lineHeight)}">${escapeXml(line)}</tspan>`,
    )
    .join('');
  const visibleFills = node.fills.filter((paint) => paint.visible && paint.opacity > 0);
  const fillLayers = (visibleFills.length > 0 ? visibleFills : [fallbackBlackPaint()])
    .map((paint) => {
      const reference = createPaintReference(paint, node.width, node.height, context);
      return `<text ${common} ${paintAttributes(reference, 'fill')} stroke="none">${textBody}</text>`;
    })
    .join('');
  const strokeLayers = node.strokes
    .filter((stroke) => stroke.visible && stroke.width > 0 && stroke.paint.visible)
    .map((stroke) => {
      const reference = createPaintReference(stroke.paint, node.width, node.height, context);
      return `<text ${common} ${strokeAttributes(stroke, reference)}>${textBody}</text>`;
    })
    .join('');
  return fillLayers + strokeLayers;
}

function serializeImage(node: ImageNode, context: SerializationContext): string {
  if (!isSafeImageHref(node.source.uri)) {
    context.warnings.add(`Image '${node.name}' was omitted because its URL scheme is unsafe.`);
    return serializeShapeStrokes(node, context);
  }
  if (node.source.kind === 'blob-url') {
    context.warnings.add(
      'Blob URL images remain session-local in SVG exports; data URLs are portable.',
    );
  }
  if (node.source.kind === 'remote-url') {
    context.warnings.add(
      'Remote images remain externally referenced and may be unavailable when the SVG is opened offline.',
    );
  }
  if (node.fit === 'crop' && !isDefaultCrop(node)) {
    context.warnings.add('Image crop offsets are approximated with a centered SVG slice.');
  }

  const clipId = nextDefinitionId(context, `image-clip-${node.id}`);
  context.definitions.push(
    `<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${geometryElement(node, '')}</clipPath>`,
  );
  const href = escapeAttribute(node.source.uri);
  let imageMarkup: string;
  if (node.fit === 'tile') {
    const patternId = nextDefinitionId(context, `image-pattern-${node.id}`);
    const tileWidth = Math.max(1, node.source.intrinsicWidth);
    const tileHeight = Math.max(1, node.source.intrinsicHeight);
    context.definitions.push(
      `<pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${formatNumber(tileWidth)}" height="${formatNumber(tileHeight)}"><image href="${href}" width="${formatNumber(tileWidth)}" height="${formatNumber(tileHeight)}"/></pattern>`,
    );
    imageMarkup = geometryElement(node, `fill="url(#${patternId})" stroke="none"`);
  } else {
    const preserve =
      node.fit === 'fill' ? 'none' : node.fit === 'fit' ? 'xMidYMid meet' : 'xMidYMid slice';
    imageMarkup = `<image href="${href}" x="0" y="0" width="${formatNumber(node.width)}" height="${formatNumber(node.height)}" preserveAspectRatio="${preserve}" clip-path="url(#${clipId})"/>`;
  }
  return imageMarkup + serializeShapeStrokes(node, context);
}

function geometryElement(node: SceneNode, attributes: string): string {
  const suffix = attributes.length > 0 ? ` ${attributes}` : '';
  switch (node.type) {
    case 'ellipse': {
      if (isFullEllipse(node.arcStart, node.arcEnd) && node.innerRadius <= 0) {
        return `<ellipse cx="${formatNumber(node.width / 2)}" cy="${formatNumber(node.height / 2)}" rx="${formatNumber(node.width / 2)}" ry="${formatNumber(node.height / 2)}"${suffix}/>`;
      }
      return `<path d="${ellipsePath(node)}"${suffix}/>`;
    }
    case 'line':
      return `<line x1="${formatNumber(node.start.x)}" y1="${formatNumber(node.start.y)}" x2="${formatNumber(node.end.x)}" y2="${formatNumber(node.end.y)}"${suffix}/>`;
    case 'polygon':
      return `<polygon points="${polygonPoints(node.width, node.height, node.pointCount, 1)}"${suffix}/>`;
    case 'star':
      return `<polygon points="${polygonPoints(node.width, node.height, node.pointCount, node.innerRadius)}"${suffix}/>`;
    case 'group':
    case 'text':
      return '';
    default:
      return `<path d="${roundedRectPath(node.width, node.height, node.cornerRadii)}"${suffix}/>`;
  }
}

function createPaintReference(
  paint: Paint,
  width: number,
  height: number,
  context: SerializationContext,
): PaintReference {
  if (paint.type === 'solid') {
    return {
      value: rgbHex(paint.color),
      opacity: clamp01(paint.color.a * paint.opacity),
      blendMode: paint.blendMode,
    };
  }

  const id = nextDefinitionId(context, `paint-${paint.id}`);
  const stops = paint.stops
    .map(
      (stop) =>
        `<stop offset="${formatNumber(clamp01(stop.position) * 100)}%" stop-color="${rgbHex(stop.color)}" stop-opacity="${formatNumber(clamp01(stop.color.a * paint.opacity))}"/>`,
    )
    .join('');
  if (paint.type === 'linear-gradient') {
    context.definitions.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${formatNumber(normalizePaintCoordinate(paint.start.x, width))}" y1="${formatNumber(normalizePaintCoordinate(paint.start.y, height))}" x2="${formatNumber(normalizePaintCoordinate(paint.end.x, width))}" y2="${formatNumber(normalizePaintCoordinate(paint.end.y, height))}">${stops}</linearGradient>`,
    );
  } else {
    const centerX = normalizePaintCoordinate(paint.center.x, width);
    const centerY = normalizePaintCoordinate(paint.center.y, height);
    const radiusX = Math.max(0.001, Math.abs(normalizePaintCoordinate(paint.radius.x, width)));
    const radiusY = Math.max(0.001, Math.abs(normalizePaintCoordinate(paint.radius.y, height)));
    const focalX = (normalizePaintCoordinate(paint.focalPoint.x, width) - centerX) / radiusX;
    const focalY = (normalizePaintCoordinate(paint.focalPoint.y, height) - centerY) / radiusY;
    context.definitions.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" fx="${formatNumber(focalX)}" fy="${formatNumber(focalY)}" gradientTransform="translate(${formatNumber(centerX)} ${formatNumber(centerY)}) scale(${formatNumber(radiusX)} ${formatNumber(radiusY)})">${stops}</radialGradient>`,
    );
  }
  return { value: `url(#${id})`, opacity: 1, blendMode: paint.blendMode };
}

function paintAttributes(reference: PaintReference, property: 'fill' | 'stroke'): string {
  const opacity =
    reference.opacity < 1 ? ` ${property}-opacity="${formatNumber(reference.opacity)}"` : '';
  const blend =
    reference.blendMode !== 'normal'
      ? ` style="mix-blend-mode:${escapeAttribute(reference.blendMode)}"`
      : '';
  return `${property}="${reference.value}"${opacity}${blend}`;
}

function strokeAttributes(stroke: Stroke, reference: PaintReference): string {
  const cap = stroke.cap === 'round' || stroke.cap === 'square' ? stroke.cap : 'butt';
  const dash =
    stroke.dash.length > 0 ? ` stroke-dasharray="${stroke.dash.map(formatNumber).join(' ')}"` : '';
  return `fill="none" ${paintAttributes(reference, 'stroke')} stroke-width="${formatNumber(stroke.width)}" stroke-linecap="${cap}" stroke-linejoin="${stroke.join}" stroke-miterlimit="${formatNumber(stroke.miterLimit)}"${dash}`;
}

function createEffectFilter(
  effects: readonly Effect[],
  nodeId: string,
  context: SerializationContext,
): string | null {
  const visible = effects.filter((effect) => effect.visible);
  if (visible.length === 0) return null;
  for (const effect of visible) {
    if (effect.type === 'background-blur') {
      context.warnings.add(
        'Background blur cannot be represented portably in standalone SVG and was omitted.',
      );
    }
    if (
      (effect.type === 'drop-shadow' || effect.type === 'inner-shadow') &&
      effect.blendMode !== 'normal'
    ) {
      context.warnings.add('Shadow blend modes are approximated as normal in SVG filters.');
    }
  }
  const rendered = visible.filter((effect) => effect.type !== 'background-blur');
  if (rendered.length === 0) return null;

  const id = nextDefinitionId(context, `effect-${nodeId}`);
  const primitives: string[] = [];
  const mergeResults: string[] = [];
  let contentResult = 'SourceGraphic';
  const layerBlur = rendered.find((effect) => effect.type === 'layer-blur');
  if (layerBlur?.type === 'layer-blur') {
    contentResult = 'blurred-source';
    primitives.push(
      `<feGaussianBlur in="SourceGraphic" stdDeviation="${formatNumber(layerBlur.radius / 2)}" result="${contentResult}"/>`,
    );
  }

  let shadowIndex = 0;
  for (const effect of rendered) {
    if (effect.type !== 'drop-shadow') continue;
    shadowIndex += 1;
    const alphaInput = effect.spread === 0 ? 'SourceAlpha' : `spread-${shadowIndex}`;
    if (effect.spread !== 0) {
      const operator = effect.spread > 0 ? 'dilate' : 'erode';
      primitives.push(
        `<feMorphology in="SourceAlpha" operator="${operator}" radius="${formatNumber(Math.abs(effect.spread))}" result="${alphaInput}"/>`,
      );
    }
    primitives.push(
      `<feGaussianBlur in="${alphaInput}" stdDeviation="${formatNumber(effect.blur / 2)}" result="shadow-blur-${shadowIndex}"/>`,
      `<feOffset in="shadow-blur-${shadowIndex}" dx="${formatNumber(effect.offset.x)}" dy="${formatNumber(effect.offset.y)}" result="shadow-offset-${shadowIndex}"/>`,
      `<feFlood flood-color="${rgbHex(effect.color)}" flood-opacity="${formatNumber(effect.color.a)}" result="shadow-color-${shadowIndex}"/>`,
      `<feComposite in="shadow-color-${shadowIndex}" in2="shadow-offset-${shadowIndex}" operator="in" result="shadow-${shadowIndex}"/>`,
    );
    mergeResults.push(`shadow-${shadowIndex}`);
  }

  mergeResults.push(contentResult);
  let innerIndex = 0;
  for (const effect of rendered) {
    if (effect.type !== 'inner-shadow') continue;
    innerIndex += 1;
    if (effect.spread !== 0) context.warnings.add('Inner-shadow spread is omitted in SVG exports.');
    primitives.push(
      `<feComponentTransfer in="SourceAlpha" result="inner-inverse-${innerIndex}"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>`,
      `<feGaussianBlur in="inner-inverse-${innerIndex}" stdDeviation="${formatNumber(effect.blur / 2)}" result="inner-blur-${innerIndex}"/>`,
      `<feOffset in="inner-blur-${innerIndex}" dx="${formatNumber(effect.offset.x)}" dy="${formatNumber(effect.offset.y)}" result="inner-offset-${innerIndex}"/>`,
      `<feComposite in="inner-offset-${innerIndex}" in2="SourceAlpha" operator="in" result="inner-mask-${innerIndex}"/>`,
      `<feFlood flood-color="${rgbHex(effect.color)}" flood-opacity="${formatNumber(effect.color.a)}" result="inner-color-${innerIndex}"/>`,
      `<feComposite in="inner-color-${innerIndex}" in2="inner-mask-${innerIndex}" operator="in" result="inner-${innerIndex}"/>`,
    );
    mergeResults.push(`inner-${innerIndex}`);
  }
  primitives.push(
    `<feMerge>${mergeResults.map((result) => `<feMergeNode in="${result}"/>`).join('')}</feMerge>`,
  );
  context.definitions.push(
    `<filter id="${id}" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB">${primitives.join('')}</filter>`,
  );
  return id;
}

function roundedRectPath(width: number, height: number, radii: SceneNode['cornerRadii']): string {
  const scale = Math.min(
    1,
    ratioOrOne(width, radii.topLeft + radii.topRight),
    ratioOrOne(width, radii.bottomLeft + radii.bottomRight),
    ratioOrOne(height, radii.topLeft + radii.bottomLeft),
    ratioOrOne(height, radii.topRight + radii.bottomRight),
  );
  const topLeft = Math.max(0, radii.topLeft * scale);
  const topRight = Math.max(0, radii.topRight * scale);
  const bottomRight = Math.max(0, radii.bottomRight * scale);
  const bottomLeft = Math.max(0, radii.bottomLeft * scale);
  return [
    `M ${formatNumber(topLeft)} 0`,
    `H ${formatNumber(width - topRight)}`,
    `A ${formatNumber(topRight)} ${formatNumber(topRight)} 0 0 1 ${formatNumber(width)} ${formatNumber(topRight)}`,
    `V ${formatNumber(height - bottomRight)}`,
    `A ${formatNumber(bottomRight)} ${formatNumber(bottomRight)} 0 0 1 ${formatNumber(width - bottomRight)} ${formatNumber(height)}`,
    `H ${formatNumber(bottomLeft)}`,
    `A ${formatNumber(bottomLeft)} ${formatNumber(bottomLeft)} 0 0 1 0 ${formatNumber(height - bottomLeft)}`,
    `V ${formatNumber(topLeft)}`,
    `A ${formatNumber(topLeft)} ${formatNumber(topLeft)} 0 0 1 ${formatNumber(topLeft)} 0`,
    'Z',
  ].join(' ');
}

function ellipsePath(node: Extract<SceneNode, { type: 'ellipse' }>): string {
  const center = { x: node.width / 2, y: node.height / 2 };
  const radius = { x: node.width / 2, y: node.height / 2 };
  const span = normalizedPositiveSpan(node.arcStart, node.arcEnd);
  if (span >= 359.999) return fullEllipsePath(center, radius, node.innerRadius);
  const start = polarEllipsePoint(center, radius, node.arcStart);
  const end = polarEllipsePoint(center, radius, node.arcStart + span);
  const largeArc = span > 180 ? 1 : 0;
  if (node.innerRadius <= 0) {
    return `M ${formatPoint(center)} L ${formatPoint(start)} A ${formatNumber(radius.x)} ${formatNumber(radius.y)} 0 ${largeArc} 1 ${formatPoint(end)} Z`;
  }
  const innerRadius = { x: radius.x * node.innerRadius, y: radius.y * node.innerRadius };
  const innerStart = polarEllipsePoint(center, innerRadius, node.arcStart);
  const innerEnd = polarEllipsePoint(center, innerRadius, node.arcStart + span);
  return `M ${formatPoint(start)} A ${formatNumber(radius.x)} ${formatNumber(radius.y)} 0 ${largeArc} 1 ${formatPoint(end)} L ${formatPoint(innerEnd)} A ${formatNumber(innerRadius.x)} ${formatNumber(innerRadius.y)} 0 ${largeArc} 0 ${formatPoint(innerStart)} Z`;
}

function fullEllipsePath(center: Vec2, radius: Vec2, innerRatio: number): string {
  const outer = `M ${formatNumber(center.x + radius.x)} ${formatNumber(center.y)} A ${formatNumber(radius.x)} ${formatNumber(radius.y)} 0 1 1 ${formatNumber(center.x - radius.x)} ${formatNumber(center.y)} A ${formatNumber(radius.x)} ${formatNumber(radius.y)} 0 1 1 ${formatNumber(center.x + radius.x)} ${formatNumber(center.y)}`;
  if (innerRatio <= 0) return `${outer} Z`;
  const innerX = radius.x * innerRatio;
  const innerY = radius.y * innerRatio;
  const inner = `M ${formatNumber(center.x + innerX)} ${formatNumber(center.y)} A ${formatNumber(innerX)} ${formatNumber(innerY)} 0 1 0 ${formatNumber(center.x - innerX)} ${formatNumber(center.y)} A ${formatNumber(innerX)} ${formatNumber(innerY)} 0 1 0 ${formatNumber(center.x + innerX)} ${formatNumber(center.y)}`;
  return `${outer} Z ${inner} Z`;
}

function polygonPoints(
  width: number,
  height: number,
  pointCount: number,
  innerRatio: number,
): string {
  const count = innerRatio < 1 ? pointCount * 2 : pointCount;
  const points: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const ratio = innerRatio < 1 && index % 2 === 1 ? innerRatio : 1;
    points.push(
      `${formatNumber(width / 2 + ((Math.cos(angle) * width) / 2) * ratio)},${formatNumber(height / 2 + ((Math.sin(angle) * height) / 2) * ratio)}`,
    );
  }
  return points.join(' ');
}

function isFullEllipse(start: number, end: number): boolean {
  return normalizedPositiveSpan(start, end) >= 359.999;
}

function normalizedPositiveSpan(start: number, end: number): number {
  const raw = end - start;
  if (Math.abs(raw) >= 360) return 360;
  const normalized = ((raw % 360) + 360) % 360;
  return normalized === 0 && raw !== 0 ? 360 : normalized;
}

function polarEllipsePoint(center: Vec2, radius: Vec2, degrees: number): Vec2 {
  const radians = (degrees * Math.PI) / 180;
  return { x: center.x + Math.cos(radians) * radius.x, y: center.y + Math.sin(radians) * radius.y };
}

function fallbackBlackPaint(): Paint {
  return {
    id: 'svg-fallback-black',
    type: 'solid',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    color: { r: 0, g: 0, b: 0, a: 1 },
  };
}

function applyTextCase(content: string, textCase: TextNode['textCase']): string {
  if (textCase === 'upper') return content.toUpperCase();
  if (textCase === 'lower') return content.toLowerCase();
  if (textCase === 'title') return content.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  return content;
}

function solidColorAttributes(
  color: RgbaColor,
  opacity: number,
  property: 'fill' | 'stroke',
): string {
  const alpha = clamp01(color.a * opacity);
  return `${property}="${rgbHex(color)}"${alpha < 1 ? ` ${property}-opacity="${formatNumber(alpha)}"` : ''}`;
}

function rgbHex(color: RgbaColor): string {
  const channel = (value: number) =>
    Math.round(clamp01(value) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function normalizePaintCoordinate(value: number, size: number): number {
  return Math.abs(value) <= 1 ? value * size : value;
}

function matrixToSvg(matrix: Matrix2D): string {
  return `matrix(${formatNumber(matrix.a)} ${formatNumber(matrix.b)} ${formatNumber(matrix.c)} ${formatNumber(matrix.d)} ${formatNumber(matrix.e)} ${formatNumber(matrix.f)})`;
}

function nextDefinitionId(context: SerializationContext, label: string): string {
  const id = `export-${sanitizeId(label)}-${context.nextDefinitionId}`;
  context.nextDefinitionId += 1;
  return id;
}

function sanitizeId(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized.length > 0 ? sanitized : 'definition';
}

function isSafeImageHref(uri: string): boolean {
  return /^(?:data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);|blob:|https?:)/i.test(uri);
}

function isDefaultCrop(node: ImageNode): boolean {
  return node.crop.x === 0 && node.crop.y === 0 && node.crop.width === 1 && node.crop.height === 1;
}

function formatPoint(point: Vec2): string {
  return `${formatNumber(point.x)} ${formatNumber(point.y)}`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10000) / 10000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function ratioOrOne(numerator: number, denominator: number): number {
  return denominator <= 0 ? 1 : numerator / denominator;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeXml(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
