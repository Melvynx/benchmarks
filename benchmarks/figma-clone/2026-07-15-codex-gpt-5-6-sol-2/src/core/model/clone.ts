import type { AutoLayoutSettings, Effect, Paint, SceneDocument, SceneNode, Stroke } from './types';

export function clonePaint(paint: Paint): Paint {
  switch (paint.type) {
    case 'solid':
      return { ...paint, color: { ...paint.color } };
    case 'linear-gradient':
      return {
        ...paint,
        start: { ...paint.start },
        end: { ...paint.end },
        stops: paint.stops.map((stop) => ({
          ...stop,
          color: { ...stop.color },
        })),
      };
    case 'radial-gradient':
      return {
        ...paint,
        center: { ...paint.center },
        radius: { ...paint.radius },
        focalPoint: { ...paint.focalPoint },
        stops: paint.stops.map((stop) => ({
          ...stop,
          color: { ...stop.color },
        })),
      };
  }
}

function cloneStroke(stroke: Stroke): Stroke {
  return {
    ...stroke,
    paint: clonePaint(stroke.paint),
    dash: [...stroke.dash],
  };
}

function cloneEffect(effect: Effect): Effect {
  switch (effect.type) {
    case 'drop-shadow':
    case 'inner-shadow':
      return {
        ...effect,
        color: { ...effect.color },
        offset: { ...effect.offset },
      };
    case 'layer-blur':
    case 'background-blur':
      return { ...effect };
  }
}

function cloneAutoLayout(layout: AutoLayoutSettings): AutoLayoutSettings {
  return { ...layout, padding: { ...layout.padding } };
}

function cloneCommonProperties<Node extends SceneNode>(node: Node): Node {
  return {
    ...node,
    cornerRadii: { ...node.cornerRadii },
    fills: node.fills.map(clonePaint),
    strokes: node.strokes.map(cloneStroke),
    effects: node.effects.map(cloneEffect),
    constraints: { ...node.constraints },
    layoutItem: { ...node.layoutItem },
  };
}

export function cloneSceneNode<Node extends SceneNode>(node: Node): Node;
export function cloneSceneNode(node: SceneNode): SceneNode {
  const commonClone = cloneCommonProperties(node);

  switch (commonClone.type) {
    case 'frame':
      return {
        ...commonClone,
        childIds: [...commonClone.childIds],
        autoLayout:
          commonClone.autoLayout === null ? null : cloneAutoLayout(commonClone.autoLayout),
      };
    case 'group':
      return { ...commonClone, childIds: [...commonClone.childIds] };
    case 'line':
      return {
        ...commonClone,
        start: { ...commonClone.start },
        end: { ...commonClone.end },
      };
    case 'image':
      return {
        ...commonClone,
        source: { ...commonClone.source },
        crop: { ...commonClone.crop },
      };
    case 'rectangle':
    case 'ellipse':
    case 'text':
    case 'polygon':
    case 'star':
      return { ...commonClone };
  }
}

export function cloneSceneDocument(scene: SceneDocument): SceneDocument {
  const nodes: Record<string, SceneNode> = {};
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    nodes[nodeId] = cloneSceneNode(node);
  }

  return {
    ...scene,
    nodes,
    rootIds: [...scene.rootIds],
    background: { ...scene.background },
  };
}

export function serializeScene(scene: SceneDocument): string {
  return JSON.stringify(scene);
}
