import type { ConstraintH, ConstraintV, GeometricNode } from "../types";

export type ConstraintBox = { x: number; y: number; width: number; height: number };

export function applyConstraints(
  child: Pick<GeometricNode, "x" | "y" | "width" | "height" | "constraintH" | "constraintV">,
  oldParent: { width: number; height: number },
  nextParent: { width: number; height: number },
): ConstraintBox {
  const x = axis(
    child.constraintH,
    child.x,
    child.width,
    oldParent.width,
    nextParent.width,
  );
  const y = axis(
    child.constraintV === "top"
      ? "left"
      : child.constraintV === "bottom"
        ? "right"
        : child.constraintV === "top-bottom"
          ? "left-right"
          : child.constraintV,
    child.y,
    child.height,
    oldParent.height,
    nextParent.height,
  );
  return { x: x.pos, y: y.pos, width: Math.max(1, x.size), height: Math.max(1, y.size) };
}

function axis(
  mode: ConstraintH | "left" | "right" | "center" | "scale" | "left-right",
  pos: number,
  size: number,
  oldParent: number,
  nextParent: number,
): { pos: number; size: number } {
  const safeOld = Math.max(oldParent, 0.0001);
  if (mode === "left") return { pos, size };
  if (mode === "right") {
    const trailing = oldParent - pos - size;
    return { pos: nextParent - trailing - size, size };
  }
  if (mode === "left-right") {
    const trailing = oldParent - pos - size;
    return { pos, size: nextParent - pos - trailing };
  }
  if (mode === "center") {
    const offset = pos + size / 2 - oldParent / 2;
    return { pos: nextParent / 2 + offset - size / 2, size };
  }
  const scale = nextParent / safeOld;
  return { pos: pos * scale, size: size * scale };
}

export function constraintLabel(h: ConstraintH, v: ConstraintV): string {
  return `${h} / ${v}`;
}
