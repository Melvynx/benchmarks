import { useEffect, useRef, useState, type JSX } from 'react';
import { PointerController } from '../input/PointerController';
import { exportSelectionAsPng } from '../persistence/exportPng';
import { exportSelectionAsSvg } from '../persistence/exportSvg';
import { CanvasRenderer } from '../render/renderer';
import { hitChain } from '../scene/sceneIndex';
import {
  deleteSelection,
  duplicateSelection,
  frameSelection,
  groupSelection,
  pickFromChain,
  reorderSelection,
  toggleLock,
  toggleVisibility,
  ungroupSelection,
} from '../store/actions';
import { copySelection, cutSelection, pastePayload } from '../store/clipboard';
import { editorStore, setSelection, useEditor } from '../store/store';
import { screenToWorld } from '../store/viewport';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { TextEditorOverlay } from './TextEditorOverlay';

export function CanvasArea(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const isEmpty = useEditor((s) => s.doc.rootIds.length === 0);

  useEffect(() => {
    const container = containerRef.current;
    const scene = sceneRef.current;
    const overlay = overlayRef.current;
    if (!container || !scene || !overlay) return;

    const renderer = new CanvasRenderer(scene, overlay, container);
    renderer.start();
    const controller = new PointerController(container);
    controller.attach();
    return () => {
      controller.detach();
      renderer.stop();
    };
  }, []);

  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const state = editorStore.getState();
    const world = screenToWorld(state.viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Right-clicking an unselected node selects it first.
    const chain = hitChain(state.doc, world, { slop: 4 / state.viewport.zoom });
    if (chain) {
      const pick = pickFromChain(state.doc, chain, state.selection, false);
      if (pick && !state.selection.includes(pick)) setSelection([pick]);
    } else if (state.selection.length > 0) {
      setSelection([]);
    }

    const selection = editorStore.getState().selection;
    const has = selection.length > 0;
    const items: MenuItem[] = [
      { label: 'Copy', shortcut: '⌘C', disabled: !has, onSelect: () => copySelection() },
      { label: 'Paste', shortcut: '⌘V', onSelect: () => pastePayload() },
      { label: 'Duplicate', shortcut: '⌘D', disabled: !has, onSelect: () => duplicateSelection() },
      { label: 'Cut', shortcut: '⌘X', disabled: !has, onSelect: () => cutSelection(deleteSelection) },
      { separator: true, label: '' },
      { label: 'Group selection', shortcut: '⌘G', disabled: selection.length < 1, onSelect: groupSelection },
      { label: 'Ungroup', shortcut: '⇧⌘G', disabled: !has, onSelect: ungroupSelection },
      { label: 'Frame selection', shortcut: '⌥⌘G', disabled: !has, onSelect: frameSelection },
      { separator: true, label: '' },
      { label: 'Bring to front', shortcut: '⇧⌘]', disabled: !has, onSelect: () => reorderSelection('front') },
      { label: 'Bring forward', shortcut: '⌘]', disabled: !has, onSelect: () => reorderSelection('forward') },
      { label: 'Send backward', shortcut: '⌘[', disabled: !has, onSelect: () => reorderSelection('backward') },
      { label: 'Send to back', shortcut: '⇧⌘[', disabled: !has, onSelect: () => reorderSelection('back') },
      { separator: true, label: '' },
      { label: 'Hide', shortcut: '⇧⌘H', disabled: !has, onSelect: () => toggleVisibility(selection) },
      { label: 'Lock', shortcut: '⇧⌘L', disabled: !has, onSelect: () => toggleLock(selection) },
      { separator: true, label: '' },
      { label: 'Export PNG (2x)', disabled: !has && isEmpty, onSelect: () => void exportSelectionAsPng(2) },
      { label: 'Export SVG', disabled: !has && isEmpty, onSelect: () => exportSelectionAsSvg() },
      { separator: true, label: '' },
      { label: 'Delete', shortcut: '⌫', disabled: !has, danger: true, onSelect: deleteSelection },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <div id="canvas-stage" className="canvas-stage" ref={containerRef} onContextMenu={onContextMenu}>
      <canvas ref={sceneRef} className="canvas-layer" />
      <canvas ref={overlayRef} className="canvas-layer" />
      <TextEditorOverlay />
      {isEmpty && (
        <div className="canvas-empty">
          <p className="canvas-empty__title">This file is empty</p>
          <p className="canvas-empty__hint">
            Press <kbd>R</kbd> and drag to draw a rectangle, <kbd>T</kbd> for text,
            <br />
            or hit <kbd>⌘/</kbd> to browse every command.
          </p>
        </div>
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  );
}
