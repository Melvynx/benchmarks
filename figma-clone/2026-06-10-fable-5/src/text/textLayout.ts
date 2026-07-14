import type { TextNode } from '../scene/types';
import { ensureFontLoaded, fontString } from './fonts';

export interface TextLine {
  text: string;
  width: number;
  /** Left offset inside the node box, already aligned. */
  x: number;
  /** Baseline y inside the node box. */
  baseline: number;
}

export interface TextLayoutResult {
  lines: TextLine[];
  /** Tight content size (max line width × total line height). */
  width: number;
  height: number;
  lineHeight: number;
  ascent: number;
  font: string;
}

let measureCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let measureCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;

function getMeasureCtx(): OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D {
  if (!measureCtx) {
    measureCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error('Could not create 2D measuring context');
    measureCtx = ctx;
  }
  return measureCtx;
}

export function supportsLetterSpacing(): boolean {
  return 'letterSpacing' in getMeasureCtx();
}

function configureCtx(node: TextNode): OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D {
  const ctx = getMeasureCtx();
  ctx.font = fontString(node.fontWeight, node.fontSize, node.fontFamily);
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D).letterSpacing = `${node.letterSpacing}px`;
  }
  return ctx;
}

export function effectiveLineHeight(node: TextNode): number {
  return node.lineHeightPx ?? Math.round(node.fontSize * 1.2 * 100) / 100;
}

/** Greedy word wrap matching the browser's default breaking closely enough for editing overlay parity. */
function wrapParagraph(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
): string[] {
  if (paragraph === '') return [''];
  const words = paragraph.split(/(\s+)/).filter((s) => s.length > 0);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current + word;
    if (current !== '' && !/^\s+$/.test(word) && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current.replace(/\s+$/, ''));
      current = word.replace(/^\s+/, '');
    } else {
      current = candidate;
    }
    // Hard-break single words longer than the box.
    while (current.length > 1 && ctx.measureText(current).width > maxWidth) {
      let cut = current.length - 1;
      while (cut > 1 && ctx.measureText(current.slice(0, cut)).width > maxWidth) cut--;
      lines.push(current.slice(0, cut));
      current = current.slice(cut);
    }
  }
  lines.push(current.replace(/\s+$/, ''));
  return lines;
}

interface CacheEntry {
  layout: TextLayoutResult;
  fontsVersion: number;
}

const cache = new WeakMap<TextNode, CacheEntry>();
let fontsVersion = 0;

/** Bump when a webfont finishes loading so cached measurements recompute. */
export function invalidateTextLayouts(): void {
  fontsVersion++;
}

export function layoutText(node: TextNode): TextLayoutResult {
  const cached = cache.get(node);
  if (cached && cached.fontsVersion === fontsVersion) return cached.layout;

  ensureFontLoaded(node.fontFamily, node.fontWeight);
  const ctx = configureCtx(node);
  const lineHeight = effectiveLineHeight(node);

  const paragraphs = node.characters.split('\n');
  const rawLines: string[] =
    node.autoResize === 'width'
      ? paragraphs
      : paragraphs.flatMap((p) => wrapParagraph(ctx, p, Math.max(1, node.width)));

  const metrics = ctx.measureText('Mg');
  const fontAscent =
    'fontBoundingBoxAscent' in metrics && metrics.fontBoundingBoxAscent > 0
      ? metrics.fontBoundingBoxAscent
      : node.fontSize * 0.8;
  const fontDescent =
    'fontBoundingBoxDescent' in metrics && metrics.fontBoundingBoxDescent > 0
      ? metrics.fontBoundingBoxDescent
      : node.fontSize * 0.2;
  // Center the font box inside the line box, the same way CSS line-height does.
  const halfLeading = (lineHeight - (fontAscent + fontDescent)) / 2;
  const ascent = halfLeading + fontAscent;

  let maxLineWidth = 0;
  const measured = rawLines.map((text) => {
    const width = text === '' ? 0 : ctx.measureText(text).width;
    if (width > maxLineWidth) maxLineWidth = width;
    return { text, width };
  });

  const contentWidth = node.autoResize === 'width' ? maxLineWidth : node.width;
  const contentHeight = measured.length * lineHeight;
  const boxHeight = node.autoResize === 'none' ? node.height : contentHeight;

  let yStart = 0;
  if (node.autoResize === 'none') {
    if (node.textAlignVertical === 'middle') yStart = (boxHeight - contentHeight) / 2;
    else if (node.textAlignVertical === 'bottom') yStart = boxHeight - contentHeight;
  }

  const lines: TextLine[] = measured.map((line, i) => {
    let x = 0;
    if (node.textAlign === 'center') x = (contentWidth - line.width) / 2;
    else if (node.textAlign === 'right') x = contentWidth - line.width;
    return { text: line.text, width: line.width, x, baseline: yStart + i * lineHeight + ascent };
  });

  const layout: TextLayoutResult = {
    lines,
    width: Math.max(1, Math.ceil(maxLineWidth)),
    height: Math.max(lineHeight, contentHeight),
    lineHeight,
    ascent,
    font: ctx.font,
  };
  cache.set(node, { layout, fontsVersion });
  return layout;
}

/** Size a text node should take given its resize mode (used by layout + editing). */
export function measureTextNodeSize(node: TextNode): { width: number; height: number } {
  const layout = layoutText(node);
  if (node.autoResize === 'width') return { width: layout.width, height: layout.height };
  if (node.autoResize === 'height') return { width: node.width, height: layout.height };
  return { width: node.width, height: node.height };
}
