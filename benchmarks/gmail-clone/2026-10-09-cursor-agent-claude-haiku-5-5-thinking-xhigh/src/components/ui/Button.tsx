import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary',
        size === 'sm' ? 'h-8 px-3.5 text-sm' : 'h-10 px-5 text-sm',
        variant === 'primary' && 'bg-primary text-on-primary shadow-sm hover:brightness-110',
        variant === 'secondary' && 'border border-line bg-surface text-primary hover:bg-hover',
        variant === 'ghost' && 'text-primary hover:bg-primary-soft/60',
        variant === 'danger' && 'bg-danger text-white hover:brightness-110',
        className,
      )}
      {...rest}
    />
  );
}
