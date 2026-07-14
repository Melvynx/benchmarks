import type { Bounds } from "../geometry/bounds";
import { boundsIntersect } from "../geometry/bounds";
import type { NodeId, Point } from "../types/nodes";

type Entry = Readonly<{ id: NodeId; bounds: Bounds }>;

export class SpatialHash {
  private readonly cellSize: number;
  private readonly cells = new Map<string, Entry[]>();

  constructor(cellSize = 256) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(id: NodeId, bounds: Bounds): void {
    for (const key of this.keysFor(bounds)) {
      const bucket = this.cells.get(key) ?? [];
      bucket.push({ id, bounds });
      this.cells.set(key, bucket);
    }
  }

  query(bounds: Bounds): NodeId[] {
    const seen = new Set<NodeId>();
    for (const key of this.keysFor(bounds)) {
      for (const entry of this.cells.get(key) ?? []) {
        if (!seen.has(entry.id) && boundsIntersect(bounds, entry.bounds)) {
          seen.add(entry.id);
        }
      }
    }
    return [...seen];
  }

  point(point: Point, radius = 1): NodeId[] {
    return this.query({ x: point.x - radius, y: point.y - radius, width: radius * 2, height: radius * 2 });
  }

  private keysFor(bounds: Bounds): string[] {
    const minX = Math.floor(bounds.x / this.cellSize);
    const maxX = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const minY = Math.floor(bounds.y / this.cellSize);
    const maxY = Math.floor((bounds.y + bounds.height) / this.cellSize);
    const keys: string[] = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        keys.push(`${x}:${y}`);
      }
    }
    return keys;
  }
}
