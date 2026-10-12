export type WindowId = 'hour' | 'day' | 'week' | 'month';

export type DepthId = 'any' | 'shallow' | 'intermediate' | 'deep';

export type SortId = 'newest' | 'largest' | 'shallowest' | 'deepest';

export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red';

export type Quake = {
  id: string;
  mag: number;
  place: string;
  time: number;
  updated: number;
  url: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: AlertLevel | null;
  status: string;
  tsunami: boolean;
  sig: number;
  magType: string;
  type: string;
  nst: number | null;
  rms: number | null;
  gap: number | null;
  dmin: number | null;
  lon: number;
  lat: number;
  depth: number;
};

export type FeedMeta = {
  generated: number;
  title: string;
  count: number;
};
