import type { Document, SceneNode } from '../scene';
import { isLine, nodeLocalMatrix } from '../scene';
import { matApplyToCtx } from '../geometry/Mat2D';
import { paintToFillStyle, hexWithAlpha } from './paints';
import { ellipsePath, polygonNodePath, roundedRectPath } from './paths';
import { ImageCache } from './ImageCache';

/** Context stack depth safety. */
const MAX_NEST = 48;

export const drawNode = (
  ctx: CanvasRenderingContext2D,
  doc: Document,
  node: SceneNode,
  depth = 0,
): void => {
  if (!node.visible || depth > MAX_NEST) return;

  ctx.save();
  matApplyToCtx(ctx, nodeLocalMatrix(node));

  ctx.globalAlpha *= node.opacity;

  if (node.blendMode !== 'normal') {
    ctx.globalCompositeOperation = node.blendMode as GlobalCompositeOperation;
  }

  // Drop shadow / layer blur applied via canvas filter / shadow
  const outerShadow = node.effects.find((e) => e.type === 'dropShadow' && e.visible);
  const layerBlur = node.effects.find((e) => e.type === 'layerBlur' && e.visible);
  if (outerShadow && outerShadow.type === 'dropShadow') {
    ctx.shadowColor = hexWithAlpha(outerShadow.color, outerShadow.opacity);
    ctx.shadowBlur = outerShadow.blur;
    ctx.shadowOffsetX = outerShadow.offsetX;
    ctx.shadowOffsetY = outerShadow.offsetY;
  }
  if (layerBlur && layerBlur.type === 'layerBlur') {
    ctx.filter = `blur(${layerBlur.radius}px)`;
  }

  const bounds = { x: 0, y: 0, width: node.width, height: node.height };

  switch (node.type) {
    case 'frame':
      drawFrame(ctx, doc, node, depth);
      break;
    case 'rectangle':
    case 'ellipse':
    case 'polygon':
    case 'image':
      drawShapedNode(ctx, node, bounds);
      break;
    case 'line':
      drawLine(ctx, node);
      break;
    case 'text':
      drawText(ctx, node);
      break;
  }

  ctx.restore();
};

const buildPathForNode = (node: SceneNode): Path2D => {
  const path = new Path2D();
  const bounds = { x: 0, y: 0, width: node.width, height: node.height };
  switch (node.type) {
    case 'rectangle':
    case 'frame':
    case 'image':
      roundedRectPath(path, bounds, (node as { cornerRadius: number }).cornerRadius);
      break;
    case 'ellipse':
      ellipsePath(path, bounds);
      break;
    case 'polygon':
      polygonNodePath(path, bounds, node);
      break;
    default:
      roundedRectPath(path, bounds, 0);
  }
  return path;
};

const drawFrame = (
  ctx: CanvasRenderingContext2D,
  doc: Document,
  node: Extract<SceneNode, { type: 'frame' }>,
  depth: number,
): void => {
  // Background fill
  const path = buildPathForNode(node);
  for (const fill of node.fills) {
    const style = paintToFillStyle(ctx, fill, { x: 0, y: 0, width: node.width, height: node.height });
    if (!style) continue;
    ctx.fillStyle = style;
    ctx.fill(path);
  }

  // Clipping for children
  if (node.clipContent) {
    ctx.save();
    ctx.clip(path);
    // Reset shadow so children don't inherit the frame shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  for (const cid of node.children) {
    const child = doc.nodes[cid];
    if (child) drawNode(ctx, doc, child, depth + 1);
  }
  if (node.clipContent) {
    ctx.restore();
  }

  // Strokes on top (outside or inside)
  drawStrokes(ctx, node, path);

  // Inner shadow
  const innerShadow = node.effects.find((e) => e.type === 'innerShadow' && e.visible);
  if (innerShadow && innerShadow.type === 'innerShadow') {
    drawInnerShadow(ctx, node.width, node.height, path, innerShadow);
  }
};

