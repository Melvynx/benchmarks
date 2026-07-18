import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  tone?: 'default' | 'danger' | 'primary';
  size?: 'small' | 'medium';
}

export function IconButton({
  label,
  children,
  className = '',
  tone = 'default',
  size = 'medium',
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button icon-button--${tone} icon-button--${size} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
