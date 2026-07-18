import { cloneSceneNode } from '@/core/model/clone';

import { layoutFrame } from './layoutFrame';

import type { SceneDocument, SceneNode } from '@/core/model/types';
import type { ChildLayoutFrame, SizeConstraint } from './types';

const NATURAL_SIZE: SizeConstraint = { width: null, height: null };

function applyConstraint(node: SceneNode, constraint: SizeConstraint): SceneNode {
  if (constraint.width === null && constraint.height === null) return node;
  return cloneSceneNode({
    ...node,
    width: constraint.width ?? node.width,
    height: constraint.height ?? node.height,
  });
}

class AutoLayoutResolver {
  readonly #source: SceneDocument;
  readonly #nodes: Record<string, SceneNode>;

  constructor(document: SceneDocument) {
    this.#source = document;
    this.#nodes = { ...document.nodes };
  }

  resolve(): SceneDocument {
    for (const rootId of this.#source.rootIds) this.#resolveNode(rootId, NATURAL_SIZE);
    return { ...this.#source, nodes: this.#nodes };
  }

  #resolveNode(id: string, constraint: SizeConstraint): SceneNode | null {
    const sourceNode = this.#source.nodes[id];
    if (!sourceNode) return null;

    if (sourceNode.type === 'frame' && sourceNode.autoLayout) {
      return this.#resolveLayoutFrame(sourceNode, constraint);
    }

    const node = applyConstraint(sourceNode, constraint);
    this.#nodes[id] = node;
    if (node.type === 'frame' || node.type === 'group') {
      for (const childId of node.childIds) this.#resolveNode(childId, NATURAL_SIZE);
    }
    return node;
  }

  #resolveLayoutFrame(
    frame: Extract<SceneNode, { type: 'frame' }>,
    constraint: SizeConstraint,
  ): SceneNode {
    const naturalChildren = frame.childIds
      .map((childId) => this.#resolveNode(childId, NATURAL_SIZE))
      .filter((child): child is SceneNode => child !== null);
    const result = layoutFrame(frame, naturalChildren, constraint);
    this.#nodes[frame.id] = result.frame;

    for (const childFrame of result.children) this.#applyChildFrame(childFrame);
    return result.frame;
  }

  #applyChildFrame(childFrame: ChildLayoutFrame) {
    const child = this.#resolveNode(childFrame.id, {
      width: childFrame.width,
      height: childFrame.height,
    });
    if (!child) return;
    this.#nodes[child.id] = cloneSceneNode({ ...child, x: childFrame.x, y: childFrame.y });
  }
}

/**
 * Computes auto-layout geometry without changing the persisted scene document.
 * The returned document keeps document metadata and revision identity intact;
 * only the node record contains ephemeral, derived geometry.
 */
export function resolveAutoLayout(document: SceneDocument): SceneDocument {
  const hasAutoLayout = Object.values(document.nodes).some(
    (node) => node.type === 'frame' && node.autoLayout !== null,
  );
  if (!hasAutoLayout) return document;
  return new AutoLayoutResolver(document).resolve();
}
