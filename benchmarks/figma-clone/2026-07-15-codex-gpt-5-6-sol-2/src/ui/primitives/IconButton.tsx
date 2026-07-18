import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cx } from './internal';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label'
> {
  label: string;
  icon: ReactNode;
  shortcut?: string;
  tooltipSide?: TooltipSide;
  active?: boolean;
  wrapperClassName?: string;
}

export function IconButton({
  label,
  icon,
  shortcut,
  tooltipSide = 'bottom',
  active = false,
  type = 'button',
  className,
  wrapperClassName,
  ...buttonProps
}: IconButtonProps) {
  const tooltipId = useId();

  return (
    <span className={cx('ui-icon-button-wrap', wrapperClassName)}>
      <button
        {...buttonProps}
        type={type}
        className={cx('ui-icon-button', className)}
        aria-label={label}
        aria-describedby={tooltipId}
        aria-pressed={buttonProps['aria-pressed'] ?? (active ? true : undefined)}
        data-active={active ? '' : undefined}
      >
        <span className="ui-icon-button__glyph" aria-hidden="true">
          {icon}
        </span>
      </button>
      <span id={tooltipId} role="tooltip" className="ui-tooltip" data-side={tooltipSide}>
        <span>{label}</span>
        {shortcut ? <kbd>{shortcut}</kbd> : null}
      </span>
    </span>
  );
}
