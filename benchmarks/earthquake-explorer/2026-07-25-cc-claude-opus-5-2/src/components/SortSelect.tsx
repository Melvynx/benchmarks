import { SORT_OPTIONS, type SortKey } from "../lib/filters";

/**
 * Sort order for the event list. It lives in the list header rather than the
 * filter panel because it reorders the list without changing which events are
 * in play — every other control in the panel changes the result set.
 */
export function SortSelect({
  sort,
  onSortChange,
}: {
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}) {
  return (
    <div className="select-wrap select-wrap-inline">
      <select
        className="select select-inline"
        value={sort}
        aria-label="Sort earthquakes"
        onChange={(event) => onSortChange(event.target.value as SortKey)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <svg className="select-chevron" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="m4 6 4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
