import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number | 'mixed';
  onChange: (v: number) => void;
  onCommit?: () => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  prefix?: React.ReactNode;
  className?: string;
  title?: string;
  precision?: number;
}

export const NumberField = ({
  value,
  onChange,
  onCommit,
  step = 1,
  min,
  max,
  suffix,
  prefix,
  className = '',
  title,
  precision = 2,
}: Props): JSX.Element => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    ref.current?.select();
  }, [editing]);

  const format = (n: number): string => {
    if (precision === 0) return Math.round(n).toString();
    return Number(n.toFixed(precision)).toString();
  };

  const displayValue =
    editing
      ? draft
      : value === 'mixed'
        ? 'Mixed'
        : format(value);

  const commit = () => {
    if (!editing) return;
    const n = evaluate(draft);
    if (!Number.isFinite(n)) {
      setEditing(false);
      return;
    }
    const clamped = clamp(n, min, max);
    onChange(clamped);
    setEditing(false);
    onCommit?.();
  };

  return (
    <div className={`flex items-center bg-panel-bgRaised rounded px-1.5 focus-within:border focus-within:border-accent ${className}`} title={title}>
      {prefix && <span className="text-text-tertiary text-xxs mr-1">{prefix}</span>}
      <input
        ref={ref}
        className="bg-transparent text-xs text-text-primary py-1 min-w-0 flex-1 outline-none tabular-nums"
        value={displayValue}
        onFocus={() => {
          setEditing(true);
          setDraft(value === 'mixed' ? '' : format(value));
        }}
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setEditing(false);
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            const curr = evaluate(draft || (value === 'mixed' ? '0' : `${value}`));
            if (Number.isFinite(curr)) {
              const mult = e.shiftKey ? 10 : 1;
              const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * mult;
              const next = clamp(curr + delta, min, max);
              setDraft(format(next));
              onChange(next);
            }
            e.preventDefault();
          }
          e.stopPropagation();
        }}
      />
      {suffix && <span className="text-text-tertiary text-xxs pl-0.5">{suffix}</span>}
    </div>
  );
};

// Evaluates a simple math expression for convenience (e.g. "100 + 20").
const evaluate = (expr: string): number => {
  if (!expr.trim()) return NaN;
  const clean = expr.replace(/[^0-9+\-*/.() %]/g, '');
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${clean});`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : NaN;
  } catch {
    const n = parseFloat(expr);
    return Number.isFinite(n) ? n : NaN;
  }
};

const clamp = (n: number, min?: number, max?: number): number => {
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
};
