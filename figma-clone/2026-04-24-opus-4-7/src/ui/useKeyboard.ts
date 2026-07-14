import { useEffect } from 'react';
import { useStore, setTool } from '../state/store';
import {
  deleteSelection,
  selectAll,
  duplicateSelection,
  copySelection,
  cutSelection,
  pasteClipboard,
  groupSelection,
  ungroupSelection,
  bringForward,
  bringToFront,
  sendBackward,
  sendToBack,
  translateSelection,
} from '../state/actions';
import { fitAll, fitSelection } from './StatusBar';
import { MIN_ZOOM, MAX_ZOOM } from '../state/viewport';

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
};

export const useKeyboard = (): void => {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (isTypingTarget(e.target)) return;

      // Tool shortcuts
      if (!mod) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setTool('select');
            return;
          case 'h':
            setTool('hand');
            return;
          case 'r':
            setTool('rectangle');
            return;
          case 'o':
            setTool('ellipse');
            return;
          case 'f':
            setTool('frame');
            return;
          case 't':
            setTool('text');
            return;
          case 'l':
            setTool('line');
            return;
          case 'p':
            setTool('polygon');
            return;
          case 'escape':
            useStore.getState().apply((s) => {
              s.selection = [];
              s.transient.editingTextId = null;
            });
            setTool('select');
            return;
          case 'delete':
          case 'backspace':
            deleteSelection();
            return;
          case ' ':
            if (!e.repeat) {
              useStore.getState().apply((s) => {
                s.transient.isPanning = true;
              });
            }
            e.preventDefault();
            return;
        }

        // Arrow nudge
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          const step = e.shiftKey ? 10 : 1;
          const [dx, dy] =
            e.key === 'ArrowUp'
              ? [0, -step]
              : e.key === 'ArrowDown'
                ? [0, step]
                : e.key === 'ArrowLeft'
                  ? [-step, 0]
                  : [step, 0];
          translateSelection(dx, dy, 'Nudge');
          e.preventDefault();
          return;
        }
      }

      // Cmd/Ctrl shortcuts
      if (mod) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) useStore.getState().redo();
          else useStore.getState().undo();
          return;
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          useStore.getState().redo();
          return;
        }
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          selectAll();
          return;
        }
        if (e.key === 'c') {
          e.preventDefault();
          copySelection();
          return;
        }
        if (e.key === 'x') {
          e.preventDefault();
          cutSelection();
          return;
        }
        if (e.key === 'v') {
          e.preventDefault();
          pasteClipboard();
          return;
        }
        if (e.key === 'd') {
          e.preventDefault();
          duplicateSelection();
          return;
        }
        if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          if (e.shiftKey) ungroupSelection();
          else groupSelection();
          return;
        }
        if (e.key === ']') {
          e.preventDefault();
          const ids = useStore.getState().selection;
          if (e.shiftKey) bringToFront(ids);
          else bringForward(ids);
          return;
        }
        if (e.key === '[') {
          e.preventDefault();
          const ids = useStore.getState().selection;
          if (e.shiftKey) sendToBack(ids);
          else sendBackward(ids);
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          const s = useStore.getState();
          useStore.setState({ viewport: { ...s.viewport, zoom: 1 } });
          return;
        }
        if (e.key === '1') {
          e.preventDefault();
          fitAll();
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          fitSelection();
          return;
        }
        if (e.key === '/') {
          e.preventDefault();
          // Toggle UI visibility
          useStore.setState((s) => ({ showUI: !s.showUI }));
          return;
        }
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          const v = useStore.getState().viewport;
          useStore.setState({ viewport: { ...v, zoom: Math.min(MAX_ZOOM, v.zoom * 1.2) } });
          return;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          const v = useStore.getState().viewport;
          useStore.setState({ viewport: { ...v, zoom: Math.max(MIN_ZOOM, v.zoom / 1.2) } });
          return;
        }
      }
    };

    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        useStore.getState().apply((s) => {
          s.transient.isPanning = false;
        });
      }
    };

    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, []);
};
