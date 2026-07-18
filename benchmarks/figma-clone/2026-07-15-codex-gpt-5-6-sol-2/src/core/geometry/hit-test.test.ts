import { describe, expect, it } from 'vitest';

import {
  composeMatrices,
  hitTestShape,
  hitTestTransformedShape,
  pointInEllipse,
  pointInPolygon,
  pointInRoundedRect,
  rotationMatrixDegrees,
  scalingMatrix,
  translationMatrix,
} from './index';

describe('shape hit testing', () => {
  it('respects rounded rectangle corners', () => {
    const rect = { x: 0, y: 0, width: 100, height: 60 };
    expect(pointInRoundedRect({ x: 50, y: 30 }, rect, 20)).toBe(true);
    expect(pointInRoundedRect({ x: 1, y: 1 }, rect, 20)).toBe(false);
    expect(pointInRoundedRect({ x: 20, y: 0 }, rect, 20)).toBe(true);
  });

  it('tests ellipses without accepting their bounding-box corners', () => {
    const ellipse = { x: 10, y: 20, width: 100, height: 40 };
    expect(pointInEllipse({ x: 60, y: 40 }, ellipse)).toBe(true);
    expect(pointInEllipse({ x: 11, y: 21 }, ellipse)).toBe(false);
  });

  it('treats polygon edges as hits and rejects exterior points', () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
    ];
    expect(pointInPolygon({ x: 50, y: 20 }, triangle)).toBe(true);
    expect(pointInPolygon({ x: 50, y: 0 }, triangle)).toBe(true);
    expect(pointInPolygon({ x: 90, y: 70 }, triangle)).toBe(false);
  });

  it('accounts for stroke width and hit slop on lines', () => {
    const line = {
      kind: 'line',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      strokeWidth: 6,
    } as const;
    expect(hitTestShape({ x: 50, y: 4 }, line, { tolerance: 1 })).toBe(true);
    expect(hitTestShape({ x: 50, y: 4.1 }, line, { tolerance: 1 })).toBe(false);
    expect(hitTestShape({ x: 104, y: 0 }, line, { tolerance: 1 })).toBe(true);
  });

  it('inverse-transforms world points for exact local testing', () => {
    const shape = {
      kind: 'rect',
      rect: { x: 0, y: 0, width: 80, height: 30 },
      cornerRadii: 8,
    } as const;
    const world = composeMatrices(
      translationMatrix(250, 120),
      rotationMatrixDegrees(42),
      scalingMatrix(1.5),
    );
    const insideWorld = {
      x: world.a * 40 + world.c * 15 + world.e,
      y: world.b * 40 + world.d * 15 + world.f,
    };
    expect(hitTestTransformedShape(insideWorld, shape, world)).toBe(true);
    expect(hitTestTransformedShape({ x: -1000, y: -1000 }, shape, world)).toBe(false);
    expect(hitTestTransformedShape(insideWorld, shape, scalingMatrix(0))).toBe(false);
  });

  it('supports stroke-only closed shapes', () => {
    const ellipse = { kind: 'ellipse', rect: { x: 0, y: 0, width: 100, height: 60 } } as const;
    expect(hitTestShape({ x: 50, y: 30 }, ellipse, { fill: false, strokeWidth: 4 })).toBe(false);
    expect(hitTestShape({ x: 50, y: 1 }, ellipse, { fill: false, strokeWidth: 4 })).toBe(true);
  });
});
