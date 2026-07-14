import type { Brush, Filters, Period, SortKey } from "../types";
import { DEFAULT_FILTERS } from "../types";

export type UrlState = {
  period: Period;
  filters: Filters;
  sort: SortKey;
  brush: Brush;
  selectedId: string | null;
};

export const DEFAULT_URL_STATE: UrlState = {
  period: "day",
  filters: DEFAULT_FILTERS,
  sort: "time",
  brush: null,
  selectedId: null,
};

const PERIODS = new Set(["hour", "day", "week", "month"]);
const DEPTHS = new Set(["any", "shallow", "intermediate", "deep"]);
const ALERTS = new Set(["any", "green", "yellow", "orange", "red"]);
const STATUSES = new Set(["any", "reviewed", "automatic"]);
const SORTS = new Set(["time", "mag", "sig"]);

export function readUrlState(): UrlState {
  const p = new URLSearchParams(window.location.search);
  const num = (key: string): number | null => {
    const raw = p.get(key);
    if (raw == null) return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  };
  const pick = <T extends string>(key: string, valid: Set<string>, fallback: T): T => {
    const raw = p.get(key);
    return raw && valid.has(raw) ? (raw as T) : fallback;
  };

  const brushStart = num("from");
  const brushEnd = num("to");
  return {
    period: pick("period", PERIODS, DEFAULT_URL_STATE.period),
    sort: pick("sort", SORTS, DEFAULT_URL_STATE.sort),
    selectedId: p.get("event"),
    brush:
      brushStart != null && brushEnd != null && brushEnd > brushStart
        ? { start: brushStart, end: brushEnd }
        : null,
    filters: {
      minMag: Math.min(8, Math.max(0, num("minmag") ?? DEFAULT_FILTERS.minMag)),
      depth: pick("depth", DEPTHS, DEFAULT_FILTERS.depth),
      alert: pick("alert", ALERTS, DEFAULT_FILTERS.alert),
      tsunamiOnly: p.get("tsunami") === "1",
      status: pick("status", STATUSES, DEFAULT_FILTERS.status),
      quakesOnly: p.get("quakes") === "1",
      query: p.get("q") ?? "",
      inView: p.get("inview") === "1",
    },
  };
}

export function writeUrlState(state: UrlState): void {
  const p = new URLSearchParams();
  const { period, filters, sort, brush, selectedId } = state;
  if (period !== DEFAULT_URL_STATE.period) p.set("period", period);
  if (filters.minMag !== DEFAULT_FILTERS.minMag) p.set("minmag", String(filters.minMag));
  if (filters.depth !== DEFAULT_FILTERS.depth) p.set("depth", filters.depth);
  if (filters.alert !== DEFAULT_FILTERS.alert) p.set("alert", filters.alert);
  if (filters.tsunamiOnly) p.set("tsunami", "1");
  if (filters.status !== DEFAULT_FILTERS.status) p.set("status", filters.status);
  if (filters.quakesOnly) p.set("quakes", "1");
  if (filters.query) p.set("q", filters.query);
  if (filters.inView) p.set("inview", "1");
  if (sort !== DEFAULT_URL_STATE.sort) p.set("sort", sort);
  if (brush) {
    p.set("from", String(Math.round(brush.start)));
    p.set("to", String(Math.round(brush.end)));
  }
  if (selectedId) p.set("event", selectedId);
  const qs = p.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  const current = `${window.location.pathname}${window.location.search}`;
  if (next !== current) window.history.replaceState(null, "", next);
}
