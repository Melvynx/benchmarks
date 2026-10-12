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
  /** ISO 3166-1 alpha-2, used to render the flag. */
  countryCode: string;
  /** IANA time zone identifier. */
  timeZone: string;
  region: Region;
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
  { id: "honolulu", name: "Honolulu", country: "United States", countryCode: "US", timeZone: "Pacific/Honolulu", region: "North America" },
  { id: "san-francisco", name: "San Francisco", country: "United States", countryCode: "US", timeZone: "America/Los_Angeles", region: "North America" },
  { id: "denver", name: "Denver", country: "United States", countryCode: "US", timeZone: "America/Denver", region: "North America" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", countryCode: "MX", timeZone: "America/Mexico_City", region: "North America" },
  { id: "chicago", name: "Chicago", country: "United States", countryCode: "US", timeZone: "America/Chicago", region: "North America" },
  { id: "new-york", name: "New York", country: "United States", countryCode: "US", timeZone: "America/New_York", region: "North America" },
  { id: "toronto", name: "Toronto", country: "Canada", countryCode: "CA", timeZone: "America/Toronto", region: "North America" },

  { id: "bogota", name: "Bogotá", country: "Colombia", countryCode: "CO", timeZone: "America/Bogota", region: "South America" },
  { id: "santiago", name: "Santiago", country: "Chile", countryCode: "CL", timeZone: "America/Santiago", region: "South America" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "AR", timeZone: "America/Argentina/Buenos_Aires", region: "South America" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", countryCode: "BR", timeZone: "America/Sao_Paulo", region: "South America" },

  { id: "lisbon", name: "Lisbon", country: "Portugal", countryCode: "PT", timeZone: "Europe/Lisbon", region: "Europe" },
  { id: "london", name: "London", country: "United Kingdom", countryCode: "GB", timeZone: "Europe/London", region: "Europe" },
  { id: "paris", name: "Paris", country: "France", countryCode: "FR", timeZone: "Europe/Paris", region: "Europe" },
  { id: "geneva", name: "Geneva", country: "Switzerland", countryCode: "CH", timeZone: "Europe/Zurich", region: "Europe" },
  { id: "berlin", name: "Berlin", country: "Germany", countryCode: "DE", timeZone: "Europe/Berlin", region: "Europe" },
  { id: "moscow", name: "Moscow", country: "Russia", countryCode: "RU", timeZone: "Europe/Moscow", region: "Europe" },

  { id: "lagos", name: "Lagos", country: "Nigeria", countryCode: "NG", timeZone: "Africa/Lagos", region: "Africa" },
  { id: "cairo", name: "Cairo", country: "Egypt", countryCode: "EG", timeZone: "Africa/Cairo", region: "Africa" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", countryCode: "ZA", timeZone: "Africa/Johannesburg", region: "Africa" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", countryCode: "KE", timeZone: "Africa/Nairobi", region: "Africa" },

  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", countryCode: "IL", timeZone: "Asia/Jerusalem", region: "Middle East" },
  { id: "tehran", name: "Tehran", country: "Iran", countryCode: "IR", timeZone: "Asia/Tehran", region: "Middle East" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "AE", timeZone: "Asia/Dubai", region: "Middle East" },

  { id: "mumbai", name: "Mumbai", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata", region: "Asia" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", countryCode: "NP", timeZone: "Asia/Kathmandu", region: "Asia" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", countryCode: "TH", timeZone: "Asia/Bangkok", region: "Asia" },
  { id: "singapore", name: "Singapore", country: "Singapore", countryCode: "SG", timeZone: "Asia/Singapore", region: "Asia" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", countryCode: "ID", timeZone: "Asia/Makassar", region: "Asia" },
  { id: "hong-kong", name: "Hong Kong", country: "China", countryCode: "HK", timeZone: "Asia/Hong_Kong", region: "Asia" },
  { id: "tokyo", name: "Tokyo", country: "Japan", countryCode: "JP", timeZone: "Asia/Tokyo", region: "Asia" },
  { id: "seoul", name: "Seoul", country: "South Korea", countryCode: "KR", timeZone: "Asia/Seoul", region: "Asia" },

  { id: "adelaide", name: "Adelaide", country: "Australia", countryCode: "AU", timeZone: "Australia/Adelaide", region: "Oceania" },
  { id: "sydney", name: "Sydney", country: "Australia", countryCode: "AU", timeZone: "Australia/Sydney", region: "Oceania" },
  { id: "auckland", name: "Auckland", country: "New Zealand", countryCode: "NZ", timeZone: "Pacific/Auckland", region: "Oceania" },
];

export const CITY_BY_ID: ReadonlyMap<string, City> = new Map(CITIES.map((city) => [city.id, city]));

export const DEFAULT_CITY_IDS: readonly string[] = ["san-francisco", "denpasar", "geneva"];

/** Turns "CH" into the 🇨🇭 flag via regional indicator symbols. */
export function flagEmoji(countryCode: string): string {
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((char) => 0x1f1a5 + char.charCodeAt(0)));
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Case- and accent-insensitive match on city or country name. */
export function matchesCityQuery(city: City, query: string): boolean {
  const needle = normalize(query);
  if (!needle) return true;
  return normalize(city.name).includes(needle) || normalize(city.country).includes(needle);
}
