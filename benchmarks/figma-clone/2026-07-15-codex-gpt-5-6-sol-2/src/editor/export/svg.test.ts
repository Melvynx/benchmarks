import { describe, expect, it } from 'vitest';

import {
  createFrameNode,
  createPolygonNode,
  createRectangleNode,
  createSceneDocument,
  createStarNode,
  createTextNode,
} from '@/core/model/factories';
import type { LinearGradientPaint, Stroke } from '@/core/model/types';
import { createSeedDocument } from '@/editor/seedDocument';

import { parseSceneDocumentJson, serializeSceneDocumentJson } from './json';
import { serializeSceneDocumentSvg } from './svg';

const gradient: LinearGradientPaint = {
  id: 'paint:gradient',
  type: 'linear-gradient',
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  stops: [
    { position: 0, color: { r: 1, g: 0.2, b: 0.5, a: 1 } },
    { position: 1, color: { r: 0.2, g: 0.3, b: 1, a: 0.8 } },
  ],
};

const dashedStroke: Stroke = {
  id: 'stroke:test',
  visible: true,
  paint: {
    id: 'paint:stroke',
    type: 'solid',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    color: { r: 0.1, g: 0.1, b: 0.12, a: 1 },
  },
  width: 3,
  align: 'center',
  cap: 'round',
  join: 'round',
  dash: [8, 4],
  miterLimit: 4,
};

function createExportDocument() {
  const frameId = 'frame:root';
  const rectangle = createRectangleNode({
    id: 'rectangle:gradient',
    parentId: frameId,
    x: 24,
    y: 30,
    width: 180,
    height: 100,
    rotation: 12,
    cornerRadii: { topLeft: 18, topRight: 6, bottomRight: 18, bottomLeft: 6 },
    fills: [gradient],
    strokes: [dashedStroke],
    effects: [
      {
        id: 'effect:shadow',
        type: 'drop-shadow',
        visible: true,
        color: { r: 0, g: 0, b: 0, a: 0.3 },
        offset: { x: 0, y: 8 },
        blur: 18,
        spread: 1,
        blendMode: 'normal',
      },
    ],
  });
  const text = createTextNode({
    id: 'text:escaped',
    parentId: frameId,
    x: 40,
    y: 160,
    width: 260,
    height: 60,
    content: 'Craft & <precision>',
  });
  const polygon = createPolygonNode({
    id: 'polygon:test',
    parentId: frameId,
    x: 260,
    y: 30,
    pointCount: 6,
  });
  const star = createStarNode({
    id: 'star:test',
    parentId: frameId,
    x: 400,
    y: 30,
    pointCount: 5,
    innerRadius: 0.42,
  });
  const frame = createFrameNode({
    id: frameId,
    name: 'Clipped artboard',
    x: 100,
    y: 80,
    width: 560,
    height: 280,
    rotation: -4,
    clipContent: true,
    childIds: [rectangle.id, text.id, polygon.id, star.id],
  });
  return createSceneDocument({
    id: 'document:export',
    name: 'SVG safety & fidelity',
    nodes: {
      [frame.id]: frame,
      [rectangle.id]: rectangle,
      [text.id]: text,
      [polygon.id]: polygon,
      [star.id]: star,
    },
    rootIds: [frame.id],
    createdAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
  });
}

describe('SVG serialization', () => {
  it('serializes the complete built-in scene', () => {
    const result = serializeSceneDocumentSvg(createSeedDocument());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.svg.length).toBeGreaterThan(10_000);
    expect(result.value.width).toBeGreaterThan(1_000);
  });

  it('serializes nested transforms, clipping, gradients, effects, text and dashed strokes', () => {
    const result = serializeSceneDocumentSvg(createExportDocument());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.svg).toContain('<linearGradient');
    expect(result.value.svg).toContain('<clipPath');
    expect(result.value.svg).toContain('<filter');
    expect(result.value.svg).toContain('stroke-dasharray="8 4"');
    expect(result.value.svg).toContain('transform="matrix(');
    expect(result.value.svg).toContain('Craft &amp; &lt;precision&gt;');
    expect(result.value.svg).toContain('<polygon');
    expect(result.value.width).toBeGreaterThan(500);
    expect(result.value.height).toBeGreaterThan(200);
  });

  it('exports a child selection at world coordinates without duplicating its selected ancestor', () => {
    const document = createExportDocument();
    const result = serializeSceneDocumentSvg(document, { nodeIds: ['rectangle:gradient'] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.svg).toContain('data-node-id="rectangle:gradient"');
    expect(result.value.svg).not.toContain('data-node-id="frame:root"');
    expect(result.value.bounds.minX).toBeGreaterThan(0);
  });
});

describe('JSON import and export', () => {
  it('round-trips validated scene data', () => {
    const serialized = serializeSceneDocumentJson(createExportDocument());
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) return;
    const parsed = parseSceneDocumentJson(serialized.value);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.id).toBe('document:export');
    expect(parsed.value.nodes['text:escaped']?.type).toBe('text');
  });

  it('rejects oversized input before parsing', () => {
    const parsed = parseSceneDocumentJson('{"large":true}', { maxBytes: 4 });
    expect(parsed).toMatchObject({ ok: false, error: { code: 'input-too-large' } });
  });
});
