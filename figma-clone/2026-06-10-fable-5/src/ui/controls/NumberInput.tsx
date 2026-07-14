import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { clamp, roundTo } from '../../geometry/math';
import { evaluateExpression } from '../../utils/expr';

export interface NumberInputProps {
  /** null renders the Figma-style "Mixed" placeholder. */
  value: number | null;
  onChange: (value: number, commit: boolean) => void;
  /** Pointer-drag on the label scrubs the value. */
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  label?: ReactNode;
  title?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  placeholder?: string;
  /** Display-only suffix, e.g. "%" or "°". */
  suffix?: string;
  flex?: boolean;
}

/**
 * Figma-style numeric field: arithmetic expressions ("120/3+8") on commit,
 * arrow-key stepping (Shift ×10), and drag-to-scrub on the label.
 */
export function NumberInput(props: NumberInputProps): JSX.Element {
  const {
    value,
    onChange,
    onScrubStart,
    onScrubEnd,
    label,
    title,
    min = -Infinity,
    max = Infinity,
    step = 1,
    precision = 2,
    disabled = false,
    placeholder,
    suffix = '',
    flex = false,
  } = props;

  const [text, setText] = useState<string | null>(null); // null = not editing
  const scrub = useRef<{ startX: number; startValue: number; moved: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const display = value === null ? '' : `${roundTo(value, precision)}${suffix}`;

  const commitText = (raw: string): void => {
    const cleaned = suffix ? raw.replace(suffix, '') : raw;
    const parsed = evaluateExpression(cleaned);
    if (parsed !== null) onChange(clamp(parsed, min, max), true);
    setText(null);
  };

  const stepBy = (direction: 1 | -1, big: boolean): void => {
    const base = value ?? 0;
    const amount = step * (big ? 10 : 1) * direction;
    onChange(clamp(roundTo(base + amount, precision), min, max), true);
    setText(null);
  };

  // Label scrubbing.
  const onLabelPointerDown = (e: React.PointerEvent<HTMLSpanElement>): void => {
    if (disabled || value === null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    scrub.current = { startX: e.clientX, startValue: value, moved: false };
  };
  const onLabelPointerMove = (e: React.PointerEvent<HTMLSpanElement>): void => {
    const s = scrub.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    if (!s.moved && Math.abs(dx) < 2) return;
    if (!s.moved) {
      s.moved = true;
      onScrubStart?.();
    }
    const factor = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    onChange(clamp(roundTo(s.startValue + dx * step * factor, precision), min, max), false);
  };
  const onLabelPointerUp = (): void => {
    const s = scrub.current;
    scrub.current = null;
    if (s?.moved) onScrubEnd?.();
  };

  useEffect(() => {
    // External changes while not editing simply re-render via `display`.
  }, [display]);

  return (
    <label className={`num-input${disabled ? ' is-disabled' : ''}${flex ? ' is-flex' : ''}`} title={title}>
      {label !== undefined && (
        <span
          className="num-input__label"
          onPointerDown={onLabelPointerDown}
          onPointerMove={onLabelPointerMove}
          onPointerUp={onLabelPointerUp}
        >
          {label}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        spellCheck={false}
        disabled={disabled}
        value={text ?? display}
        placeholder={value === null ? (placeholder ?? 'Mixed') : placeholder}
        onFocus={(e) => {
          setText(value === null ? '' : String(roundTo(value, precision)));
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => {
          if (text !== null && text !== '') commitText(e.target.value);
          else setText(null);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            commitText((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setText(null);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            stepBy(1, e.shiftKey);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            stepBy(-1, e.shiftKey);
          }
        }}
      />
    </label>
  );
}
