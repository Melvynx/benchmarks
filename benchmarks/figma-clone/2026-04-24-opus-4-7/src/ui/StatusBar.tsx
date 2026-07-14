import { useStore } from '../state/store';
import { MIN_ZOOM, MAX_ZOOM, fitRectToViewport } from '../state/viewport';
import { nodeWorldAABB, unionWorldAABB } from '../core/scene';
import { Minus, Plus, Maximize2 } from 'lucide-react';

export const StatusBar = (): JSX.Element => {
  const zoom = useStore((s) => s.viewport.zoom);
  return (
    <div
      className="h-8 bg-panel-bg border-t border-panel-divider flex items-center justify-between px-3 text-text-secondary text-xxs chrome-no-select"
      style={{ zIndex: 20 }}
    >
      <div className="flex items-center gap-3">
        <div>Vector</div>
        <HistoryCounter />
      </div>
      <div className="flex items-center gap-1">
        <button
          className="w-6 h-6 flex items-center justify-center hover:text-text-primary rounded hover:bg-panel-bgRaised"
          onClick={() => {
            const v = useStore.getState().viewport;
            const next = Math.max(MIN_ZOOM, v.zoom / 1.25);
            useStore.setState({ viewport: { ...v, zoom: next } });
          }}
        >
          <Minus size={12} />
        </button>
        <ZoomMenu zoom={zoom} />
        <button
          className="w-6 h-6 flex items-center justify-center hover:text-text-primary rounded hover:bg-panel-bgRaised"
          onClick={() => {
            const v = useStore.getState().viewport;
            const next = Math.min(MAX_ZOOM, v.zoom * 1.25);
            useStore.setState({ viewport: { ...v, zoom: next } });
          }}
        >
          <Plus size={12} />
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center hover:text-text-primary rounded hover:bg-panel-bgRaised"
          title="Fit content"
          onClick={() => fitAll()}
        >
          <Maximize2 size={12} />
        </button>
      </div>
    </div>
  );
};

const HistoryCounter = (): JSX.Element => {
  const undoCount = useStore((s) => s.historyUndoCount);
  const redoCount = useStore((s) => s.historyRedoCount);
  return (
    <div className="text-xxs text-text-tertiary tabular-nums">
      history {undoCount} / {undoCount + redoCount}
    </div>
  );
};

const ZoomMenu = ({ zoom }: { zoom: number }): JSX.Element => {
  const setZoom = (z: number) => {
    const s = useStore.getState();
    const v = s.viewport;
    // zoom at center of canvas (we don't know canvas size here, so just set zoom)
    useStore.setState({
      viewport: { x: v.x, y: v.y, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)) },
    });
  };

  return (
    <div className="relative group">
      <button className="px-2 h-6 rounded hover:bg-panel-bgRaised hover:text-text-primary tabular-nums">
        {Math.round(zoom * 100)}%
      </button>
      <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 bg-panel-bg border border-panel-divider rounded p-1 w-32 shadow-xl z-50">
        {[0.1, 0.25, 0.5, 1, 2, 4, 8].map((z) => (
          <button
            key={z}
            className="w-full text-left px-2 py-1 text-xs rounded hover:bg-panel-bgRaised"
            onClick={() => setZoom(z)}
          >
            {Math.round(z * 100)}%
          </button>
        ))}
        <div className="h-px bg-panel-divider my-1" />
        <button
          className="w-full text-left px-2 py-1 text-xs rounded hover:bg-panel-bgRaised"
          onClick={() => fitAll()}
        >
          Fit to content
        </button>
        <button
          className="w-full text-left px-2 py-1 text-xs rounded hover:bg-panel-bgRaised"
          onClick={() => fitSelection()}
        >
          Fit selection
        </button>
      </div>
    </div>
  );
};

const fitAll = (): void => {
  const s = useStore.getState();
  const page = s.doc.pages[s.doc.currentPageId];
  if (!page || page.children.length === 0) return;
  const bounds = unionWorldAABB(s.doc, page.children);
  if (!bounds) return;
  const w = window.innerWidth - 480;
  const h = window.innerHeight - 40 - 32;
  useStore.setState({ viewport: fitRectToViewport(bounds, { width: w, height: h }) });
};

const fitSelection = (): void => {
  const s = useStore.getState();
  if (s.selection.length === 0) return fitAll();
  const bounds = unionWorldAABB(s.doc, s.selection) ?? nodeWorldAABB(s.doc, s.selection[0]!);
  const w = window.innerWidth - 480;
  const h = window.innerHeight - 40 - 32;
  useStore.setState({ viewport: fitRectToViewport(bounds, { width: w, height: h }) });
};

export { fitAll, fitSelection };
