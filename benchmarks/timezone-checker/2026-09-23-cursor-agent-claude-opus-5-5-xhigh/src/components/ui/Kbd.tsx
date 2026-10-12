import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center rounded-md border border-current/20 px-1.5 font-mono text-[10px] leading-none font-medium opacity-70',
        className,
      )}
      {...props}
    />
  )
}
