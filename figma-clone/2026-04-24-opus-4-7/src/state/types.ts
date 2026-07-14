import type { Document, NodeId, SceneNode } from '../core/scene';
import type { Rect } from '../core/geometry/Rect';

export type ToolId =
  | 'select'
  | 'hand'
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'text'
  | 'image'
  | 'pen';

export interface Viewport {
  /** Page-local coordinates at the top-left of the canvas viewport (in "world" units). */
  x: number;
  y: number;
  zoom: number; // 1 = 100%
}

export interface SmartGuide {
  orientation: 'vertical' | 'horizontal';
  /** world coordinate (x for vertical, y for horizontal) */
  position: number;
  /** start and end along the perpendicular axis (for drawing the guide). */
  from: number;
  to: number;
}

export interface SpacingBadge {
  /** world-space coordinates of the badge center */
  x: number;
  y: number;
  value: number;
  orientation: 'vertical' | 'horizontal';
}

export interface DragGuideState {
  guides: SmartGuide[];
  badges: SpacingBadge[];
}

export interface ResizeAnchor {
  ax: -1 | 0 | 1;
  ay: -1 | 0 | 1;
}

export interface TransientState {
  /** The node being live-edited as text. */
  editingTextId: NodeId | null;
  /** Marquee selection box (world coords). */
  marquee: Rect | null;
  /** The node currently under the pointer. */
  hoverId: NodeId | null;
  /** Smart guides + spacing badges rendered this frame. */
  guides: DragGuideState;
  /** True while user holds space or middle-mouse for panning. */
  isPanning: boolean;
  /** Active tool can be switched temporarily via hotkey. */
  tempTool: ToolId | null;
  /** Pending image source (used when selecting area with image tool). */
  pendingImage: { src: string; naturalWidth: number; naturalHeight: number } | null;
}

export interface AppState {
  doc: Document;

  selection: NodeId[];
  tool: ToolId;
  previousTool: ToolId;

  viewport: Viewport;

  transient: TransientState;

  clipboard: SceneNode[] | null;
  fileName: string;

  showGrid: boolean;
  showRulers: boolean;
  showUI: boolean;

  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  /** History counters for UI (updated via subscribe). */
  historyUndoCount: number;
  historyRedoCount: number;
}
