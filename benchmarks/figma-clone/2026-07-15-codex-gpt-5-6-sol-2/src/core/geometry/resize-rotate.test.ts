import { describe, expect, it } from 'vitest';

import {
  applyMatrixToPoint,
  composeMatrices,
  degreesToRadians,
  frameWorldCorners,
  resizeFrameLocalAxes,
  resizeHandleLocalPoint,
  rotateFrameAroundCenter,
  rotationMatrixDegrees,
  translationMatrix,
  vec2AlmostEqual,
  worldTransformMatrix,
} from './index';
import type { Matrix2D, ResizeHandle, TransformRect, Vec2 } from './index';

function handleWorld(frame: TransformRect, handle: ResizeHandle, parentWorld?: Matrix2D): Vec2 {
  const local = resizeHandleLocalPoint(handle, frame.width, frame.height);
  return applyMatrixToPoint(worldTransformMatrix(frame, parentWorld), local);
}

function expectPoint(actual: Vec2, expected: Vec2): void {
  expect(actual.x).toBeCloseTo(expected.x, 7);
  expect(actual.y).toBeCloseTo(expected.y, 7);
}

describe('local-axis resize', () => {
  it('resizes a normal east edge without moving its origin', () => {
    const initial = { x: 10, y: 20, width: 100, height: 50, rotation: 0 };
    const result = resizeFrameLocalAxes({
      initial,
      handle: 'east',
      startPointerWorld: handleWorld(initial, 'east'),
      currentPointerWorld: { x: 150, y: 45 },
    });
    expect(result.frame).toEqual({ ...initial, width: 140 });
  });

  it('measures pointer movement in a rotated node local axis', () => {
    const initial = { x: 40, y: 30, width: 100, height: 50, rotation: 67 };
    const initialWorld = worldTransformMatrix(initial);
    const result = resizeFrameLocalAxes({
      initial,
      handle: 'east',
      startPointerWorld: handleWorld(initial, 'east'),
      currentPointerWorld: applyMatrixToPoint(initialWorld, { x: 135, y: 25 }),
    });
    expect(result.frame.width).toBeCloseTo(135);
    expect(result.frame.height).toBeCloseTo(50);
    expect(result.frame.x).toBeCloseTo(initial.x);
    expect(result.frame.y).toBeCloseTo(initial.y);
  });

  it('keeps the opposite edge fixed through a rotated and nested transform', () => {
    const parentWorld = composeMatrices(translationMatrix(300, 140), rotationMatrixDegrees(-23));
    const initial = { x: 35, y: 25, width: 120, height: 70, rotation: 41 };
    const initialWorld = worldTransformMatrix(initial, parentWorld);
    const fixedEast = applyMatrixToPoint(initialWorld, { x: initial.width, y: initial.height / 2 });
    const result = resizeFrameLocalAxes({
      initial,
      parentWorld,
      handle: 'west',
      startPointerWorld: handleWorld(initial, 'west', parentWorld),
      currentPointerWorld: applyMatrixToPoint(initialWorld, { x: 25, y: initial.height / 2 }),
    });
    const resizedEast = handleWorld(result.frame, 'east', parentWorld);

    expect(result.frame.width).toBeCloseTo(95);
    expectPoint(resizedEast, fixedEast);
  });

  it('implements Alt resize around the immutable center', () => {
    const initial = { x: 80, y: 60, width: 100, height: 50, rotation: 31 };
    const initialCenter = applyMatrixToPoint(worldTransformMatrix(initial), { x: 50, y: 25 });
    const initialWorld = worldTransformMatrix(initial);
    const result = resizeFrameLocalAxes({
      initial,
      handle: 'east',
      fromCenter: true,
      startPointerWorld: handleWorld(initial, 'east'),
      currentPointerWorld: applyMatrixToPoint(initialWorld, { x: 120, y: 25 }),
    });
    const resizedCenter = applyMatrixToPoint(worldTransformMatrix(result.frame), {
      x: result.frame.width / 2,
      y: result.frame.height / 2,
    });

    expect(result.frame.width).toBeCloseTo(140);
    expectPoint(resizedCenter, initialCenter);
  });

  it('implements Shift aspect locking for corner and edge handles', () => {
    const initial = { x: 0, y: 0, width: 100, height: 50, rotation: 0 };
    const corner = resizeFrameLocalAxes({
      initial,
      handle: 'south-east',
      keepAspectRatio: true,
      startPointerWorld: { x: 100, y: 50 },
      currentPointerWorld: { x: 140, y: 55 },
    });
    const edge = resizeFrameLocalAxes({
      initial,
      handle: 'east',
      keepAspectRatio: true,
      startPointerWorld: { x: 100, y: 25 },
      currentPointerWorld: { x: 120, y: 25 },
    });

    expect(corner.frame.width).toBeCloseTo(140);
    expect(corner.frame.height).toBeCloseTo(70);
    expect(edge.frame.width).toBeCloseTo(120);
    expect(edge.frame.height).toBeCloseTo(60);
    expect(edge.localBounds.y).toBeCloseTo(-5);
  });
});

describe('center-preserving rotation', () => {
  it('rotates clockwise in screen coordinates while keeping the world center fixed', () => {
    const initial = { x: 10, y: 20, width: 100, height: 50, rotation: 0 };
    const pivot = { x: 60, y: 45 };
    const result = rotateFrameAroundCenter({
      initial,
      startPointerWorld: { x: 110, y: 45 },
      currentPointerWorld: { x: 60, y: 95 },
    });
    const newCenter = applyMatrixToPoint(worldTransformMatrix(result.frame), { x: 50, y: 25 });

    expect(result.frame.rotation).toBeCloseTo(90);
    expectPoint(newCenter, pivot);
    expect(frameWorldCorners(result.frame)).toHaveLength(4);
  });

  it('implements Shift snapping and preserves a nested world pivot', () => {
    const parentWorld = composeMatrices(translationMatrix(250, 90), rotationMatrixDegrees(-17));
    const initial = { x: 30, y: 40, width: 80, height: 40, rotation: 0 };
    const pivot = applyMatrixToPoint(worldTransformMatrix(initial, parentWorld), { x: 40, y: 20 });
    const radius = 70;
    const start = { x: pivot.x + radius, y: pivot.y };
    const angle = degreesToRadians(22);
    const current = {
      x: pivot.x + Math.cos(angle) * radius,
      y: pivot.y + Math.sin(angle) * radius,
    };
    const result = rotateFrameAroundCenter({
      initial,
      parentWorld,
      startPointerWorld: start,
      currentPointerWorld: current,
      snap: true,
    });
    const newPivot = applyMatrixToPoint(worldTransformMatrix(result.frame, parentWorld), {
      x: 40,
      y: 20,
    });

    expect(result.frame.rotation).toBe(15);
    expect(vec2AlmostEqual(newPivot, pivot, 1e-7)).toBe(true);
  });
});
