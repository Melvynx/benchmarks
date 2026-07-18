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
  timezone: string;
  region: Region;
}

export const CITIES: City[] = [
  { id: "san-francisco", name: "San Francisco", country: "United States", timezone: "America/Los_Angeles", region: "North America" },
  { id: "los-angeles", name: "Los Angeles", country: "United States", timezone: "America/Los_Angeles", region: "North America" },
  { id: "vancouver", name: "Vancouver", country: "Canada", timezone: "America/Vancouver", region: "North America" },
  { id: "denver", name: "Denver", country: "United States", timezone: "America/Denver", region: "North America" },
  { id: "chicago", name: "Chicago", country: "United States", timezone: "America/Chicago", region: "North America" },
  { id: "toronto", name: "Toronto", country: "Canada", timezone: "America/Toronto", region: "North America" },
  { id: "new-york", name: "New York", country: "United States", timezone: "America/New_York", region: "North America" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", timezone: "America/Mexico_City", region: "North America" },
  { id: "bogota", name: "Bogotá", country: "Colombia", timezone: "America/Bogota", region: "South America" },
  { id: "lima", name: "Lima", country: "Peru", timezone: "America/Lima", region: "South America" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", timezone: "America/Sao_Paulo", region: "South America" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", timezone: "America/Argentina/Buenos_Aires", region: "South America" },
  { id: "santiago", name: "Santiago", country: "Chile", timezone: "America/Santiago", region: "South America" },
  { id: "london", name: "London", country: "United Kingdom", timezone: "Europe/London", region: "Europe" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", timezone: "Europe/Lisbon", region: "Europe" },
  { id: "paris", name: "Paris", country: "France", timezone: "Europe/Paris", region: "Europe" },
  { id: "geneva", name: "Geneva", country: "Switzerland", timezone: "Europe/Zurich", region: "Europe" },
  { id: "berlin", name: "Berlin", country: "Germany", timezone: "Europe/Berlin", region: "Europe" },
  { id: "helsinki", name: "Helsinki", country: "Finland", timezone: "Europe/Helsinki", region: "Europe" },
  { id: "kyiv", name: "Kyiv", country: "Ukraine", timezone: "Europe/Kyiv", region: "Europe" },
  { id: "casablanca", name: "Casablanca", country: "Morocco", timezone: "Africa/Casablanca", region: "Africa" },
  { id: "lagos", name: "Lagos", country: "Nigeria", timezone: "Africa/Lagos", region: "Africa" },
  { id: "cape-town", name: "Cape Town", country: "South Africa", timezone: "Africa/Johannesburg", region: "Africa" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", timezone: "Africa/Nairobi", region: "Africa" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", timezone: "Asia/Dubai", region: "Middle East" },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", timezone: "Asia/Jerusalem", region: "Middle East" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", timezone: "Asia/Riyadh", region: "Middle East" },
  { id: "delhi", name: "Delhi", country: "India", timezone: "Asia/Kolkata", region: "Asia" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", timezone: "Asia/Kathmandu", region: "Asia" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", region: "Asia" },
  { id: "singapore", name: "Singapore", country: "Singapore", timezone: "Asia/Singapore", region: "Asia" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", timezone: "Asia/Hong_Kong", region: "Asia" },
  { id: "tokyo", name: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", region: "Asia" },
  { id: "seoul", name: "Seoul", country: "South Korea", timezone: "Asia/Seoul", region: "Asia" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", timezone: "Asia/Makassar", region: "Asia" },
  { id: "perth", name: "Perth", country: "Australia", timezone: "Australia/Perth", region: "Oceania" },
  { id: "sydney", name: "Sydney", country: "Australia", timezone: "Australia/Sydney", region: "Oceania" },
  { id: "auckland", name: "Auckland", country: "New Zealand", timezone: "Pacific/Auckland", region: "Oceania" },
];

export const CITY_BY_ID = new Map(CITIES.map((city) => [city.id, city]));

export const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];
