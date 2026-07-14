import { useStore } from '../../state/store';
import { updateNodes, updateNodesCoalesced } from '../../state/actions';
import { ColorSwatch } from '../ColorSwatch';
import { Plus, Minus } from 'lucide-react';
import { hasFills } from '../../core/scene';
import { solidPaint } from '../../core/scene';
import type { Paint } from '../../core/scene';

export const FillsSection = (): JSX.Element | null => {
  const selection = useStore((s) => s.selection);
  const first = useStore((s) => s.doc.nodes[selection[0] ?? '']);
  if (!first || !hasFills(first)) return null;

  const fills = first.fills;

  const updateFill = (idx: number, partial: Partial<Paint>) => {
    updateNodesCoalesced(
      selection,
      (n) => {
        if (!hasFills(n)) return;
        const f = n.fills[idx];
        if (!f) return;
        n.fills[idx] = { ...f, ...partial } as Paint;
      },
      'Fill',
    );
  };

  return (
    <div className="panel-section">
      <div className="flex items-center justify-between mb-2">
        <div className="panel-section-title mb-0">Fill</div>
        <button
          onClick={() => {
            updateNodes(
              selection,
              (n) => {
                if (hasFills(n)) n.fills.push(solidPaint('#9e9e9e', 1));
              },
              'Add fill',
            );
          }}
          className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
        >
          <Plus size={12} />
        </button>
      </div>
      {fills.length === 0 && (
        <div className="text-xxs text-text-tertiary italic">No fill</div>
      )}
      <div className="space-y-1">
        {fills.map((fill, i) => {
          if (fill.type !== 'solid') {
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-400 to-pink-400" />
                <span>{fill.type === 'linear' ? 'Linear' : fill.type === 'radial' ? 'Radial' : 'Image'}</span>
                <button
                  onClick={() => {
                    updateNodes(
                      selection,
                      (n) => {
                        if ('fills' in n && n.fills) n.fills.splice(i, 1);
                      },
                      'Remove fill',
                    );
                  }}
                  className="ml-auto w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
                >
                  <Minus size={12} />
                </button>
              </div>
            );
          }
          return (
            <div key={i} className="flex items-center gap-1.5">
              <ColorSwatch
                color={fill.color}
                opacity={fill.opacity}
                onChange={(c, o) => updateFill(i, { color: c, opacity: o } as Partial<Paint>)}
              />
              <div className="text-xs text-text-secondary tabular-nums uppercase flex-1">
                {fill.color}
              </div>
              <div className="text-xxs text-text-tertiary tabular-nums w-9 text-right">
                {Math.round(fill.opacity * 100)}%
              </div>
              <button
                onClick={() => {
                  updateNodes(
                    selection,
                    (n) => {
                      if (hasFills(n)) n.fills.splice(i, 1);
                    },
                    'Remove fill',
                  );
                }}
                className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
              >
                <Minus size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
