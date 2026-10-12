import type { Box } from "../geometry/matrix";
import type { FrameNode, GeometricNode, InstanceNode, Page, SceneNode, TextNode } from "../types";
import { isFrameLike, isGeometric } from "../types";

export type Geom = Box;

export type MeasureText = (node: TextNode, maxWidth: number | null) => { width: number; height: number };

export function resolveLayout(page: Page, measure: MeasureText): Map<string, Geom> {
  const map = new Map<string, Geom>();
  const visit = (id: string) => {
    const node = page.nodes[id];
    if (!node) return;
    if (isGeometric(node)) {
      map.set(id, {
        x: node.x,
        y: node.y,
        width: Math.max(0, node.width),
        height: Math.max(0, node.height),
        rotation: node.rotation,
      });
      if (node.type === "text") applyText(node, map, measure);
    }
    for (const childId of node.childIds) visit(childId);
    if (isFrameLike(node) && node.layoutMode !== "none") layoutFrame(node, page, map);
  };
  visit(page.rootId);
  return map;
}

function applyText(node: TextNode, map: Map<string, Geom>, measure: MeasureText): void {
  const current = map.get(node.id);
  if (!current) return;
  if (node.textAutoResize === "none") return;
  const maxWidth = node.textAutoResize === "height" ? Math.max(1, node.width) : null;
  const size = measure(node, maxWidth);
  map.set(node.id, {
    ...current,
    width: node.textAutoResize === "width" ? Math.max(1, size.width) : current.width,
    height: Math.max(1, size.height),
  });
}

function contentSize(child: GeometricNode, geom: Geom, axis: "h" | "v", sizing: "fixed" | "hug" | "fill"): number {
  if (child.type === "text") {
    if (axis === "h" && child.textAutoResize === "width") return geom.width;
    if (axis === "v" && child.textAutoResize !== "none") return geom.height;
  }
  if (sizing === "fixed") return axis === "h" ? child.width : child.height;
  return axis === "h" ? geom.width : geom.height;
}

function layoutFrame(frame: FrameNode | InstanceNode, page: Page, map: Map<string, Geom>): void {
  const frameGeom = map.get(frame.id);
  if (!frameGeom) return;
  const horizontal = frame.layoutMode === "horizontal";
  const flow = frame.childIds
    .map((id) => page.nodes[id])
    .filter((node): node is GeometricNode => !!node && isGeometric(node) && node.visible && node.layoutPositioning === "auto");

  const pad = frame.padding;
  const padMainStart = horizontal ? pad[3] : pad[0];
  const padMainEnd = horizontal ? pad[1] : pad[2];
  const padCrossStart = horizontal ? pad[0] : pad[3];
  const padCrossEnd = horizontal ? pad[2] : pad[1];

  const preferred = flow.map((child) => {
    const g = map.get(child.id) ?? { x: child.x, y: child.y, width: child.width, height: child.height, rotation: child.rotation };
    const mainSize = horizontal ? child.layoutSizingH : child.layoutSizingV;
    const crossSize = horizontal ? child.layoutSizingV : child.layoutSizingH;
    const main = contentSize(child, g, horizontal ? "h" : "v", mainSize);
    const cross = contentSize(child, g, horizontal ? "v" : "h", crossSize);
    return { child, main: Math.max(1, main), cross: Math.max(1, cross), mainSize, crossSize };
  });

  const gapCount = Math.max(0, preferred.length - 1);
  const spacing = frame.primaryAlign === "space-between" ? 0 : frame.itemSpacing;
  const preferredMain = preferred.reduce((sum, item) => sum + item.main, 0) + gapCount * frame.itemSpacing;
  const preferredCross = preferred.reduce((max, item) => Math.max(max, item.cross), 0);

  let frameMain = horizontal ? frameGeom.width : frameGeom.height;
  let frameCross = horizontal ? frameGeom.height : frameGeom.width;
  if (horizontal && frame.primarySizing === "hug") frameMain = padMainStart + padMainEnd + preferredMain;
  if (!horizontal && frame.primarySizing === "hug") frameMain = padMainStart + padMainEnd + preferredMain;
  if (horizontal && frame.counterSizing === "hug") frameCross = padCrossStart + padCrossEnd + preferredCross;
  if (!horizontal && frame.counterSizing === "hug") frameCross = padCrossStart + padCrossEnd + preferredCross;
  if (preferred.length === 0) {
    if (horizontal && frame.primarySizing === "hug") frameMain = padMainStart + padMainEnd;
    if (!horizontal && frame.primarySizing === "hug") frameMain = padMainStart + padMainEnd;
  }

  frameMain = Math.max(1, frameMain);
  frameCross = Math.max(1, frameCross);
  const innerMain = Math.max(0, frameMain - padMainStart - padMainEnd);
  const innerCross = Math.max(0, frameCross - padCrossStart - padCrossEnd);

  const parentHugsMain = horizontal ? frame.primarySizing === "hug" : frame.primarySizing === "hug";
  const fillItems = preferred.filter((item) => item.mainSize === "fill" && !parentHugsMain);
  const fixedMain = preferred
    .filter((item) => item.mainSize !== "fill" || parentHugsMain)
    .reduce((sum, item) => sum + item.main, 0);
  const fillCount = fillItems.length;
  const free = innerMain - fixedMain - gapCount * spacing;
  const fillSize = fillCount > 0 ? Math.max(1, free / fillCount) : 0;

  const used = preferred.map((item) => {
    const main = item.mainSize === "fill" && !parentHugsMain ? fillSize : item.main;
    const cross =
      item.crossSize === "fill" || frame.counterAlign === "stretch" ? innerCross : item.cross;
    return { ...item, main, cross };
  });

  const usedMain = used.reduce((sum, item) => sum + item.main, 0);
  const gap =
    frame.primaryAlign === "space-between" && used.length > 1
      ? Math.max(0, (innerMain - usedMain) / (used.length - 1))
      : spacing;
  const contentMain = usedMain + gap * Math.max(0, used.length - 1);
  let cursor = padMainStart;
  if (frame.primaryAlign === "center") cursor = padMainStart + (innerMain - contentMain) / 2;
  if (frame.primaryAlign === "end") cursor = frameMain - padMainEnd - contentMain;

  for (const item of used) {
    let crossPos = padCrossStart;
    if (frame.counterAlign === "center") crossPos = padCrossStart + (innerCross - item.cross) / 2;
    if (frame.counterAlign === "end") crossPos = frameCross - padCrossEnd - item.cross;
    const prev = map.get(item.child.id);
    if (horizontal) {
      map.set(item.child.id, {
        x: cursor,
        y: crossPos,
        width: item.main,
        height: item.cross,
        rotation: prev?.rotation ?? item.child.rotation,
      });
    } else {
      map.set(item.child.id, {
        x: crossPos,
        y: cursor,
        width: item.cross,
        height: item.main,
        rotation: prev?.rotation ?? item.child.rotation,
      });
    }
    cursor += item.main + gap;
  }

  map.set(frame.id, {
    ...frameGeom,
    width: horizontal ? frameMain : frameCross,
    height: horizontal ? frameCross : frameMain,
  });
}

export function nodeGeom(node: SceneNode, map: Map<string, Geom>): Geom | null {
  if (!isGeometric(node)) return null;
  return (
    map.get(node.id) ?? {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rotation: node.rotation,
    }
  );
}
