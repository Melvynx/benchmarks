// USGS GeoJSON feed types — see https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php

export type UsgsAlertLevel = "green" | "yellow" | "orange" | "red";
export type UsgsReviewStatus = "automatic" | "reviewed" | "deleted";

export interface UsgsFeatureProperties {
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
  alert: UsgsAlertLevel | null;
  status: UsgsReviewStatus;
  tsunami: 0 | 1;
  sig: number | null;
  net: string | null;
  code: string | null;
  ids: string | null;
  sources: string | null;
  types: string | null;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
  gap: number | null;
  magType: string | null;
  type: string;
  title: string;
}

export interface UsgsFeature {
  type: "Feature";
  id: string;
  properties: UsgsFeatureProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number, number]; // lon, lat, depth(km)
  };
}

export interface UsgsFeedMetadata {
  generated: number;
  url: string;
  title: string;
  status: number;
  api: string;
  count: number;
}

export interface UsgsFeedCollection {
  type: "FeatureCollection";
  metadata: UsgsFeedMetadata;
  bbox?: number[];
  features: UsgsFeature[];
}

/** Normalized, application-level representation of a single earthquake event. */
export interface EarthquakeEvent {
  id: string;
  magnitude: number | null;
  magType: string | null;
  place: string;
  title: string;
  timeMs: number;
  updatedMs: number;
  longitude: number;
  latitude: number;
  depthKm: number | null;
  alert: UsgsAlertLevel | null;
  status: UsgsReviewStatus;
  tsunami: boolean;
  significance: number | null;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  type: string;
  url: string;
  detailUrl: string;
  gap: number | null;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
}

export type TimeRangeKey = "hour" | "day" | "week" | "month";

export interface TimeRangeOption {
  key: TimeRangeKey;
  label: string;
  shortLabel: string;
  feedUrl: string;
  description: string;
}
