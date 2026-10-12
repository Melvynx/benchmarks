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
  /** IANA time zone identifier, resolved through Intl so DST is always current. */
  timeZone: string;
  /** Extra search terms: nicknames, former names, nearby areas. */
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
  // North America
  { id: "honolulu", name: "Honolulu", country: "United States", region: "North America", timeZone: "Pacific/Honolulu", aliases: ["Hawaii"] },
  { id: "san-francisco", name: "San Francisco", country: "United States", region: "North America", timeZone: "America/Los_Angeles", aliases: ["SF", "Bay Area", "Silicon Valley"] },
  { id: "denver", name: "Denver", country: "United States", region: "North America", timeZone: "America/Denver" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", region: "North America", timeZone: "America/Mexico_City", aliases: ["CDMX"] },
  { id: "chicago", name: "Chicago", country: "United States", region: "North America", timeZone: "America/Chicago" },
  { id: "new-york", name: "New York", country: "United States", region: "North America", timeZone: "America/New_York", aliases: ["NYC", "Manhattan", "Brooklyn"] },

  // South America
  { id: "bogota", name: "Bogotá", country: "Colombia", region: "South America", timeZone: "America/Bogota" },
  { id: "santiago", name: "Santiago", country: "Chile", region: "South America", timeZone: "America/Santiago" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", region: "South America", timeZone: "America/Argentina/Buenos_Aires" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", region: "South America", timeZone: "America/Sao_Paulo" },

  // Europe
  { id: "london", name: "London", country: "United Kingdom", region: "Europe", timeZone: "Europe/London", aliases: ["UK", "England"] },
  { id: "lisbon", name: "Lisbon", country: "Portugal", region: "Europe", timeZone: "Europe/Lisbon" },
  { id: "paris", name: "Paris", country: "France", region: "Europe", timeZone: "Europe/Paris" },
  { id: "berlin", name: "Berlin", country: "Germany", region: "Europe", timeZone: "Europe/Berlin" },
  { id: "geneva", name: "Geneva", country: "Switzerland", region: "Europe", timeZone: "Europe/Zurich", aliases: ["Genève", "Genf"] },
  { id: "athens", name: "Athens", country: "Greece", region: "Europe", timeZone: "Europe/Athens" },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", region: "Europe", timeZone: "Europe/Istanbul", aliases: ["Turkey"] },

  // Africa
  { id: "lagos", name: "Lagos", country: "Nigeria", region: "Africa", timeZone: "Africa/Lagos" },
  { id: "cairo", name: "Cairo", country: "Egypt", region: "Africa", timeZone: "Africa/Cairo" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", region: "Africa", timeZone: "Africa/Nairobi" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", region: "Africa", timeZone: "Africa/Johannesburg" },

  // Middle East
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", region: "Middle East", timeZone: "Asia/Jerusalem" },
  { id: "tehran", name: "Tehran", country: "Iran", region: "Middle East", timeZone: "Asia/Tehran" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", region: "Middle East", timeZone: "Asia/Dubai", aliases: ["UAE"] },

  // Asia
  { id: "mumbai", name: "Mumbai", country: "India", region: "Asia", timeZone: "Asia/Kolkata", aliases: ["Bombay"] },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", region: "Asia", timeZone: "Asia/Kathmandu" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", region: "Asia", timeZone: "Asia/Bangkok" },
  { id: "singapore", name: "Singapore", country: "Singapore", region: "Asia", timeZone: "Asia/Singapore" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", region: "Asia", timeZone: "Asia/Makassar", aliases: ["Bali", "Canggu", "Ubud"] },
  { id: "shanghai", name: "Shanghai", country: "China", region: "Asia", timeZone: "Asia/Shanghai" },
  { id: "tokyo", name: "Tokyo", country: "Japan", region: "Asia", timeZone: "Asia/Tokyo" },

  // Oceania
  { id: "adelaide", name: "Adelaide", country: "Australia", region: "Oceania", timeZone: "Australia/Adelaide" },
  { id: "sydney", name: "Sydney", country: "Australia", region: "Oceania", timeZone: "Australia/Sydney" },
  { id: "auckland", name: "Auckland", country: "New Zealand", region: "Oceania", timeZone: "Pacific/Auckland" },
];

export const DEFAULT_CITY_IDS: readonly string[] = ["san-francisco", "denpasar", "geneva"];

const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export function getCity(id: string): City | undefined {
  return CITY_BY_ID.get(id);
}

export function isCityId(id: unknown): id is string {
  return typeof id === "string" && CITY_BY_ID.has(id);
}

/** Lowercase and strip diacritics so "sao paulo" finds "São Paulo". */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function searchCities(query: string): City[] {
  const needle = normalizeSearch(query);
  if (!needle) return [...CITIES];

  const ranked: { city: City; rank: number }[] = [];
  for (const city of CITIES) {
    const name = normalizeSearch(city.name);
    const country = normalizeSearch(city.country);
    const aliases = (city.aliases ?? []).map(normalizeSearch);

    let rank: number | null = null;
    if (name.startsWith(needle)) rank = 0;
    else if (name.split(/\s+/).some((word) => word.startsWith(needle))) rank = 1;
    else if (country.startsWith(needle)) rank = 2;
    else if (name.includes(needle) || country.includes(needle)) rank = 3;
    else if (aliases.some((alias) => alias.includes(needle))) rank = 4;

    if (rank !== null) ranked.push({ city, rank });
  }

  return ranked.sort((a, b) => a.rank - b.rank).map(({ city }) => city);
}
