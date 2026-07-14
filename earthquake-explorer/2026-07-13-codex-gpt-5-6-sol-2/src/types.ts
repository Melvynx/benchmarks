export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red' | null;

export interface EarthquakeProperties {
  mag: number | null;
  place: string | null;
  time: number;
  updated: number;
  tz: number | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: AlertLevel;
  status: string;
  tsunami: number;
  sig: number;
  net: string;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
  gap: number | null;
  magType: string | null;
  type: string;
  title: string;
}

export interface EarthquakeFeature {
  type: 'Feature';
  properties: EarthquakeProperties;
  geometry: { type: 'Point'; coordinates: [number, number, number] };
  id: string;
}

export interface EarthquakeFeed {
  type: 'FeatureCollection';
  metadata: { generated: number; url: string; title: string; status: number; count: number };
  features: EarthquakeFeature[];
  bbox: [number, number, number, number, number, number];
}

export type Period = 'hour' | 'day' | 'week' | 'month';
export type SortKey = 'time' | 'magnitude' | 'significance' | 'depth';

export interface Filters {
  minMagnitude: number;
  maxDepth: number;
  alert: 'all' | 'issued' | 'green' | 'yellow' | 'orange' | 'red';
  tsunami: 'all' | 'yes' | 'no';
  status: 'all' | 'reviewed' | 'automatic';
  area: string;
}

export interface AreaDefinition {
  label: string;
  bounds?: [number, number, number, number];
}

export interface TimeWindow { start: number; end: number }
