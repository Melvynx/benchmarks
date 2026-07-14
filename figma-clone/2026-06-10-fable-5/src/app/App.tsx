import type { JSX } from 'react';
import { useEditor } from '../store/store';
import { CanvasArea } from '../ui/CanvasArea';
import { CommandPalette } from '../ui/CommandPalette';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { LayersPanel } from '../ui/panels/LayersPanel';
import { PropertiesPanel } from '../ui/panels/PropertiesPanel';
import { Toasts } from '../ui/Toasts';
import { TopBar } from '../ui/TopBar';

export function App(): JSX.Element {
  const panelsVisible = useEditor((s) => s.panelsVisible);
  return (
    <ErrorBoundary>
      <div className="app">
        <TopBar />
        <div className="workspace">
          {panelsVisible && <LayersPanel />}
          <CanvasArea />
          {panelsVisible && <PropertiesPanel />}
        </div>
        <CommandPalette />
        <Toasts />
      </div>
    </ErrorBoundary>
  );
}
