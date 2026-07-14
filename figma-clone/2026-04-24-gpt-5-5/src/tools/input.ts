import type { Bounds } from "../geometry/bounds";
import { boundsFromPoints, containsPoint, inflateBounds, nodeBounds, nodeCorners, unionBounds } from "../geometry/bounds";
import { pointInNode } from "../geometry/hitTest";
import { invert, nodeMatrix, screenToWorld, snapAngle, transformPoint } from "../geometry/matrix";
import type React from "react";
import type { SmartGuide } from "../scene/render";
import type { EditorDocument, NodeId, Point, SceneNode, Viewport } from "../types/nodes";

export type Handle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotate"
  | "body"
  | null;

export function hitTest(document: EditorDocument, point: Point, candidates: readonly NodeId[]): NodeId | null {
  for (const id of [...candidates].reverse()) {
    const node = document.nodes[id];
    if (node && pointInNode(node, point)) return id;
  }
  return null;
}

export function selectionBounds(document: EditorDocument): Bounds | null {
  return unionBounds(document.selection.map((id) => document.nodes[id]).filter((node): node is SceneNode => Boolean(node)).map(nodeBounds));
}

export function handleAt(document: EditorDocument, viewport: Viewport, screenPoint: Point): Handle {
  if (document.selection.length !== 1) return null;
  const node = document.nodes[document.selection[0]];
  if (!node) return null;
  const screenCorners = nodeCorners(node).map((point) => ({ x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y }));
  const bounds = boundsFromPoints(screenCorners);
  const handles: readonly [Handle, Point][] = [
    ["nw", screenCorners[0]],
    ["n", midpoint(screenCorners[0], screenCorners[1])],
    ["ne", screenCorners[1]],
    ["e", midpoint(screenCorners[1], screenCorners[2])],
    ["se", screenCorners[2]],
    ["s", midpoint(screenCorners[2], screenCorners[3])],
    ["sw", screenCorners[3]],
    ["w", midpoint(screenCorners[3], screenCorners[0])],
    ["rotate", { x: bounds.x + bounds.width / 2, y: bounds.y - 30 }],
  ];
  const hit = handles.find(([, point]) => Math.hypot(point.x - screenPoint.x, point.y - screenPoint.y) <= 8);
  if (hit) return hit[0];
  return containsPoint(inflateBounds(bounds, 4), screenPoint) ? "body" : null;
}

export function transformByHandle(node: SceneNode, handle: Exclude<Handle, null | "body" | "rotate">, startWorld: Point, currentWorld: Point, modifiers: { shift: boolean; alt: boolean }): SceneNode {
  const inverse = invert(nodeMatrix(node));
  const start = transformPoint(inverse, startWorld);
  const current = transformPoint(inverse, currentWorld);
  let left = 0;
  let top = 0;
  let right = node.width;
  let bottom = node.height;
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  if (handle.includes("w")) left += dx;
  if (handle.includes("e")) right += dx;
  if (handle.includes("n")) top += dy;
  if (handle.includes("s")) bottom += dy;
  if (modifiers.alt) {
    if (handle.includes("w") || handle.includes("e")) {
      left -= dx;
      right += dx;
    }
    if (handle.includes("n") || handle.includes("s")) {
      top -= dy;
      bottom += dy;
    }
  }
  let width = Math.max(2, right - left);
  let height = Math.max(2, bottom - top);
  if (modifiers.shift) {
    const ratio = node.width / Math.max(1, node.height);
    if (width / height > ratio) width = height * ratio;
    else height = width / ratio;
  }
  const localCenter = { x: left + width / 2, y: top + height / 2 };
  const oldCenter = transformPoint(nodeMatrix(node), { x: node.width / 2, y: node.height / 2 });
  const newCenter = transformPoint(nodeMatrix(node), localCenter);
  return { ...node, x: node.x + newCenter.x - oldCenter.x, y: node.y + newCenter.y - oldCenter.y, width, height };
}

export function rotateNodeFromPointer(node: SceneNode, currentWorld: Point, shift: boolean): SceneNode {
  const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  const angle = (Math.atan2(currentWorld.y - center.y, currentWorld.x - center.x) * 180) / Math.PI + 90;
  return { ...node, rotation: shift ? snapAngle(angle) : angle };
}

export function marqueeSelection(document: EditorDocument, bounds: Bounds): NodeId[] {
  return Object.values(document.nodes)
    .filter((node) => node.id !== document.rootId && node.visible && !node.locked && intersects(bounds, nodeBounds(node)))
    .map((node) => node.id);
}

export function smartSnap(document: EditorDocument, movingIds: readonly NodeId[], proposed: Record<NodeId, { x: number; y: number }>): { adjusted: Record<NodeId, { x: number; y: number }>; guides: SmartGuide[] } {
  const moved = movingIds.map((id) => {
    const node = document.nodes[id];
    return node ? { ...node, x: proposed[id]?.x ?? node.x, y: proposed[id]?.y ?? node.y } : null;
  }).filter((node): node is SceneNode => node !== null);
  const movingBounds = unionBounds(moved.map(nodeBounds));
  if (!movingBounds) return { adjusted: proposed, guides: [] };
  const staticNodes = Object.values(document.nodes).filter((node) => node.id !== document.rootId && !movingIds.includes(node.id) && node.visible);
  const movingStops = stops(movingBounds);
  let bestDx = 0;
  let bestDy = 0;
  let xGuide: SmartGuide | null = null;
  let yGuide: SmartGuide | null = null;
  for (const node of staticNodes) {
    const bound = nodeBounds(node);
    const staticStops = stops(bound);
    for (const ms of movingStops.x) {
      for (const ss of staticStops.x) {
        const delta = ss - ms;
        if (Math.abs(delta) < 5 && (bestDx === 0 || Math.abs(delta) < Math.abs(bestDx))) {
          bestDx = delta;
          xGuide = { kind: "vertical", from: { x: ss, y: Math.min(bound.y, movingBounds.y) - 40 }, to: { x: ss, y: Math.max(bound.y + bound.height, movingBounds.y + movingBounds.height) + 40 } };
        }
      }
    }
    for (const ms of movingStops.y) {
      for (const ss of staticStops.y) {
        const delta = ss - ms;
        if (Math.abs(delta) < 5 && (bestDy === 0 || Math.abs(delta) < Math.abs(bestDy))) {
          bestDy = delta;
          yGuide = { kind: "horizontal", from: { x: Math.min(bound.x, movingBounds.x) - 40, y: ss }, to: { x: Math.max(bound.x + bound.width, movingBounds.x + movingBounds.width) + 40, y: ss } };
        }
      }
    }
  }
  const adjusted = Object.fromEntries(Object.entries(proposed).map(([id, point]) => [id, { x: point.x + bestDx, y: point.y + bestDy }]));
  return { adjusted, guides: [xGuide, yGuide].filter((guide): guide is SmartGuide => guide !== null) };
}

export function pointerPoint(event: React.PointerEvent | React.MouseEvent | React.WheelEvent | React.DragEvent | PointerEvent | MouseEvent | WheelEvent | DragEvent, element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function pointerWorld(event: React.PointerEvent | PointerEvent, element: HTMLElement, viewport: Viewport): Point {
  return screenToWorld(viewport, pointerPoint(event, element));
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function intersects(a: Bounds, b: Bounds): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

function stops(bounds: Bounds): { x: [number, number, number]; y: [number, number, number] } {
  return {
    x: [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width],
    y: [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height],
  };
}