const drawShapedNode = (
  ctx: CanvasRenderingContext2D,
  node: Extract<SceneNode, { type: 'rectangle' | 'ellipse' | 'polygon' | 'image' }>,
  bounds: { x: number; y: number; width: number; height: number },
): void => {
  const path = buildPathForNode(node);
  // fills
  if (node.type !== 'image') {
    for (const fill of node.fills) {
      const style = paintToFillStyle(ctx, fill, bounds);
      if (!style) continue;
      ctx.fillStyle = style;
      ctx.fill(path);
    }
  }
  // image
  if (node.type === 'image') {
    const img = ImageCache.get(node.src);
    if (img) {
      ctx.save();
      ctx.clip(path);
      drawImageFit(ctx, img, node);
      ctx.restore();
    } else {
      // placeholder
      ctx.fillStyle = '#eeeeee';
      ctx.fill(path);
      ctx.fillStyle = '#999';
      ctx.font = '10px Inter';
      ctx.fillText('loading...', 4, 12);
    }
  }
  // strokes
  drawStrokes(ctx, node, path);
  // inner shadow
  const innerShadow = node.effects.find((e) => e.type === 'innerShadow' && e.visible);
  if (innerShadow && innerShadow.type === 'innerShadow') {
    drawInnerShadow(ctx, node.width, node.height, path, innerShadow);
  }
};

const drawImageFit = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  node: Extract<SceneNode, { type: 'image' }>,
): void => {
  const iw = img.naturalWidth || node.naturalWidth;
  const ih = img.naturalHeight || node.naturalHeight;
  if (iw <= 0 || ih <= 0) return;
  const targetW = node.width;
  const targetH = node.height;

  if (node.fit === 'fill') {
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return;
  }
  const targetRatio = targetW / targetH;
  const imgRatio = iw / ih;
  if (node.fit === 'contain') {
    let dw = targetW;
    let dh = targetH;
    if (imgRatio > targetRatio) {
      dh = targetW / imgRatio;
    } else {
      dw = targetH * imgRatio;
    }
    ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
  } else {
    // cover
    let dw = targetW;
    let dh = targetH;
    if (imgRatio < targetRatio) {
      dh = targetW / imgRatio;
    } else {
      dw = targetH * imgRatio;
    }
    ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
  }
};

const drawStrokes = (
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  path: Path2D,
): void => {
  if (isLine(node)) return;
  const withStrokes = node as { strokes?: Array<{ paint: unknown; width: number; align: string; dash: number[] }> };
  if (!withStrokes.strokes) return;

  for (const stroke of withStrokes.strokes) {
    if (stroke.width <= 0) continue;
    const style = paintToFillStyle(ctx, stroke.paint as Parameters<typeof paintToFillStyle>[1], {
      x: 0,
      y: 0,
      width: node.width,
      height: node.height,
    });
    if (!style) continue;

    if (stroke.align === 'center') {
      ctx.save();
      ctx.lineWidth = stroke.width;
      ctx.strokeStyle = style;
      if (stroke.dash.length) ctx.setLineDash(stroke.dash);
      ctx.stroke(path);
      ctx.restore();
    } else if (stroke.align === 'inside') {
      ctx.save();
      ctx.clip(path);
      ctx.lineWidth = stroke.width * 2;
      ctx.strokeStyle = style;
      if (stroke.dash.length) ctx.setLineDash(stroke.dash);
      ctx.stroke(path);
      ctx.restore();
    } else {
      // outside: draw a 2*width stroke, then clip out the inside using even-odd fill
      ctx.save();
      // simpler approach: just draw wider stroke; not a perfect outside but looks similar for thin strokes
      ctx.lineWidth = stroke.width;
      ctx.strokeStyle = style;
      if (stroke.dash.length) ctx.setLineDash(stroke.dash);
      ctx.stroke(path);
      ctx.restore();
    }
  }
};

