/**
 * The city catalog. Fixed list — users cannot enter arbitrary timezones.
 * `zone` is an IANA identifier, so UTC offsets (and DST) are resolved at runtime
 * from the current date rather than being baked in here.
 */

export type Region =
  | "North America"
  | "South America"
  | "Europe"
  | "Africa"
  | "Middle East"
  | "Asia"
  | "Oceania & Pacific";

export type City = {
  id: string;
  name: string;
  country: string;
  zone: string;
  region: Region;
  /** Extra search terms: nicknames, airport-ish shorthand, alternate spellings. */
  aliases?: string[];
};

/** Display order of regions, roughly west to east. */
export const REGION_ORDER: Region[] = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Middle East",
  "Asia",
  "Oceania & Pacific",
];

export const CITIES: City[] = [
  // ── North America ──────────────────────────────────────────────────────────
  {
    id: "san-francisco",
    name: "San Francisco",
    country: "United States",
    zone: "America/Los_Angeles",
    region: "North America",
    aliases: ["sf", "bay area", "california", "usa", "pacific", "pst"],
  },
  {
    id: "denver",
    name: "Denver",
    country: "United States",
    zone: "America/Denver",
    region: "North America",
    aliases: ["colorado", "usa", "mountain", "mst"],
  },
  {
    id: "mexico-city",
    name: "Mexico City",
    country: "Mexico",
    zone: "America/Mexico_City",
    region: "North America",
    aliases: ["cdmx", "ciudad de mexico"],
  },
  {
    id: "chicago",
    name: "Chicago",
    country: "United States",
    zone: "America/Chicago",
    region: "North America",
    aliases: ["illinois", "usa", "central", "cst"],
  },
  {
    id: "new-york",
    name: "New York",
    country: "United States",
    zone: "America/New_York",
    region: "North America",
    aliases: ["nyc", "usa", "eastern", "est", "brooklyn"],
  },
  {
    id: "toronto",
    name: "Toronto",
    country: "Canada",
    zone: "America/Toronto",
    region: "North America",
    aliases: ["ontario"],
  },

  // ── South America ──────────────────────────────────────────────────────────
  {
    id: "bogota",
    name: "Bogotá",
    country: "Colombia",
    zone: "America/Bogota",
    region: "South America",
    aliases: ["bogota"],
  },
  {
    id: "sao-paulo",
    name: "São Paulo",
    country: "Brazil",
    zone: "America/Sao_Paulo",
    region: "South America",
    aliases: ["sao paulo", "brasil"],
  },
  {
    id: "buenos-aires",
    name: "Buenos Aires",
    country: "Argentina",
    zone: "America/Argentina/Buenos_Aires",
    region: "South America",
  },

  // ── Europe ─────────────────────────────────────────────────────────────────
  {
    id: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    zone: "Europe/Lisbon",
    region: "Europe",
    aliases: ["lisboa"],
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    zone: "Europe/London",
    region: "Europe",
    aliases: ["uk", "england", "britain", "gmt", "bst"],
  },
  {
    id: "geneva",
    name: "Geneva",
    country: "Switzerland",
    zone: "Europe/Zurich",
    region: "Europe",
    aliases: ["geneve", "genève", "suisse", "zurich", "cet"],
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    zone: "Europe/Paris",
    region: "Europe",
    aliases: ["cet"],
  },
  {
    id: "berlin",
    name: "Berlin",
    country: "Germany",
    zone: "Europe/Berlin",
    region: "Europe",
    aliases: ["deutschland", "cet"],
  },
  {
    id: "athens",
    name: "Athens",
    country: "Greece",
    zone: "Europe/Athens",
    region: "Europe",
    aliases: ["athina"],
  },
  {
    id: "moscow",
    name: "Moscow",
    country: "Russia",
    zone: "Europe/Moscow",
    region: "Europe",
    aliases: ["moskva"],
  },

  // ── Africa ─────────────────────────────────────────────────────────────────
  {
    id: "lagos",
    name: "Lagos",
    country: "Nigeria",
    zone: "Africa/Lagos",
    region: "Africa",
  },
  {
    id: "cairo",
    name: "Cairo",
    country: "Egypt",
    zone: "Africa/Cairo",
    region: "Africa",
  },
  {
    id: "nairobi",
    name: "Nairobi",
    country: "Kenya",
    zone: "Africa/Nairobi",
    region: "Africa",
  },
  {
    id: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    zone: "Africa/Johannesburg",
    region: "Africa",
    aliases: ["kaapstad", "johannesburg"],
  },

  // ── Middle East ────────────────────────────────────────────────────────────
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Türkiye",
    zone: "Europe/Istanbul",
    region: "Middle East",
    aliases: ["turkey", "turkiye"],
  },
  {
    id: "tel-aviv",
    name: "Tel Aviv",
    country: "Israel",
    zone: "Asia/Jerusalem",
    region: "Middle East",
    aliases: ["jerusalem"],
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    zone: "Asia/Dubai",
    region: "Middle East",
    aliases: ["uae", "emirates", "abu dhabi"],
  },

  // ── Asia ───────────────────────────────────────────────────────────────────
  {
    id: "karachi",
    name: "Karachi",
    country: "Pakistan",
    zone: "Asia/Karachi",
    region: "Asia",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    zone: "Asia/Kolkata",
    region: "Asia",
    aliases: ["bombay", "bengaluru", "bangalore", "delhi", "ist"],
  },
  {
    id: "kathmandu",
    name: "Kathmandu",
    country: "Nepal",
    zone: "Asia/Kathmandu",
    region: "Asia",
  },
  {
    id: "dhaka",
    name: "Dhaka",
    country: "Bangladesh",
    zone: "Asia/Dhaka",
    region: "Asia",
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    zone: "Asia/Bangkok",
    region: "Asia",
    aliases: ["chiang mai", "siam"],
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    zone: "Asia/Singapore",
    region: "Asia",
  },
  {
    id: "denpasar",
    name: "Denpasar",
    country: "Indonesia",
    zone: "Asia/Makassar",
    region: "Asia",
    aliases: ["bali", "canggu", "ubud", "wita"],
  },
  {
    id: "shanghai",
    name: "Shanghai",
    country: "China",
    zone: "Asia/Shanghai",
    region: "Asia",
    aliases: ["beijing", "hong kong", "shenzhen"],
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    zone: "Asia/Tokyo",
    region: "Asia",
    aliases: ["nippon", "osaka", "jst"],
  },

  // ── Oceania & Pacific ──────────────────────────────────────────────────────
  {
    id: "sydney",
    name: "Sydney",
    country: "Australia",
    zone: "Australia/Sydney",
    region: "Oceania & Pacific",
    aliases: ["melbourne", "nsw", "aest"],
  },
  {
    id: "auckland",
    name: "Auckland",
    country: "New Zealand",
    zone: "Pacific/Auckland",
    region: "Oceania & Pacific",
    aliases: ["nz", "aotearoa", "wellington"],
  },
  {
    id: "honolulu",
    name: "Honolulu",
    country: "United States",
    zone: "Pacific/Honolulu",
    region: "Oceania & Pacific",
    aliases: ["hawaii", "usa"],
  },
];

