import { IDENTITY, applyM, applyMxy, invertM, mul, type Mat2d } from '../geometry/mat2d';
import type { Rect } from '../geometry/rect';
import { boundsOfPoints, inflateRect, rectUnion, rectsIntersect } from '../geometry/rect';
import { nodePath } from '../geometry/shapePath';
import type { Vec2 } from '../geometry/vec2';
import { SpatialGrid } from '../spatial/spatialGrid';
import { layoutText } from '../text/textLayout';
import { localMatrix } from './nodeGeometry';
import { ancestorIds } from './traversal';
import type { NodeId, SceneDocument, SceneNode } from './types';
import { isContainer } from './types';

export interface SceneIndexData {
  worldMatrices: Map<NodeId, Mat2d>;
  /** Tight bounds of the node's own box. */
  worldBounds: Map<NodeId, Rect>;
  /** Own box inflated by strokes/effects — what actually gets painted. */
  renderBounds: Map<NodeId, Rect>;
  /** Render bounds of the node plus all (unclipped) descendants, for culling. */
  subtreeBounds: Map<NodeId, Rect>;
  paintIndex: Map<NodeId, number>;
  hidden: Set<NodeId>;
  locked: Set<NodeId>;
  grid: SpatialGrid;
}

let cachedDoc: SceneDocument | null = null;
let cachedData: SceneIndexData | null = null;

/** Index is memoized on document identity — documents are immutable between edits. */
export function getSceneIndex(doc: SceneDocument): SceneIndexData {
  if (cachedDoc === doc && cachedData) return cachedData;
  cachedData = buildSceneIndex(doc);
  cachedDoc = doc;
  return cachedData;
}

export function buildSceneIndex(doc: SceneDocument): SceneIndexData {
  const data: SceneIndexData = {
    worldMatrices: new Map(),
    worldBounds: new Map(),
    renderBounds: new Map(),
    subtreeBounds: new Map(),
    paintIndex: new Map(),
    hidden: new Set(),
    locked: new Set(),
    grid: new SpatialGrid(),
  };

  let order = 0;
  const walk = (
    ids: readonly NodeId[],
    parentMatrix: Mat2d,
    parentHidden: boolean,
    parentLocked: boolean,
  ): Rect | null => {
    let levelBounds: Rect | null = null;
    for (const id of ids) {
      const node = doc.nodes[id];
      if (!node) continue;
      data.paintIndex.set(id, order++);
      const m = mul(parentMatrix, localMatrix(node));
      data.worldMatrices.set(id, m);

      const hidden = parentHidden || !node.visible;
      const locked = parentLocked || node.locked;
      if (hidden) data.hidden.add(id);
      if (locked) data.locked.add(id);

      const own = ownWorldBounds(node, m);
      data.worldBounds.set(id, own);
      const render = inflateRect(own, paintInflation(node));
      data.renderBounds.set(id, render);
      data.grid.insert(id, render);

      let subtree = render;
      if (isContainer(node)) {
        const childBounds = walk(node.childIds, m, hidden, locked);
        const clips = node.type === 'frame' && node.clipsContent;
        if (childBounds && !clips) subtree = rectUnion(subtree, childBounds);
      }
      data.subtreeBounds.set(id, subtree);
      if (!hidden) levelBounds = levelBounds === null ? subtree : rectUnion(levelBounds, subtree);
    }
    return levelBounds;
  };

  walk(doc.rootIds, IDENTITY, false, false);
  return data;
}

function ownWorldBounds(node: SceneNode, m: Mat2d): Rect {
  const w = node.width;
  let h = node.height;
  // Text content can overflow a fixed box; index the painted extent.
  if (node.type === 'text' && node.autoResize === 'none') {
    const layout = layoutText(node);
    h = Math.max(h, layout.height);
  }
  return boundsOfPoints([applyMxy(m, 0, 0), applyMxy(m, w, 0), applyMxy(m, w, h), applyMxy(m, 0, h)]);
}

