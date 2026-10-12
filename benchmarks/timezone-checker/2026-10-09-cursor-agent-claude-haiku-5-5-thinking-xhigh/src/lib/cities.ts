export interface City {
  /** Stable key persisted in localStorage. Never change once shipped. */
  readonly id: string;
  readonly name: string;
  readonly country: string;
  /** IANA zone. DST and fractional offsets are resolved by Intl at runtime. */
  readonly timeZone: string;
  /** Extra search terms: nicknames, abbreviations, alternate names. */
  readonly aliases?: readonly string[];
}

export const CITIES: readonly City[] = [
  // North America
  { id: "san-francisco", name: "San Francisco", country: "United States", timeZone: "America/Los_Angeles", aliases: ["SF", "California"] },
  { id: "denver", name: "Denver", country: "United States", timeZone: "America/Denver", aliases: ["Colorado"] },
  { id: "new-york", name: "New York", country: "United States", timeZone: "America/New_York", aliases: ["NYC", "NY"] },
  { id: "honolulu", name: "Honolulu", country: "United States", timeZone: "Pacific/Honolulu", aliases: ["Hawaii"] },
  { id: "halifax", name: "Halifax", country: "Canada", timeZone: "America/Halifax", aliases: ["Nova Scotia"] },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", timeZone: "America/Mexico_City", aliases: ["CDMX"] },

  // South America
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", timeZone: "America/Sao_Paulo", aliases: ["SP"] },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", timeZone: "America/Argentina/Buenos_Aires" },
  { id: "bogota", name: "Bogotá", country: "Colombia", timeZone: "America/Bogota" },
  { id: "santiago", name: "Santiago", country: "Chile", timeZone: "America/Santiago" },

  // Europe
  { id: "london", name: "London", country: "United Kingdom", timeZone: "Europe/London", aliases: ["UK", "England"] },
  { id: "geneva", name: "Geneva", country: "Switzerland", timeZone: "Europe/Zurich", aliases: ["Genève"] },
  { id: "berlin", name: "Berlin", country: "Germany", timeZone: "Europe/Berlin" },
  { id: "istanbul", name: "Istanbul", country: "Turkey", timeZone: "Europe/Istanbul", aliases: ["Türkiye"] },

  // Africa
  { id: "casablanca", name: "Casablanca", country: "Morocco", timeZone: "Africa/Casablanca" },
  { id: "lagos", name: "Lagos", country: "Nigeria", timeZone: "Africa/Lagos" },
  { id: "cairo", name: "Cairo", country: "Egypt", timeZone: "Africa/Cairo" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", timeZone: "Africa/Nairobi" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", timeZone: "Africa/Johannesburg", aliases: ["Joburg"] },

  // Middle East
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", timeZone: "Asia/Dubai", aliases: ["UAE"] },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", timeZone: "Asia/Jerusalem" },
  { id: "tehran", name: "Tehran", country: "Iran", timeZone: "Asia/Tehran" },

  // Asia
  { id: "mumbai", name: "Mumbai", country: "India", timeZone: "Asia/Kolkata", aliases: ["Bombay"] },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", timeZone: "Asia/Kathmandu" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", timeZone: "Asia/Bangkok" },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", timeZone: "Asia/Jakarta" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", timeZone: "Asia/Makassar", aliases: ["Bali"] },
  { id: "singapore", name: "Singapore", country: "Singapore", timeZone: "Asia/Singapore" },
  { id: "seoul", name: "Seoul", country: "South Korea", timeZone: "Asia/Seoul", aliases: ["Korea"] },
  { id: "tokyo", name: "Tokyo", country: "Japan", timeZone: "Asia/Tokyo" },

  // Oceania
  { id: "sydney", name: "Sydney", country: "Australia", timeZone: "Australia/Sydney" },
  { id: "adelaide", name: "Adelaide", country: "Australia", timeZone: "Australia/Adelaide" },
  { id: "perth", name: "Perth", country: "Australia", timeZone: "Australia/Perth" },
  { id: "auckland", name: "Auckland", country: "New Zealand", timeZone: "Pacific/Auckland", aliases: ["NZ"] },
];

const CITIES_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export function getCityById(id: string): City | undefined {
  return CITIES_BY_ID.get(id);
}

/** Lowercase, accent-insensitive form used for matching. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Filters and ranks cities for the picker. Empty query returns all cities
 * alphabetically. Otherwise: name prefix > name substring > alias/country match.
 */
export function searchCities(cities: readonly City[], query: string): City[] {
  const q = normalize(query);
  if (!q) {
    return [...cities].sort((a, b) => a.name.localeCompare(b.name));
  }

  const scored: { city: City; score: number }[] = [];
  for (const city of cities) {
    const name = normalize(city.name);
    const secondary = [city.country, ...(city.aliases ?? [])].map(normalize);

    let score = 0;
    if (name.startsWith(q)) score = 4;
    else if (name.includes(q)) score = 3;
    else if (secondary.some((term) => term.startsWith(q))) score = 2;
    else if (secondary.some((term) => term.includes(q))) score = 1;

    if (score > 0) scored.push({ city, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name))
    .map(({ city }) => city);
}
