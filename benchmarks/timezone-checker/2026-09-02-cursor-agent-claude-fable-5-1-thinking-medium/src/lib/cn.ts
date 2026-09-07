export type ClassValue = string | number | false | null | undefined | Record<string, boolean>

/** Tiny class-name joiner: strings, falsy values, and `{ class: condition }` maps. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = []
  for (const value of values) {
    if (!value) continue
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value))
      continue
    }
    for (const [key, enabled] of Object.entries(value)) if (enabled) out.push(key)
  }
  return out.join(' ')
}
