import type { Box, Vec } from "./matrix";

export type HandleId = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const HANDLES: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function handles(): HandleId[] {
  return HANDLES;
}

function moves(handle: HandleId): { left: boolean; right: boolean; top: boolean; bottom: boolean } {
  return {
    left: handle.includes("w"),
    right: handle.includes("e"),
    top: handle.includes("n"),
    bottom: handle.includes("s"),
  };
}

function anchorLocal(
  handle: HandleId,
  width: number,
  height: number,
  alt: boolean,
): Vec {
  if (alt) return { x: width / 2, y: height / 2 };
  const midX = width / 2;
  const midY = height / 2;
  switch (handle) {
    case "e":
      return { x: 0, y: midY };
    case "w":
      return { x: width, y: midY };
    case "n":
      return { x: midX, y: height };
    case "s":
      return { x: midX, y: 0 };
    case "ne":
      return { x: 0, y: height };
    case "nw":
      return { x: width, y: height };
    case "se":
      return { x: 0, y: 0 };
    case "sw":
      return { x: width, y: 0 };
  }
}

function toLocal(start: Box, point: Vec): Vec {
  const rad = (start.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = start.x + start.width / 2;
  const cy = start.y + start.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  return {
    x: dx * cos + dy * sin + start.width / 2,
    y: -dx * sin + dy * cos + start.height / 2,
  };
}

function parentOfAnchor(anchorParent: Vec, anchor: Vec, width: number, height: number, rotation: number): Box {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const lx = anchor.x - width / 2;
  const ly = anchor.y - height / 2;
  const rx = lx * cos - ly * sin;
  const ry = lx * sin + ly * cos;
  const cx = anchorParent.x - rx;
  const cy = anchorParent.y - ry;
  return { x: cx - width / 2, y: cy - height / 2, width, height, rotation };
}

export function resizeBox(args: {
  start: Box;
  handle: HandleId;
  pointer: Vec;
  shift: boolean;
  alt: boolean;
  min?: number;
}): Box {
  const min = args.min ?? 1;
  const { start, handle, alt, shift } = args;
  const side = moves(handle);
  const resizesX = side.left || side.right;
  const resizesY = side.top || side.bottom;
  const local = toLocal(start, args.pointer);

  let rawW = start.width;
  let rawH = start.height;
  if (alt) {
    if (resizesX) rawW = Math.abs(local.x - start.width / 2) * 2;
    if (resizesY) rawH = Math.abs(local.y - start.height / 2) * 2;
  } else {
    if (side.right) rawW = local.x;
    if (side.left) rawW = start.width - local.x;
    if (side.bottom) rawH = local.y;
    if (side.top) rawH = start.height - local.y;
  }

  if (shift) {
    const aspect = start.width / Math.max(start.height, 0.0001);
    if (resizesX && resizesY) {
      const sw = Math.abs(rawW);
      const sh = Math.abs(rawH);
      if (sw / aspect >= sh) rawH = (sw / aspect) * (rawH < 0 ? -1 : 1);
      else rawW = sh * aspect * (rawW < 0 ? -1 : 1);
    } else if (resizesX) {
      rawH = Math.abs(rawW) / aspect;
    } else if (resizesY) {
      rawW = Math.abs(rawH) * aspect;
    }
  }

  const flipX = resizesX && rawW < 0;
  const flipY = resizesY && rawH < 0;
  let newW = resizesX ? Math.max(min, Math.abs(rawW)) : start.width;
  let newH = resizesY ? Math.max(min, Math.abs(rawH)) : start.height;
  if (shift && resizesX && !resizesY) newH = Math.max(min, Math.abs(rawH));
  if (shift && resizesY && !resizesX) newW = Math.max(min, Math.abs(rawW));

  const fixed = anchorLocal(handle, start.width, start.height, alt);
  const rad = (start.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = start.x + start.width / 2;
  const cy = start.y + start.height / 2;
  const lx = fixed.x - start.width / 2;
  const ly = fixed.y - start.height / 2;
  const anchorParent = {
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  };

  let anchor = anchorLocal(handle, newW, newH, alt);
  if (!alt && flipX) anchor = { ...anchor, x: newW - anchor.x };
  if (!alt && flipY) anchor = { ...anchor, y: newH - anchor.y };
  if (alt) anchor = { x: newW / 2, y: newH / 2 };

  return parentOfAnchor(anchorParent, anchor, newW, newH, start.rotation);
}

export function handleCursor(handle: HandleId, rotation: number): string {
  const base: Record<HandleId, number> = {
    n: 0,
    s: 0,
    e: 90,
    w: 90,
    ne: 45,
    sw: 45,
    nw: 135,
    se: 135,
  };
  const angle = (((base[handle] + rotation) % 180) + 180) % 180;
  const idx = Math.round(angle / 45) % 4;
  return ["ns-resize", "nesw-resize", "ew-resize", "nwse-resize"][idx] ?? "nwse-resize";
}
