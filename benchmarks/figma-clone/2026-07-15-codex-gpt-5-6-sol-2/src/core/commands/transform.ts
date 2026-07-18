import { getNode, type NodeId, type Point, type SceneDocument, type SceneNode } from '../model';

interface AffineMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

export interface NodeTransform {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}

const IDENTITY: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

function multiply(left: AffineMatrix, right: AffineMatrix): AffineMatrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function invert(matrix: AffineMatrix): AffineMatrix {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < Number.EPSILON) {
    throw new Error('Cannot invert a degenerate scene transform');
  }
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
}

function nodeLocalMatrix(node: Pick<SceneNode, 'x' | 'y' | 'rotation'>): AffineMatrix {
  const radians = node.rotation * DEGREES_TO_RADIANS;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    a: cosine,
    b: sine,
    c: -sine,
    d: cosine,
    e: node.x,
    f: node.y,
  };
}

function parentWorldMatrix(scene: SceneDocument, parentId: NodeId | null): AffineMatrix {
  return parentId === null ? IDENTITY : nodeWorldMatrix(scene, parentId);
}

function nodeWorldMatrix(scene: SceneDocument, nodeId: NodeId): AffineMatrix {
  const node = getNode(scene, nodeId);
  return multiply(parentWorldMatrix(scene, node.parentId), nodeLocalMatrix(node));
}

function normalizeDegrees(rotation: number): number {
  const wrapped = ((((rotation + 180) % 360) + 360) % 360) - 180;
  return Math.abs(wrapped) < 1e-10 ? 0 : wrapped;
}

function matrixToNodeTransform(matrix: AffineMatrix): NodeTransform {
  const rotation = Math.atan2(matrix.b, matrix.a);
  return {
    x: matrix.e,
    y: matrix.f,
    rotation: normalizeDegrees(rotation * RADIANS_TO_DEGREES),
  };
}

export function transformNodeToParent(
  scene: SceneDocument,
  nodeId: NodeId,
  newParentId: NodeId | null,
): NodeTransform {
  const targetParentMatrix = parentWorldMatrix(scene, newParentId);
  const localMatrix = multiply(invert(targetParentMatrix), nodeWorldMatrix(scene, nodeId));
  return matrixToNodeTransform(localMatrix);
}

export function transformNodeIntoSyntheticParent(
  scene: SceneDocument,
  nodeId: NodeId,
  syntheticParent: Pick<SceneNode, 'parentId' | 'x' | 'y' | 'width' | 'height' | 'rotation'>,
): NodeTransform {
  const syntheticWorld = multiply(
    parentWorldMatrix(scene, syntheticParent.parentId),
    nodeLocalMatrix(syntheticParent),
  );
  const localMatrix = multiply(invert(syntheticWorld), nodeWorldMatrix(scene, nodeId));
  return matrixToNodeTransform(localMatrix);
}

function transformPoint(matrix: AffineMatrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function getNodesBoundsInParent(scene: SceneDocument, nodeIds: readonly NodeId[]): Bounds {
  const points = nodeIds.flatMap((nodeId) => {
    const node = getNode(scene, nodeId);
    const matrix = nodeLocalMatrix(node);
    return [
      transformPoint(matrix, { x: 0, y: 0 }),
      transformPoint(matrix, { x: node.width, y: 0 }),
      transformPoint(matrix, { x: node.width, y: node.height }),
      transformPoint(matrix, { x: 0, y: node.height }),
    ];
  });
  if (points.length === 0) {
    throw new Error('Cannot calculate bounds for an empty node list');
  }
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minimumX = Math.min(...xValues);
  const maximumX = Math.max(...xValues);
  const minimumY = Math.min(...yValues);
  const maximumY = Math.max(...yValues);
  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX,
    height: maximumY - minimumY,
  };
}
