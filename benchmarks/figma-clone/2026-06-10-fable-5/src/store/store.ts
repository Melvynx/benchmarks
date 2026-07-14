import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { Rect } from '../geometry/rect';
import type { NodeId, SceneDocument } from '../scene/types';
import { emptyDocument } from '../scene/types';
import { newId } from '../utils/id';

export type ToolId =
  | 'select'
  | 'hand'
  | 'frame'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'star'
  | 'text';

export interface Viewport {
  /** Screen position (CSS px) of the world origin. */
  panX: number;
  panY: number;
  zoom: number;
}

export interface DocMeta {
  id: string;
  name: string;
  updatedAt: number;
}

export interface SnapGuide {
  axis: 'x' | 'y';
  position: number;
  from: number;
  to: number;
}

export interface SnapLabel {
  x: number;
  y: number;
  text: string;
}

export interface SnapVisuals {
  guides: SnapGuide[];
  labels: SnapLabel[];
}

export type GestureKind = 'move' | 'resize' | 'rotate' | 'draw' | 'text-edit' | 'panel' | null;

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error';
}

export interface EditorState {
  doc: SceneDocument;
  /** Monotonic counter; bumped on every document change (incl. transient gesture frames). */
  docVersion: number;
  docId: string;
  docName: string;
  docList: DocMeta[];
  selection: NodeId[];
  hoverId: NodeId | null;
  tool: ToolId;
  viewport: Viewport;
  editingTextId: NodeId | null;
  marquee: Rect | null;
  snap: SnapVisuals | null;
  activeGesture: GestureKind;
  rotationHud: number | null;
  dropTargetId: NodeId | null;
  /** Alt is held: overlay shows measured distances to the hovered node. */
  measuring: boolean;
  spacePanning: boolean;
  showRulers: boolean;
  showGrid: boolean;
  panelsVisible: boolean;
  paletteOpen: boolean;
  recentColors: string[];
  historyVersion: number;
  fontsTick: number;
  imagesTick: number;
  toasts: Toast[];
}

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 64;

function initialState(): EditorState {
  return {
    doc: emptyDocument(),
    docVersion: 0,
    docId: newId(),
    docName: 'Untitled',
    docList: [],
    selection: [],
    hoverId: null,
    tool: 'select',
    viewport: { panX: 0, panY: 0, zoom: 1 },
    editingTextId: null,
    marquee: null,
    snap: null,
    activeGesture: null,
    rotationHud: null,
    dropTargetId: null,
    measuring: false,
    spacePanning: false,
    showRulers: true,
    showGrid: true,
    panelsVisible: true,
    paletteOpen: false,
    recentColors: [],
    historyVersion: 0,
    fontsTick: 0,
    imagesTick: 0,
    toasts: [],
  };
}

export const editorStore = createStore<EditorState>(initialState);

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useStore(editorStore, selector);
}

// ---------------------------------------------------------------------------
// Small UI-state actions (document mutations live in docEdit.ts / actions.ts)
// ---------------------------------------------------------------------------

export function setTool(tool: ToolId): void {
  editorStore.setState({ tool, hoverId: null });
}

export function setSelection(ids: NodeId[]): void {
  editorStore.setState({ selection: ids });
}

export function setHover(id: NodeId | null): void {
  if (editorStore.getState().hoverId !== id) editorStore.setState({ hoverId: id });
}

export function togglePanels(): void {
  editorStore.setState((s) => ({ panelsVisible: !s.panelsVisible }));
}

export function toggleRulers(): void {
  editorStore.setState((s) => ({ showRulers: !s.showRulers }));
}

export function toggleGrid(): void {
  editorStore.setState((s) => ({ showGrid: !s.showGrid }));
}

export function setPaletteOpen(open: boolean): void {
  editorStore.setState({ paletteOpen: open });
}

let toastCounter = 0;

export function pushToast(message: string, kind: Toast['kind'] = 'info'): void {
  const id = ++toastCounter;
  editorStore.setState((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
  setTimeout(() => {
    editorStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }, 2600);
}

const MAX_RECENT_COLORS = 14;

export function addRecentColor(hex: string): void {
  editorStore.setState((s) => {
    const next = [hex, ...s.recentColors.filter((c) => c !== hex)].slice(0, MAX_RECENT_COLORS);
    return { recentColors: next };
  });
}

export function bumpFontsTick(): void {
  editorStore.setState((s) => ({ fontsTick: s.fontsTick + 1, docVersion: s.docVersion + 1 }));
}

export function bumpImagesTick(): void {
  editorStore.setState((s) => ({ imagesTick: s.imagesTick + 1, docVersion: s.docVersion + 1 }));
}
