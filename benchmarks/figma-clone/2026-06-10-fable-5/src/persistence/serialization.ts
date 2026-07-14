import type { NodeId, NodeType, SceneDocument, SceneNode } from '../scene/types';
import { childIdsOf, isContainer } from '../scene/types';
import type { Viewport } from '../store/store';

export interface SerializedDocV1 {
  schema: 1;
  app: 'claude-fable-5';
  name: string;
  nodes: Record<NodeId, SceneNode>;
  rootIds: NodeId[];
  viewport?: Viewport;
}

export function serializeDocument(doc: SceneDocument, name: string, viewport?: Viewport): string {
  const payload: SerializedDocV1 = {
    schema: 1,
    app: 'claude-fable-5',
    name,
    nodes: doc.nodes,
    rootIds: doc.rootIds,
    ...(viewport ? { viewport } : {}),
  };
  return JSON.stringify(payload);
}

export interface DeserializedDocument {
  doc: SceneDocument;
  name: string;
  viewport: Viewport | null;
}

const KNOWN_TYPES: ReadonlySet<NodeType> = new Set([
  'frame',
  'group',
  'rect',
  'ellipse',
  'line',
  'polygon',
  'star',
  'text',
]);

export function deserializeDocument(json: string): DeserializedDocument {
  const raw: unknown = JSON.parse(json);
  if (typeof raw !== 'object' || raw === null) throw new Error('Not a document');
  const data = raw as Partial<SerializedDocV1>;
  if (data.schema !== 1 || typeof data.nodes !== 'object' || data.nodes === null || !Array.isArray(data.rootIds)) {
    throw new Error('Unsupported document format');
  }
  const doc = sanitizeDocument({ nodes: data.nodes as Record<NodeId, SceneNode>, rootIds: data.rootIds });
  const viewport =
    data.viewport &&
    Number.isFinite(data.viewport.panX) &&
    Number.isFinite(data.viewport.panY) &&
    Number.isFinite(data.viewport.zoom) &&
    data.viewport.zoom > 0
      ? data.viewport
      : null;
  return { doc, name: typeof data.name === 'string' && data.name.trim() !== '' ? data.name : 'Untitled', viewport };
}

function finite(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Defensive repair of a parsed document: drops unknown node types, fixes
 * orphaned parent links, prunes dangling child references, and coerces the
 * numeric fields gestures depend on. Imported files are untrusted input.
 */
export function sanitizeDocument(input: SceneDocument): SceneDocument {
  const nodes: Record<NodeId, SceneNode> = {};

  for (const [id, node] of Object.entries(input.nodes)) {
    if (!node || typeof node !== 'object') continue;
    if (!KNOWN_TYPES.has(node.type)) continue;
    if (typeof node.id !== 'string' || node.id !== id) continue;
    const repaired: SceneNode = {
      ...node,
      x: finite(node.x, 0),
      y: finite(node.y, 0),
      width: Math.max(0, finite(node.width, 1)),
      height: Math.max(0, finite(node.height, node.type === 'line' ? 0 : 1)),
      rotation: finite(node.rotation, 0),
      opacity: Math.min(1, Math.max(0, finite(node.opacity, 1))),
      strokeWeight: Math.max(0, finite(node.strokeWeight, 1)),
      fills: Array.isArray(node.fills) ? node.fills : [],
      strokes: Array.isArray(node.strokes) ? node.strokes : [],
      effects: Array.isArray(node.effects) ? node.effects : [],
    };
    nodes[id] = repaired;
  }

  // Rebuild containment: keep only children that exist and point back at us.
  for (const node of Object.values(nodes)) {
    if (!isContainer(node)) continue;
    node.childIds = childIdsOf(node).filter((childId) => {
      const child = nodes[childId];
      return child !== undefined && child.parentId === node.id;
    }) as NodeId[];
  }

  // Roots: declared roots that exist, plus orphans whose parent vanished.
  const claimed = new Set<NodeId>();
  for (const node of Object.values(nodes)) {
    for (const childId of childIdsOf(node)) claimed.add(childId);
  }
  const rootIds = input.rootIds.filter((id) => nodes[id] !== undefined && !claimed.has(id));
  const rootSet = new Set(rootIds);
  for (const node of Object.values(nodes)) {
    if (!claimed.has(node.id) && !rootSet.has(node.id)) {
      rootIds.push(node.id);
      rootSet.add(node.id);
    }
  }
  for (const id of rootIds) {
    const node = nodes[id];
    if (node && node.parentId !== null) nodes[id] = { ...node, parentId: null } as SceneNode;
  }

  return { nodes, rootIds };
}
