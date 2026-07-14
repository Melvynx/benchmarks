import {
  deleteSelection,
  duplicateSelection,
  frameSelection,
  groupSelection,
  nudgeSelection,
  reorderSelection,
  selectAll,
  ungroupSelection,
} from '../store/actions';
import { copySelection, cutSelection, parseClipboardText, pastePayload } from '../store/clipboard';
import { cancelGesture, isGestureActive, redo, undo } from '../store/docEdit';
import { insertImageFiles } from '../store/images';
import {
  editorStore,
  pushToast,
  setPaletteOpen,
  setSelection,
  setTool,
  toggleGrid,
  togglePanels,
  toggleRulers,
  type ToolId,
} from '../store/store';
import { toggleLock, toggleVisibility } from '../store/actions';
import { zoom100, zoomStep, zoomToFit, zoomToSelection, screenToWorld } from '../store/viewport';
import { exportSelectionAsPng } from '../persistence/exportPng';
import { getNode } from '../scene/traversal';
import { isContainer } from '../scene/types';
import { pickFile } from '../utils/download';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

const TOOL_KEYS: Record<string, ToolId> = {
  v: 'select',
  h: 'hand',
  r: 'rect',
  o: 'ellipse',
  l: 'line',
  t: 'text',
  f: 'frame',
  p: 'polygon',
  s: 'star',
};

function comboOf(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  parts.push(e.key.toLowerCase());
  return parts.join('+');
}

function handleEscape(): void {
  const state = editorStore.getState();
  if (state.paletteOpen) {
    setPaletteOpen(false);
    return;
  }
  if (isGestureActive()) {
    cancelGesture();
    return;
  }
  if (state.editingTextId !== null) {
    editorStore.setState({ editingTextId: null });
    return;
  }
  if (state.selection.length > 0) {
    setSelection([]);
    return;
  }
  if (state.tool !== 'select') setTool('select');
}

function handleEnter(): void {
  const state = editorStore.getState();
  const only = state.selection.length === 1 ? state.selection[0] : undefined;
  if (!only) return;
  const node = getNode(state.doc, only);
  if (!node) return;
  if (node.type === 'text') {
    editorStore.setState({ editingTextId: only });
  } else if (isContainer(node) && node.childIds.length > 0) {
    setSelection([...node.childIds]);
  }
}

async function placeImageFromPicker(): Promise<void> {
  const file = await pickFile('image/*');
  if (file) await insertImageFiles([file]);
}

/** Central keymap. Tools, edit ops, view ops — everything in one table. */
function handleKeyDown(e: KeyboardEvent): void {
  const typing = isTypingTarget(e.target);
  const state = editorStore.getState();

  // Space pans (held), even over the canvas, but never while typing.
  if (e.key === ' ' && !typing) {
    if (!e.repeat && !state.spacePanning) editorStore.setState({ spacePanning: true });
    e.preventDefault();
    return;
  }
  if (e.key === 'Alt' && !typing) {
    if (!state.measuring) editorStore.setState({ measuring: true });
    return;
  }

  if (e.key === 'Escape') {
    if (!typing) {
      handleEscape();
      e.preventDefault();
    }
    return;
  }
  if (typing) return;
  if (state.paletteOpen) return; // palette handles its own keys

  const combo = comboOf(e);

  // Single-letter tool switching.
  if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    const tool = TOOL_KEYS[e.key.toLowerCase()];
    if (tool) {
      setTool(tool);
      e.preventDefault();
      return;
    }
  }

  const actions: Record<string, () => void> = {
    'mod+z': undo,
    'mod+shift+z': redo,
    'mod+y': redo,
    'mod+c': () => copySelection(),
    'mod+x': () => cutSelection(deleteSelection),
    'mod+d': () => duplicateSelection(),
    'mod+a': selectAll,
    'mod+g': groupSelection,
    'mod+shift+g': ungroupSelection,
    'mod+alt+g': frameSelection,
    'mod+]': () => reorderSelection('forward'),
    'mod+[': () => reorderSelection('backward'),
    'mod+shift+]': () => reorderSelection('front'),
    'mod+shift+[': () => reorderSelection('back'),
    'mod+0': zoom100,
    'mod+1': zoomToFit,
    'shift+1': zoomToFit,
    'mod+2': zoomToSelection,
    'shift+2': zoomToSelection,
    'mod+=': () => zoomStep(1),
    'mod+-': () => zoomStep(-1),
    '=': () => zoomStep(1),
    '+': () => zoomStep(1),
    '-': () => zoomStep(-1),
    'mod+/': () => setPaletteOpen(!state.paletteOpen),
    'mod+\\': togglePanels,
    'shift+r': toggleRulers,
    'shift+g': toggleGrid,
    'mod+shift+h': () => toggleVisibility(state.selection),
    'mod+shift+l': () => toggleLock(state.selection),
    'mod+shift+k': () => void placeImageFromPicker(),
    'mod+shift+e': () => void exportSelectionAsPng(2),
    delete: deleteSelection,
    backspace: deleteSelection,
    enter: handleEnter,
    arrowleft: () => nudgeSelection(-1, 0),
    arrowright: () => nudgeSelection(1, 0),
    arrowup: () => nudgeSelection(0, -1),
    arrowdown: () => nudgeSelection(0, 1),
    'shift+arrowleft': () => nudgeSelection(-10, 0),
    'shift+arrowright': () => nudgeSelection(10, 0),
    'shift+arrowup': () => nudgeSelection(0, -10),
    'shift+arrowdown': () => nudgeSelection(0, 10),
  };

  const action = actions[combo];
  if (action) {
    e.preventDefault();
    action();
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  if (e.key === ' ') {
    editorStore.setState({ spacePanning: false });
  }
  if (e.key === 'Alt') {
    editorStore.setState({ measuring: false });
  }
}

function handlePaste(e: ClipboardEvent): void {
  if (isTypingTarget(e.target)) return;
  const data = e.clipboardData;
  if (data) {
    const files = [...data.files].filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      e.preventDefault();
      void insertImageFiles(files);
      return;
    }
    const text = data.getData('text/plain');
    if (text) {
      const payload = parseClipboardText(text);
      if (payload) {
        e.preventDefault();
        pastePayload(payload);
        return;
      }
    }
  }
  // Fall back to the in-memory clipboard.
  e.preventDefault();
  pastePayload();
}

/** Drag & drop image files onto the canvas. */
function handleDrop(e: DragEvent): void {
  const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
  if (files.length === 0) return;
  e.preventDefault();
  const stage = document.getElementById('canvas-stage');
  const rect = stage?.getBoundingClientRect();
  const state = editorStore.getState();
  const at = rect
    ? screenToWorld(state.viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top })
    : undefined;
  void insertImageFiles(files, at);
  pushToast(`Placing ${files.length} image${files.length > 1 ? 's' : ''}…`);
}

export function installShortcuts(): () => void {
  const keydown = (e: KeyboardEvent): void => handleKeyDown(e);
  const keyup = (e: KeyboardEvent): void => handleKeyUp(e);
  const paste = (e: ClipboardEvent): void => handlePaste(e);
  const drop = (e: DragEvent): void => handleDrop(e);
  const dragover = (e: DragEvent): void => e.preventDefault();
  const blur = (): void => editorStore.setState({ spacePanning: false, measuring: false });

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('paste', paste);
  window.addEventListener('drop', drop);
  window.addEventListener('dragover', dragover);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('paste', paste);
    window.removeEventListener('drop', drop);
    window.removeEventListener('dragover', dragover);
    window.removeEventListener('blur', blur);
  };
}
