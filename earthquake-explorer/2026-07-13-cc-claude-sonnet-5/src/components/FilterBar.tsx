import { useId, useState } from "react";
import { TIME_RANGES } from "../lib/usgs";
import type { AppFilters, SortKey } from "../lib/urlState";
import type { TimeRangeKey, UsgsAlertLevel } from "../types/earthquake";
import { SearchBox } from "./SearchBox";

const ALERT_OPTIONS: { key: UsgsAlertLevel; label: string; dot: string }[] = [
  { key: "green", label: "Green", dot: "bg-alert-green" },
  { key: "yellow", label: "Yellow", dot: "bg-alert-yellow" },
  { key: "orange", label: "Orange", dot: "bg-alert-orange" },
  { key: "red", label: "Red", dot: "bg-alert-red" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "time-desc", label: "Newest first" },
  { key: "time-asc", label: "Oldest first" },
  { key: "mag-desc", label: "Strongest magnitude" },
  { key: "sig-desc", label: "Most significant" },
];

export interface FilterBarProps {
  filters: AppFilters;
  setFilters: (updater: (prev: AppFilters) => AppFilters) => void;
  isDefault: boolean;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}

export function FilterBar({ filters, setFilters, isDefault, onReset, resultCount, totalCount }: FilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const magId = useId();
  const depthId = useId();
  const sortId = useId();

  function setRange(range: TimeRangeKey) {
    setFilters((prev) => ({ ...prev, range }));
  }
  function toggleAlert(alert: UsgsAlertLevel) {
    setFilters((prev) => ({
      ...prev,
      alerts: prev.alerts.includes(alert) ? prev.alerts.filter((a) => a !== alert) : [...prev.alerts, alert],
    }));
  }

  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filters.minMag > 0) activeChips.push({ label: `M${filters.minMag.toFixed(1)}+`, onRemove: () => setFilters((p) => ({ ...p, minMag: 0 })) });
  if (filters.maxDepth !== null) activeChips.push({ label: `≤ ${filters.maxDepth} km deep`, onRemove: () => setFilters((p) => ({ ...p, maxDepth: null })) });
  filters.alerts.forEach((a) => activeChips.push({ label: `${a} alert`, onRemove: () => toggleAlert(a) }));
  if (filters.tsunamiOnly) activeChips.push({ label: "Tsunami flagged", onRemove: () => setFilters((p) => ({ ...p, tsunamiOnly: false })) });
  if (filters.reviewed) activeChips.push({ label: "Reviewed only", onRemove: () => setFilters((p) => ({ ...p, reviewed: false })) });
  if (filters.place) activeChips.push({ label: `Near ${filters.place.label.split(",")[0]}`, onRemove: () => setFilters((p) => ({ ...p, place: null })) });

  return (
    <div className="border-b border-ink-800 bg-ink-900/70">
      <div className="flex flex-wrap items-center gap-2.5 px-3 py-2.5 sm:px-4">
        <div role="tablist" aria-label="Time range" className="flex rounded-md border border-ink-600 bg-ink-900 p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={filters.range === r.key}
              onClick={() => setRange(r.key)}
              className={`min-h-11 rounded px-3 text-[12.5px] font-medium transition-colors ${
                filters.range === r.key ? "bg-accent text-ink-950" : "text-ink-300 hover:text-ink-50"
              }`}
              title={r.description}
            >
              {r.shortLabel}
            </button>
          ))}
        </div>

        <SearchBox place={filters.place} onChange={(place) => setFilters((p) => ({ ...p, place }))} />

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          aria-controls="advanced-filters"
          className={`flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-[12.5px] font-medium transition-colors ${
            advancedOpen ? "border-accent text-accent" : "border-ink-600 text-ink-200 hover:text-ink-50"
          }`}
        >
          Filters
          {activeChips.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-ink-950">
              {activeChips.length}
            </span>
          )}
        </button>

        <label className="ml-auto flex items-center gap-1.5 text-[12.5px] text-ink-300">
          Sort
          <select
            id={sortId}
            value={filters.sort}
            onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value as SortKey }))}
            className="min-h-11 rounded-md border border-ink-600 bg-ink-900 px-2 text-[12.5px] text-ink-50"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {advancedOpen && (
        <div id="advanced-filters" className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-ink-800 px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={magId} className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
              Minimum magnitude · <span className="tnum text-ink-100">{filters.minMag.toFixed(1)}</span>
            </label>
            <input
              id={magId}
              type="range"
              min={0}
              max={7}
              step={0.5}
              value={filters.minMag}
              onChange={(e) => setFilters((p) => ({ ...p, minMag: Number(e.target.value) }))}
              className="w-40 accent-[#d9a441]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={depthId} className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
              Max depth · <span className="tnum text-ink-100">{filters.maxDepth === null ? "any" : `${filters.maxDepth} km`}</span>
            </label>
            <input
              id={depthId}
              type="range"
              min={0}
              max={700}
              step={10}
              value={filters.maxDepth ?? 700}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFilters((p) => ({ ...p, maxDepth: v >= 700 ? null : v }));
              }}
              className="w-40 accent-[#d9a441]"
            />
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Alert level</legend>
            <div className="flex gap-1.5">
              {ALERT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={filters.alerts.includes(opt.key)}
                  onClick={() => toggleAlert(opt.key)}
                  className={`flex min-h-11 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium ${
                    filters.alerts.includes(opt.key) ? "border-accent text-ink-50" : "border-ink-600 text-ink-300"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${opt.dot}`} aria-hidden="true" />
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex min-h-11 items-center gap-2 text-[12.5px] text-ink-200">
            <input
              type="checkbox"
              checked={filters.tsunamiOnly}
              onChange={(e) => setFilters((p) => ({ ...p, tsunamiOnly: e.target.checked }))}
              className="h-4 w-4 accent-[#d9a441]"
            />
            Tsunami flagged only
          </label>

          <label className="flex min-h-11 items-center gap-2 text-[12.5px] text-ink-200">
            <input
              type="checkbox"
              checked={filters.reviewed}
              onChange={(e) => setFilters((p) => ({ ...p, reviewed: e.target.checked }))}
              className="h-4 w-4 accent-[#d9a441]"
            />
            Reviewed only
          </label>

          {!isDefault && (
            <button
              type="button"
              onClick={onReset}
              className="ml-auto flex min-h-11 items-center gap-1.5 rounded-md border border-ink-600 px-3 text-[12.5px] font-medium text-ink-200 hover:border-alert-red hover:text-alert-red"
            >
              Reset all filters
            </button>
          )}
        </div>
      )}

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-800 px-3 py-2 sm:px-4">
          {activeChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onRemove}
              className="flex items-center gap-1 rounded-full border border-ink-600 bg-ink-850 px-2.5 py-1 text-[11.5px] text-ink-100 hover:border-accent"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      <p className="tnum px-3 pb-2 text-[11.5px] text-ink-400 sm:px-4" aria-live="polite">
        Showing {resultCount.toLocaleString()} of {totalCount.toLocaleString()} events
      </p>
    </div>
  );
}
