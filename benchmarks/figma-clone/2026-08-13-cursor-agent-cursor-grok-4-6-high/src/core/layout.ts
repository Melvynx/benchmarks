import { isParent } from "./factories";
import type { AutoLayout, Document, FrameNode, NodeId, SceneNode } from "./types";
import { MIN_SIZE } from "./types";
import { activePage, getNode } from "./scene";

function visibleChildren(doc: Document, ids: NodeId[]): SceneNode[] {
  const out: SceneNode[] = [];
  for (const id of ids) {
    const n = getNode(doc, id);
    if (n && n.visible) out.push(n);
  }
  return out;
}

function hugSize(node: SceneNode, axis: "x" | "y"): number {
  return axis === "x" ? Math.max(MIN_SIZE, node.width) : Math.max(MIN_SIZE, node.height);
}

/**
 * Resolve auto-layout bottom-up (hug) then top-down (fill). Mutates nodes in place.
 * Returns true if any geometry changed.
 */
export function resolveAutoLayout(doc: Document): boolean {
  let changed = false;
  const page = activePage(doc);

  const hugPass = (id: NodeId) => {
    const node = getNode(doc, id);
    if (!node || !isParent(node)) return;
    for (const cid of node.children) hugPass(cid);
    if ((node.type === "frame" || node.type === "component") && node.layout) {
      if (applyHug(doc, node, node.layout)) changed = true;
    }
  };

  const fillPass = (id: NodeId, parentLayout: AutoLayout | null, parentInner: { w: number; h: number } | null) => {
    const node = getNode(doc, id);
    if (!node) return;
    if (parentLayout && parentInner && node.constraints) {
      // fill is expressed via layout.childSizing on the parent, applied in applyFill
    }
    if ((node.type === "frame" || node.type === "component") && node.layout) {
      if (applyFillAndPlace(doc, node, node.layout)) changed = true;
      const inner = {
        w: node.width - node.layout.padding.left - node.layout.padding.right,
        h: node.height - node.layout.padding.top - node.layout.padding.bottom,
      };
      for (const cid of node.children) fillPass(cid, node.layout, inner);
    } else if (isParent(node)) {
      for (const cid of node.children) fillPass(cid, null, null);
    }
  };

  for (const id of page.children) hugPass(id);
  for (const id of page.children) fillPass(id, null, null);
  return changed;
}

function applyHug(doc: Document, frame: FrameNode | { type: "component"; children: NodeId[]; layout: AutoLayout | null; width: number; height: number }, layout: AutoLayout): boolean {
  const kids = visibleChildren(doc, frame.children);
  const pad = layout.padding;
  const gap = layout.gap;
  let changed = false;

  if (layout.childSizing.horizontal === "hug" || layout.childSizing.vertical === "hug") {
    if (kids.length === 0) {
      const w = pad.left + pad.right;
      const h = pad.top + pad.bottom;
      if (layout.childSizing.horizontal === "hug" && frame.width !== Math.max(MIN_SIZE, w)) {
        frame.width = Math.max(MIN_SIZE, w);
        changed = true;
      }
      if (layout.childSizing.vertical === "hug" && frame.height !== Math.max(MIN_SIZE, h)) {
        frame.height = Math.max(MIN_SIZE, h);
        changed = true;
      }
      return changed;
    }

    if (layout.direction === "horizontal") {
      const contentW = kids.reduce((s, k) => s + hugSize(k, "x"), 0) + gap * Math.max(0, kids.length - 1);
      const contentH = kids.reduce((m, k) => Math.max(m, hugSize(k, "y")), 0);
      if (layout.childSizing.horizontal === "hug") {
        const w = contentW + pad.left + pad.right;
        if (frame.width !== Math.max(MIN_SIZE, w)) {
          frame.width = Math.max(MIN_SIZE, w);
          changed = true;
        }
      }
      if (layout.childSizing.vertical === "hug") {
        const h = contentH + pad.top + pad.bottom;
        if (frame.height !== Math.max(MIN_SIZE, h)) {
          frame.height = Math.max(MIN_SIZE, h);
          changed = true;
        }
      }
    } else {
      const contentH = kids.reduce((s, k) => s + hugSize(k, "y"), 0) + gap * Math.max(0, kids.length - 1);
      const contentW = kids.reduce((m, k) => Math.max(m, hugSize(k, "x")), 0);
      if (layout.childSizing.vertical === "hug") {
        const h = contentH + pad.top + pad.bottom;
        if (frame.height !== Math.max(MIN_SIZE, h)) {
          frame.height = Math.max(MIN_SIZE, h);
          changed = true;
        }
      }
      if (layout.childSizing.horizontal === "hug") {
        const w = contentW + pad.left + pad.right;
        if (frame.width !== Math.max(MIN_SIZE, w)) {
          frame.width = Math.max(MIN_SIZE, w);
          changed = true;
        }
      }
    }
  }
  return changed;
}

