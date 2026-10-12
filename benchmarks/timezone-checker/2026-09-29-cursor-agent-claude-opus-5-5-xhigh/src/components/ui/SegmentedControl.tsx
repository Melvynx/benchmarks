import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { type KeyboardEvent, useId, useRef } from 'react';
import { cx } from '../../lib/cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

/** Radio group styled as a segmented control, with roving focus and an animated thumb. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const thumbId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = NEXT_KEYS.has(event.key) ? 1 : PREV_KEYS.has(event.key) ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex rounded-xl border border-line bg-sunken p-1', className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              'relative isolate flex flex-1 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors',
              size === 'md' ? 'h-9 px-4 text-sm' : 'h-7 px-3 text-xs',
              checked ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {checked && (
              <motion.span
                layoutId={thumbId}
                aria-hidden
                className="absolute inset-0 -z-10 rounded-lg bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-line"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            {Icon && <Icon className="size-4" aria-hidden />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
