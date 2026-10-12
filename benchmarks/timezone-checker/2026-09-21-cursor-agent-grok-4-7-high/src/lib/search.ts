import { CITIES, REGIONS, type City, type Region } from "../data/cities";

export function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function filterCities(query: string, cities: City[] = CITIES): City[] {
  const needle = fold(query.trim());
  if (!needle) return cities;
  return cities.filter(
    (city) => fold(city.name).includes(needle) || fold(city.country).includes(needle),
  );
}

export function groupByRegion(cities: City[]): { region: Region; cities: City[] }[] {
  return REGIONS.map((region) => ({
    region,
    cities: cities.filter((city) => city.region === region),
  })).filter((group) => group.cities.length > 0);
}
