import { describe, expect, it } from 'vitest';

import { SpatialGrid } from './SpatialGrid';

describe('SpatialGrid', () => {
  it('returns intersecting entries in paint order', () => {
    const grid = new SpatialGrid(100);
    grid.insert({ id: 'back', minX: 0, minY: 0, maxX: 80, maxY: 80, order: 1 });
    grid.insert({ id: 'front', minX: 40, minY: 40, maxX: 120, maxY: 120, order: 2 });

    expect(grid.queryPoint(60, 60).map(({ id }) => id)).toEqual(['front', 'back']);
  });

  it('updates cell membership without leaving stale entries', () => {
    const grid = new SpatialGrid(50);
    grid.insert({ id: 'node', minX: 0, minY: 0, maxX: 20, maxY: 20, order: 1 });
    grid.update({ id: 'node', minX: 200, minY: 200, maxX: 220, maxY: 220, order: 1 });

    expect(grid.queryPoint(10, 10)).toHaveLength(0);
    expect(grid.queryPoint(210, 210)).toHaveLength(1);
  });

  it('supports negative world coordinates and removals', () => {
    const grid = new SpatialGrid(64);
    grid.insert({ id: 'negative', minX: -90, minY: -70, maxX: -10, maxY: -5, order: 1 });

    expect(grid.queryPoint(-40, -20)).toHaveLength(1);
    expect(grid.remove('negative')).toBe(true);
    expect(grid.queryPoint(-40, -20)).toHaveLength(0);
  });

  it('keeps enormous entries queryable without expanding them into grid cells', () => {
    const grid = new SpatialGrid(1);
    grid.insert({
      id: 'world-background',
      minX: -1_000_000_000,
      minY: -1_000_000_000,
      maxX: 1_000_000_000,
      maxY: 1_000_000_000,
      order: 1,
    });
    grid.insert({ id: 'detail', minX: 5, minY: 5, maxX: 6, maxY: 6, order: 2 });

    expect(grid.size).toBe(2);
    expect(grid.queryPoint(5.5, 5.5).map(({ id }) => id)).toEqual(['detail', 'world-background']);
    expect(grid.queryPoint(999_999_999, 999_999_999).map(({ id }) => id)).toEqual([
      'world-background',
    ]);
  });

  it('uses a bounded full scan for enormous query areas while retaining correct results', () => {
    const grid = new SpatialGrid(10);
    grid.insert({ id: 'west', minX: -200, minY: -20, maxX: -180, maxY: 20, order: 1 });
    grid.insert({ id: 'east', minX: 180, minY: -20, maxX: 200, maxY: 20, order: 2 });
    grid.insert({
      id: 'oversized',
      minX: -1_000_000_000,
      minY: -1_000_000_000,
      maxX: 1_000_000_000,
      maxY: 1_000_000_000,
      order: 3,
    });

    expect(
      grid
        .query({
          minX: -1_000_000_000,
          minY: -1_000_000_000,
          maxX: 1_000_000_000,
          maxY: 1_000_000_000,
        })
        .map(({ id }) => id),
    ).toEqual(['oversized', 'east', 'west']);
  });

  it('rejects invalid spatial bounds and point-query parameters', () => {
    const grid = new SpatialGrid();

    expect(() =>
      grid.insert({ id: 'invalid', minX: 5, minY: 0, maxX: 1, maxY: 2, order: 1 }),
    ).toThrow(/ordered/i);
    expect(() => grid.query({ minX: 0, minY: 0, maxX: Number.POSITIVE_INFINITY, maxY: 1 })).toThrow(
      /finite/i,
    );
    expect(() => grid.queryPoint(0, 0, -1)).toThrow(/non-negative/i);
  });
});
