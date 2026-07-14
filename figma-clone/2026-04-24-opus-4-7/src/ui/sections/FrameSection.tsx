import { useStore } from '../../state/store';
import { updateNodes } from '../../state/actions';
import { NumberField } from '../NumberField';
import { isFrame } from '../../core/scene';

export const FrameSection = (): JSX.Element | null => {
  const selection = useStore((s) => s.selection);
  const first = useStore((s) => s.doc.nodes[selection[0] ?? '']);
  if (!first || !isFrame(first)) return null;

  const al = first.autoLayout;

  const update = (partial: Partial<typeof al>) => {
    updateNodes(
      selection,
      (n) => {
        if (n.type === 'frame') {
          n.autoLayout = { ...n.autoLayout, ...partial };
        }
      },
      'Auto-layout',
    );
  };

  return (
    <div className="panel-section">
      <div className="panel-section-title">Frame</div>
      <label className="flex items-center justify-between text-xs text-text-primary mb-2 cursor-pointer">
        <span>Clip content</span>
        <input
          type="checkbox"
          checked={first.clipContent}
          onChange={(e) => {
            updateNodes(
              selection,
              (n) => {
                if (n.type === 'frame') n.clipContent = e.target.checked;
              },
              'Clip',
            );
          }}
        />
      </label>

      <label className="flex items-center justify-between text-xs text-text-primary mb-2 cursor-pointer">
        <span>Auto-layout</span>
        <input
          type="checkbox"
          checked={al.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
      </label>

      {al.enabled && (
        <div className="space-y-1.5 pl-2 border-l border-panel-divider">
          <div className="flex gap-1">
            {(['horizontal', 'vertical'] as const).map((d) => (
              <button
                key={d}
                className={`flex-1 h-7 rounded text-xs capitalize ${
                  al.direction === d ? 'bg-accent text-white' : 'text-text-secondary bg-panel-bgRaised hover:bg-[#3a3a3a]'
                }`}
                onClick={() => update({ direction: d })}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField prefix="Gap" value={al.gap} min={0} onChange={(v) => update({ gap: v })} />
            <NumberField
              prefix="Pad"
              value={al.padding.top}
              min={0}
              onChange={(v) => update({ padding: { top: v, right: v, bottom: v, left: v } })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              className="bg-panel-bgRaised text-xs text-text-primary rounded px-2 py-1 outline-none"
              value={al.align}
              onChange={(e) => update({ align: e.target.value as typeof al.align })}
            >
              <option value="start">Align start</option>
              <option value="center">Align center</option>
              <option value="end">Align end</option>
            </select>
            <select
              className="bg-panel-bgRaised text-xs text-text-primary rounded px-2 py-1 outline-none"
              value={al.justify}
              onChange={(e) => update({ justify: e.target.value as typeof al.justify })}
            >
              <option value="start">Justify start</option>
              <option value="center">Justify center</option>
              <option value="end">Justify end</option>
              <option value="space-between">Space between</option>
            </select>
          </div>
          <button
            className="w-full text-xs bg-panel-bgRaised hover:bg-[#3a3a3a] text-text-primary py-1.5 rounded"
            onClick={() => applyAutoLayout(selection[0]!)}
          >
            Apply layout
          </button>
        </div>
      )}
    </div>
  );
};

// Lay out children of the frame per its auto-layout settings.
import { applyAutoLayoutToFrame } from '../../core/layout/autoLayout';

const applyAutoLayout = (frameId: string): void => applyAutoLayoutToFrame(frameId);
