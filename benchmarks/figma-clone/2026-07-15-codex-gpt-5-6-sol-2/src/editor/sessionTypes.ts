export type Tool =
  | 'move'
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'star'
  | 'text'
  | 'hand';

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface SnapGuide {
  readonly axis: 'x' | 'y';
  readonly position: number;
  readonly start: number;
  readonly end: number;
  readonly label?: string;
}

export interface MarqueeSelection {
  readonly origin: CanvasPoint;
  readonly current: CanvasPoint;
}

export interface TransformPreview {
  readonly nodeIds: readonly string[];
  readonly kind: 'move' | 'resize' | 'rotate' | 'draw';
  readonly bounds?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly angle?: number;
}

export type InteractionState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'panning'; readonly origin: CanvasPoint }
  | { readonly kind: 'marquee'; readonly marquee: MarqueeSelection }
  | { readonly kind: 'transform'; readonly preview: TransformPreview }
  | { readonly kind: 'drawing'; readonly preview: TransformPreview }
  | { readonly kind: 'text-edit'; readonly nodeId: string };

export type SaveState =
  | { readonly status: 'saved'; readonly savedAt: number }
  | { readonly status: 'saving' }
  | { readonly status: 'error'; readonly message: string };

export type ToastTone = 'neutral' | 'success' | 'error';

export interface ToastMessage {
  readonly id: string;
  readonly message: string;
  readonly tone: ToastTone;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

export interface EditorSession {
  readonly activeTool: Tool;
  readonly camera: Camera;
  readonly viewport: ViewportSize;
  readonly selectedIds: ReadonlySet<string>;
  readonly hoveredId: string | null;
  readonly interaction: InteractionState;
  readonly snapGuides: readonly SnapGuide[];
  readonly isGridVisible: boolean;
  readonly areRulersVisible: boolean;
  readonly isSnappingEnabled: boolean;
  readonly isLeftPanelOpen: boolean;
  readonly isRightPanelOpen: boolean;
  readonly isCommandPaletteOpen: boolean;
  readonly saveState: SaveState;
  readonly cursorWorld: CanvasPoint;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 64;

export const DEFAULT_SESSION: EditorSession = {
  activeTool: 'move',
  camera: { x: 164, y: 110, zoom: 0.72 },
  viewport: { width: 0, height: 0 },
  selectedIds: new Set<string>(),
  hoveredId: null,
  interaction: { kind: 'idle' },
  snapGuides: [],
  isGridVisible: true,
  areRulersVisible: true,
  isSnappingEnabled: true,
  isLeftPanelOpen: true,
  isRightPanelOpen: true,
  isCommandPaletteOpen: false,
  saveState: { status: 'saved', savedAt: Date.now() },
  cursorWorld: { x: 0, y: 0 },
};
