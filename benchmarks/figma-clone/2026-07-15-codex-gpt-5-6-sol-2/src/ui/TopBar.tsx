import {
  Circle,
  Download,
  Frame,
  Hand,
  Menu,
  Minus,
  MousePointer2,
  Play,
  Redo2,
  Square,
  Star,
  Type,
  Undo2,
} from 'lucide-react';

import { IconButton } from '@/ui/primitives';

import type { SaveState, Tool } from '@/editor/sessionTypes';
import type { LucideIcon } from 'lucide-react';

interface ToolDefinition {
  readonly id: Tool;
  readonly label: string;
  readonly shortcut: string;
  readonly icon: LucideIcon;
  readonly isSecondary?: boolean;
}

const TOOLS: readonly ToolDefinition[] = [
  { id: 'move', label: 'Move', shortcut: 'V', icon: MousePointer2 },
  { id: 'frame', label: 'Frame', shortcut: 'F', icon: Frame },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'star', label: 'Star', shortcut: '⇧S', icon: Star, isSecondary: true },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { id: 'hand', label: 'Hand', shortcut: 'H', icon: Hand },
];

export interface TopBarProps {
  readonly activeTool: Tool;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly saveState: SaveState;
  readonly onToolChange: (tool: Tool) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onOpenMenu: () => void;
  readonly onOpenPreview: () => void;
  readonly onOpenExport: () => void;
}

function SaveIndicator({ saveState }: Pick<TopBarProps, 'saveState'>) {
  const label =
    saveState.status === 'saving'
      ? 'Saving…'
      : saveState.status === 'error'
        ? 'Save failed'
        : 'Saved locally';

  return (
    <span className="save-indicator" data-status={saveState.status} title={label}>
      <span className="save-indicator__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export function TopBar({
  activeTool,
  canUndo,
  canRedo,
  saveState,
  onToolChange,
  onUndo,
  onRedo,
  onOpenMenu,
  onOpenPreview,
  onOpenExport,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <IconButton label="Main menu" icon={<Menu size={16} />} onClick={onOpenMenu} />
        <h1 className="brand-title">GPT-5.6 Sol</h1>
      </div>

      <nav className="topbar__center" aria-label="Design tools">
        {TOOLS.map(({ id, label, shortcut, icon: ToolIcon, isSecondary }) => (
          <IconButton
            key={id}
            label={label}
            shortcut={shortcut}
            icon={<ToolIcon size={16} strokeWidth={1.7} />}
            active={activeTool === id}
            data-secondary-tool={isSecondary ? 'true' : undefined}
            onClick={() => onToolChange(id)}
          />
        ))}
      </nav>

      <div className="topbar__right">
        <SaveIndicator saveState={saveState} />
        <IconButton
          label="Undo"
          shortcut="⌘Z"
          icon={<Undo2 size={16} />}
          disabled={!canUndo}
          onClick={onUndo}
        />
        <IconButton
          label="Redo"
          shortcut="⇧⌘Z"
          icon={<Redo2 size={16} />}
          disabled={!canRedo}
          onClick={onRedo}
        />
        <span className="tool-divider" aria-hidden="true" />
        <button type="button" className="text-action" onClick={onOpenPreview}>
          <Play size={14} aria-hidden="true" />
          Preview
        </button>
        <button type="button" className="primary-action" onClick={onOpenExport}>
          <Download size={14} aria-hidden="true" />
          Export
        </button>
      </div>
    </header>
  );
}
