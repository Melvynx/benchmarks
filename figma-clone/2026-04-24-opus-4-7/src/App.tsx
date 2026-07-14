import { useEffect, useState } from 'react';
import { Canvas } from './ui/Canvas';
import { Toolbar } from './ui/Toolbar';
import { LeftPanel } from './ui/LeftPanel';
import { RightPanel } from './ui/RightPanel';
import { StatusBar } from './ui/StatusBar';
import { useKeyboard } from './ui/useKeyboard';
import { useStore } from './state/store';
import { setupAutosave, loadAutosave } from './core/persistence';
import { ContextMenu, useContextMenu } from './ui/ContextMenu';
import { screenToWorld } from './state/viewport';
import { loadImageFromFile } from './core/persistence';
import { addNode } from './state/actions';
import { createImage } from './core/scene';
import { Welcome } from './ui/Welcome';

export const App = (): JSX.Element => {
  useKeyboard();
  const showUI = useStore((s) => s.showUI);
  const [hydrated, setHydrated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const menu = useContextMenu();

  // Autosave + restore
  useEffect(() => {
    const saved = loadAutosave();
    if (saved) {
      useStore.getState().replaceDoc(saved);
    } else {
      setShowWelcome(true);
    }
    setHydrated(true);
    const unsub = setupAutosave();
    return unsub;
  }, []);

  // Paste image / file support
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const res = await loadImageFromFile(file);
          const w = Math.min(400, res.naturalWidth);
          const h = (w * res.naturalHeight) / res.naturalWidth;
          const v = useStore.getState().viewport;
          const node = createImage({
            parentId: null,
            x: v.x + 40,
            y: v.y + 40,
            width: w,
            height: h,
            src: res.src,
            naturalWidth: res.naturalWidth,
            naturalHeight: res.naturalHeight,
          });
          addNode(node, null);
          e.preventDefault();
          return;
        }
      }
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          const res = await loadImageFromFile(file);
          const w = Math.min(400, res.naturalWidth);
          const h = (w * res.naturalHeight) / res.naturalWidth;
          const screen = { x: e.clientX, y: e.clientY };
          const world = screenToWorld(useStore.getState().viewport, screen);
          const node = createImage({
            parentId: null,
            x: world.x - w / 2,
            y: world.y - h / 2,
            width: w,
            height: h,
            src: res.src,
            naturalWidth: res.naturalWidth,
            naturalHeight: res.naturalHeight,
          });
          addNode(node, null);
        }
      }
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', onDragOver);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragover', onDragOver);
    };
  }, []);

  // Context menu opening from root
  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA') return;
      e.preventDefault();
      const v = useStore.getState().viewport;
      menu.open({ x: e.clientX, y: e.clientY }, screenToWorld(v, { x: e.clientX, y: e.clientY }));
    };
    document.addEventListener('contextmenu', onCtx);
    return () => document.removeEventListener('contextmenu', onCtx);
  }, [menu]);

  if (!hydrated) {
    return (
      <div className="w-full h-full bg-panel-bg flex items-center justify-center text-text-tertiary text-xs">
        Loading…
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-panel-bg text-text-primary">
      {showUI && <Toolbar />}
      <div className="flex-1 flex min-h-0">
        {showUI && <LeftPanel />}
        <Canvas />
        {showUI && <RightPanel />}
      </div>
      {showUI && <StatusBar />}
      {menu.state && (
        <ContextMenu
          x={menu.state.x}
          y={menu.state.y}
          world={menu.state.world}
          onClose={menu.close}
        />
      )}
      {showWelcome && <Welcome onClose={() => setShowWelcome(false)} />}
    </div>
  );
};
