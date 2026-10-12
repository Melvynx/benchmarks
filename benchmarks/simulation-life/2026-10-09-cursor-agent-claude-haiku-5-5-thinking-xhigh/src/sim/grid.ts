export interface GridItem {
  x: number;
  z: number;
}

/** Uniform hash grid for neighbour queries. Rebuilt every tick. */
export class SpatialGrid<T extends GridItem> {
  private cells = new Map<number, T[]>();

  constructor(private readonly cellSize: number) {}

  clear(): void {
    for (const arr of this.cells.values()) arr.length = 0;
  }

  private key(cx: number, cz: number): number {
    return (cx + 256) * 1024 + (cz + 256);
  }

  insert(item: T): void {
    const k = this.key(Math.floor(item.x / this.cellSize), Math.floor(item.z / this.cellSize));
    let arr = this.cells.get(k);
    if (!arr) {
      arr = [];
      this.cells.set(k, arr);
    }
    arr.push(item);
  }

  /** Fills `out` with items within radius `r` of (x, z). */
  query(x: number, z: number, r: number, out: T[]): T[] {
    out.length = 0;
    const s = this.cellSize;
    const r2 = r * r;
    const x0 = Math.floor((x - r) / s);
    const x1 = Math.floor((x + r) / s);
    const z0 = Math.floor((z - r) / s);
    const z1 = Math.floor((z + r) / s);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const arr = this.cells.get(this.key(cx, cz));
        if (!arr) continue;
        for (const item of arr) {
          const dx = item.x - x;
          const dz = item.z - z;
          if (dx * dx + dz * dz <= r2) out.push(item);
        }
      }
    }
    return out;
  }
}
