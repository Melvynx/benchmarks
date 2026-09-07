import type { Quake } from "./usgs";

export interface QuakeFeatureProps {
  qid: string;
  mag: number;
  depth: number;
  /** Milliseconds since the event, precomputed so the GPU never waits on JS. */
  age: number;
}

export interface QuakeFeature {
  type: "Feature";
  id: number;
  properties: QuakeFeatureProps;
  geometry: { type: "Point"; coordinates: [number, number] };
}

export interface QuakeCollection {
  type: "FeatureCollection";
  features: QuakeFeature[];
}

export const EMPTY_COLLECTION: QuakeCollection = { type: "FeatureCollection", features: [] };

/**
 * Every quake becomes exactly one point feature at its reported coordinates.
 * Nothing is aggregated, binned, or clustered on the way to the map.
 */
export function toCollection(quakes: Quake[], now: number): QuakeCollection {
  return {
    type: "FeatureCollection",
    features: quakes.map((quake, index) => ({
      type: "Feature",
      id: index,
      properties: {
        qid: quake.id,
        mag: quake.mag,
        depth: quake.depth,
        age: Math.max(0, now - quake.time),
      },
      geometry: { type: "Point", coordinates: [quake.lon, quake.lat] },
    })),
  };
}

export function singleCollection(quake: Quake | null, now: number): QuakeCollection {
  return quake ? toCollection([quake], now) : EMPTY_COLLECTION;
}