/** How far painting can spill outside the geometry box (strokes + effects). */
function paintInflation(node: SceneNode): number {
  let strokeOut = 0;
  if (node.strokes.some((s) => s.enabled)) {
    if (node.strokeAlign === 'outside') strokeOut = node.strokeWeight;
    else if (node.strokeAlign === 'center' || node.type === 'line') strokeOut = node.strokeWeight / 2;
  }
  let effectOut = 0;
  for (const effect of node.effects) {
    if (!effect.enabled) continue;
    if (effect.type === 'drop-shadow') {
      effectOut = Math.max(
        effectOut,
        effect.blur + effect.spread + Math.max(Math.abs(effect.offsetX), Math.abs(effect.offsetY)),
      );
    } else if (effect.type === 'layer-blur') {
      effectOut = Math.max(effectOut, effect.radius * 2);
    }
  }
  return strokeOut + effectOut;
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

let hitCtx: CanvasRenderingContext2D | null = null;

function getHitCtx(): CanvasRenderingContext2D {
  if (!hitCtx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create hit-test context');
    hitCtx = ctx;
  }
  return hitCtx;
}

export interface HitOptions {
  /** World-space slop added around strokes/lines so thin targets stay clickable. */
  slop: number;
  includeLocked?: boolean;
  exclude?: ReadonlySet<NodeId>;
}

/** Precise shape test in the node's local space. */
function nodeHitsPoint(node: SceneNode, m: Mat2d, point: Vec2, slop: number): boolean {
  const local = applyM(invertM(m), point);
  const ctx = getHitCtx();

  if (node.type === 'text' || node.type === 'group') {
    return local.x >= 0 && local.x <= node.width && local.y >= 0 && local.y <= node.height;
  }
  if (node.type === 'line') {
    const width = Math.max(node.strokeWeight, 1) + slop * 2;
    ctx.lineWidth = width;
    return ctx.isPointInStroke(nodePath(node), local.x, local.y);
  }

  const path = nodePath(node);
  if (node.fills.some((f) => f.enabled) && ctx.isPointInPath(path, local.x, local.y)) return true;
  if (node.strokes.some((s) => s.enabled)) {
    ctx.lineWidth = node.strokeWeight + slop * 2;
    if (ctx.isPointInStroke(path, local.x, local.y)) return true;
  }
  return false;
}

/** True if the point survives every clipping ancestor frame of `id`. */
function passesClipAncestors(doc: SceneDocument, data: SceneIndexData, id: NodeId, point: Vec2): boolean {
  const ctx = getHitCtx();
  for (const ancestorId of ancestorIds(doc, id)) {
    const ancestor = doc.nodes[ancestorId];
    if (!ancestor || ancestor.type !== 'frame' || !ancestor.clipsContent) continue;
    const m = data.worldMatrices.get(ancestorId);
    if (!m) continue;
    const local = applyM(invertM(m), point);
    if (!ctx.isPointInPath(nodePath(ancestor), local.x, local.y)) return false;
  }
  return true;
}

/**
 * Deepest concrete node under the point, topmost in paint order first.
 * Returns the full ancestor chain (deepest → outermost) so selection policy
 * (bubble to top-level child / enter groups) can be decided by the caller.
 */
export function hitChain(doc: SceneDocument, point: Vec2, options: HitOptions): NodeId[] | null {
  const data = getSceneIndex(doc);
  const candidates = data.grid
    .queryPoint(point)
    .filter((id) => {
      if (data.hidden.has(id)) return false;
      if (!options.includeLocked && data.locked.has(id)) return false;
      if (options.exclude?.has(id)) return false;
      const node = doc.nodes[id];
      return node !== undefined && node.type !== 'group';
    })
    .sort((a, b) => (data.paintIndex.get(b) ?? 0) - (data.paintIndex.get(a) ?? 0));

  for (const id of candidates) {
    const node = doc.nodes[id];
    const m = data.worldMatrices.get(id);
    if (!node || !m) continue;
    if (!nodeHitsPoint(node, m, point, options.slop)) continue;
    if (!passesClipAncestors(doc, data, id, point)) continue;
    return [id, ...ancestorIds(doc, id)];
  }
  return null;
}

/** SAT intersection between two convex polygons. */
function convexPolysIntersect(a: readonly Vec2[], b: readonly Vec2[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      if (!p1 || !p2) continue;
      const nx = p2.y - p1.y;
      const ny = p1.x - p2.x;
      let minA = Infinity;
      let maxA = -Infinity;
      for (const p of a) {
        const proj = nx * p.x + ny * p.y;
        if (proj < minA) minA = proj;
        if (proj > maxA) maxA = proj;
      }
      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of b) {
        const proj = nx * p.x + ny * p.y;
        if (proj < minB) minB = proj;
        if (proj > maxB) maxB = proj;
      }
      if (maxA < minB || maxB < minA) return false;
    }
  }
  return true;
}

/** Concrete (non-group) nodes whose rotated box intersects the world rect. */
export function nodesIntersectingRect(doc: SceneDocument, area: Rect, includeLocked = false): NodeId[] {
  const data = getSceneIndex(doc);
  const areaCorners: Vec2[] = [
    { x: area.x, y: area.y },
    { x: area.x + area.width, y: area.y },
    { x: area.x + area.width, y: area.y + area.height },
    { x: area.x, y: area.y + area.height },
  ];
  const out: NodeId[] = [];
  for (const id of data.grid.queryRect(area)) {
    if (data.hidden.has(id)) continue;
    if (!includeLocked && data.locked.has(id)) continue;
    const node = doc.nodes[id];
    const m = data.worldMatrices.get(id);
    if (!node || !m || node.type === 'group') continue;
    const bounds = data.worldBounds.get(id);
    if (!bounds || !rectsIntersect(bounds, area)) continue;
    if (node.rotation !== 0) {
      const corners = [
        applyMxy(m, 0, 0),
        applyMxy(m, node.width, 0),
        applyMxy(m, node.width, node.height),
        applyMxy(m, 0, node.height),
      ];
      if (!convexPolysIntersect(corners, areaCorners)) continue;
    }
    out.push(id);
  }
  return out;
}
