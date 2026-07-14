import type { Rect } from '../geometry/rect';
import { rectsIntersect, rectContainsPoint } from '../geometry/rect';
import type { Vec2 } from '../geometry/vec2';

const CELL_SIZE = 512;

/**
 * Uniform spatial hash grid over world space. Insert-only between rebuilds —
 * the scene index rebuilds it per document version, so queries (hit testing,
 * marquee, snapping) stay O(cells touched) instead of O(n) scans.
 */
export class SpatialGrid {
  private cells = new Map<string, string[]>();
  private bounds = new Map<string, Rect>();

  clear(): void {
    this.cells.clear();
    this.bounds.clear();
  }

  private static key(cx: number, cy: number): string {
    return cx + ':' + cy;
  }

  insert(id: string, r: Rect): void {
    this.bounds.set(id, r);
    const x0 = Math.floor(r.x / CELL_SIZE);
    const y0 = Math.floor(r.y / CELL_SIZE);
    const x1 = Math.floor((r.x + r.width) / CELL_SIZE);
    const y1 = Math.floor((r.y + r.height) / CELL_SIZE);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = SpatialGrid.key(cx, cy);
        const cell = this.cells.get(key);
        if (cell) cell.push(id);
        else this.cells.set(key, [id]);
      }
    }
  }

  boundsOf(id: string): Rect | null {
    return this.bounds.get(id) ?? null;
  }

  /** Ids whose bounds contain the point (deduped, unordered). */
  queryPoint(p: Vec2): string[] {
    const key = SpatialGrid.key(Math.floor(p.x / CELL_SIZE), Math.floor(p.y / CELL_SIZE));
    const candidates = this.cells.get(key);
    if (!candidates) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const id of candidates) {
      if (seen.has(id)) continue;
      seen.add(id);
      const b = this.bounds.get(id);
      if (b && rectContainsPoint(b, p)) out.push(id);
    }
    return out;
  }

  /** Ids whose bounds intersect the rect (deduped, unordered). */
  queryRect(r: Rect): string[] {
    const x0 = Math.floor(r.x / CELL_SIZE);
    const y0 = Math.floor(r.y / CELL_SIZE);
    const x1 = Math.floor((r.x + r.width) / CELL_SIZE);
    const y1 = Math.floor((r.y + r.height) / CELL_SIZE);
    const out: string[] = [];
    const seen = new Set<string>();
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cell = this.cells.get(SpatialGrid.key(cx, cy));
        if (!cell) continue;
        for (const id of cell) {
          if (seen.has(id)) continue;
          seen.add(id);
          const b = this.bounds.get(id);
          if (b && rectsIntersect(b, r)) out.push(id);
        }
      }
    }
    return out;
  }
}
