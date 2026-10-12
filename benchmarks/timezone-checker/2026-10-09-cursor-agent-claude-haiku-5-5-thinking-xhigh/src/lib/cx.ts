/** Joins truthy class names. Keeps conditional classes readable without a dependency. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
