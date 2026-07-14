import { degToRad } from '../geometry/math';
import { rectUnionAll, type Rect } from '../geometry/rect';
import { localMatrix } from '../scene/nodeGeometry';
import { getSceneIndex } from '../scene/sceneIndex';
import { paintOrderIndex, topLevelSelection } from '../scene/traversal';
import type { GradientPaint, NodeId, Paint, SceneDocument, SceneNode } from '../scene/types';
import { isContainer } from '../scene/types';
import { layoutText } from '../text/textLayout';
import { familyDef } from '../text/fonts';
import { rgbaToCss } from '../utils/color';
import { editorStore, pushToast } from '../store/store';
import { downloadText } from '../utils/download';

/**
 * SVG exporter. Faithful for fills (solid/gradient/image), center strokes,
 * dashes, per-corner radii, rotation, clipping, opacity, drop shadows and
 * layer blur. Known gaps (inner shadows, backdrop blur, inside/outside stroke
 * alignment) are documented in the README.
 */

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function num(v: number): string {
  return String(Math.round(v * 100) / 100);
}

class SvgBuilder {
  defs: string[] = [];
  private counter = 0;

  uid(prefix: string): string {
    return `${prefix}${++this.counter}`;
  }
}

function gradientDef(b: SvgBuilder, paint: GradientPaint, w: number, h: number): string {
  const id = b.uid('grad');
  const stops = paint.stops
    .map(
      (s) =>
        `<stop offset="${num(Math.min(1, Math.max(0, s.position)) * 100)}%" stop-color="${rgbaToCss(
          s.color,
          paint.opacity,
        )}"/>`,
    )
    .join('');
  if (paint.type === 'gradient-linear') {
    const rad = degToRad(paint.angle);
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    b.defs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(cx - dx * half)}" y1="${num(
        cy - dy * half,
      )}" x2="${num(cx + dx * half)}" y2="${num(cy + dy * half)}">${stops}</linearGradient>`,
    );
  } else {
    b.defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(w / 2)}" cy="${num(h / 2)}" r="${num(
        Math.max(w, h) / 2,
      )}">${stops}</radialGradient>`,
    );
  }
  return id;
}

function fillAttr(b: SvgBuilder, paint: Paint | undefined, w: number, h: number): string {
  if (!paint) return 'fill="none"';
  if (paint.type === 'solid') return `fill="${rgbaToCss(paint.color, paint.opacity)}"`;
  if (paint.type === 'image') return 'fill="rgba(200,200,200,1)"';
  return `fill="url(#${gradientDef(b, paint, w, h)})"`;
}

function shapeElement(node: SceneNode, attrs: string): string {
  const w = node.width;
  const h = node.height;
  switch (node.type) {
    case 'frame':
    case 'rect': {
      const r = node.cornerRadius;
      const uniform = r.tl === r.tr && r.tr === r.br && r.br === r.bl;
      if (uniform) {
        return `<rect width="${num(w)}" height="${num(h)}" rx="${num(Math.min(r.tl, w / 2, h / 2))}" ${attrs}/>`;
      }
      const tl = Math.min(r.tl, w / 2, h / 2);
      const tr = Math.min(r.tr, w / 2, h / 2);
      const br = Math.min(r.br, w / 2, h / 2);
      const bl = Math.min(r.bl, w / 2, h / 2);
      const d =
        `M ${num(tl)} 0 H ${num(w - tr)} A ${num(tr)} ${num(tr)} 0 0 1 ${num(w)} ${num(tr)} ` +
        `V ${num(h - br)} A ${num(br)} ${num(br)} 0 0 1 ${num(w - br)} ${num(h)} ` +
        `H ${num(bl)} A ${num(bl)} ${num(bl)} 0 0 1 0 ${num(h - bl)} ` +
        `V ${num(tl)} A ${num(tl)} ${num(tl)} 0 0 1 ${num(tl)} 0 Z`;
      return `<path d="${d}" ${attrs}/>`;
    }
    case 'ellipse':
      return `<ellipse cx="${num(w / 2)}" cy="${num(h / 2)}" rx="${num(w / 2)}" ry="${num(h / 2)}" ${attrs}/>`;
    case 'line':
      return `<line x1="0" y1="0" x2="${num(w)}" y2="0" ${attrs}/>`;
    case 'polygon':
    case 'star': {
      const points: string[] = [];
      const n = Math.max(3, Math.round(node.pointCount));
      const total = node.type === 'star' ? n * 2 : n;
      for (let i = 0; i < total; i++) {
        const ratio = node.type === 'star' && i % 2 === 1 ? Math.max(0.01, node.innerRatio) : 1;
        const angle = -Math.PI / 2 + (i * Math.PI * (node.type === 'star' ? 1 : 2)) / n;
        points.push(`${num(w / 2 + (w / 2) * ratio * Math.cos(angle))},${num(h / 2 + (h / 2) * ratio * Math.sin(angle))}`);
      }
      return `<polygon points="${points.join(' ')}" ${attrs}/>`;
    }
    default:
      return '';
  }
}

