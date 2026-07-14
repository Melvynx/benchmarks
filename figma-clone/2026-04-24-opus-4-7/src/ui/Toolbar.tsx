import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Minus,
  Type,
  Image as ImageIcon,
  Frame as FrameIcon,
  Star,
  Pentagon,
  Undo2,
  Redo2,
  ChevronDown,
} from 'lucide-react';
import { useStore, setTool } from '../state/store';
import type { ToolId } from '../state/types';
import { useRef, useState } from 'react';
import { loadImageFromFile } from '../core/persistence/images';

interface ToolDef {
  id: ToolId;
  icon: React.ElementType;
  shortcut: string;
  label: string;
}

const PRIMARY_TOOLS: ToolDef[] = [
  { id: 'select', icon: MousePointer2, shortcut: 'V', label: 'Move' },
  { id: 'hand', icon: Hand, shortcut: 'H', label: 'Hand' },
];

const SHAPE_TOOLS: ToolDef[] = [
  { id: 'frame', icon: FrameIcon, shortcut: 'F', label: 'Frame' },
  { id: 'rectangle', icon: Square, shortcut: 'R', label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, shortcut: 'O', label: 'Ellipse' },
  { id: 'line', icon: Minus, shortcut: 'L', label: 'Line' },
  { id: 'polygon', icon: Pentagon, shortcut: 'P', label: 'Polygon' },
];

export const Toolbar = (): JSX.Element => {
  const tool = useStore((s) => s.tool);
  const canUndo = useStore((s) => s.historyUndoCount > 0);
  const canRedo = useStore((s) => s.historyRedoCount > 0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [shapesOpen, setShapesOpen] = useState(false);
  const docName = useStore((s) => s.doc.name);

  const zoom = useStore((s) => s.viewport.zoom);

  const activeShape = SHAPE_TOOLS.find((t) => t.id === tool);

  return (
    <div
      className="h-11 bg-panel-bg border-b border-panel-divider flex items-center px-2 gap-0.5 chrome-no-select select-none"
      style={{ zIndex: 30 }}
    >
      <div className="w-6 h-6 mr-2 flex items-center justify-center">
        <LogoMark />
      </div>

      {PRIMARY_TOOLS.map((t) => (
        <ToolButton key={t.id} def={t} active={tool === t.id} onClick={() => setTool(t.id)} />
      ))}

      <div className="w-px h-5 bg-panel-divider mx-1" />

      {/* Shape group (dropdown) */}
      <div className="relative">
        <div className="flex">
          <ToolButton
            def={activeShape ?? SHAPE_TOOLS[1]!}
            active={!!activeShape}
            onClick={() => setTool((activeShape ?? SHAPE_TOOLS[1]!).id)}
          />
          <button
            className="tool-btn w-4 h-8 flex items-center justify-center"
            onClick={() => setShapesOpen((v) => !v)}
            aria-label="More shapes"
          >
            <ChevronDown size={10} />
          </button>
        </div>
        {shapesOpen && (
          <div
            className="absolute top-full left-0 bg-panel-bg border border-panel-divider rounded shadow-xl mt-1 p-1 w-40 slide-in-top"
            onMouseLeave={() => setShapesOpen(false)}
            style={{ zIndex: 40 }}
          >
            {SHAPE_TOOLS.map((t) => (
              <button
                key={t.id}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-primary rounded hover:bg-panel-bgRaised ${
                  tool === t.id ? 'bg-accent/30' : ''
                }`}
                onClick={() => {
                  setTool(t.id);
                  setShapesOpen(false);
                }}
              >
                <t.icon size={14} className="text-text-secondary" />
                <span>{t.label}</span>
                <span className="ml-auto text-xxs text-text-tertiary">{t.shortcut}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ToolButton
        def={{ id: 'text', icon: Type, shortcut: 'T', label: 'Text' }}
        active={tool === 'text'}
        onClick={() => setTool('text')}
      />

      <ToolButton
        def={{ id: 'image', icon: ImageIcon, shortcut: '', label: 'Image' }}
        active={tool === 'image'}
        onClick={async () => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const res = await loadImageFromFile(file);
          useStore.setState((s) => ({
            transient: { ...s.transient, pendingImage: res },
            tool: 'image',
          }));
          e.target.value = '';
        }}
      />

      <div className="flex-1" />

      {/* Filename */}
      <div className="text-xs text-text-secondary mx-4 flex items-center gap-2">
        <Star size={12} className="text-text-tertiary" />
        <span>{docName}</span>
        <span className="text-text-tertiary">·</span>
        <span className="text-xxs text-text-tertiary font-mono tracking-wide">
          built by Opus 4.7
        </span>
      </div>

      <div className="flex-1" />

      <button
        className={`tool-btn ${!canUndo ? 'opacity-30 cursor-not-allowed' : ''}`}
        disabled={!canUndo}
        onClick={() => useStore.getState().undo()}
        title="Undo (⌘Z)"
      >
        <Undo2 size={16} />
      </button>
      <button
        className={`tool-btn ${!canRedo ? 'opacity-30 cursor-not-allowed' : ''}`}
        disabled={!canRedo}
        onClick={() => useStore.getState().redo()}
        title="Redo (⌘⇧Z)"
      >
        <Redo2 size={16} />
      </button>

      <div className="w-px h-5 bg-panel-divider mx-2" />

      <div className="text-xs text-text-secondary font-mono tabular-nums min-w-[56px] text-center">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};

const ToolButton = ({
  def,
  active,
  onClick,
}: {
  def: ToolDef;
  active: boolean;
  onClick: () => void;
}): JSX.Element => {
  const Icon = def.icon;
  return (
    <button
      className={`tool-btn relative group`}
      data-active={active}
      title={`${def.label}${def.shortcut ? ` (${def.shortcut})` : ''}`}
      onClick={onClick}
      style={active ? { background: '#0d99ff', color: '#fff' } : undefined}
    >
      <Icon size={16} />
    </button>
  );
};

const LogoMark = (): JSX.Element => (
  <svg viewBox="0 0 32 32" width={20} height={20}>
    <rect x="4" y="4" width="11" height="11" rx="2" fill="#0d99ff" />
    <rect x="17" y="4" width="11" height="11" rx="2" fill="#ff3b30" />
    <rect x="4" y="17" width="11" height="11" rx="2" fill="#34c759" />
    <circle cx="22.5" cy="22.5" r="5.5" fill="#ffcc00" />
  </svg>
);
