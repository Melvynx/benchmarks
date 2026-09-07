const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = (bLat - aLat) * RAD;
  const dLon = (bLon - aLon) * RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Compass bearing from A to B as one of 16 points. */
export function compassBearing(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): string {
  const dLon = (bLon - aLon) * RAD;
  const y = Math.sin(dLon) * Math.cos(bLat * RAD);
  const x =
    Math.cos(aLat * RAD) * Math.sin(bLat * RAD) -
    Math.sin(aLat * RAD) * Math.cos(bLat * RAD) * Math.cos(dLon);
  const deg = (Math.atan2(y, x) / RAD + 360) % 360;
  const points = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return points[Math.round(deg / 22.5) % 16];
}

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Is a point inside the viewport? Handles a viewport that has been panned
 * across the antimeridian, where `west` can be greater than `east`.
 */
export function withinBounds(lat: number, lon: number, b: Bounds): boolean {
  if (lat < b.south || lat > b.north) return false;
  if (b.east - b.west >= 360) return true;
  const west = normalizeLon(b.west);
  const east = normalizeLon(b.east);
  const point = normalizeLon(lon);
  return west <= east ? point >= west && point <= east : point >= west || point <= east;
}

/** Wrap a longitude into [-180, 180). */
export function normalizeLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}
