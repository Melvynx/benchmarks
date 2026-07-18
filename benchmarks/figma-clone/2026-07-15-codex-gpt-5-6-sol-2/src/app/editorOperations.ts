import { applyMatrixToVector, invertMatrix } from '@/core/geometry';
import { cloneSceneNode } from '@/core/model';

import type { EditorStore } from '@/editor/EditorStore';
import type { AlignmentAction } from '@/ui/panels';

export function alignEditorNodes(
  store: EditorStore,
  action: AlignmentAction,
  requestedNodeIds: readonly string[],
) {
  const snapshot = store.getSnapshot();
  const entries = requestedNodeIds.flatMap((nodeId) => {
    const node = snapshot.document.nodes[nodeId];
    const bounds = snapshot.runtime.getWorldBounds(nodeId);
    return node && bounds && !node.locked ? [{ node, bounds }] : [];
  });
  if (entries.length < 2) {
    store.addToast('Select at least two editable layers to align.', 'neutral');
    return;
  }

  const left = Math.min(...entries.map(({ bounds }) => bounds.minX));
  const right = Math.max(...entries.map(({ bounds }) => bounds.maxX));
  const top = Math.min(...entries.map(({ bounds }) => bounds.minY));
  const bottom = Math.max(...entries.map(({ bounds }) => bounds.maxY));
  const horizontalCenter = (left + right) / 2;
  const verticalCenter = (top + bottom) / 2;

  const nodes = entries.map(({ node, bounds }) => {
    let worldDelta = { x: 0, y: 0 };
    switch (action) {
      case 'align-left':
        worldDelta = { x: left - bounds.minX, y: 0 };
        break;
      case 'align-horizontal-center':
        worldDelta = { x: horizontalCenter - (bounds.minX + bounds.maxX) / 2, y: 0 };
        break;
      case 'align-right':
        worldDelta = { x: right - bounds.maxX, y: 0 };
        break;
      case 'align-top':
        worldDelta = { x: 0, y: top - bounds.minY };
        break;
      case 'align-vertical-center':
        worldDelta = { x: 0, y: verticalCenter - (bounds.minY + bounds.maxY) / 2 };
        break;
      case 'align-bottom':
        worldDelta = { x: 0, y: bottom - bounds.maxY };
        break;
    }
    const localDelta = applyMatrixToVector(
      invertMatrix(snapshot.runtime.getParentWorldMatrix(node.id)),
      worldDelta,
    );
    return cloneSceneNode({ ...node, x: node.x + localDelta.x, y: node.y + localDelta.y });
  });

  store.updateNodes(nodes, 'Align layers');
}
