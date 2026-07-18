import { intersects, nodeWorldBounds } from "./geometry";
import type { Bounds, SceneNode } from "./types";

const DEFAULT_CELL_SIZE = 256;

export class SpatialGrid {
  readonly #cellSize: number;
  readonly #cells = new Map<string, Set<string>>();
  readonly #bounds = new Map<string, Bounds>();

  constructor(cellSize = DEFAULT_CELL_SIZE) {
    this.#cellSize = cellSize;
  }

  rebuild(nodes: Readonly<Record<string, SceneNode>>): void {
    this.clear();
    Object.values(nodes).forEach((node) => {
      if (node.visible) this.insert(node.id, nodeWorldBounds(node, nodes));
    });
  }

  insert(id: string, bounds: Bounds): void {
    this.#bounds.set(id, bounds);
    this.#keys(bounds).forEach((key) => {
      const cell = this.#cells.get(key) ?? new Set<string>();
      cell.add(id);
      this.#cells.set(key, cell);
    });
  }

  query(bounds: Bounds): readonly string[] {
    const candidates = new Set<string>();
    this.#keys(bounds).forEach((key) => this.#cells.get(key)?.forEach((id) => candidates.add(id)));
    return [...candidates].filter((id) => {
      const item = this.#bounds.get(id);
      return item ? intersects(bounds, item) : false;
    });
  }

  boundsFor(id: string): Bounds | undefined {
    return this.#bounds.get(id);
  }

  clear(): void {
    this.#cells.clear();
    this.#bounds.clear();
  }

  #keys(bounds: Bounds): readonly string[] {
    const startX = Math.floor(bounds.x / this.#cellSize);
    const startY = Math.floor(bounds.y / this.#cellSize);
    const endX = Math.floor((bounds.x + bounds.width) / this.#cellSize);
    const endY = Math.floor((bounds.y + bounds.height) / this.#cellSize);
    const keys: string[] = [];
    for (let x = startX; x <= endX; x += 1) {
      for (let y = startY; y <= endY; y += 1) keys.push(`${x}:${y}`);
    }
    return keys;
  }
}
