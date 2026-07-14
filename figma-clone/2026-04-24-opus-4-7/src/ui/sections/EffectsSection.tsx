import { useStore } from '../../state/store';
import { updateNodes } from '../../state/actions';
import { Plus, Minus, Eye, EyeOff } from 'lucide-react';
import { NumberField } from '../NumberField';
import { ColorSwatch } from '../ColorSwatch';
import type { Effect } from '../../core/scene';

export const EffectsSection = (): JSX.Element | null => {
  const selection = useStore((s) => s.selection);
  const first = useStore((s) => s.doc.nodes[selection[0] ?? '']);
  if (!first) return null;

  const effects = first.effects ?? [];

  const update = (idx: number, partial: Partial<Effect>) => {
    updateNodes(
      selection,
      (n) => {
        const e = n.effects[idx];
        if (!e) return;
        n.effects[idx] = { ...e, ...partial } as Effect;
      },
      'Effect',
    );
  };

  const add = (type: Effect['type']) => {
    updateNodes(
      selection,
      (n) => {
        let eff: Effect;
        if (type === 'dropShadow')
          eff = {
            type: 'dropShadow',
            offsetX: 0,
            offsetY: 4,
            blur: 8,
            spread: 0,
            color: '#000000',
            opacity: 0.25,
            visible: true,
          };
        else if (type === 'innerShadow')
          eff = {
            type: 'innerShadow',
            offsetX: 0,
            offsetY: 4,
            blur: 8,
            spread: 0,
            color: '#000000',
            opacity: 0.25,
            visible: true,
          };
        else if (type === 'layerBlur') eff = { type: 'layerBlur', radius: 4, visible: true };
        else eff = { type: 'backgroundBlur', radius: 10, visible: true };
        n.effects.push(eff);
      },
      'Add effect',
    );
  };

  return (
    <div className="panel-section">
      <div className="flex items-center justify-between mb-2">
        <div className="panel-section-title mb-0">Effects</div>
        <div className="relative group">
          <button className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary">
            <Plus size={12} />
          </button>
          <div className="absolute right-0 top-full mt-1 bg-panel-bg border border-panel-divider rounded shadow-xl hidden group-hover:block z-10 w-36 p-1">
            {(['dropShadow', 'innerShadow', 'layerBlur', 'backgroundBlur'] as const).map((t) => (
              <button
                key={t}
                className="w-full text-left text-xs px-2 py-1.5 rounded text-text-primary hover:bg-panel-bgRaised"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(t);
                }}
              >
                {effectLabel(t)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {effects.length === 0 && <div className="text-xxs text-text-tertiary italic">No effects</div>}
      <div className="space-y-2">
        {effects.map((eff, i) => (
          <div key={i} className="border border-panel-divider rounded p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="text-xs text-text-primary flex-1">{effectLabel(eff.type)}</div>
              <button
                className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
                onClick={() => update(i, { visible: !eff.visible })}
              >
                {eff.visible ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
              <button
                className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
                onClick={() => {
                  updateNodes(
                    selection,
                    (n) => {
                      n.effects.splice(i, 1);
                    },
                    'Remove effect',
                  );
                }}
              >
                <Minus size={12} />
              </button>
            </div>
            {(eff.type === 'dropShadow' || eff.type === 'innerShadow') && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <NumberField
                    prefix="X"
                    value={eff.offsetX}
                    onChange={(v) => update(i, { offsetX: v })}
                  />
                  <NumberField
                    prefix="Y"
                    value={eff.offsetY}
                    onChange={(v) => update(i, { offsetY: v })}
                  />
                  <NumberField
                    prefix="B"
                    value={eff.blur}
                    min={0}
                    onChange={(v) => update(i, { blur: v })}
                  />
                  <NumberField
                    prefix="S"
                    value={eff.spread}
                    onChange={(v) => update(i, { spread: v })}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <ColorSwatch
                    color={eff.color}
                    opacity={eff.opacity}
                    onChange={(c, o) => update(i, { color: c, opacity: o })}
                  />
                  <div className="text-xs text-text-secondary uppercase flex-1">
                    {eff.color}
                  </div>
                </div>
              </>
            )}
            {(eff.type === 'layerBlur' || eff.type === 'backgroundBlur') && (
              <NumberField
                prefix="Radius"
                value={eff.radius}
                min={0}
                onChange={(v) => update(i, { radius: v })}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const effectLabel = (t: Effect['type']): string => {
  switch (t) {
    case 'dropShadow':
      return 'Drop shadow';
    case 'innerShadow':
      return 'Inner shadow';
    case 'layerBlur':
      return 'Layer blur';
    case 'backgroundBlur':
      return 'Background blur';
  }
};
