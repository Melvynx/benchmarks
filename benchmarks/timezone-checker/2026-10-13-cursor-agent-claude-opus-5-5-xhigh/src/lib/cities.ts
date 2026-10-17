export type Region =
  | "North America"
  | "South America"
  | "Europe"
  | "Africa"
  | "Middle East"
  | "Asia"
  | "Oceania";

export interface City {
  id: string;
  name: string;
  country: string;
  region: Region;
  timeZone: string;
  aliases?: readonly string[];
}

export const REGIONS: readonly Region[] = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Middle East",
  "Asia",
  "Oceania",
];

export const CITIES: readonly City[] = [
  { id: "honolulu", name: "Honolulu", country: "United States", region: "North America", timeZone: "Pacific/Honolulu", aliases: ["hawaii"] },
  { id: "san-francisco", name: "San Francisco", country: "United States", region: "North America", timeZone: "America/Los_Angeles", aliases: ["sf", "bay area", "los angeles", "la", "seattle", "pacific"] },
  { id: "denver", name: "Denver", country: "United States", region: "North America", timeZone: "America/Denver", aliases: ["mountain"] },
  { id: "chicago", name: "Chicago", country: "United States", region: "North America", timeZone: "America/Chicago", aliases: ["central", "austin", "dallas"] },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", region: "North America", timeZone: "America/Mexico_City", aliases: ["cdmx"] },
  { id: "new-york", name: "New York", country: "United States", region: "North America", timeZone: "America/New_York", aliases: ["nyc", "eastern", "toronto", "boston", "miami"] },

  { id: "bogota", name: "Bogotá", country: "Colombia", region: "South America", timeZone: "America/Bogota", aliases: ["lima"] },
  { id: "santiago", name: "Santiago", country: "Chile", region: "South America", timeZone: "America/Santiago" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", region: "South America", timeZone: "America/Argentina/Buenos_Aires" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", region: "South America", timeZone: "America/Sao_Paulo", aliases: ["rio"] },

  { id: "london", name: "London", country: "United Kingdom", region: "Europe", timeZone: "Europe/London", aliases: ["uk", "england", "dublin"] },
  { id: "lisbon", name: "Lisbon", country: "Portugal", region: "Europe", timeZone: "Europe/Lisbon" },
  { id: "paris", name: "Paris", country: "France", region: "Europe", timeZone: "Europe/Paris" },
  { id: "berlin", name: "Berlin", country: "Germany", region: "Europe", timeZone: "Europe/Berlin", aliases: ["amsterdam", "madrid", "rome"] },
  { id: "geneva", name: "Geneva", country: "Switzerland", region: "Europe", timeZone: "Europe/Zurich", aliases: ["zurich", "genève"] },
  { id: "athens", name: "Athens", country: "Greece", region: "Europe", timeZone: "Europe/Athens", aliases: ["kyiv", "helsinki"] },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", region: "Europe", timeZone: "Europe/Istanbul", aliases: ["turkey"] },

  { id: "lagos", name: "Lagos", country: "Nigeria", region: "Africa", timeZone: "Africa/Lagos" },
  { id: "cairo", name: "Cairo", country: "Egypt", region: "Africa", timeZone: "Africa/Cairo" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", region: "Africa", timeZone: "Africa/Johannesburg", aliases: ["cape town"] },
  { id: "nairobi", name: "Nairobi", country: "Kenya", region: "Africa", timeZone: "Africa/Nairobi" },

  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", region: "Middle East", timeZone: "Asia/Jerusalem", aliases: ["jerusalem"] },
  { id: "tehran", name: "Tehran", country: "Iran", region: "Middle East", timeZone: "Asia/Tehran" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", region: "Middle East", timeZone: "Asia/Dubai", aliases: ["uae", "abu dhabi"] },

  { id: "mumbai", name: "Mumbai", country: "India", region: "Asia", timeZone: "Asia/Kolkata", aliases: ["bombay", "delhi", "bangalore", "bengaluru", "kolkata"] },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", region: "Asia", timeZone: "Asia/Kathmandu" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", region: "Asia", timeZone: "Asia/Bangkok", aliases: ["ho chi minh", "jakarta"] },
  { id: "singapore", name: "Singapore", country: "Singapore", region: "Asia", timeZone: "Asia/Singapore", aliases: ["kuala lumpur"] },
  { id: "hong-kong", name: "Hong Kong", country: "China", region: "Asia", timeZone: "Asia/Hong_Kong", aliases: ["shanghai", "beijing", "shenzhen", "taipei"] },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", region: "Asia", timeZone: "Asia/Makassar", aliases: ["bali", "canggu", "ubud"] },
  { id: "tokyo", name: "Tokyo", country: "Japan", region: "Asia", timeZone: "Asia/Tokyo", aliases: ["seoul", "osaka"] },

  { id: "adelaide", name: "Adelaide", country: "Australia", region: "Oceania", timeZone: "Australia/Adelaide" },
  { id: "sydney", name: "Sydney", country: "Australia", region: "Oceania", timeZone: "Australia/Sydney", aliases: ["melbourne"] },
  { id: "auckland", name: "Auckland", country: "New Zealand", region: "Oceania", timeZone: "Pacific/Auckland", aliases: ["nz", "wellington"] },
];

export const DEFAULT_CITY_IDS: readonly string[] = ["san-francisco", "denpasar", "geneva"];

const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export function getCity(id: string): City | undefined {
  return CITY_BY_ID.get(id);
}

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Ranks catalog cities against a query. Name-prefix matches come first, then
 * country/alias matches, so "san" surfaces San Francisco before Santiago's country.
 */
export function searchCities(query: string): City[] {
  const q = normalizeSearch(query);
  if (!q) return [...CITIES];

  const scored: Array<{ city: City; score: number }> = [];
  for (const city of CITIES) {
    const name = normalizeSearch(city.name);
    const country = normalizeSearch(city.country);
    const aliases = (city.aliases ?? []).map(normalizeSearch);

    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (name.split(/\s+/).some((word) => word.startsWith(q))) score = 1;
    else if (country.startsWith(q) || country.split(/\s+/).some((word) => word.startsWith(q))) score = 2;
    else if (aliases.some((alias) => alias.startsWith(q))) score = 3;
    else if (name.includes(q) || country.includes(q)) score = 4;

    if (score >= 0) scored.push({ city, score });
  }

  return scored.sort((a, b) => a.score - b.score).map(({ city }) => city);
}
