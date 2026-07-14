import { useStore } from '../../state/store';
import { updateNodes } from '../../state/actions';
import { ColorSwatch } from '../ColorSwatch';
import { NumberField } from '../NumberField';
import { Plus, Minus } from 'lucide-react';
import type { Stroke, StrokeAlign } from '../../core/scene';
import { defaultStroke, hasStrokes } from '../../core/scene';

export const StrokesSection = (): JSX.Element | null => {
  const selection = useStore((s) => s.selection);
  const first = useStore((s) => s.doc.nodes[selection[0] ?? '']);
  if (!first || !hasStrokes(first)) return null;
  const strokes: Stroke[] = first.strokes;

  const update = (idx: number, partial: Partial<Stroke>) => {
    updateNodes(
      selection,
      (n) => {
        if (!hasStrokes(n)) return;
        const s = n.strokes[idx];
        if (!s) return;
        n.strokes[idx] = { ...s, ...partial };
      },
      'Stroke',
    );
  };

  return (
    <div className="panel-section">
      <div className="flex items-center justify-between mb-2">
        <div className="panel-section-title mb-0">Stroke</div>
        <button
          onClick={() => {
            updateNodes(
              selection,
              (n) => {
                if (!hasStrokes(n)) return;
                n.strokes.push(defaultStroke('#000000', 1));
              },
              'Add stroke',
            );
          }}
          className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
        >
          <Plus size={12} />
        </button>
      </div>
      {strokes.length === 0 && <div className="text-xxs text-text-tertiary italic">No stroke</div>}
      <div className="space-y-2">
        {strokes.map((stroke, i) => {
          const color =
            stroke.paint.type === 'solid' ? stroke.paint.color : '#808080';
          const opacity =
            stroke.paint.type === 'solid' ? stroke.paint.opacity : 1;
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <ColorSwatch
                  color={color}
                  opacity={opacity}
                  onChange={(c, o) => {
                    if (stroke.paint.type === 'solid') {
                      update(i, { paint: { ...stroke.paint, color: c, opacity: o } });
                    }
                  }}
                />
                <div className="text-xs text-text-secondary uppercase flex-1">{color}</div>
                <button
                  onClick={() => {
                    updateNodes(
                      selection,
                      (n) => {
                        if (hasStrokes(n)) n.strokes.splice(i, 1);
                      },
                      'Remove stroke',
                    );
                  }}
                  className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
                >
                  <Minus size={12} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <NumberField
                  value={stroke.width}
                  min={0}
                  step={0.5}
                  onChange={(v) => update(i, { width: v })}
                  precision={1}
                />
                <select
                  className="bg-panel-bgRaised text-xs text-text-primary rounded px-1.5 py-1 outline-none"
                  value={stroke.align}
                  onChange={(e) => update(i, { align: e.target.value as StrokeAlign })}
                >
                  <option value="center">Center</option>
                  <option value="inside">Inside</option>
                  <option value="outside">Outside</option>
                </select>
                <select
                  className="bg-panel-bgRaised text-xs text-text-primary rounded px-1.5 py-1 outline-none"
                  value={stroke.dash.length > 0 ? 'dashed' : 'solid'}
                  onChange={(e) => {
                    update(i, { dash: e.target.value === 'dashed' ? [6, 4] : [] });
                  }}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
