import type { AABB } from "../geometry/bounds";

type Item = { id: string; box: AABB };

export class Quadtree {
  private root: Node;

  constructor(
    bounds: AABB = { x: -1e6, y: -1e6, width: 2e6, height: 2e6 },
    private capacity = 8,
    private maxDepth = 10,
  ) {
    this.root = { bounds, depth: 0, items: [], children: null };
  }

  clear(bounds?: AABB): void {
    this.root = {
      bounds: bounds ?? { x: -1e6, y: -1e6, width: 2e6, height: 2e6 },
      depth: 0,
      items: [],
      children: null,
    };
  }

  insert(id: string, box: AABB): void {
    insertInto(this.root, { id, box }, this.capacity, this.maxDepth);
  }

  query(range: AABB): string[] {
    const out: string[] = [];
    queryNode(this.root, range, out);
    return [...new Set(out)];
  }

  queryPoint(x: number, y: number, pad = 0): string[] {
    return this.query({ x: x - pad, y: y - pad, width: pad * 2, height: pad * 2 });
  }
}

type Node = {
  bounds: AABB;
  depth: number;
  items: Item[];
  children: Node[] | null;
};

function overlaps(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function insertInto(node: Node, item: Item, capacity: number, maxDepth: number): void {
  if (!overlaps(node.bounds, item.box)) return;
  if (node.children) {
    for (const child of node.children) insertInto(child, item, capacity, maxDepth);
    return;
  }
  node.items.push(item);
  if (node.items.length <= capacity || node.depth >= maxDepth) return;
  const { x, y, width, height } = node.bounds;
  const hw = width / 2;
  const hh = height / 2;
  node.children = [
    { bounds: { x, y, width: hw, height: hh }, depth: node.depth + 1, items: [], children: null },
    {
      bounds: { x: x + hw, y, width: hw, height: hh },
      depth: node.depth + 1,
      items: [],
      children: null,
    },
    {
      bounds: { x, y: y + hh, width: hw, height: hh },
      depth: node.depth + 1,
      items: [],
      children: null,
    },
    {
      bounds: { x: x + hw, y: y + hh, width: hw, height: hh },
      depth: node.depth + 1,
      items: [],
      children: null,
    },
  ];
  const items = node.items;
  node.items = [];
  for (const existing of items) {
    for (const child of node.children) insertInto(child, existing, capacity, maxDepth);
  }
}

function queryNode(node: Node, range: AABB, out: string[]): void {
  if (!overlaps(node.bounds, range)) return;
  for (const item of node.items) {
    if (overlaps(item.box, range)) out.push(item.id);
  }
  if (!node.children) return;
  for (const child of node.children) queryNode(child, range, out);
}
