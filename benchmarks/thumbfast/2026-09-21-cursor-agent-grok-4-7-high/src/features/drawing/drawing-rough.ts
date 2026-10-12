import type { DrawingObject, Point } from "./drawing.schema";

export function roughRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: string,
) {
  const rand = rng(hashString(seed));
  const wobble = Math.min(width, height, 18) * 0.035 + 1.2;
  const jitter = () => (rand() - 0.5) * wobble;
  const point = (px: number, py: number): Point => ({
    x: px + jitter(),
    y: py + jitter(),
  });
  const topLeft = point(x, y);
  const topRight = point(x + width, y);
  const bottomRight = point(x + width, y + height);
  const bottomLeft = point(x, y + height);
  return `M ${pair(topLeft)} Q ${pair(mid(topLeft, topRight, jitter))} ${pair(topRight)} Q ${pair(mid(topRight, bottomRight, jitter))} ${pair(bottomRight)} Q ${pair(mid(bottomRight, bottomLeft, jitter))} ${pair(bottomLeft)} Q ${pair(mid(bottomLeft, topLeft, jitter))} ${pair(topLeft)}`;
}

export function roughEllipsePath(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: string,
) {
  const rand = rng(hashString(`${seed}:ellipse`));
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const wobble = Math.min(rx, ry, 16) * 0.04 + 0.8;
  const j = () => (rand() - 0.5) * wobble;
  const k = 0.5522847498;
  const p = (px: number, py: number) => ({ x: px + j(), y: py + j() });
  const right = p(cx + rx, cy);
  const bottom = p(cx, cy + ry);
  const left = p(cx - rx, cy);
  const top = p(cx, cy - ry);
  return [
    `M ${pair(right)}`,
    `C ${pair(p(cx + rx, cy + ry * k))} ${pair(p(cx + rx * k, cy + ry))} ${pair(bottom)}`,
    `C ${pair(p(cx - rx * k, cy + ry))} ${pair(p(cx - rx, cy + ry * k))} ${pair(left)}`,
    `C ${pair(p(cx - rx, cy - ry * k))} ${pair(p(cx - rx * k, cy - ry))} ${pair(top)}`,
    `C ${pair(p(cx + rx * k, cy - ry))} ${pair(p(cx + rx, cy - ry * k))} ${pair(right)}`,
  ].join(" ");
}

export function arrowGeometry(object: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const y = object.y + object.height / 2;
  const start = object.x + 2;
  const end = object.x + Math.max(8, object.width) - 2;
  const head = Math.min(26, Math.max(10, object.width * 0.18));
  const wing = Math.min(14, Math.max(6, object.height * 0.28));
  return {
    y,
    shaft: `M ${start} ${y} L ${end - head * 0.72} ${y}`,
    head: `M ${end} ${y} L ${end - head} ${y - wing} M ${end} ${y} L ${end - head} ${y + wing}`,
  };
}

export function personGeometry(object: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const headRadius = Math.min(object.width * 0.2, object.height * 0.16);
  const cx = object.x + object.width / 2;
  const headCy = object.y + headRadius + object.height * 0.08;
  const shoulderY = headCy + headRadius * 0.85;
  const bodyBottom = object.y + object.height * 0.78;
  const left = object.x + object.width * 0.12;
  const right = object.x + object.width * 0.88;
  return {
    cx,
    headCy,
    headRadius,
    shoulders: `M ${left} ${bodyBottom} Q ${object.x + object.width * 0.08} ${shoulderY} ${cx} ${shoulderY + headRadius * 0.15} Q ${object.x + object.width * 0.92} ${shoulderY} ${right} ${bodyBottom} Z`,
    labelY: object.y + object.height * 0.9,
  };
}

export function pencilPolyline(object: Extract<DrawingObject, { type: "pencil" }>) {
  return object.points
    .map((point, index) => {
      const x = object.x + point.x * object.width;
      const y = object.y + point.y * object.height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function mid(a: Point, b: Point, jitter: () => number): Point {
  return {
    x: (a.x + b.x) / 2 + jitter(),
    y: (a.y + b.y) / 2 + jitter(),
  };
}

function pair(point: Point) {
  return `${round(point.x)} ${round(point.y)}`;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 16807) + 1) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
