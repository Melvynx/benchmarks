import type { CSSProperties } from 'react';
import {
  PARAM_SPECS,
  PRESETS,
  type ParamGroup,
  type ParamKey,
  type ParamSpec,
  type Params,
  type Preset,
} from '../sim/params';

const GROUPS: { id: ParamGroup; title: string; accent: string }[] = [
  { id: 'fruit', title: 'Fruit trees', accent: 'var(--green)' },
  { id: 'blue', title: 'Blue blobs', accent: 'var(--blue)' },
  { id: 'red', title: 'Red blobs', accent: 'var(--red)' },
  { id: 'world', title: 'Garden', accent: 'var(--ink)' },
];

function decimals(step: number): number {
  const s = String(step);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

function formatValue(spec: ParamSpec, v: number): string {
  const text = v.toFixed(decimals(spec.step));
  return spec.unit ? `${text} ${spec.unit}` : text;
}

interface ControlsProps {
  draft: Params;
  applied: Params;
  onChange: (key: ParamKey, value: number) => void;
  onPreset: (preset: Preset) => void;
  onApply: () => void;
}

export function Controls({ draft, applied, onChange, onPreset, onApply }: ControlsProps) {
  const pending = PARAM_SPECS.some((s) => s.reset && draft[s.key] !== applied[s.key]);

  return (
    <div className="controls">
      <section className="card">
        <h2>Presets</h2>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button key={p.id} className="chip-btn" title={p.blurb} onClick={() => onPreset(p)}>
              {p.name}
            </button>
          ))}
        </div>
        {pending && (
          <button className="btn primary wide" onClick={onApply}>
            Start fresh garden
          </button>
        )}
      </section>

      {GROUPS.map((g) => (
        <section key={g.id} className="card" style={{ '--accent': g.accent } as CSSProperties}>
          <h2>{g.title}</h2>
          {PARAM_SPECS.filter((s) => s.group === g.id).map((spec) => {
            const changed = draft[spec.key] !== applied[spec.key];
            const tag = spec.reset && changed ? <em className="pending">new garden</em> : null;
            if (spec.key === 'seed') {
              return (
                <label key={spec.key} className="field">
                  <span className="field-top">
                    <span>
                      {spec.label}
                      {tag}
                    </span>
                  </span>
                  <input
                    type="number"
                    min={spec.min}
                    max={spec.max}
                    step={1}
                    value={draft.seed}
                    onChange={(e) => onChange('seed', Math.max(spec.min, Math.min(spec.max, Math.round(Number(e.target.value) || spec.min))))}
                  />
                </label>
              );
            }
            return (
              <label key={spec.key} className="slider">
                <span className="field-top">
                  <span>
                    {spec.label}
                    {tag}
                  </span>
                  <output>{formatValue(spec, draft[spec.key])}</output>
                </span>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={draft[spec.key]}
                  onChange={(e) => onChange(spec.key, Number(e.target.value))}
                />
              </label>
            );
          })}
        </section>
      ))}
    </div>
  );
}
