export type AlertLevel = "green" | "yellow" | "orange" | "red";

export type Quake = {
  id: string;
  mag: number | null;
  place: string | null;
  time: number;
  updated: number;
  url: string | null;
  detail: string | null;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: AlertLevel | null;
  status: string | null;
  tsunami: boolean;
  sig: number | null;
  type: string;
  title: string;
  lon: number;
  lat: number;
  depth: number | null;
};

export type Period = "hour" | "day" | "week" | "month";

export type DepthBand = "any" | "shallow" | "intermediate" | "deep";

export type SortKey = "time" | "mag" | "sig";

export type Filters = {
  minMag: number;
  depth: DepthBand;
  alert: "any" | AlertLevel;
  tsunamiOnly: boolean;
  status: "any" | "reviewed" | "automatic";
  quakesOnly: boolean;
  query: string;
  inView: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  minMag: 0,
  depth: "any",
  alert: "any",
  tsunamiOnly: false,
  status: "any",
  quakesOnly: false,
  query: "",
  inView: false,
};

export type Brush = { start: number; end: number } | null;

export type FeedResult = {
  quakes: Quake[];
  generated: number | null;
  fetchedAt: number;
  title: string | null;
};

export type MapViewport = {
  center: [number, number];
  zoom: number;
  bounds: [number, number, number, number] | null; // W, S, E, N
};