function effectFilter(b: SvgBuilder, node: SceneNode): string {
  const parts: string[] = [];
  for (const effect of node.effects) {
    if (!effect.enabled) continue;
    if (effect.type === 'drop-shadow') {
      parts.push(
        `<feDropShadow dx="${num(effect.offsetX)}" dy="${num(effect.offsetY)}" stdDeviation="${num(
          effect.blur / 2,
        )}" flood-color="${rgbaToCss(effect.color)}"/>`,
      );
    } else if (effect.type === 'layer-blur' && effect.radius > 0) {
      parts.push(`<feGaussianBlur stdDeviation="${num(effect.radius / 2)}"/>`);
    }
  }
  if (parts.length === 0) return '';
  const id = b.uid('fx');
  b.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${parts.join('')}</filter>`);
  return ` filter="url(#${id})"`;
}

function strokeAttrs(b: SvgBuilder, node: SceneNode): string {
  const stroke = node.strokes.find((s) => s.enabled);
  if (!stroke || node.strokeWeight <= 0) return '';
  let paintRef: string;
  if (stroke.type === 'solid') paintRef = rgbaToCss(stroke.color, stroke.opacity);
  else if (stroke.type === 'image') paintRef = 'rgba(128,128,128,1)';
  else paintRef = `url(#${gradientDef(b, stroke, node.width, node.height)})`;
  const dash = node.strokeDash > 0 ? ` stroke-dasharray="${num(node.strokeDash)} ${num(node.strokeGap || node.strokeDash)}"` : '';
  return ` stroke="${paintRef}" stroke-width="${num(node.strokeWeight)}"${dash}`;
}

function nodeToSvg(b: SvgBuilder, doc: SceneDocument, node: SceneNode): string {
  if (!node.visible) return '';
  const m = localMatrix(node);
  const transform = ` transform="matrix(${num(m.a)} ${num(m.b)} ${num(m.c)} ${num(m.d)} ${num(m.e)} ${num(m.f)})"`;
  const opacity = node.opacity < 1 ? ` opacity="${num(node.opacity)}"` : '';
  const filter = effectFilter(b, node);

  let body = '';
  if (node.type === 'text') {
    body = textToSvg(b, node);
  } else if (node.type === 'group') {
    body = '';
  } else {
    const fills = node.fills.filter((f) => f.enabled);
    const strokes = strokeAttrs(b, node);
    if (node.type === 'line') {
      body = shapeElement(node, `fill="none"${strokes}`);
    } else if (fills.length === 0) {
      body = strokes ? shapeElement(node, `fill="none"${strokes}`) : '';
    } else {
      body = fills
        .map((fill, i) =>
          shapeElement(node, `${fillAttr(b, fill, node.width, node.height)}${i === fills.length - 1 ? strokes : ''}`),
        )
        .join('');
    }
  }

  let children = '';
  if (isContainer(node)) {
    let clipAttr = '';
    if (node.type === 'frame' && node.clipsContent) {
      const clipId = b.uid('clip');
      b.defs.push(`<clipPath id="${clipId}">${shapeElement(node, '')}</clipPath>`);
      clipAttr = ` clip-path="url(#${clipId})"`;
    }
    const inner = node.childIds
      .map((id) => {
        const child = doc.nodes[id];
        return child ? nodeToSvg(b, doc, child) : '';
      })
      .join('');
    children = clipAttr ? `<g${clipAttr}>${inner}</g>` : inner;
  }

  return `<g${transform}${opacity}${filter} data-name="${esc(node.name)}">${body}${children}</g>`;
}

function textToSvg(b: SvgBuilder, node: SceneNode & { type: 'text' }): string {
  const layout = layoutText(node);
  const fill = node.fills.find((f) => f.enabled);
  const fillRef = fillAttr(b, fill, node.width, node.height);
  const spacing = node.letterSpacing !== 0 ? ` letter-spacing="${num(node.letterSpacing)}"` : '';
  const family = `${node.fontFamily}, ${familyDef(node.fontFamily).fallback}`;
  const lines = layout.lines
    .filter((line) => line.text !== '')
    .map((line) => `<text x="${num(line.x)}" y="${num(line.baseline)}" ${fillRef}>${esc(line.text)}</text>`)
    .join('');
  return `<g font-family="${esc(family)}" font-size="${num(node.fontSize)}" font-weight="${node.fontWeight}"${spacing}>${lines}</g>`;
}

export function exportSelectionAsSvg(): void {
  const state = editorStore.getState();
  const doc = state.doc;
  const order = paintOrderIndex(doc);
  let ids: NodeId[] = topLevelSelection(doc, state.selection).sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
  );
  if (ids.length === 0) ids = [...doc.rootIds];
  if (ids.length === 0) {
    pushToast('Nothing to export', 'error');
    return;
  }
  const index = getSceneIndex(doc);
  const bounds = rectUnionAll(
    ids.map((id) => index.subtreeBounds.get(id)).filter((r): r is Rect => r !== undefined),
  );
  if (!bounds) return;

  const b = new SvgBuilder();
  // Top-level nodes are positioned relative to the export bounds. Their own
  // transform already includes x/y, so wrap everything in one offset group.
  const content = ids
    .map((id) => {
      const node = doc.nodes[id];
      return node ? nodeToSvg(b, doc, node) : '';
    })
    .join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(bounds.width)}" height="${num(bounds.height)}" ` +
    `viewBox="0 0 ${num(bounds.width)} ${num(bounds.height)}">` +
    (b.defs.length > 0 ? `<defs>${b.defs.join('')}</defs>` : '') +
    `<g transform="translate(${num(-bounds.x)} ${num(-bounds.y)})">${content}</g></svg>`;

  const first = ids[0];
  const name =
    ids.length === 1 && first && doc.nodes[first] ? doc.nodes[first].name : state.docName;
  downloadText(svg, `${name.replace(/[^\w\- ]+/g, '')}.svg`, 'image/svg+xml');
  pushToast('Exported SVG');
}
