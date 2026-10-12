export type Region = {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
  contains: (lon: number, lat: number) => boolean;
};

function box(west: number, south: number, east: number, north: number) {
  return (lon: number, lat: number) => lon >= west && lon <= east && lat >= south && lat <= north;
}

export const REGIONS: readonly Region[] = [
  {
    id: 'world',
    label: 'World',
    center: [168, 6],
    zoom: 1.55,
    contains: () => true,
  },
  {
    id: 'california',
    label: 'California',
    center: [-119.4, 37.2],
    zoom: 5.2,
    contains: box(-125.5, 32.2, -114, 42.2),
  },
  {
    id: 'alaska',
    label: 'Alaska',
    center: [-152, 62],
    zoom: 3.45,
    contains: (lon, lat) =>
      (lat >= 54 && lat <= 72 && lon <= -130 && lon >= -170) ||
      (lat >= 51 && lat <= 56 && (lon <= -165 || lon >= 170)),
  },
  {
    id: 'japan',
    label: 'Japan',
    center: [138.2, 36.5],
    zoom: 4.5,
    contains: box(128, 30, 147, 46),
  },
  {
    id: 'indonesia',
    label: 'Indonesia',
    center: [118, -2],
    zoom: 3.9,
    contains: box(95, -11, 141, 6.5),
  },
  {
    id: 'chile',
    label: 'Chile',
    center: [-71, -32],
    zoom: 3.6,
    contains: box(-76.5, -56, -66, -17),
  },
  {
    id: 'mediterranean',
    label: 'Mediterranean',
    center: [16, 37.5],
    zoom: 4.15,
    contains: box(-10, 30, 36, 45.5),
  },
  {
    id: 'newzealand',
    label: 'New Zealand',
    center: [173.5, -41],
    zoom: 4.7,
    contains: box(165, -48, 180, -34),
  },
  {
    id: 'iceland',
    label: 'Iceland',
    center: [-18.5, 64.8],
    zoom: 5.1,
    contains: box(-25.5, 63, -13, 67.2),
  },
];

export function regionById(id: string): Region {
  return REGIONS.find((region) => region.id === id) ?? REGIONS[0];
}
