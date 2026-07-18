import { useId, type ChangeEvent } from 'react';

import { cx } from './internal';

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  ariaLabel?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  ariaLabel,
  disabled = false,
  name,
  value,
  className,
}: ToggleProps) {
  const descriptionId = useId();
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCheckedChange(event.currentTarget.checked);
  };

  return (
    <label className={cx('ui-toggle', className, disabled && 'ui-toggle--disabled')}>
      <span className="ui-toggle__control">
        <input
          className="ui-toggle__native"
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          name={name}
          value={value}
          aria-label={ariaLabel ?? label}
          aria-describedby={description ? descriptionId : undefined}
        />
        <span className="ui-toggle__track" aria-hidden="true">
          <span className="ui-toggle__thumb" />
        </span>
      </span>
      {label || description ? (
        <span className="ui-toggle__copy">
          {label ? <span className="ui-toggle__label">{label}</span> : null}
          {description ? (
            <span id={descriptionId} className="ui-toggle__description">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
