import { useCallback, useEffect, useState } from "react";
import type { TimeRangeKey, UsgsAlertLevel } from "../types/earthquake";

export type SortKey = "time-desc" | "time-asc" | "mag-desc" | "sig-desc";

export interface PlaceFilter {
  label: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface AppFilters {
  range: TimeRangeKey;
  minMag: number;
  maxDepth: number | null;
  alerts: UsgsAlertLevel[];
  tsunamiOnly: boolean;
  reviewed: boolean; // true = reviewed-only
  sort: SortKey;
  place: PlaceFilter | null;
  selected: string | null;
}

export const DEFAULT_FILTERS: AppFilters = {
  range: "week",
  minMag: 0,
  maxDepth: null,
  alerts: [],
  tsunamiOnly: false,
  reviewed: false,
  sort: "time-desc",
  place: null,
  selected: null,
};

function parseFilters(search: string): AppFilters {
  const p = new URLSearchParams(search);
  const range = p.get("range");
  const alertsRaw = p.get("alert");
  const lat = p.get("lat");
  const lon = p.get("lon");
  const radius = p.get("radius");
  const q = p.get("q");

  return {
    range: (range === "hour" || range === "day" || range === "week" || range === "month" ? range : DEFAULT_FILTERS.range),
    minMag: clampNumber(p.get("minMag"), DEFAULT_FILTERS.minMag, -2, 10),
    maxDepth: p.has("maxDepth") ? clampNumber(p.get("maxDepth"), 700, 0, 700) : null,
    alerts: alertsRaw
      ? (alertsRaw.split(",").filter((a) => ["green", "yellow", "orange", "red"].includes(a)) as UsgsAlertLevel[])
      : [],
    tsunamiOnly: p.get("tsunami") === "1",
    reviewed: p.get("status") === "reviewed",
    sort: (["time-desc", "time-asc", "mag-desc", "sig-desc"].includes(p.get("sort") ?? "")
      ? (p.get("sort") as SortKey)
      : DEFAULT_FILTERS.sort),
    place: lat && lon && q ? { label: q, lat: Number(lat), lon: Number(lon), radiusKm: radius ? Number(radius) : 500 } : null,
    selected: p.get("id"),
  };
}

function clampNumber(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function serializeFilters(f: AppFilters): string {
  const p = new URLSearchParams();
  if (f.range !== DEFAULT_FILTERS.range) p.set("range", f.range);
  if (f.minMag !== DEFAULT_FILTERS.minMag) p.set("minMag", String(f.minMag));
  if (f.maxDepth !== null) p.set("maxDepth", String(f.maxDepth));
  if (f.alerts.length) p.set("alert", f.alerts.join(","));
  if (f.tsunamiOnly) p.set("tsunami", "1");
  if (f.reviewed) p.set("status", "reviewed");
  if (f.sort !== DEFAULT_FILTERS.sort) p.set("sort", f.sort);
  if (f.place) {
    p.set("q", f.place.label);
    p.set("lat", f.place.lat.toFixed(4));
    p.set("lon", f.place.lon.toFixed(4));
    p.set("radius", String(f.place.radiusKm));
  }
  if (f.selected) p.set("id", f.selected);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useUrlFilters() {
  const [filters, setFiltersState] = useState<AppFilters>(() => parseFilters(window.location.search));

  useEffect(() => {
    const onPop = () => setFiltersState(parseFilters(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setFilters = useCallback((updater: (prev: AppFilters) => AppFilters, replace = false) => {
    setFiltersState((prev) => {
      const next = updater(prev);
      const url = `${window.location.pathname}${serializeFilters(next)}${window.location.hash}`;
      if (replace) {
        window.history.replaceState(null, "", url);
      } else {
        window.history.pushState(null, "", url);
      }
      return next;
    });
  }, []);

  const isDefault =
    filters.range === DEFAULT_FILTERS.range &&
    filters.minMag === DEFAULT_FILTERS.minMag &&
    filters.maxDepth === DEFAULT_FILTERS.maxDepth &&
    filters.alerts.length === 0 &&
    !filters.tsunamiOnly &&
    !filters.reviewed &&
    filters.sort === DEFAULT_FILTERS.sort &&
    !filters.place;

  return { filters, setFilters, isDefault };
}
