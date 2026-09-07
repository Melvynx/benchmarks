export type WindowId = "hour" | "day" | "week" | "month";

export type ColorMode = "magnitude" | "depth";

export type DepthBand = "all" | "shallow" | "intermediate" | "deep";

export type SortKey = "recent" | "strongest" | "felt" | "nearest";

export type BasemapId = "table" | "night";

export type Quake = {
  id: string;
  mag: number | null;
  place: string;
  time: number;
  updated: number;
  url: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  status: string;
  tsunami: boolean;
  sig: number;
  magType: string;
  type: string;
  lon: number;
  lat: number;
  depth: number | null;
  net: string;
  code: string;
};

export type FeedMeta = {
  generated: number;
  title: string;
  count: number;
  url: string;
};

export type Filters = {
  minMag: number;
  depth: DepthBand;
  query: string;
  feltOnly: boolean;
  tsunamiOnly: boolean;
  viewportOnly: boolean;
  timeFrom: number | null;
  timeTo: number | null;
};

export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type Region = {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
};
