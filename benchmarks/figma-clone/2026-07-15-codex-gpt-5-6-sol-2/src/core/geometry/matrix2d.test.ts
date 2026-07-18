import { describe, expect, it } from 'vitest';

import {
  applyMatrixToPoint,
  composeMatrices,
  frameWorldBounds,
  frameWorldCorners,
  invertMatrix,
  multiplyMatrices,
  rotatedRectBounds,
  rotationMatrixDegrees,
  scalingMatrix,
  translationMatrix,
  tryInvertMatrix,
  worldToLocalPoint,
} from './index';
import type { Vec2 } from './index';

function expectPoint(actual: Vec2, expected: Vec2): void {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
}

describe('Matrix2D', () => {
  it('composes transforms in canvas order', () => {
    const matrix = composeMatrices(
      translationMatrix(10, 20),
      rotationMatrixDegrees(90),
      scalingMatrix(2),
    );
    expectPoint(applyMatrixToPoint(matrix, { x: 2, y: 3 }), { x: 4, y: 24 });
  });

  it('round-trips points through an affine inverse', () => {
    const matrix = composeMatrices(
      translationMatrix(-17, 42),
      rotationMatrixDegrees(33),
      scalingMatrix(1.75, 0.6),
    );
    const inverse = invertMatrix(matrix);
    const point = { x: 83.25, y: -9.5 };
    expectPoint(applyMatrixToPoint(inverse, applyMatrixToPoint(matrix, point)), point);
    expect(multiplyMatrices(matrix, inverse)).toMatchObject({ a: 1, d: 1 });
  });

  it('rejects singular transforms without producing invalid numbers', () => {
    const singular = scalingMatrix(1, 0);
    expect(tryInvertMatrix(singular)).toBeNull();
    expect(() => invertMatrix(singular)).toThrow(RangeError);
  });
});

describe('bounds and local/world transforms', () => {
  it('computes the AABB of a rotated rectangle', () => {
    const bounds = rotatedRectBounds({ x: 0, y: 0, width: 100, height: 40 }, Math.PI / 2);
    expect(bounds.minX).toBeCloseTo(30);
    expect(bounds.maxX).toBeCloseTo(70);
    expect(bounds.minY).toBeCloseTo(-30);
    expect(bounds.maxY).toBeCloseTo(70);
  });

  it('computes nested world corners and converts back to local space', () => {
    const parentWorld = composeMatrices(
      translationMatrix(200, 80),
      rotationMatrixDegrees(-30),
      scalingMatrix(1.25),
    );
    const frame = { x: 20, y: 15, width: 120, height: 60, rotation: 35 };
    const corners = frameWorldCorners(frame, parentWorld);
    const bounds = frameWorldBounds(frame, parentWorld);

    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(bounds.minX - 1e-8);
      expect(corner.x).toBeLessThanOrEqual(bounds.maxX + 1e-8);
      expect(corner.y).toBeGreaterThanOrEqual(bounds.minY - 1e-8);
      expect(corner.y).toBeLessThanOrEqual(bounds.maxY + 1e-8);
    }

    expectPoint(worldToLocalPoint(corners[2], frame, parentWorld), { x: 120, y: 60 });
  });
});
