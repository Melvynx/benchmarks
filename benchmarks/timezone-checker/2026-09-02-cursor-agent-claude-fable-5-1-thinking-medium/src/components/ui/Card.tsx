import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-ink-700/70 bg-ink-850/80 shadow-[0_1px_0_0_rgb(255_255_255/0.03)_inset,0_20px_50px_-30px_rgb(0_0_0/0.8)] backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  )
}
