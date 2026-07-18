import { Box, Grid3X3, Magnet, MousePointer2 } from 'lucide-react';

import type { CanvasPoint, Tool } from '@/editor/sessionTypes';

export interface StatusBarProps {
  readonly cursorWorld: CanvasPoint;
  readonly activeTool: Tool;
  readonly selectedCount: number;
  readonly nodeCount: number;
  readonly isSnappingEnabled: boolean;
  readonly isGridVisible: boolean;
}

const TOOL_LABELS = {
  move: 'Move',
  frame: 'Frame',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  polygon: 'Polygon',
  star: 'Star',
  text: 'Text',
  hand: 'Hand',
} as const satisfies Record<Tool, string>;

function formatCoordinate(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function StatusBar({
  cursorWorld,
  activeTool,
  selectedCount,
  nodeCount,
  isSnappingEnabled,
  isGridVisible,
}: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div className="status-bar__group">
        <span className="status-value">
          <MousePointer2 size={12} aria-hidden="true" />
          <strong>{TOOL_LABELS[activeTool]}</strong>
        </span>
        <span className="status-value">
          X <strong>{formatCoordinate(cursorWorld.x)}</strong>
          &nbsp;Y <strong>{formatCoordinate(cursorWorld.y)}</strong>
        </span>
        <span className="status-value">
          <Box size={12} aria-hidden="true" />
          {selectedCount === 0 ? 'No selection' : `${selectedCount} selected`}
        </span>
      </div>
      <div className="status-bar__group">
        <span className="status-value" title={`${nodeCount} scene nodes`}>
          {nodeCount.toLocaleString()} layers
        </span>
        <span className="status-value">
          <Grid3X3 size={12} aria-hidden="true" />
          Grid {isGridVisible ? 'on' : 'off'}
        </span>
        <span className="status-value">
          <Magnet size={12} aria-hidden="true" />
          Snap {isSnappingEnabled ? 'on' : 'off'}
        </span>
        <span className="status-value">
          <span className="status-dot" aria-hidden="true" />
          Local
        </span>
      </div>
    </footer>
  );
}
