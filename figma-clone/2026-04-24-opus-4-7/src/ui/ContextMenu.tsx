import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import {
  copySelection,
  cutSelection,
  duplicateSelection,
  pasteClipboard,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  deleteSelection,
  groupSelection,
  ungroupSelection,
} from '../state/actions';
import { exportAsJson, exportAsPng, exportAsSvg } from '../core/persistence';

interface Props {
  x: number;
  y: number;
  world: { x: number; y: number };
  onClose: () => void;
}

const MenuItem = ({
  label,
  shortcut,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}): JSX.Element => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`w-full flex items-center px-3 py-1.5 text-xs rounded ${
      disabled
        ? 'text-text-disabled cursor-not-allowed'
        : `text-text-primary hover:bg-accent hover:text-white ${danger ? 'hover:bg-red-600' : ''}`
    }`}
  >
    <span>{label}</span>
    {shortcut && <span className="ml-auto text-xxs text-text-tertiary">{shortcut}</span>}
  </button>
);

const MenuSep = (): JSX.Element => <div className="h-px bg-panel-divider my-1" />;

export const ContextMenu = ({ x, y, world, onClose }: Props): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null);
  const selection = useStore((s) => s.selection);
  const hasClipboard = useStore((s) => !!s.clipboard && s.clipboard.length > 0);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const hasSelection = selection.length > 0;
  const meta = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';

  return (
    <div
      ref={ref}
      className="fixed bg-panel-bg border border-panel-divider rounded-md shadow-2xl py-1 w-56 z-50 slide-in-top"
      style={{ left: x, top: y }}
    >
      <MenuItem
        label="Copy"
        shortcut={`${meta}C`}
        onClick={() => {
          copySelection();
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuItem
        label="Cut"
        shortcut={`${meta}X`}
        onClick={() => {
          cutSelection();
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuItem
        label="Paste here"
        shortcut={`${meta}V`}
        onClick={() => {
          pasteClipboard(world);
          onClose();
        }}
        disabled={!hasClipboard}
      />
      <MenuItem
        label="Duplicate"
        shortcut={`${meta}D`}
        onClick={() => {
          duplicateSelection();
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuSep />
      <MenuItem
        label="Bring forward"
        shortcut={`${meta}]`}
        onClick={() => {
          bringForward(selection);
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuItem
        label="Send backward"
        shortcut={`${meta}[`}
        onClick={() => {
          sendBackward(selection);
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuItem
        label="Bring to front"
        shortcut={`${meta}⇧]`}
        onClick={() => {
          bringToFront(selection);
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuItem
        label="Send to back"
        shortcut={`${meta}⇧[`}
        onClick={() => {
          sendToBack(selection);
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuSep />
      <MenuItem
        label="Group"
        shortcut={`${meta}G`}
        onClick={() => {
          groupSelection();
          onClose();
        }}
        disabled={selection.length < 2}
      />
      <MenuItem
        label="Ungroup"
        shortcut={`${meta}⇧G`}
        onClick={() => {
          ungroupSelection();
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuSep />
      <MenuItem
        label="Export selection as PNG"
        onClick={() => {
          exportAsPng(useStore.getState().doc, selection);
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuItem
        label="Export selection as SVG"
        onClick={() => {
          exportAsSvg(useStore.getState().doc, selection);
          onClose();
        }}
        disabled={!hasSelection}
      />
      <MenuItem
        label="Export document as JSON"
        onClick={() => {
          exportAsJson(useStore.getState().doc);
          onClose();
        }}
      />
      <MenuSep />
      <MenuItem
        label="Delete"
        shortcut="⌫"
        onClick={() => {
          deleteSelection();
          onClose();
        }}
        disabled={!hasSelection}
        danger
      />
    </div>
  );
};

export const useContextMenu = (): {
  state: { x: number; y: number; world: { x: number; y: number } } | null;
  open: (screen: { x: number; y: number }, world: { x: number; y: number }) => void;
  close: () => void;
} => {
  const [state, setState] = useState<{ x: number; y: number; world: { x: number; y: number } } | null>(null);
  return {
    state,
    open: (screen, world) => setState({ x: screen.x, y: screen.y, world }),
    close: () => setState(null),
  };
};
