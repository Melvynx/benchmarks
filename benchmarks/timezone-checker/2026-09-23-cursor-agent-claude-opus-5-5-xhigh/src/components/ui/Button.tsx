import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const VARIANTS = {
  primary: 'bg-ink text-surface shadow-sm hover:bg-ink/88',
  secondary: 'border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
} as const

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
} as const

interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
}

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
