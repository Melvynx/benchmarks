import { useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';

import { cx } from './internal';

export interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
  ariaLabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<Value extends string> {
  value: Value;
  options: readonly SegmentOption<Value>[];
  onValueChange: (value: Value) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  grow?: boolean;
}

export function SegmentedControl<Value extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  disabled = false,
  className,
  grow = false,
}: SegmentedControlProps<Value>) {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveSelection = (event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const enabledIndices = options.flatMap((option, index) =>
      option.disabled || disabled ? [] : [index],
    );
    if (enabledIndices.length === 0) return;

    const currentEnabledIndex = enabledIndices.indexOf(currentIndex);
    let targetPosition = currentEnabledIndex < 0 ? 0 : currentEnabledIndex;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetPosition = (targetPosition + 1) % enabledIndices.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetPosition = (targetPosition - 1 + enabledIndices.length) % enabledIndices.length;
        break;
      case 'Home':
        targetPosition = 0;
        break;
      case 'End':
        targetPosition = enabledIndices.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const targetIndex = enabledIndices[targetPosition];
    if (targetIndex === undefined) return;
    const targetOption = options[targetIndex];
    if (!targetOption) return;
    onValueChange(targetOption.value);
    optionRefs.current[targetIndex]?.focus();
  };

  return (
    <div
      className={cx('ui-segmented', grow && 'ui-segmented--grow', className)}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            key={option.value}
            type="button"
            className="ui-segmented__option"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel ?? option.label}
            disabled={disabled || option.disabled}
            tabIndex={selected ? 0 : -1}
            data-selected={selected ? '' : undefined}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => moveSelection(event, index)}
          >
            {option.icon ? (
              <span className="ui-segmented__icon" aria-hidden="true">
                {option.icon}
              </span>
            ) : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
