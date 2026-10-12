import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge<'bg-pattern'>({
  extend: { classGroups: { 'bg-pattern': ['bg-hatch'] } },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
