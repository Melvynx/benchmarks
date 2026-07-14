import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useStore } from '../../state/store';
import { updateNodes } from '../../state/actions';
import { NumberField } from '../NumberField';

const FONTS = ['Inter', 'Roboto', 'Poppins', 'Playfair Display', 'JetBrains Mono', 'Space Grotesk'];
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export const TextSection = (): JSX.Element | null => {
  const selection = useStore((s) => s.selection);
  const first = useStore((s) => s.doc.nodes[selection[0] ?? '']);
  if (!first || first.type !== 'text') return null;

  const update = (partial: Partial<typeof first>) => {
    updateNodes(
      selection,
      (n) => {
        if (n.type === 'text') Object.assign(n, partial);
      },
      'Text',
    );
  };

  return (
    <div className="panel-section">
      <div className="panel-section-title">Typography</div>
      <div className="space-y-1.5">
        <select
          className="w-full bg-panel-bgRaised text-xs text-text-primary rounded px-2 py-1 outline-none"
          value={first.fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value })}
        >
          {FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: `"${f}"` }}>
              {f}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-1.5">
          <select
            className="bg-panel-bgRaised text-xs text-text-primary rounded px-2 py-1 outline-none"
            value={first.fontWeight}
            onChange={(e) => update({ fontWeight: Number(e.target.value) })}
          >
            {WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {weightLabel(w)}
              </option>
            ))}
          </select>
          <NumberField
            prefix="Size"
            value={first.fontSize}
            min={1}
            onChange={(v) => update({ fontSize: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField
            prefix="Line"
            value={first.lineHeight}
            min={0.5}
            step={0.05}
            precision={2}
            onChange={(v) => update({ lineHeight: v })}
          />
          <NumberField
            prefix="Spacing"
            value={first.letterSpacing}
            step={0.1}
            precision={1}
            onChange={(v) => update({ letterSpacing: v })}
          />
        </div>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((dir) => {
            const Icon = dir === 'left' ? AlignLeft : dir === 'center' ? AlignCenter : AlignRight;
            const active = first.textAlign === dir;
            return (
              <button
                key={dir}
                className={`flex-1 h-7 rounded text-text-secondary hover:bg-panel-bgRaised flex items-center justify-center ${
                  active ? 'bg-accent text-white' : ''
                }`}
                onClick={() => update({ textAlign: dir })}
              >
                <Icon size={12} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const weightLabel = (w: number): string => {
  switch (w) {
    case 100:
      return 'Thin';
    case 200:
      return 'ExtraLight';
    case 300:
      return 'Light';
    case 400:
      return 'Regular';
    case 500:
      return 'Medium';
    case 600:
      return 'SemiBold';
    case 700:
      return 'Bold';
    case 800:
      return 'ExtraBold';
    case 900:
      return 'Black';
    default:
      return String(w);
  }
};
