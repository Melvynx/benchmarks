export const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Middle East",
  "Asia",
  "Oceania",
] as const;

export type Region = (typeof REGIONS)[number];

export type City = {
  id: string;
  name: string;
  country: string;
  region: Region;
  timeZone: string;
};

export const CITIES: City[] = [
  { id: "san-francisco", name: "San Francisco", country: "United States", region: "North America", timeZone: "America/Los_Angeles" },
  { id: "vancouver", name: "Vancouver", country: "Canada", region: "North America", timeZone: "America/Vancouver" },
  { id: "chicago", name: "Chicago", country: "United States", region: "North America", timeZone: "America/Chicago" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", region: "North America", timeZone: "America/Mexico_City" },
  { id: "toronto", name: "Toronto", country: "Canada", region: "North America", timeZone: "America/Toronto" },
  { id: "new-york", name: "New York", country: "United States", region: "North America", timeZone: "America/New_York" },
  { id: "bogota", name: "Bogotá", country: "Colombia", region: "South America", timeZone: "America/Bogota" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", region: "South America", timeZone: "America/Sao_Paulo" },
  { id: "santiago", name: "Santiago", country: "Chile", region: "South America", timeZone: "America/Santiago" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", region: "South America", timeZone: "America/Argentina/Buenos_Aires" },
  { id: "london", name: "London", country: "United Kingdom", region: "Europe", timeZone: "Europe/London" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", region: "Europe", timeZone: "Europe/Lisbon" },
  { id: "geneva", name: "Geneva", country: "Switzerland", region: "Europe", timeZone: "Europe/Zurich" },
  { id: "paris", name: "Paris", country: "France", region: "Europe", timeZone: "Europe/Paris" },
  { id: "berlin", name: "Berlin", country: "Germany", region: "Europe", timeZone: "Europe/Berlin" },
  { id: "stockholm", name: "Stockholm", country: "Sweden", region: "Europe", timeZone: "Europe/Stockholm" },
  { id: "cairo", name: "Cairo", country: "Egypt", region: "Africa", timeZone: "Africa/Cairo" },
  { id: "lagos", name: "Lagos", country: "Nigeria", region: "Africa", timeZone: "Africa/Lagos" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", region: "Africa", timeZone: "Africa/Nairobi" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", region: "Africa", timeZone: "Africa/Johannesburg" },
  { id: "istanbul", name: "Istanbul", country: "Turkey", region: "Middle East", timeZone: "Europe/Istanbul" },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", region: "Middle East", timeZone: "Asia/Jerusalem" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", region: "Middle East", timeZone: "Asia/Dubai" },
  { id: "tehran", name: "Tehran", country: "Iran", region: "Middle East", timeZone: "Asia/Tehran" },
  { id: "mumbai", name: "Mumbai", country: "India", region: "Asia", timeZone: "Asia/Kolkata" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", region: "Asia", timeZone: "Asia/Kathmandu" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", region: "Asia", timeZone: "Asia/Bangkok" },
  { id: "singapore", name: "Singapore", country: "Singapore", region: "Asia", timeZone: "Asia/Singapore" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", region: "Asia", timeZone: "Asia/Makassar" },
  { id: "seoul", name: "Seoul", country: "South Korea", region: "Asia", timeZone: "Asia/Seoul" },
  { id: "tokyo", name: "Tokyo", country: "Japan", region: "Asia", timeZone: "Asia/Tokyo" },
  { id: "adelaide", name: "Adelaide", country: "Australia", region: "Oceania", timeZone: "Australia/Adelaide" },
  { id: "sydney", name: "Sydney", country: "Australia", region: "Oceania", timeZone: "Australia/Sydney" },
  { id: "auckland", name: "Auckland", country: "New Zealand", region: "Oceania", timeZone: "Pacific/Auckland" },
];

export const CITY_MAP = new Map(CITIES.map((city) => [city.id, city]));

export const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];
