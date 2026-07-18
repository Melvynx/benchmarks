import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

export function cx(...classes: readonly (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface ControllableStateOptions<T> {
  value: T | undefined;
  defaultValue: T;
  onChange: ((value: T) => void) | undefined;
}

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: ControllableStateOptions<T>): readonly [T, Dispatch<SetStateAction<T>>] {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = controlled ? value : internalValue;

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (nextValue) => {
      const resolvedValue =
        typeof nextValue === 'function'
          ? (nextValue as (previousValue: T) => T)(currentValue)
          : nextValue;

      if (Object.is(resolvedValue, currentValue)) return;
      if (!controlled) setInternalValue(resolvedValue);
      onChange?.(resolvedValue);
    },
    [controlled, currentValue, onChange],
  );

  return [currentValue, setValue] as const;
}

export function clamp(value: number, minimum = -Infinity, maximum = Infinity): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
