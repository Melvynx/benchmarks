import type { AABB, NodeId } from "./types";
import { aabbIntersects, pointInAABB } from "./geometry";

interface Cell {
  ids: NodeId[];
}

/**
 * Uniform spatial hash. Rebuild is O(n); queries are O(k) in occupied cells.
 * Better than a quadtree for the typical design-file mix of similarly sized frames.
 */
export class SpatialIndex {
  private readonly cell: number;
  private readonly cells = new Map<string, Cell>();
  private readonly bounds = new Map<NodeId, AABB>();

  constructor(cellSize = 256) {
    this.cell = cellSize;
  }

  clear(): void {
    this.cells.clear();
    this.bounds.clear();
  }

  insert(id: NodeId, aabb: AABB): void {
    this.bounds.set(id, aabb);
    const { minI, minJ, maxI, maxJ } = this.range(aabb);
    for (let i = minI; i <= maxI; i++) {
      for (let j = minJ; j <= maxJ; j++) {
        const key = `${i}:${j}`;
        let cell = this.cells.get(key);
        if (!cell) {
          cell = { ids: [] };
          this.cells.set(key, cell);
        }
        cell.ids.push(id);
      }
    }
  }

  query(aabb: AABB): NodeId[] {
    const seen = new Set<NodeId>();
    const out: NodeId[] = [];
    const { minI, minJ, maxI, maxJ } = this.range(aabb);
    for (let i = minI; i <= maxI; i++) {
      for (let j = minJ; j <= maxJ; j++) {
        const cell = this.cells.get(`${i}:${j}`);
        if (!cell) continue;
        for (const id of cell.ids) {
          if (seen.has(id)) continue;
          seen.add(id);
          const b = this.bounds.get(id);
          if (b && aabbIntersects(b, aabb)) out.push(id);
        }
      }
    }
    return out;
  }

  queryPoint(x: number, y: number): NodeId[] {
    return this.query({ minX: x, minY: y, maxX: x, maxY: y }).filter((id) => {
      const b = this.bounds.get(id);
      return b ? pointInAABB({ x, y }, b) : false;
    });
  }

  getAABB(id: NodeId): AABB | undefined {
    return this.bounds.get(id);
  }

  size(): number {
    return this.bounds.size;
  }

  private range(aabb: AABB): { minI: number; minJ: number; maxI: number; maxJ: number } {
    return {
      minI: Math.floor(aabb.minX / this.cell),
      minJ: Math.floor(aabb.minY / this.cell),
      maxI: Math.floor(aabb.maxX / this.cell),
      maxJ: Math.floor(aabb.maxY / this.cell),
    };
  }
}
