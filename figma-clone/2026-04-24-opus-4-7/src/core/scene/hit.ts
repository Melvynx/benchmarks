import type { Document, NodeId, SceneNode } from './types';
import { isFrame, isEllipse, isLine, isText } from './types';
import { nodeWorldMatrix } from './traversal';
import { matInvert, matApply } from '../geometry/Mat2D';
import type { Vec2 } from '../geometry/Vec2';
import { pointInRect, pointInEllipse, distPointToSegment } from '../geometry/HitTest';

/** Hit-test a point (in world/page coords) against a single node, respecting its local transform. */
export const hitTestNode = (doc: Document, node: SceneNode, worldPoint: Vec2, tolerance = 4): boolean => {
  const m = nodeWorldMatrix(doc, node.id);
  const inv = matInvert(m);
  const localPt = matApply(inv, worldPoint);

  if (isLine(node)) {
    // line goes from (0,0) to (w,h) in local space
    return (
      distPointToSegment(localPt, { x: 0, y: 0 }, { x: node.width, y: node.height }) <= tolerance
    );
  }
  const aabb = { x: 0, y: 0, width: node.width, height: node.height };
  if (isEllipse(node)) return pointInEllipse(localPt, aabb);
  if (isText(node)) return pointInRect(localPt, aabb);
  return pointInRect(localPt, aabb);
};

/** Depth-first, front-first hit test. Returns the topmost hit node. */
export const hitTestTopmost = (
  doc: Document,
  worldPoint: Vec2,
  options: { ignore?: Set<NodeId>; deepSelect?: boolean } = {},
): NodeId | null => {
  const page = doc.pages[doc.currentPageId];
  if (!page) return null;
  // iterate children front-first (last in array = on top)
  for (let i = page.children.length - 1; i >= 0; i--) {
    const id = page.children[i]!;
    const hit = hitInSubtree(doc, id, worldPoint, options);
    if (hit) return hit;
  }
  return null;
};

const hitInSubtree = (
  doc: Document,
  id: NodeId,
  worldPoint: Vec2,
  options: { ignore?: Set<NodeId>; deepSelect?: boolean },
): NodeId | null => {
  const node = doc.nodes[id];
  if (!node || !node.visible) return null;
  if (options.ignore?.has(id)) return null;

  if (isFrame(node)) {
    const selfHit = hitTestNode(doc, node, worldPoint);
    // Descend in front-first order (last child drawn on top)
    for (let i = node.children.length - 1; i >= 0; i--) {
      const cid = node.children[i]!;
      const childHit = hitInSubtree(doc, cid, worldPoint, options);
      if (childHit) return childHit;
    }
    // No child hit: return the frame itself if its area was hit
    if (selfHit) return id;
    return null;
  }

  if (node.locked) return null;
  if (hitTestNode(doc, node, worldPoint)) return id;
  return null;
};

/** Topmost hit, but returns top-level frame or node (not inside frames) unless deep-select. */
export const hitTestForSelection = (
  doc: Document,
  worldPoint: Vec2,
  deepSelect: boolean,
): NodeId | null => {
  if (deepSelect) return hitTestTopmost(doc, worldPoint);

  const page = doc.pages[doc.currentPageId];
  if (!page) return null;
  for (let i = page.children.length - 1; i >= 0; i--) {
    const id = page.children[i]!;
    const node = doc.nodes[id];
    if (!node || !node.visible || node.locked) continue;
    // If it's a frame, and the point is inside its bounds, do we enter?
    if (isFrame(node)) {
      // Prefer a child hit; if a child is hit, return the TOP-LEVEL selection scope (the frame itself's child, from the outermost)
      const childHit = hitInFrameChildren(doc, node.id, worldPoint);
      if (childHit) return childHit;
      if (hitTestNode(doc, node, worldPoint)) return id;
    } else {
      if (hitTestNode(doc, node, worldPoint)) return id;
    }
  }
  return null;
};

/** Search only immediate children (not descendants into sub-frames) to support "select child" behavior. */
const hitInFrameChildren = (doc: Document, frameId: NodeId, worldPoint: Vec2): NodeId | null => {
  const frame = doc.nodes[frameId];
  if (!frame || !isFrame(frame)) return null;
  for (let i = frame.children.length - 1; i >= 0; i--) {
    const cid = frame.children[i]!;
    const child = doc.nodes[cid];
    if (!child || !child.visible || child.locked) continue;
    if (hitTestNode(doc, child, worldPoint)) return cid;
  }
  return null;
};
