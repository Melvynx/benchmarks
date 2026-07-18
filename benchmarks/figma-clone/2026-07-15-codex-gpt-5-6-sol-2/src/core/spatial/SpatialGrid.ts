export interface SpatialBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface SpatialEntry extends SpatialBounds {
  readonly id: string;
  readonly order: number;
}

const DEFAULT_CELL_SIZE = 256;
// A uniform grid is excellent for local interaction, but a single full-page
// background or an accidental unbounded rectangle must not allocate millions
// of buckets. Entries beyond this budget live in a small fallback set.
const MAX_CELLS_PER_OPERATION = 4_096;

function rangesOverlap(firstMin: number, firstMax: number, secondMin: number, secondMax: number) {
  return firstMin <= secondMax && firstMax >= secondMin;
}

function intersects(first: SpatialBounds, second: SpatialBounds) {
  return (
    rangesOverlap(first.minX, first.maxX, second.minX, second.maxX) &&
    rangesOverlap(first.minY, first.maxY, second.minY, second.maxY)
  );
}

function assertValidBounds(bounds: SpatialBounds, context: string) {
  const values = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${context} bounds must contain finite coordinates.`);
  }

  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    throw new Error(`${context} bounds must have ordered minimum and maximum coordinates.`);
  }
}

export class SpatialGrid {
  readonly #cellSize: number;
  readonly #cells = new Map<string, Set<string>>();
  readonly #entries = new Map<string, SpatialEntry>();
  readonly #entryCells = new Map<string, readonly string[]>();
  readonly #oversizedEntries = new Set<string>();

  constructor(cellSize = DEFAULT_CELL_SIZE) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new Error('Spatial grid cell size must be a positive finite number.');
    }
    this.#cellSize = cellSize;
  }

  get size() {
    return this.#entries.size;
  }

  clear() {
    this.#cells.clear();
    this.#entries.clear();
    this.#entryCells.clear();
    this.#oversizedEntries.clear();
  }

  insert(entry: SpatialEntry) {
    assertValidBounds(entry, 'Spatial entry');
    if (!Number.isFinite(entry.order)) {
      throw new Error('Spatial entry order must be finite.');
    }

    this.remove(entry.id);
    const keys = this.#keysForBounds(entry);
    this.#entries.set(entry.id, entry);
    this.#entryCells.set(entry.id, keys ?? []);

    if (!keys) {
      this.#oversizedEntries.add(entry.id);
      return;
    }

    for (const key of keys) {
      const bucket = this.#cells.get(key) ?? new Set<string>();
      bucket.add(entry.id);
      this.#cells.set(key, bucket);
    }
  }

  update(entry: SpatialEntry) {
    this.insert(entry);
  }

  remove(id: string) {
    const keys = this.#entryCells.get(id);
    if (!keys) return false;

    for (const key of keys) {
      const bucket = this.#cells.get(key);
      bucket?.delete(id);
      if (bucket?.size === 0) this.#cells.delete(key);
    }

    this.#entryCells.delete(id);
    this.#oversizedEntries.delete(id);
    return this.#entries.delete(id);
  }

  query(bounds: SpatialBounds) {
    assertValidBounds(bounds, 'Spatial query');
    const candidates = new Set<string>();
    const keys = this.#keysForBounds(bounds);

    if (!keys) {
      for (const id of this.#entries.keys()) candidates.add(id);
    } else {
      for (const key of keys) {
        const bucket = this.#cells.get(key);
        if (!bucket) continue;
        for (const id of bucket) candidates.add(id);
      }
      for (const id of this.#oversizedEntries) candidates.add(id);
    }

    return [...candidates]
      .map((id) => this.#entries.get(id))
      .filter((entry): entry is SpatialEntry => entry !== undefined && intersects(entry, bounds))
      .sort((first, second) => second.order - first.order);
  }

  queryPoint(x: number, y: number, tolerance = 0) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Spatial point queries require finite coordinates.');
    }
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new Error('Spatial point query tolerance must be a non-negative finite number.');
    }

    return this.query({
      minX: x - tolerance,
      minY: y - tolerance,
      maxX: x + tolerance,
      maxY: y + tolerance,
    });
  }

  #keysForBounds(bounds: SpatialBounds) {
    const minCellX = Math.floor(bounds.minX / this.#cellSize);
    const minCellY = Math.floor(bounds.minY / this.#cellSize);
    const maxCellX = Math.floor(bounds.maxX / this.#cellSize);
    const maxCellY = Math.floor(bounds.maxY / this.#cellSize);

    if (
      !Number.isSafeInteger(minCellX) ||
      !Number.isSafeInteger(minCellY) ||
      !Number.isSafeInteger(maxCellX) ||
      !Number.isSafeInteger(maxCellY)
    ) {
      return null;
    }

    const columnCount = maxCellX - minCellX + 1;
    const rowCount = maxCellY - minCellY + 1;
    if (
      !Number.isSafeInteger(columnCount) ||
      !Number.isSafeInteger(rowCount) ||
      columnCount * rowCount > MAX_CELLS_PER_OPERATION
    ) {
      return null;
    }

    const keys: string[] = [];

    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        keys.push(`${cellX}:${cellY}`);
      }
    }

    return keys;
  }
}
