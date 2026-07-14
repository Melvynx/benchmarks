import { describe, expect, it } from 'vitest';
import {
  applyMxy,
  decomposeToNode,
  invertM,
  mul,
  nodeLocalMatrix,
  rotationM,
  rotationOf,
  translation,
} from './mat2d';

const close = (a: number, b: number, eps = 1e-6): void => {
  expect(Math.abs(a - b)).toBeLessThan(eps);
};

describe('mat2d', () => {
  it('composes translation then rotation in the right order', () => {
    // mul(A, B) applies B first.
    const m = mul(translation(10, 0), rotationM(Math.PI / 2));
    const p = applyMxy(m, 1, 0); // rotate (1,0) → (0,1), then translate → (10,1)
    close(p.x, 10);
    close(p.y, 1);
  });

  it('inverts matrices', () => {
    const m = mul(translation(12, -7), rotationM(0.7));
    const roundTrip = mul(invertM(m), m);
    close(roundTrip.a, 1);
    close(roundTrip.b, 0);
    close(roundTrip.c, 0);
    close(roundTrip.d, 1);
    close(roundTrip.e, 0);
    close(roundTrip.f, 0);
  });

  it('rotates a node around its center', () => {
    const m = nodeLocalMatrix(0, 0, 100, 50, 90);
    const center = applyMxy(m, 50, 25);
    close(center.x, 50);
    close(center.y, 25);
    // Top-left corner moves under rotation.
    const corner = applyMxy(m, 0, 0);
    close(corner.x, 75);
    close(corner.y, -25);
  });

  it('decomposes a node matrix back to x/y/rotation', () => {
    const m = nodeLocalMatrix(33, -12, 80, 40, 42);
    const placed = decomposeToNode(m, 80, 40);
    close(placed.x, 33, 1e-2);
    close(placed.y, -12, 1e-2);
    close(placed.rotation, 42, 1e-2);
  });

  it('extracts rotation from TR matrices', () => {
    close(rotationOf(rotationM(0.5)), 0.5);
  });
});