function applyFillAndPlace(
  doc: Document,
  frame: FrameNode | { children: NodeId[]; layout: AutoLayout | null; width: number; height: number; type: string },
  layout: AutoLayout,
): boolean {
  const kids = visibleChildren(doc, frame.children);
  const pad = layout.padding;
  const gap = layout.gap;
  const innerW = Math.max(0, frame.width - pad.left - pad.right);
  const innerH = Math.max(0, frame.height - pad.top - pad.bottom);
  let changed = false;

  const primaryFill = (k: SceneNode) =>
    layout.direction === "horizontal"
      ? k.constraints.horizontal === "left-right"
      : k.constraints.vertical === "top-bottom";

  const fills = kids.filter(primaryFill);
  const fixedSum = kids.reduce((s, k) => {
    if (primaryFill(k)) return s;
    return s + (layout.direction === "horizontal" ? k.width : k.height);
  }, 0);
  const leftover = (layout.direction === "horizontal" ? innerW : innerH) - fixedSum - gap * Math.max(0, kids.length - 1);
  const fillEach = fills.length > 0 ? Math.max(MIN_SIZE, leftover / fills.length) : 0;

  for (const k of kids) {
    if (primaryFill(k)) {
      if (layout.direction === "horizontal" && k.width !== fillEach) {
        k.width = fillEach;
        changed = true;
      }
      if (layout.direction === "vertical" && k.height !== fillEach) {
        k.height = fillEach;
        changed = true;
      }
    }
    if (layout.direction === "horizontal" && k.constraints.vertical === "top-bottom") {
      if (k.height !== innerH) {
        k.height = innerH;
        changed = true;
      }
    }
    if (layout.direction === "vertical" && k.constraints.horizontal === "left-right") {
      if (k.width !== innerW) {
        k.width = innerW;
        changed = true;
      }
    }
  }

  const sizes = kids.map((k) => (layout.direction === "horizontal" ? k.width : k.height));
  const total = sizes.reduce((s, n) => s + n, 0) + gap * Math.max(0, kids.length - 1);
  const free = (layout.direction === "horizontal" ? innerW : innerH) - total;

  let cursor = layout.direction === "horizontal" ? pad.left : pad.top;
  if (layout.primaryAlign === "center") cursor += free / 2;
  if (layout.primaryAlign === "end") cursor += free;
  const between = layout.primaryAlign === "space-between" && kids.length > 1 ? Math.max(0, ((layout.direction === "horizontal" ? innerW : innerH) - sizes.reduce((s, n) => s + n, 0)) / (kids.length - 1)) : gap;

  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (!k) continue;
    const size = sizes[i] ?? 0;
    if (layout.direction === "horizontal") {
      const y = placeCounter(pad.top, innerH, k.height, layout.counterAlign);
      if (k.x !== cursor || k.y !== y || k.rotation !== 0) {
        k.x = cursor;
        k.y = y;
        k.rotation = 0;
        changed = true;
      }
      cursor += size + between;
    } else {
      const x = placeCounter(pad.left, innerW, k.width, layout.counterAlign);
      if (k.y !== cursor || k.x !== x || k.rotation !== 0) {
        k.y = cursor;
        k.x = x;
        k.rotation = 0;
        changed = true;
      }
      cursor += size + between;
    }
  }

  return changed;
}

function placeCounter(pad: number, inner: number, size: number, align: AutoLayout["counterAlign"]): number {
  if (align === "center") return pad + (inner - size) / 2;
  if (align === "end") return pad + inner - size;
  return pad;
}

/** Apply Figma-style constraints when a parent frame is resized. */
export function applyConstraints(
  child: SceneNode,
  prev: { width: number; height: number },
  next: { width: number; height: number },
): void {
  const dw = next.width - prev.width;
  const dh = next.height - prev.height;
  const sx = prev.width === 0 ? 1 : next.width / prev.width;
  const sy = prev.height === 0 ? 1 : next.height / prev.height;

  switch (child.constraints.horizontal) {
    case "left":
      break;
    case "right":
      child.x += dw;
      break;
    case "center":
      child.x += dw / 2;
      break;
    case "left-right":
      child.width = Math.max(MIN_SIZE, child.width + dw);
      break;
    case "scale":
      child.x *= sx;
      child.width = Math.max(MIN_SIZE, child.width * sx);
      break;
  }

  switch (child.constraints.vertical) {
    case "top":
      break;
    case "bottom":
      child.y += dh;
      break;
    case "center":
      child.y += dh / 2;
      break;
    case "top-bottom":
      child.height = Math.max(MIN_SIZE, child.height + dh);
      break;
    case "scale":
      child.y *= sy;
      child.height = Math.max(MIN_SIZE, child.height * sy);
      break;
  }
}

export function applyConstraintsRecursive(
  doc: Document,
  parentId: NodeId,
  prev: { width: number; height: number },
  next: { width: number; height: number },
): void {
  const parent = getNode(doc, parentId);
  if (!parent || !isParent(parent)) return;
  if ((parent.type === "frame" || parent.type === "component") && parent.layout) return;
  for (const cid of parent.children) {
    const child = getNode(doc, cid);
    if (!child) continue;
    const before = { width: child.width, height: child.height };
    applyConstraints(child, prev, next);
    if (isParent(child) && (child.width !== before.width || child.height !== before.height)) {
      applyConstraintsRecursive(doc, child.id, before, { width: child.width, height: child.height });
    }
  }
}
