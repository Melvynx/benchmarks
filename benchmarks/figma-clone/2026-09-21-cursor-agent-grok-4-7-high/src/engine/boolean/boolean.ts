import polygonClipping, { type MultiPolygon, type Pair, type Polygon } from "polygon-clipping";
import { apply, type Matrix } from "../geometry/matrix";
import { flatten, polygonLocal, starLocal } from "../geometry/hit";
import { createId } from "../ids";
import type { GeometricNode, VectorNode, VectorPoint } from "../types";
import type { Geom } from "../layout/layout";

export type BoolOp = "union" | "subtract" | "intersect" | "exclude";

export function booleanVector(
  items: { node: GeometricNode; matrix: Matrix; geom: Geom }[],
  op: BoolOp,
): VectorNode | null {
  const polys = items.map((item) => toPolygon(item.node, item.matrix, item.geom)).filter((poly) => poly.length > 0);
  if (polys.length < 2) return null;
  let acc = polys[0];
  if (!acc) return null;
  for (let i = 1; i < polys.length; i += 1) {
    const next = polys[i];
    if (!next) continue;
    if (op === "union") acc = polygonClipping.union(acc, next);
    else if (op === "subtract") acc = polygonClipping.difference(acc, next);
    else if (op === "intersect") acc = polygonClipping.intersection(acc, next);
    else acc = polygonClipping.xor(acc, next);
  }
  return multiToVector(acc);
}

function toPolygon(node: GeometricNode, matrix: Matrix, geom: Geom): MultiPolygon {
  let local: { x: number; y: number }[] = [];
  if (node.type === "ellipse") {
    local = Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2;
      return { x: geom.width / 2 + (Math.cos(a) * geom.width) / 2, y: geom.height / 2 + (Math.sin(a) * geom.height) / 2 };
    });
  } else if (node.type === "polygon") local = polygonLocal(node.sides, geom.width, geom.height);
  else if (node.type === "star") local = starLocal(node.points, node.innerRatio, geom.width, geom.height);
  else if (node.type === "vector") {
    const contour = node.contours[0];
    local = contour ? flatten(contour.points) : [];
  } else if (node.type !== "line" && node.type !== "text" && node.type !== "group") {
    local = [
      { x: 0, y: 0 },
      { x: geom.width, y: 0 },
      { x: geom.width, y: geom.height },
      { x: 0, y: geom.height },
    ];
  }
  if (local.length < 3) return [];
  const ring: Pair[] = local.map((p) => {
    const w = apply(matrix, p.x, p.y);
    return [w.x, w.y];
  });
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([first[0], first[1]]);
  return [[ring]];
}

function multiToVector(multi: MultiPolygon): VectorNode | null {
  const points: { x: number; y: number }[] = [];
  for (const polygon of multi) {
    for (const ring of polygon) {
      for (const pair of ring) points.push({ x: pair[0], y: pair[1] });
    }
  }
  if (points.length < 3) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const contours = multi
    .map((polygon: Polygon) => {
      const ring = polygon[0];
      if (!ring || ring.length < 4) return null;
      const unique = ring.slice(0, -1);
      const pts: VectorPoint[] = unique.map((pair) => ({
        id: createId("pt"),
        x: pair[0] - minX,
        y: pair[1] - minY,
        handleIn: null,
        handleOut: null,
      }));
      return { points: pts };
    })
    .filter((contour): contour is { points: VectorPoint[] } => !!contour);
  if (!contours.length) return null;
  return {
    type: "vector",
    id: createId("vector"),
    name: "Boolean",
    parentId: null,
    childIds: [],
    visible: true,
    locked: false,
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    rotation: 0,
    opacity: 1,
    cornerRadius: [0, 0, 0, 0],
    fills: itemsFill(multi),
    strokes: [],
    effects: [],
    constraintH: "left",
    constraintV: "top",
    layoutSizingH: "fixed",
    layoutSizingV: "fixed",
    layoutPositioning: "auto",
    fillStyleId: null,
    textStyleId: null,
    prototypeTargetId: null,
    masterNodeId: null,
    overriddenKeys: [],
    closed: true,
    contours,
  };
}

function itemsFill(_multi: MultiPolygon): VectorNode["fills"] {
  return [
    {
      id: createId("fill"),
      type: "solid",
      color: { r: 92, g: 124, b: 255, a: 1 },
      opacity: 1,
      visible: true,
    },
  ];
}
