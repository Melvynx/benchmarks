import { useEffect, useState, type CSSProperties } from 'react';
import type { ParamSpec } from '../sim/params';

interface Props {
  spec: ParamSpec;
  value: number;
  tone?: 'fruit' | 'blue' | 'red' | 'world';
  onChange: (value: number) => void;
}

export function ParamSlider({ spec, value, tone = 'world', onChange }: Props) {
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const digits = spec.digits ?? 1;
  const pct = ((shown - spec.min) / (spec.max - spec.min)) * 100;
  const commit = () => {
    if (draft !== null && draft !== value) onChange(draft);
    setDraft(null);
  };

  return (
    <label className={`slider tone-${tone}`} title={spec.hint}>
      <span className="slider-top">
        <span className="slider-name">{spec.label}</span>
        <output>
          {shown.toFixed(digits)}
          {spec.unit ? <small>{spec.unit}</small> : null}
        </output>
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={shown}
        style={{ '--p': `${pct}%` } as CSSProperties}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (spec.rebuilds) setDraft(v);
          else onChange(v);
        }}
        onPointerUp={spec.rebuilds ? commit : undefined}
        onKeyUp={spec.rebuilds ? commit : undefined}
        onBlur={spec.rebuilds ? commit : undefined}
      />
      {spec.rebuilds && <span className="slider-hint">restarts the garden</span>}
    </label>
  );
}
