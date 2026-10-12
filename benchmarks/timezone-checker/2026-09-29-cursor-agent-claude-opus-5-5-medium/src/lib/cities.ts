import type { City, Region } from "../types";

export const REGIONS: Region[] = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Middle East",
  "Asia",
  "Oceania",
];

export const CITIES: City[] = [
  { id: "honolulu", name: "Honolulu", country: "United States", countryCode: "US", region: "North America", timeZone: "Pacific/Honolulu" },
  { id: "san-francisco", name: "San Francisco", country: "United States", countryCode: "US", region: "North America", timeZone: "America/Los_Angeles" },
  { id: "denver", name: "Denver", country: "United States", countryCode: "US", region: "North America", timeZone: "America/Denver" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", countryCode: "MX", region: "North America", timeZone: "America/Mexico_City" },
  { id: "chicago", name: "Chicago", country: "United States", countryCode: "US", region: "North America", timeZone: "America/Chicago" },
  { id: "toronto", name: "Toronto", country: "Canada", countryCode: "CA", region: "North America", timeZone: "America/Toronto" },
  { id: "new-york", name: "New York", country: "United States", countryCode: "US", region: "North America", timeZone: "America/New_York" },

  { id: "bogota", name: "Bogotá", country: "Colombia", countryCode: "CO", region: "South America", timeZone: "America/Bogota" },
  { id: "santiago", name: "Santiago", country: "Chile", countryCode: "CL", region: "South America", timeZone: "America/Santiago" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "AR", region: "South America", timeZone: "America/Argentina/Buenos_Aires" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", countryCode: "BR", region: "South America", timeZone: "America/Sao_Paulo" },

  { id: "lisbon", name: "Lisbon", country: "Portugal", countryCode: "PT", region: "Europe", timeZone: "Europe/Lisbon" },
  { id: "london", name: "London", country: "United Kingdom", countryCode: "GB", region: "Europe", timeZone: "Europe/London" },
  { id: "paris", name: "Paris", country: "France", countryCode: "FR", region: "Europe", timeZone: "Europe/Paris" },
  { id: "geneva", name: "Geneva", country: "Switzerland", countryCode: "CH", region: "Europe", timeZone: "Europe/Zurich" },
  { id: "berlin", name: "Berlin", country: "Germany", countryCode: "DE", region: "Europe", timeZone: "Europe/Berlin" },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", countryCode: "TR", region: "Europe", timeZone: "Europe/Istanbul" },
  { id: "moscow", name: "Moscow", country: "Russia", countryCode: "RU", region: "Europe", timeZone: "Europe/Moscow" },

  { id: "lagos", name: "Lagos", country: "Nigeria", countryCode: "NG", region: "Africa", timeZone: "Africa/Lagos" },
  { id: "cairo", name: "Cairo", country: "Egypt", countryCode: "EG", region: "Africa", timeZone: "Africa/Cairo" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", countryCode: "ZA", region: "Africa", timeZone: "Africa/Johannesburg" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", countryCode: "KE", region: "Africa", timeZone: "Africa/Nairobi" },

  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", countryCode: "IL", region: "Middle East", timeZone: "Asia/Jerusalem" },
  { id: "tehran", name: "Tehran", country: "Iran", countryCode: "IR", region: "Middle East", timeZone: "Asia/Tehran" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "AE", region: "Middle East", timeZone: "Asia/Dubai" },

  { id: "mumbai", name: "Mumbai", country: "India", countryCode: "IN", region: "Asia", timeZone: "Asia/Kolkata" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", countryCode: "NP", region: "Asia", timeZone: "Asia/Kathmandu" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", countryCode: "TH", region: "Asia", timeZone: "Asia/Bangkok" },
  { id: "singapore", name: "Singapore", country: "Singapore", countryCode: "SG", region: "Asia", timeZone: "Asia/Singapore" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", countryCode: "ID", region: "Asia", timeZone: "Asia/Makassar" },
  { id: "seoul", name: "Seoul", country: "South Korea", countryCode: "KR", region: "Asia", timeZone: "Asia/Seoul" },
  { id: "tokyo", name: "Tokyo", country: "Japan", countryCode: "JP", region: "Asia", timeZone: "Asia/Tokyo" },

  { id: "sydney", name: "Sydney", country: "Australia", countryCode: "AU", region: "Oceania", timeZone: "Australia/Sydney" },
  { id: "auckland", name: "Auckland", country: "New Zealand", countryCode: "NZ", region: "Oceania", timeZone: "Pacific/Auckland" },
];

const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export function getCity(id: string): City | undefined {
  return CITY_BY_ID.get(id);
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export function searchCities(query: string, excludeIds: readonly string[]): City[] {
  const excluded = new Set(excludeIds);
  const q = normalize(query);
  const available = CITIES.filter((city) => !excluded.has(city.id));
  if (!q) return available;

  const scored: { city: City; score: number }[] = [];
  for (const city of available) {
    const name = normalize(city.name);
    const country = normalize(city.country);
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (name.split(/\s+/).some((word) => word.startsWith(q))) score = 1;
    else if (country.startsWith(q) || city.countryCode.toLowerCase() === q) score = 2;
    else if (name.includes(q) || country.includes(q)) score = 3;
    if (score >= 0) scored.push({ city, score });
  }
  return scored.sort((a, b) => a.score - b.score).map((entry) => entry.city);
}
