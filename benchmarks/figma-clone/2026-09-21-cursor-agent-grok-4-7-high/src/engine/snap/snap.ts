import type { AABB } from "../geometry/bounds";

export type SnapLine = {
  axis: "x" | "y";
  at: number;
  start: number;
  end: number;
  label?: string;
};

type Guide = { axis: "x" | "y"; offset: number };

export function snapMove(args: {
  box: AABB;
  others: AABB[];
  guides: Guide[];
  threshold: number;
}): { dx: number; dy: number; lines: SnapLine[] } {
  const x = snapAxis(
    "x",
    [args.box.x, args.box.x + args.box.width / 2, args.box.x + args.box.width],
    collect("x", args.others, args.guides),
    args.threshold,
    args.box,
    args.others,
  );
  const y = snapAxis(
    "y",
    [args.box.y, args.box.y + args.box.height / 2, args.box.y + args.box.height],
    collect("y", args.others, args.guides),
    args.threshold,
    args.box,
    args.others,
  );
  return { dx: x.delta, dy: y.delta, lines: [...x.lines, ...y.lines] };
}

function collect(axis: "x" | "y", others: AABB[], guides: Guide[]): number[] {
  const values: number[] = [];
  for (const box of others) {
    if (axis === "x") values.push(box.x, box.x + box.width / 2, box.x + box.width);
    else values.push(box.y, box.y + box.height / 2, box.y + box.height);
  }
  for (const guide of guides) {
    if (guide.axis === axis) values.push(guide.offset);
  }
  return values;
}

function snapAxis(
  axis: "x" | "y",
  edges: number[],
  targets: number[],
  threshold: number,
  moving: AABB,
  others: AABB[],
): { delta: number; lines: SnapLine[] } {
  let best = threshold;
  let delta = 0;
  let at = 0;
  for (const edge of edges) {
    for (const target of targets) {
      const d = target - edge;
      if (Math.abs(d) <= best) {
        best = Math.abs(d);
        delta = d;
        at = target;
      }
    }
  }
  if (best >= threshold && delta === 0 && best === threshold) {
    return { delta: 0, lines: [] };
  }
  if (Math.abs(delta) > threshold) return { delta: 0, lines: [] };
  if (delta === 0 && best === threshold) return { delta: 0, lines: [] };

  const crossStart = axis === "x" ? Math.min(moving.y, ...others.map((o) => o.y)) : Math.min(moving.x, ...others.map((o) => o.x));
  const crossEnd =
    axis === "x"
      ? Math.max(moving.y + moving.height, ...others.map((o) => o.y + o.height))
      : Math.max(moving.x + moving.width, ...others.map((o) => o.x + o.width));
  const gap = nearestGap(axis, moving, others, delta);
  return {
    delta,
    lines: [
      {
        axis,
        at,
        start: Number.isFinite(crossStart) ? crossStart : 0,
        end: Number.isFinite(crossEnd) ? crossEnd : 0,
        label: gap ? `${Math.round(gap)}` : undefined,
      },
    ],
  };
}

function nearestGap(axis: "x" | "y", moving: AABB, others: AABB[], delta: number): number | null {
  const box =
    axis === "x"
      ? { ...moving, x: moving.x + delta }
      : { ...moving, y: moving.y + delta };
  let best: number | null = null;
  for (const other of others) {
    const overlap =
      axis === "x"
        ? intervalsOverlap(box.y, box.y + box.height, other.y, other.y + other.height)
        : intervalsOverlap(box.x, box.x + box.width, other.x, other.x + other.width);
    if (!overlap) continue;
    const gap =
      axis === "x"
        ? box.x >= other.x + other.width
          ? box.x - (other.x + other.width)
          : other.x >= box.x + box.width
            ? other.x - (box.x + box.width)
            : null
        : box.y >= other.y + other.height
          ? box.y - (other.y + other.height)
          : other.y >= box.y + box.height
            ? other.y - (box.y + box.height)
            : null;
    if (gap === null) continue;
    if (best === null || gap < best) best = gap;
  }
  return best;
}

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && a1 > b0;
}
