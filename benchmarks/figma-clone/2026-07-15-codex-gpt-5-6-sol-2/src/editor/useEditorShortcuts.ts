import { useEffect } from 'react';

import type { Tool } from './sessionTypes';

type OrderDirection = 'forward' | 'backward' | 'front' | 'back';

export interface EditorShortcutActions {
  readonly setTool: (tool: Tool) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly copy: () => void;
  readonly cut: () => void;
  readonly duplicate: () => void;
  readonly selectAll: () => void;
  readonly group: () => void;
  readonly ungroup: () => void;
  readonly order: (direction: OrderDirection) => void;
  readonly deleteSelection: () => void;
  readonly nudge: (x: number, y: number) => void;
  readonly fitAll: () => void;
  readonly zoomToOne: () => void;
  readonly fitSelection: () => void;
  readonly toggleGrid: () => void;
  readonly toggleRulers: () => void;
  readonly openCommandPalette: () => void;
  readonly escape: () => void;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.closest('[role="dialog"], [role="menu"]') !== null
  );
}

const TOOL_SHORTCUTS = {
  v: 'move',
  f: 'frame',
  r: 'rectangle',
  o: 'ellipse',
  l: 'line',
  t: 'text',
  h: 'hand',
} as const satisfies Record<string, Tool>;

function toolForShortcut(key: string): Tool | undefined {
  return Object.entries(TOOL_SHORTCUTS).find(([shortcut]) => shortcut === key)?.[1];
}

function handleModifiedShortcut(event: KeyboardEvent, actions: EditorShortcutActions) {
  const key = event.key.toLowerCase();

  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) actions.redo();
    else actions.undo();
    return true;
  }

  const simpleActions: Readonly<Record<string, (() => void) | undefined>> = {
    c: actions.copy,
    x: actions.cut,
    d: actions.duplicate,
    a: actions.selectAll,
    '0': actions.fitAll,
    '1': actions.zoomToOne,
    '2': actions.fitSelection,
    '/': actions.openCommandPalette,
    k: actions.openCommandPalette,
  };
  const action = simpleActions[key];
  if (action) {
    event.preventDefault();
    action();
    return true;
  }

  if (key === 'g') {
    event.preventDefault();
    if (event.shiftKey) actions.ungroup();
    else actions.group();
    return true;
  }

  if (event.code === 'BracketRight') {
    event.preventDefault();
    actions.order(event.shiftKey ? 'front' : 'forward');
    return true;
  }

  if (event.code === 'BracketLeft') {
    event.preventDefault();
    actions.order(event.shiftKey ? 'back' : 'backward');
    return true;
  }

  return false;
}

function handleNudge(event: KeyboardEvent, actions: EditorShortcutActions) {
  const distance = event.altKey ? 0.1 : event.shiftKey ? 10 : 1;
  const offsets: Readonly<Record<string, readonly [number, number] | undefined>> = {
    ArrowLeft: [-distance, 0],
    ArrowRight: [distance, 0],
    ArrowUp: [0, -distance],
    ArrowDown: [0, distance],
  };
  const offset = offsets[event.key];
  if (offset === undefined) return false;
  event.preventDefault();
  actions.nudge(offset[0], offset[1]);
  return true;
}

export function useEditorShortcuts(actions: EditorShortcutActions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      const hasCommandModifier = event.metaKey || event.ctrlKey;
      if (hasCommandModifier && handleModifiedShortcut(event, actions)) return;
      if (handleNudge(event, actions)) return;

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        actions.deleteSelection();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        actions.escape();
        return;
      }

      const key = event.key.toLowerCase();
      if (event.shiftKey && key === 'g') {
        event.preventDefault();
        actions.toggleGrid();
        return;
      }
      if (event.shiftKey && key === 'r') {
        event.preventDefault();
        actions.toggleRulers();
        return;
      }
      if (event.shiftKey && key === 's') {
        event.preventDefault();
        actions.setTool('star');
        return;
      }

      const tool = toolForShortcut(key);
      if (!event.altKey && !event.shiftKey && tool) {
        event.preventDefault();
        actions.setTool(tool);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}
