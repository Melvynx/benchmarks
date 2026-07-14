import type { Document, NodeId, SceneNode } from '../scene';
import { hasFills, hasStrokes, isFrame, isText, nodeWorldAABB, nodeWorldMatrix, radiusToIndividual } from '../scene';
import { drawNode } from '../render/drawNode';
import { unionWorldAABB } from '../scene';

export const exportAsJson = (doc: Document): void => {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${doc.name || 'untitled'}.vector.json`);
};

export const exportAsPng = async (
  doc: Document,
  ids: NodeId[],
  scale = 2,
): Promise<void> => {
  const bounds = ids.length > 0 ? unionWorldAABB(doc, ids) : null;
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
  const w = Math.round(bounds.width * scale);
  const h = Math.round(bounds.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // White BG? We'll make transparent.
  ctx.clearRect(0, 0, w, h);
  ctx.setTransform(scale, 0, 0, scale, -bounds.x * scale, -bounds.y * scale);

  for (const id of ids) {
    const n = doc.nodes[id];
    if (!n) continue;
    // Push parent transforms so node draws in world coords
    drawWithParentTransform(ctx, doc, id);
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, `${doc.name || 'export'}.png`);
  }, 'image/png');
};

const drawWithParentTransform = (ctx: CanvasRenderingContext2D, doc: Document, id: NodeId): void => {
  const n = doc.nodes[id];
  if (!n) return;
  const m = nodeWorldMatrix(doc, id);
  ctx.save();
  // Undo the local matrix that drawNode will apply, then apply world.
  // drawNode applies nodeLocalMatrix. We want node drawn with world transform.
  // Easier: apply world matrix relative to current world and undo node-local inside drawNode.
  // Simpler approach: skip drawNode's own transform by computing the parent world manually
  // and applying it before calling drawNode.
  const parentM = n.parentId ? nodeWorldMatrix(doc, n.parentId) : null;
  if (parentM) ctx.transform(parentM.a, parentM.b, parentM.c, parentM.d, parentM.tx, parentM.ty);
  drawNode(ctx, doc, n);
  ctx.restore();
  // silence unused
  void m;
};

/** SVG export (serializes nodes to inline SVG). */
export const exportAsSvg = (doc: Document, ids: NodeId[]): void => {
  const bounds = ids.length > 0 ? unionWorldAABB(doc, ids) : null;
  if (!bounds) return;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">`,
  );
  for (const id of ids) {
    const n = doc.nodes[id];
    if (!n) continue;
    parts.push(nodeToSvg(doc, n));
  }
  parts.push('</svg>');
  const blob = new Blob([parts.join('\n')], { type: 'image/svg+xml' });
  downloadBlob(blob, `${doc.name || 'export'}.svg`);
};

const nodeToSvg = (doc: Document, node: SceneNode): string => {
  const m = nodeWorldMatrix(doc, node.id);
  const transform = `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.tx} ${m.ty})`;
  const fill = firstSolidFill(node);
  const stroke = firstStroke(node);
  let shape = '';
  switch (node.type) {
    case 'rectangle':
    case 'frame':
    case 'image': {
      const r = radiusToIndividual((node as { cornerRadius: import('../scene').CornerRadius }).cornerRadius);
      const rMax = Math.max(r.tl, r.tr, r.br, r.bl);
      shape = `<rect x="0" y="0" width="${node.width}" height="${node.height}" rx="${rMax}" ry="${rMax}" ${fill} ${stroke} />`;
      break;
    }
    case 'ellipse':
      shape = `<ellipse cx="${node.width / 2}" cy="${node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" ${fill} ${stroke} />`;
      break;
    case 'line': {
      const sw = node.strokes[0]?.width ?? 1;
      const sc =
        node.strokes[0]?.paint.type === 'solid' ? node.strokes[0].paint.color : '#000';
      shape = `<line x1="0" y1="0" x2="${node.width}" y2="${node.height}" stroke="${sc}" stroke-width="${sw}" />`;
      break;
    }
    case 'polygon': {
      const pts = polygonPointsSVG(node);
      shape = `<polygon points="${pts}" ${fill} ${stroke} />`;
      break;
    }
    case 'text':
      shape = `<text x="0" y="${node.fontSize}" font-family="${node.fontFamily}" font-weight="${node.fontWeight}" font-size="${node.fontSize}" fill="${node.color}" text-anchor="${node.textAlign === 'center' ? 'middle' : node.textAlign === 'right' ? 'end' : 'start'}">${escapeXml(node.text)}</text>`;
      break;
  }
  let content = `<g transform="${transform}" opacity="${node.opacity}">${shape}`;
  if (isFrame(node)) {
    for (const cid of node.children) {
      const c = doc.nodes[cid];
      if (c) content += nodeToSvg(doc, c);
    }
  }
  content += '</g>';
  return content;
};

const polygonPointsSVG = (n: Extract<SceneNode, { type: 'polygon' }>): string => {
  const cx = n.width / 2;
  const cy = n.height / 2;
  const rx = n.width / 2;
  const ry = n.height / 2;
  const pts = n.starRatio !== null ? n.pointCount * 2 : n.pointCount;
  const out: string[] = [];
  for (let i = 0; i < pts; i++) {
    const angle = -Math.PI / 2 + (i / pts) * Math.PI * 2;
    const r = n.starRatio !== null && i % 2 === 1 ? n.starRatio : 1;
    out.push(`${(cx + Math.cos(angle) * rx * r).toFixed(2)},${(cy + Math.sin(angle) * ry * r).toFixed(2)}`);
  }
  return out.join(' ');
};

const firstSolidFill = (node: SceneNode): string => {
  if (isText(node)) return `fill="${node.color}"`;
  if (!hasFills(node)) return 'fill="none"';
  const first = node.fills[0];
  if (!first) return 'fill="none"';
  if (first.type === 'solid') {
    return `fill="${first.color}" fill-opacity="${first.opacity}"`;
  }
  return 'fill="#888"';
};
const firstStroke = (node: SceneNode): string => {
  if (!hasStrokes(node)) return '';
  const first = node.strokes[0];
  if (!first) return '';
  const color = first.paint.type === 'solid' ? first.paint.color : '#000';
  return `stroke="${color}" stroke-width="${first.width}"${first.dash.length ? ` stroke-dasharray="${first.dash.join(',')}"` : ''}`;
};

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

void nodeWorldAABB;
