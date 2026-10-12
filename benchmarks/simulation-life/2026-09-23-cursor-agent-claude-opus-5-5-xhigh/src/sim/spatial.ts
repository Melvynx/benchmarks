import type { Blob, Species } from "./types";

/** Uniform grid rebuilt every tick; linked lists keep it allocation-free. */
export class SpatialGrid {
  readonly cell: number;
  readonly half: number;
  readonly cols: number;
  private heads: Int32Array;
  private next: Int32Array;

  constructor(radius: number, cell: number, capacity: number) {
    this.cell = cell;
    this.half = radius + cell;
    this.cols = Math.ceil((this.half * 2) / cell) + 1;
    this.heads = new Int32Array(this.cols * this.cols).fill(-1);
    this.next = new Int32Array(capacity).fill(-1);
  }

  private cellIndex(x: number, y: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor((x + this.half) / this.cell)));
    const cy = Math.min(this.cols - 1, Math.max(0, Math.floor((y + this.half) / this.cell)));
    return cy * this.cols + cx;
  }

  /** Pass `only` to index a single species; neighbors then come back in the same relative order as the mixed grid. */
  rebuild(blobs: Blob[], only?: Species) {
    if (this.next.length < blobs.length) this.next = new Int32Array(blobs.length * 2);
    this.heads.fill(-1);
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      if (b.action === "fade" || (only && b.species !== only)) continue;
      const c = this.cellIndex(b.x, b.y);
      this.next[i] = this.heads[c];
      this.heads[c] = i;
    }
  }

  private out = new Int32Array(1024);

  /**
   * Collects indices of blobs in cells overlapping the query circle.
   * Returns a shared buffer that is only valid until the next query.
   */
  query(x: number, y: number, r: number): { ids: Int32Array; count: number } {
    const x0 = Math.max(0, Math.floor((x - r + this.half) / this.cell));
    const x1 = Math.min(this.cols - 1, Math.floor((x + r + this.half) / this.cell));
    const y0 = Math.max(0, Math.floor((y - r + this.half) / this.cell));
    const y1 = Math.min(this.cols - 1, Math.floor((y + r + this.half) / this.cell));
    let count = 0;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        let i = this.heads[cy * this.cols + cx];
        while (i !== -1) {
          if (count >= this.out.length) {
            const grown = new Int32Array(this.out.length * 2);
            grown.set(this.out);
            this.out = grown;
          }
          this.out[count++] = i;
          i = this.next[i];
        }
      }
    }
    this.result.ids = this.out;
    this.result.count = count;
    return this.result;
  }

  private result = { ids: this.out, count: 0 };
}
