/** Trim and return undefined when empty — use at query boundaries. */
export const normalizeSearchTerm = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/** Case-insensitive substring match for admin and in-app search filters. */
export const includesSearch = (value: unknown, search: string) => {
  const normalized = normalizeSearchTerm(search);
  if (!normalized) return true;
  return String(value ?? "")
    .toLocaleLowerCase()
    .includes(normalized.toLocaleLowerCase());
};

/** True when any field matches the search term (case-insensitive). */
export const matchesAnySearch = (
  search: string | undefined,
  ...values: unknown[]
) => {
  const normalized = normalizeSearchTerm(search);
  if (!normalized) return true;
  return values.some((value) => includesSearch(value, normalized));
};
