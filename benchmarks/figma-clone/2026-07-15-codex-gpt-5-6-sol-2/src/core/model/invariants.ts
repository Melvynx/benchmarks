import {
  SCENE_SCHEMA_VERSION,
  type NodeId,
  type Paint,
  type SceneDocument,
  type SceneNode,
} from './types';
import { isContainerNode } from './traversal';

export type SceneInvariantCode =
  | 'schema-version'
  | 'node-key'
  | 'missing-node'
  | 'missing-parent'
  | 'invalid-parent'
  | 'parent-child-mismatch'
  | 'duplicate-child'
  | 'duplicate-root'
  | 'invalid-root'
  | 'cycle'
  | 'orphan'
  | 'invalid-number'
  | 'invalid-range'
  | 'invalid-gradient'
  | 'invalid-shape';

export interface SceneInvariantViolation {
  readonly code: SceneInvariantCode;
  readonly path: string;
  readonly message: string;
  readonly nodeId?: NodeId;
}

export class SceneInvariantError extends Error {
  readonly violations: readonly SceneInvariantViolation[];

  constructor(violations: readonly SceneInvariantViolation[]) {
    super(violations.map((violation) => violation.message).join('\n'));
    this.name = 'SceneInvariantError';
    this.violations = violations;
  }
}

