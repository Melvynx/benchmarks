import type { DraftDoc } from '../../scene/draft';
import { getN } from '../../scene/draft';
import type { NodeId, SceneNode } from '../../scene/types';
import { beginGesture, editDoc, endGesture, updateGesture } from '../../store/docEdit';
import { editorStore, useEditor } from '../../store/store';

/** Selected node objects (re-renders on doc/selection changes). */
export function useSelectedNodes(): SceneNode[] {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const nodes: SceneNode[] = [];
  for (const id of selection) {
    const node = doc.nodes[id];
    if (node) nodes.push(node);
  }
  return nodes;
}

/** Common value across nodes, or null when they disagree ("Mixed"). */
export function sharedValue<T, N extends SceneNode = SceneNode>(
  nodes: readonly N[],
  get: (n: N) => T | undefined,
): T | null {
  let value: T | undefined;
  let found = false;
  for (const node of nodes) {
    const v = get(node);
    if (v === undefined) continue;
    if (!found) {
      value = v;
      found = true;
    } else if (!deepEq(value, v)) {
      return null;
    }
  }
  return found ? (value as T) : null;
}

function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Run a draft mutation over every selected node. */
export function applyToSelection(d: DraftDoc, fn: (d: DraftDoc, node: SceneNode) => void): void {
  for (const id of editorStore.getState().selection) {
    const node = getN(d, id);
    if (node) fn(d, node);
  }
}

export interface FieldHandlers {
  onChange: (value: number, commit: boolean) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}

/**
 * Wire a NumberInput to the edit pipeline: typed commits become merged
 * history entries; label-scrubbing becomes one gesture → one undo step.
 */
export function numericField(
  label: string,
  mergeKey: string,
  apply: (d: DraftDoc, value: number) => void,
): FieldHandlers {
  return {
    onChange: (value, commit) => {
      if (commit) editDoc(label, (d) => apply(d, value), { mergeKey });
      else updateGesture((d) => apply(d, value));
    },
    onScrubStart: () => beginGesture('panel'),
    onScrubEnd: () => endGesture(label),
  };
}

export function selectionIds(): NodeId[] {
  return editorStore.getState().selection;
}
