import { decomposeToNode } from '../geometry/mat2d';
import { addNode, cloneSubtree } from '../scene/draft';
import { worldMatrix } from '../scene/nodeGeometry';
import { paintOrderIndex, topLevelSelection } from '../scene/traversal';
import type { NodeId, SceneDocument, SceneNode } from '../scene/types';
import { childIdsOf } from '../scene/types';
import { sanitizeDocument } from '../persistence/serialization';
import { editDoc } from './docEdit';
import { editorStore, pushToast } from './store';

export const CLIPBOARD_SENTINEL = '__fable5_clipboard__';

interface ClipboardPayload {
  kind: typeof CLIPBOARD_SENTINEL;
  /** Roots in paint order; coordinates already converted to world space. */
  rootIds: NodeId[];
  nodes: SceneNode[];
}

let internalClipboard: ClipboardPayload | null = null;

function buildPayload(): ClipboardPayload | null {
  const state = editorStore.getState();
  const doc = state.doc;
  const order = paintOrderIndex(doc);
  const roots = topLevelSelection(doc, state.selection).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  if (roots.length === 0) return null;

  const nodes: SceneNode[] = [];
  const collect = (id: NodeId): void => {
    const node = doc.nodes[id];
    if (!node) return;
    nodes.push(structuredClone(node));
    for (const childId of childIdsOf(node)) collect(childId);
  };
  for (const id of roots) collect(id);

  // Rebase each root into world coordinates so pasting anywhere is exact.
  for (const node of nodes) {
    if (!roots.includes(node.id)) continue;
    const world = worldMatrix(doc, node.id);
    const placed = decomposeToNode(world, node.width, node.height);
    node.x = placed.x;
    node.y = placed.y;
    node.rotation = placed.rotation;
    node.parentId = null;
  }
  return { kind: CLIPBOARD_SENTINEL, rootIds: roots, nodes };
}

export function copySelection(): boolean {
  const payload = buildPayload();
  if (!payload) return false;
  internalClipboard = payload;
  // Mirror to the system clipboard so copy/paste works across tabs/documents.
  navigator.clipboard?.writeText(JSON.stringify(payload)).catch(() => undefined);
  return true;
}

export function cutSelection(deleteSelection: () => void): void {
  if (copySelection()) deleteSelection();
}

export function parseClipboardText(text: string): ClipboardPayload | null {
  if (!text.includes(CLIPBOARD_SENTINEL)) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as ClipboardPayload).kind === CLIPBOARD_SENTINEL &&
      Array.isArray((parsed as ClipboardPayload).nodes)
    ) {
      return parsed as ClipboardPayload;
    }
  } catch {
    return null;
  }
  return null;
}

const PASTE_OFFSET = 16;

export function pastePayload(payload: ClipboardPayload | null = internalClipboard): void {
  if (!payload || payload.rootIds.length === 0) return;

  // Re-id through a sanitized temp document so malformed payloads can't corrupt the doc.
  const temp: SceneDocument = sanitizeDocument({
    nodes: Object.fromEntries(payload.nodes.map((n) => [n.id, n])),
    rootIds: payload.rootIds.filter((id) => payload.nodes.some((n) => n.id === id)),
  });

  const pastedIds: NodeId[] = [];
  editDoc(
    'Paste',
    (d) => {
      for (const rootId of temp.rootIds) {
        const cloned = cloneSubtree(temp, rootId);
        if (!cloned) continue;
        for (const node of cloned.nodes) {
          if (node.id !== cloned.rootId) d.nodes[node.id] = node;
        }
        const root = cloned.nodes.find((n) => n.id === cloned.rootId);
        if (!root) continue;
        root.x += PASTE_OFFSET;
        root.y += PASTE_OFFSET;
        addNode(d, root, null, -1);
        pastedIds.push(root.id);
      }
    },
    { select: pastedIds },
  );
  if (pastedIds.length > 0) pushToast(`Pasted ${pastedIds.length} layer${pastedIds.length > 1 ? 's' : ''}`);
}

export function hasInternalClipboard(): boolean {
  return internalClipboard !== null;
}
