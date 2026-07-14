import { describe, expect, it } from 'vitest';
import { IDENTITY, applyMxy, nodeLocalMatrix } from '../geometry/mat2d';
import { resizeAlignedRect, resizeRotatedBox } from './resizeMath';

const close = (a: number, b: number, eps = 1e-4): void => {
  expect(Math.abs(a - b)).toBeLessThan(eps);
};

describe('resizeRotatedBox', () => {
  it('resizes an unrotated box from the SE handle', () => {
    const placed = resizeRotatedBox(
      { width: 100, height: 50 },
      nodeLocalMatrix(10, 20, 100, 50, 0),
      IDENTITY,
      { x: 150, y: 100 }, // world pointer
      'se',
      { aspect: false, fromCenter: false },
    );
    close(placed.x, 10);
    close(placed.y, 20);
    close(placed.width, 140);
    close(placed.height, 80);
  });

  it('keeps the anchor corner world-stationary for rotated nodes', () => {
    const start = { x: 10, y: 20, width: 100, height: 50, rotation: 30 };
    const world0 = nodeLocalMatrix(start.x, start.y, start.width, start.height, start.rotation);
    const anchorBefore = applyMxy(world0, 0, 0); // SE drag anchors at local (0,0)

    // Drag the SE corner to local (130, 90), expressed in world coords.
    const pointerWorld = applyMxy(world0, 130, 90);
    const placed = resizeRotatedBox(
      { width: start.width, height: start.height },
      world0,
      IDENTITY,
      pointerWorld,
      'se',
      { aspect: false, fromCenter: false },
    );

    close(placed.width, 130);
    close(placed.height, 90);
    close(placed.rotation, 30, 1e-2);
    const worldAfter = nodeLocalMatrix(placed.x, placed.y, placed.width, placed.height, placed.rotation);
    const anchorAfter = applyMxy(worldAfter, 0, 0);
    close(anchorAfter.x, anchorBefore.x, 1e-2);
    close(anchorAfter.y, anchorBefore.y, 1e-2);
  });

  it('flips cleanly when dragging across the anchor', () => {
    const world0 = nodeLocalMatrix(0, 0, 100, 50, 0);
    const placed = resizeRotatedBox(
      { width: 100, height: 50 },
      world0,
      IDENTITY,
      { x: -40, y: 25 },
      'e',
      { aspect: false, fromCenter: false },
    );
    close(placed.width, 40);
    close(placed.x, -40);
  });

  it('resizes from the center with Alt', () => {
    const world0 = nodeLocalMatrix(0, 0, 100, 50, 0);
    const placed = resizeRotatedBox(
      { width: 100, height: 50 },
      world0,
      IDENTITY,
      { x: 120, y: 25 },
      'e',
      { aspect: false, fromCenter: true },
    );
    close(placed.width, 140);
    close(placed.x, -20);
    const centerX = placed.x + placed.width / 2;
    close(centerX, 50);
  });

  it('locks aspect ratio with Shift on corner handles', () => {
    const world0 = nodeLocalMatrix(0, 0, 100, 50, 0);
    const placed = resizeRotatedBox(
      { width: 100, height: 50 },
      world0,
      IDENTITY,
      { x: 200, y: 60 },
      'se',
      { aspect: true, fromCenter: false },
    );
    close(placed.width / placed.height, 2);
  });
});

describe('resizeAlignedRect', () => {
  it('returns the normalized rect for a NW drag', () => {
    const { rect } = resizeAlignedRect(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: -20, y: 30 },
      'nw',
      { aspect: false, fromCenter: false },
    );
    close(rect.x, -20);
    close(rect.y, 30);
    close(rect.width, 120);
    close(rect.height, 70);
  });
});
