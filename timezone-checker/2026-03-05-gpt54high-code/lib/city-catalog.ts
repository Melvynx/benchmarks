import type { CatalogCity } from "@/lib/types";

export const CITY_CATALOG: CatalogCity[] = [
  { id: "san-francisco", name: "San Francisco", country: "United States", timeZone: "America/Los_Angeles" },
  { id: "new-york", name: "New York", country: "United States", timeZone: "America/New_York" },
  { id: "toronto", name: "Toronto", country: "Canada", timeZone: "America/Toronto" },
  { id: "vancouver", name: "Vancouver", country: "Canada", timeZone: "America/Vancouver" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", timeZone: "America/Mexico_City" },
  { id: "bogota", name: "Bogota", country: "Colombia", timeZone: "America/Bogota" },
  { id: "lima", name: "Lima", country: "Peru", timeZone: "America/Lima" },
  { id: "santiago", name: "Santiago", country: "Chile", timeZone: "America/Santiago" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", timeZone: "America/Argentina/Buenos_Aires" },
  { id: "sao-paulo", name: "Sao Paulo", country: "Brazil", timeZone: "America/Sao_Paulo" },
  { id: "london", name: "London", country: "United Kingdom", timeZone: "Europe/London" },
  { id: "dublin", name: "Dublin", country: "Ireland", timeZone: "Europe/Dublin" },
  { id: "geneva", name: "Geneva", country: "Switzerland", timeZone: "Europe/Zurich" },
  { id: "paris", name: "Paris", country: "France", timeZone: "Europe/Paris" },
  { id: "berlin", name: "Berlin", country: "Germany", timeZone: "Europe/Berlin" },
  { id: "athens", name: "Athens", country: "Greece", timeZone: "Europe/Athens" },
  { id: "istanbul", name: "Istanbul", country: "Turkey", timeZone: "Europe/Istanbul" },
  { id: "cairo", name: "Cairo", country: "Egypt", timeZone: "Africa/Cairo" },
  { id: "lagos", name: "Lagos", country: "Nigeria", timeZone: "Africa/Lagos" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", timeZone: "Africa/Johannesburg" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", timeZone: "Africa/Nairobi" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", timeZone: "Asia/Dubai" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", timeZone: "Asia/Riyadh" },
  { id: "mumbai", name: "Mumbai", country: "India", timeZone: "Asia/Kolkata" },
  { id: "karachi", name: "Karachi", country: "Pakistan", timeZone: "Asia/Karachi" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", timeZone: "Asia/Kathmandu" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", timeZone: "Asia/Bangkok" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", timeZone: "Asia/Makassar" },
  { id: "singapore", name: "Singapore", country: "Singapore", timeZone: "Asia/Singapore" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", timeZone: "Asia/Hong_Kong" },
  { id: "shanghai", name: "Shanghai", country: "China", timeZone: "Asia/Shanghai" },
  { id: "seoul", name: "Seoul", country: "South Korea", timeZone: "Asia/Seoul" },
  { id: "tokyo", name: "Tokyo", country: "Japan", timeZone: "Asia/Tokyo" },
  { id: "perth", name: "Perth", country: "Australia", timeZone: "Australia/Perth" },
  { id: "sydney", name: "Sydney", country: "Australia", timeZone: "Australia/Sydney" },
  { id: "auckland", name: "Auckland", country: "New Zealand", timeZone: "Pacific/Auckland" }
];

export const CITY_INDEX = Object.fromEntries(CITY_CATALOG.map((city) => [city.id, city])) as Record<
  string,
  CatalogCity
>;

export const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];