function violation(
  code: SceneInvariantCode,
  path: string,
  message: string,
  nodeId?: NodeId,
): SceneInvariantViolation {
  return nodeId === undefined ? { code, path, message } : { code, path, message, nodeId };
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function validateColor(
  values: readonly number[],
  path: string,
  node: SceneNode,
): SceneInvariantViolation[] {
  if (values.every((value) => isFiniteNumber(value) && value >= 0 && value <= 1)) {
    return [];
  }
  return [
    violation('invalid-range', path, `Node ${node.id} has a color channel outside 0..1`, node.id),
  ];
}

function validatePaint(paint: Paint, path: string, node: SceneNode): SceneInvariantViolation[] {
  const issues = validateColor(
    paint.type === 'solid'
      ? [paint.color.r, paint.color.g, paint.color.b, paint.color.a]
      : paint.stops.flatMap((stop) => [stop.color.r, stop.color.g, stop.color.b, stop.color.a]),
    path,
    node,
  );
  if (paint.opacity < 0 || paint.opacity > 1 || !isFiniteNumber(paint.opacity)) {
    issues.push(
      violation(
        'invalid-range',
        `${path}.opacity`,
        `Paint opacity on ${node.id} is invalid`,
        node.id,
      ),
    );
  }
  if (paint.type === 'solid') {
    return issues;
  }

  const hasEnoughStops = paint.stops.length >= 2;
  const stopsAreOrdered = paint.stops.every(
    (stop, index) =>
      isFiniteNumber(stop.position) &&
      stop.position >= 0 &&
      stop.position <= 1 &&
      (index === 0 || stop.position >= (paint.stops[index - 1]?.position ?? 0)),
  );
  if (!hasEnoughStops || !stopsAreOrdered) {
    issues.push(
      violation(
        'invalid-gradient',
        `${path}.stops`,
        `Gradient on ${node.id} needs at least two ordered stops in 0..1`,
        node.id,
      ),
    );
  }
  return issues;
}

function validateNodeNumbers(node: SceneNode): SceneInvariantViolation[] {
  const issues: SceneInvariantViolation[] = [];
  const numbers = [node.x, node.y, node.width, node.height, node.rotation, node.opacity];
  if (!numbers.every(isFiniteNumber)) {
    issues.push(
      violation(
        'invalid-number',
        `nodes.${node.id}`,
        `Node ${node.id} contains a non-finite number`,
        node.id,
      ),
    );
  }
  if (node.width < 0 || node.height < 0 || node.opacity < 0 || node.opacity > 1) {
    issues.push(
      violation(
        'invalid-range',
        `nodes.${node.id}`,
        `Node ${node.id} has invalid dimensions or opacity`,
        node.id,
      ),
    );
  }
  const radii = [
    node.cornerRadii.topLeft,
    node.cornerRadii.topRight,
    node.cornerRadii.bottomRight,
    node.cornerRadii.bottomLeft,
  ];
  if (radii.some((radius) => !isFiniteNumber(radius) || radius < 0)) {
    issues.push(
      violation(
        'invalid-range',
        `nodes.${node.id}.cornerRadii`,
        `Node ${node.id} has an invalid corner radius`,
        node.id,
      ),
    );
  }
  const layoutLimits = [
    node.layoutItem.minWidth,
    node.layoutItem.maxWidth,
    node.layoutItem.minHeight,
    node.layoutItem.maxHeight,
  ].filter((value): value is number => value !== null);
  if (
    node.layoutItem.grow < 0 ||
    !isFiniteNumber(node.layoutItem.grow) ||
    layoutLimits.some((value) => value < 0 || !isFiniteNumber(value))
  ) {
    issues.push(
      violation(
        'invalid-range',
        `nodes.${node.id}.layoutItem`,
        `Node ${node.id} has invalid layout sizing`,
        node.id,
      ),
    );
  }
  return issues;
}

function validateNodeSpecifics(node: SceneNode): SceneInvariantViolation[] {
  const issues: SceneInvariantViolation[] = [];
  if (node.type === 'ellipse') {
    const validArc = node.arcStart >= 0 && node.arcEnd <= 360 && node.arcEnd >= node.arcStart;
    if (!validArc || node.innerRadius < 0 || node.innerRadius > 1) {
      issues.push(
        violation(
          'invalid-shape',
          `nodes.${node.id}`,
          `Ellipse ${node.id} has invalid arc values`,
          node.id,
        ),
      );
    }
  }
  if (node.type === 'polygon' && (!Number.isInteger(node.pointCount) || node.pointCount < 3)) {
    issues.push(
      violation(
        'invalid-shape',
        `nodes.${node.id}.pointCount`,
        `Polygon ${node.id} needs at least three points`,
        node.id,
      ),
    );
  }
  if (
    node.type === 'star' &&
    (!Number.isInteger(node.pointCount) ||
      node.pointCount < 3 ||
      node.innerRadius <= 0 ||
      node.innerRadius >= 1)
  ) {
    issues.push(
      violation(
        'invalid-shape',
        `nodes.${node.id}`,
        `Star ${node.id} has invalid geometry`,
        node.id,
      ),
    );
  }
  if (node.type === 'text') {
    const validTextMetrics =
      node.fontSize > 0 && node.lineHeight > 0 && node.fontWeight >= 100 && node.fontWeight <= 900;
    if (!validTextMetrics) {
      issues.push(
        violation(
          'invalid-range',
          `nodes.${node.id}`,
          `Text ${node.id} has invalid typography`,
          node.id,
        ),
      );
    }
  }
  if (node.type === 'line') {
    const endpointValues = [node.start.x, node.start.y, node.end.x, node.end.y];
    if (!endpointValues.every(isFiniteNumber)) {
      issues.push(
        violation(
          'invalid-number',
          `nodes.${node.id}`,
          `Line ${node.id} has invalid endpoints`,
          node.id,
        ),
      );
    }
  }
  if (node.type === 'image') {
    const sourceSizeIsValid = node.source.intrinsicWidth > 0 && node.source.intrinsicHeight > 0;
    const cropValues = [node.crop.x, node.crop.y, node.crop.width, node.crop.height];
    const cropIsValid =
      cropValues.every((value) => isFiniteNumber(value) && value >= 0 && value <= 1) &&
      node.crop.width > 0 &&
      node.crop.height > 0;
    if (!sourceSizeIsValid || !cropIsValid || node.source.uri.length === 0) {
      issues.push(
        violation(
          'invalid-range',
          `nodes.${node.id}`,
          `Image ${node.id} has invalid source or crop values`,
          node.id,
        ),
      );
    }
  }
  if (node.type === 'frame' && node.autoLayout !== null) {
    const { gap, counterAxisGap, padding } = node.autoLayout;
    if (
      [gap, counterAxisGap, padding.top, padding.right, padding.bottom, padding.left].some(
        (value) => !isFiniteNumber(value) || value < 0,
      )
    ) {
      issues.push(
        violation(
          'invalid-range',
          `nodes.${node.id}.autoLayout`,
          `Frame ${node.id} has invalid auto-layout spacing`,
          node.id,
        ),
      );
    }
  }
  return issues;
}

function validateNode(node: SceneNode): SceneInvariantViolation[] {
  const issues = [...validateNodeNumbers(node), ...validateNodeSpecifics(node)];
  node.fills.forEach((paint, index) => {
    issues.push(...validatePaint(paint, `nodes.${node.id}.fills.${index}`, node));
  });
  node.strokes.forEach((stroke, index) => {
    issues.push(...validatePaint(stroke.paint, `nodes.${node.id}.strokes.${index}.paint`, node));
    if (
      stroke.width < 0 ||
      !isFiniteNumber(stroke.width) ||
      stroke.miterLimit < 0 ||
      !isFiniteNumber(stroke.miterLimit) ||
      stroke.dash.some((value) => value < 0 || !isFiniteNumber(value))
    ) {
      issues.push(
        violation(
          'invalid-range',
          `nodes.${node.id}.strokes.${index}`,
          `Node ${node.id} has an invalid stroke`,
          node.id,
        ),
      );
    }
  });
  node.effects.forEach((effect, index) => {
    const path = `nodes.${node.id}.effects.${index}`;
    if (effect.type === 'drop-shadow' || effect.type === 'inner-shadow') {
      issues.push(
        ...validateColor(
          [effect.color.r, effect.color.g, effect.color.b, effect.color.a],
          `${path}.color`,
          node,
        ),
      );
      const values = [effect.offset.x, effect.offset.y, effect.blur, effect.spread];
      if (!values.every(isFiniteNumber) || effect.blur < 0) {
        issues.push(
          violation('invalid-range', path, `Node ${node.id} has an invalid shadow effect`, node.id),
        );
      }
    } else if (!isFiniteNumber(effect.radius) || effect.radius < 0) {
      issues.push(
        violation('invalid-range', path, `Node ${node.id} has an invalid blur effect`, node.id),
      );
    }
  });
  return issues;
}

function validateRoots(scene: SceneDocument): SceneInvariantViolation[] {
  const issues: SceneInvariantViolation[] = [];
  const roots = new Set<NodeId>();
  for (const [index, nodeId] of scene.rootIds.entries()) {
    if (roots.has(nodeId)) {
      issues.push(
        violation(
          'duplicate-root',
          `rootIds.${index}`,
          `Root ${nodeId} appears more than once`,
          nodeId,
        ),
      );
      continue;
    }
    roots.add(nodeId);
    const node = scene.nodes[nodeId];
    if (node === undefined) {
      issues.push(
        violation('missing-node', `rootIds.${index}`, `Root ${nodeId} does not exist`, nodeId),
      );
    } else if (node.parentId !== null) {
      issues.push(
        violation(
          'invalid-root',
          `rootIds.${index}`,
          `Root ${nodeId} has parent ${node.parentId}`,
          nodeId,
        ),
      );
    }
  }
  return issues;
}

function validateContainerLinks(scene: SceneDocument): SceneInvariantViolation[] {
  const issues: SceneInvariantViolation[] = [];
  for (const node of Object.values(scene.nodes)) {
    if (!isContainerNode(node)) {
      continue;
    }
    const childSet = new Set<NodeId>();
    for (const [index, childId] of node.childIds.entries()) {
      if (childSet.has(childId)) {
        issues.push(
          violation(
            'duplicate-child',
            `nodes.${node.id}.childIds.${index}`,
            `Container ${node.id} contains ${childId} twice`,
            node.id,
          ),
        );
        continue;
      }
      childSet.add(childId);
      const child = scene.nodes[childId];
      if (child === undefined) {
        issues.push(
          violation(
            'missing-node',
            `nodes.${node.id}.childIds.${index}`,
            `Child ${childId} does not exist`,
            node.id,
          ),
        );
      } else if (child.parentId !== node.id) {
        issues.push(
          violation(
            'parent-child-mismatch',
            `nodes.${node.id}.childIds.${index}`,
            `Child ${childId} does not point back to ${node.id}`,
            childId,
          ),
        );
      }
    }
  }
  return issues;
}

function validateParentLinks(scene: SceneDocument): SceneInvariantViolation[] {
  const issues: SceneInvariantViolation[] = [];
  for (const node of Object.values(scene.nodes)) {
    if (node.parentId === null) {
      if (!scene.rootIds.includes(node.id)) {
        issues.push(
          violation(
            'orphan',
            `nodes.${node.id}`,
            `Root-level node ${node.id} is absent from rootIds`,
            node.id,
          ),
        );
      }
      continue;
    }
    const parent = scene.nodes[node.parentId];
    if (parent === undefined) {
      issues.push(
        violation(
          'missing-parent',
          `nodes.${node.id}.parentId`,
          `Parent ${node.parentId} of ${node.id} does not exist`,
          node.id,
        ),
      );
    } else if (!isContainerNode(parent)) {
      issues.push(
        violation(
          'invalid-parent',
          `nodes.${node.id}.parentId`,
          `Parent ${node.parentId} cannot contain children`,
          node.id,
        ),
      );
    } else if (!parent.childIds.includes(node.id)) {
      issues.push(
        violation(
          'parent-child-mismatch',
          `nodes.${node.id}.parentId`,
          `Parent ${node.parentId} does not contain ${node.id}`,
          node.id,
        ),
      );
    }
  }
  return issues;
}

function validateReachability(scene: SceneDocument): SceneInvariantViolation[] {
  const issues: SceneInvariantViolation[] = [];
  const visited = new Set<NodeId>();
  const visiting = new Set<NodeId>();

  function visit(nodeId: NodeId): void {
    if (visiting.has(nodeId)) {
      issues.push(
        violation('cycle', `nodes.${nodeId}`, `Scene graph contains a cycle at ${nodeId}`, nodeId),
      );
      return;
    }
    if (visited.has(nodeId)) {
      return;
    }
    const node = scene.nodes[nodeId];
    if (node === undefined) {
      return;
    }
    visiting.add(nodeId);
    if (isContainerNode(node)) {
      node.childIds.forEach(visit);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  scene.rootIds.forEach(visit);
  const reachable = new Set(visited);
  for (const nodeId of Object.keys(scene.nodes)) {
    if (!visited.has(nodeId)) {
      visit(nodeId);
    }
    if (!reachable.has(nodeId)) {
      issues.push(
        violation(
          'orphan',
          `nodes.${nodeId}`,
          `Node ${nodeId} is unreachable from the document roots`,
          nodeId,
        ),
      );
    }
  }
  return issues;
}

export function validateSceneInvariants(scene: SceneDocument): readonly SceneInvariantViolation[] {
  const issues: SceneInvariantViolation[] = [];
  const schemaVersion: number = scene.schemaVersion;
  if (schemaVersion !== SCENE_SCHEMA_VERSION) {
    issues.push(
      violation('schema-version', 'schemaVersion', `Unsupported scene schema ${schemaVersion}`),
    );
  }
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    if (node.id !== nodeId) {
      issues.push(
        violation(
          'node-key',
          `nodes.${nodeId}`,
          `Node map key ${nodeId} differs from node id ${node.id}`,
          node.id,
        ),
      );
    }
    issues.push(...validateNode(node));
  }
  issues.push(...validateRoots(scene));
  issues.push(...validateContainerLinks(scene));
  issues.push(...validateParentLinks(scene));
  issues.push(...validateReachability(scene));
  return issues;
}

export function assertSceneInvariants(scene: SceneDocument): void {
  const violations = validateSceneInvariants(scene);
  if (violations.length > 0) {
    throw new SceneInvariantError(violations);
  }
}
