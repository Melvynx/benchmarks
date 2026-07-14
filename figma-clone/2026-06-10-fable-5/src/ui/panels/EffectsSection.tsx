import { useRef, useState, type JSX } from 'react';
import { dropShadow } from '../../scene/factories';
import { patchBase } from '../../scene/draft';
import { isShadowEffect, type Effect, type EffectType, type SceneNode } from '../../scene/types';
import { beginGesture, editDoc, endGesture, updateGesture } from '../../store/docEdit';
import { rgba } from '../../utils/color';
import { ColorPicker } from '../controls/ColorPicker';
import { NumberInput } from '../controls/NumberInput';
import { Popover } from '../controls/Popover';
import { IEye, IEyeOff, IMinus, IPlus } from '../icons';
import { applyToSelection, sharedValue } from './panelUtils';

const effectScrub = {
  onScrubStart: (): void => beginGesture('panel'),
  onScrubEnd: (): void => endGesture('Edit effect'),
};

const EFFECT_NAMES: Record<EffectType, string> = {
  'drop-shadow': 'Drop shadow',
  'inner-shadow': 'Inner shadow',
  'layer-blur': 'Layer blur',
  'background-blur': 'Background blur',
};

function makeEffect(type: EffectType): Effect {
  if (type === 'drop-shadow') return dropShadow();
  if (type === 'inner-shadow') {
    return { type, enabled: true, color: rgba(0, 0, 0, 0.25), offsetX: 0, offsetY: 4, blur: 8, spread: 0 };
  }
  return { type, enabled: true, radius: 8 };
}

export function EffectsSection({ nodes }: { nodes: SceneNode[] }): JSX.Element {
  const reference = nodes[0];
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const anchorRef = useRef<DOMRect | null>(null);
  if (!reference) return <></>;

  const allSame = sharedValue(nodes, (n) => n.effects) !== null;
  const effects = reference.effects;

  const mutate = (label: string, next: (current: Effect[]) => Effect[], commit = true): void => {
    const fn = (d: Parameters<typeof applyToSelection>[0]): void =>
      applyToSelection(d, (dd, node) => patchBase(dd, node.id, { effects: next(node.effects) }));
    if (commit) editDoc(label, fn, { mergeKey: 'effects:edit' });
    else updateGesture(fn);
  };

  return (
    <section className="prop-section">
      <header className="prop-section__header">
        <span>Effects</span>
        <button
          className="icon-btn"
          title="Add effect"
          onClick={() => {
            mutate('Add effect', (c) => (allSame ? [...c, makeEffect('drop-shadow')] : [makeEffect('drop-shadow')]));
            setOpenIndex(null);
          }}
        >
          <IPlus size={12} />
        </button>
      </header>

      {!allSame && <div className="prop-mixed-note">Click + to replace mixed effects</div>}

      {allSame &&
        effects.map((effect, index) => (
          <div className={`paint-row${effect.enabled ? '' : ' is-disabled'}`} key={index}>
            <select
              className="select select--grow"
              value={effect.type}
              onChange={(e) =>
                mutate('Change effect', (c) => c.map((fx, i) => (i === index ? makeEffect(e.target.value as EffectType) : fx)))
              }
            >
              {Object.entries(EFFECT_NAMES).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
            <button
              className="icon-btn"
              title="Effect settings"
              onClick={(e) => {
                anchorRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setOpenIndex(openIndex === index ? null : index);
              }}
            >
              ⚙
            </button>
            <button
              className="icon-btn"
              title={effect.enabled ? 'Disable' : 'Enable'}
              onClick={() => mutate('Toggle effect', (c) => c.map((fx, i) => (i === index ? { ...fx, enabled: !effect.enabled } : fx)))}
            >
              {effect.enabled ? <IEye size={12} /> : <IEyeOff size={12} />}
            </button>
            <button
              className="icon-btn"
              title="Remove"
              onClick={() => {
                setOpenIndex(null);
                mutate('Remove effect', (c) => c.filter((_, i) => i !== index));
              }}
            >
              <IMinus size={12} />
            </button>
          </div>
        ))}

      {openIndex !== null && allSame && effects[openIndex] && (
        <Popover
          anchor={anchorRef.current ?? new DOMRect(window.innerWidth - 280, 300, 0, 0)}
          onClose={() => setOpenIndex(null)}
          width={232}
        >
          <EffectControls
            effect={effects[openIndex]}
            onPatch={(patch, commit) =>
              mutate('Edit effect', (c) => c.map((fx, i) => (i === openIndex ? ({ ...fx, ...patch } as Effect) : fx)), commit)
            }
          />
        </Popover>
      )}
    </section>
  );
}

function EffectControls({
  effect,
  onPatch,
}: {
  effect: Effect;
  onPatch: (patch: Partial<Effect>, commit: boolean) => void;
}): JSX.Element {
  if (!isShadowEffect(effect)) {
    return (
      <div className="effect-controls">
        <NumberInput
          label="Blur"
          value={effect.radius}
          min={0}
          max={200}
          flex
          {...effectScrub}
          onChange={(v, commit) => onPatch({ radius: v }, commit)}
        />
      </div>
    );
  }
  const shadow = effect;
  return (
    <div className="effect-controls">
      <div className="prop-row">
        <NumberInput label="X" value={shadow.offsetX} flex {...effectScrub} onChange={(v, c) => onPatch({ offsetX: v }, c)} />
        <NumberInput label="Y" value={shadow.offsetY} flex {...effectScrub} onChange={(v, c) => onPatch({ offsetY: v }, c)} />
      </div>
      <div className="prop-row">
        <NumberInput label="Blur" value={shadow.blur} min={0} max={250} flex {...effectScrub} onChange={(v, c) => onPatch({ blur: v }, c)} />
        <NumberInput label="Spread" value={shadow.spread} min={-100} max={250} flex {...effectScrub} onChange={(v, c) => onPatch({ spread: v }, c)} />
      </div>
      <ColorPicker
        paint={{ type: 'solid', enabled: true, opacity: 1, color: shadow.color }}
        allowGradients={false}
        onChange={(paint, commit) => {
          if (paint.type === 'solid') onPatch({ color: paint.color }, commit);
        }}
      />
    </div>
  );
}
