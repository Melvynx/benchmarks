import type { Rect } from '../geometry/Rect';
import { rectIntersects } from '../geometry/Rect';

export interface QuadItem<T> {
  id: T;
  bounds: Rect;
}

interface QuadNode<T> {
  bounds: Rect;
  items: QuadItem<T>[];
  children: [QuadNode<T>, QuadNode<T>, QuadNode<T>, QuadNode<T>] | null;
  depth: number;
}

export interface QuadtreeOptions {
  maxItemsPerNode?: number;
  maxDepth?: number;
}

/**
 * Simple bounded quadtree for AABB-indexed scene items.
 * Re-built on document change; supports region queries.
 */
export class Quadtree<T> {
  private root: QuadNode<T>;
  private readonly maxItems: number;
  private readonly maxDepth: number;

  constructor(bounds: Rect, options: QuadtreeOptions = {}) {
    this.maxItems = options.maxItemsPerNode ?? 8;
    this.maxDepth = options.maxDepth ?? 8;
    this.root = this.makeNode(bounds, 0);
  }

  private makeNode(bounds: Rect, depth: number): QuadNode<T> {
    return { bounds, items: [], children: null, depth };
  }

  clear(bounds?: Rect): void {
    if (bounds) this.root = this.makeNode(bounds, 0);
    else this.root = this.makeNode(this.root.bounds, 0);
  }

  insert(item: QuadItem<T>): void {
    this.insertInto(this.root, item);
  }

  private insertInto(node: QuadNode<T>, item: QuadItem<T>): void {
    if (!rectIntersects(node.bounds, item.bounds)) return;

    if (node.children) {
      for (const child of node.children) {
        if (rectIntersects(child.bounds, item.bounds)) {
          this.insertInto(child, item);
        }
      }
      return;
    }

    node.items.push(item);
    if (node.items.length > this.maxItems && node.depth < this.maxDepth) {
      this.split(node);
    }
  }

  private split(node: QuadNode<T>): void {
    const { x, y, width, height } = node.bounds;
    const hw = width / 2;
    const hh = height / 2;
    const d = node.depth + 1;
    node.children = [
      this.makeNode({ x, y, width: hw, height: hh }, d),
      this.makeNode({ x: x + hw, y, width: hw, height: hh }, d),
      this.makeNode({ x, y: y + hh, width: hw, height: hh }, d),
      this.makeNode({ x: x + hw, y: y + hh, width: hw, height: hh }, d),
    ];
    const items = node.items;
    node.items = [];
    for (const it of items) {
      for (const child of node.children) {
        if (rectIntersects(child.bounds, it.bounds)) {
          this.insertInto(child, it);
        }
      }
    }
  }

  queryRect(region: Rect, out: T[] = []): T[] {
    const seen = new Set<T>();
    this.queryInto(this.root, region, seen, out);
    return out;
  }

  queryPoint(x: number, y: number, out: T[] = []): T[] {
    return this.queryRect({ x, y, width: 0, height: 0 }, out);
  }

  private queryInto(node: QuadNode<T>, region: Rect, seen: Set<T>, out: T[]): void {
    if (!rectIntersects(node.bounds, region)) return;
    for (const it of node.items) {
      if (!seen.has(it.id) && rectIntersects(it.bounds, region)) {
        seen.add(it.id);
        out.push(it.id);
      }
    }
    if (node.children) {
      for (const c of node.children) this.queryInto(c, region, seen, out);
    }
  }
}
