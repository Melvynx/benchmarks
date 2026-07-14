import type { AppState } from './types';
import type { Document, NodeId, SceneNode } from '../core/scene';
import { unionWorldAABB } from '../core/scene';

export const selectDoc = (s: AppState): Document => s.doc;
export const selectSelection = (s: AppState): NodeId[] => s.selection;
export const selectTool = (s: AppState): AppState['tool'] => s.tool;
export const selectViewport = (s: AppState): AppState['viewport'] => s.viewport;
export const selectTransient = (s: AppState): AppState['transient'] => s.transient;

export const selectSelectedNodes = (s: AppState): SceneNode[] =>
  s.selection.map((id) => s.doc.nodes[id]).filter((n): n is SceneNode => !!n);

export const selectSelectionBounds = (s: AppState) =>
  unionWorldAABB(s.doc, s.selection);