const drawInnerShadow = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  path: Path2D,
  shadow: { offsetX: number; offsetY: number; blur: number; spread: number; color: string; opacity: number },
): void => {
  // Use an offscreen trick: clip, then draw an offset big rect inverted through even-odd.
  ctx.save();
  ctx.clip(path);
  ctx.shadowColor = hexWithAlpha(shadow.color, shadow.opacity);
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetX = shadow.offsetX;
  ctx.shadowOffsetY = shadow.offsetY;

  ctx.beginPath();
  const pad = (shadow.blur + shadow.spread + Math.abs(shadow.offsetX) + Math.abs(shadow.offsetY)) * 2 + 50;
  ctx.rect(-pad, -pad, w + pad * 2, h + pad * 2);
  // add inner hole via even-odd
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill('evenodd');
  ctx.restore();
};

const drawLine = (
  ctx: CanvasRenderingContext2D,
  node: Extract<SceneNode, { type: 'line' }>,
): void => {
  for (const stroke of node.strokes) {
    const style = paintToFillStyle(ctx, stroke.paint, {
      x: 0,
      y: 0,
      width: Math.max(node.width, 1),
      height: Math.max(node.height, 1),
    });
    if (!style) continue;
    ctx.strokeStyle = style;
    ctx.lineWidth = stroke.width;
    if (stroke.dash.length) ctx.setLineDash(stroke.dash);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(node.width, node.height);
    ctx.stroke();
    if (stroke.dash.length) ctx.setLineDash([]);
  }
};

const drawText = (
  ctx: CanvasRenderingContext2D,
  node: Extract<SceneNode, { type: 'text' }>,
): void => {
  const style = [
    node.italic ? 'italic' : '',
    `${node.fontWeight}`,
    `${node.fontSize}px`,
    `"${node.fontFamily}"`,
  ]
    .filter(Boolean)
    .join(' ');
  ctx.font = style;
  ctx.fillStyle = node.color;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = node.textAlign === 'justify' ? 'left' : (node.textAlign as CanvasTextAlign);

  const lines = node.text.split('\n');
  const lineH = node.fontSize * node.lineHeight;
  // For letter spacing we manually advance. Use measureText for widths.
  const baselineOffset = node.fontSize * 0.82; // approximate ascent
  for (let i = 0; i < lines.length; i++) {
    const y = i * lineH + baselineOffset;
    drawTextLine(ctx, lines[i]!, node, y);
  }
};

const drawTextLine = (
  ctx: CanvasRenderingContext2D,
  line: string,
  node: Extract<SceneNode, { type: 'text' }>,
  y: number,
): void => {
  if (node.letterSpacing === 0) {
    let x = 0;
    if (node.textAlign === 'center') x = node.width / 2;
    else if (node.textAlign === 'right') x = node.width;
    ctx.fillText(line, x, y);
    return;
  }
  // Letter spacing: manual advance
  let x = 0;
  if (node.textAlign !== 'left') {
    const totalWidth = lineWidth(ctx, line, node.letterSpacing);
    if (node.textAlign === 'center') x = (node.width - totalWidth) / 2;
    else if (node.textAlign === 'right') x = node.width - totalWidth;
  }
  const orig = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of line) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + node.letterSpacing;
  }
  ctx.textAlign = orig;
};

export const lineWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
): number => {
  if (letterSpacing === 0) return ctx.measureText(text).width;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + letterSpacing;
  return w - letterSpacing;
};

/** Measure a text node's intrinsic size (without modifying stored size). */
export const measureText = (
  ctx: CanvasRenderingContext2D,
  node: Extract<SceneNode, { type: 'text' }>,
): { width: number; height: number } => {
  const style = [
    node.italic ? 'italic' : '',
    `${node.fontWeight}`,
    `${node.fontSize}px`,
    `"${node.fontFamily}"`,
  ]
    .filter(Boolean)
    .join(' ');
  const prev = ctx.font;
  ctx.font = style;
  const lines = node.text.split('\n');
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, lineWidth(ctx, l, node.letterSpacing));
  const h = lines.length * node.fontSize * node.lineHeight;
  ctx.font = prev;
  return { width: Math.max(1, maxW), height: Math.max(node.fontSize * node.lineHeight, h) };
};