const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export function getCity(id: string): City | undefined {
  return CITY_BY_ID.get(id);
}

/** Matches on city name, country, or alias. Accent- and case-insensitive. */
export function searchCities(query: string, excludeIds: readonly string[] = []): City[] {
  const excluded = new Set(excludeIds);
  const pool = CITIES.filter((city) => !excluded.has(city.id));
  const needle = normalize(query);
  if (!needle) return pool;

  const scored: { city: City; score: number }[] = [];
  for (const city of pool) {
    const score = scoreCity(city, needle);
    if (score > 0) scored.push({ city, score });
  }
  // Strongest match first, then keep the catalog's west-to-east ordering.
  scored.sort((a, b) => b.score - a.score || CITIES.indexOf(a.city) - CITIES.indexOf(b.city));
  return scored.map((entry) => entry.city);
}

function scoreCity(city: City, needle: string): number {
  const name = normalize(city.name);
  if (name.startsWith(needle)) return 100;
  if (name.includes(needle)) return 80;

  const country = normalize(city.country);
  if (country.startsWith(needle)) return 60;
  if (country.includes(needle)) return 50;

  for (const alias of city.aliases ?? []) {
    const value = normalize(alias);
    if (value.startsWith(needle)) return 40;
    if (value.includes(needle)) return 30;
  }
  return 0;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
