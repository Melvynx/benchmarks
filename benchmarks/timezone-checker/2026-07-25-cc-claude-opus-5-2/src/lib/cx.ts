export type ClassValue = string | false | null | undefined;

/** Minimal class joiner — no dependency needed for what this app does. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
