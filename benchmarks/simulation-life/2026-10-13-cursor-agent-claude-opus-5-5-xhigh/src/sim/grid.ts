export interface Point {
  x: number;
  z: number;
}

/** Uniform bucket grid (linked lists in typed arrays), rebuilt every tick. */
export class Grid<T extends Point> {
  private readonly cell: number;
  private readonly half: number;
  private readonly cols: number;
  private readonly heads: Int32Array;
  private next = new Int32Array(256);
  items: T[] = [];

  constructor(radius: number, cell: number) {
    this.cell = cell;
    this.half = radius + 2;
    this.cols = Math.max(1, Math.ceil((2 * this.half) / cell));
    this.heads = new Int32Array(this.cols * this.cols);
  }

  private col(v: number): number {
    const c = Math.floor((v + this.half) / this.cell);
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  build(items: T[]): void {
    this.items = items;
    this.heads.fill(-1);
    if (this.next.length < items.length) this.next = new Int32Array(items.length * 2);
    for (let i = 0; i < items.length; i++) {
      const c = this.col(items[i].z) * this.cols + this.col(items[i].x);
      this.next[i] = this.heads[c];
      this.heads[c] = i;
    }
  }

  forEachNear(x: number, z: number, r: number, fn: (item: T, d2: number) => void): void {
    const r2 = r * r;
    const x0 = this.col(x - r);
    const x1 = this.col(x + r);
    const z0 = this.col(z - r);
    const z1 = this.col(z + r);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (let i = this.heads[cz * this.cols + cx]; i >= 0; i = this.next[i]) {
          const it = this.items[i];
          const dx = it.x - x;
          const dz = it.z - z;
          const d2 = dx * dx + dz * dz;
          if (d2 <= r2) fn(it, d2);
        }
      }
    }
  }

  nearest(x: number, z: number, r: number, accept: (item: T) => boolean): T | null {
    let best: T | null = null;
    let bestD2 = r * r;
    const x0 = this.col(x - r);
    const x1 = this.col(x + r);
    const z0 = this.col(z - r);
    const z1 = this.col(z + r);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (let i = this.heads[cz * this.cols + cx]; i >= 0; i = this.next[i]) {
          const it = this.items[i];
          const dx = it.x - x;
          const dz = it.z - z;
          const d2 = dx * dx + dz * dz;
          if (d2 < bestD2 && accept(it)) {
            best = it;
            bestD2 = d2;
          }
        }
      }
    }
    return best;
  }
}
