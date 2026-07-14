export type CityOption = {
  id: string;
  city: string;
  country: string;
  region: string;
  timeZone: string;
};

export const CITY_CATALOG: CityOption[] = [
  { id: "san-francisco", city: "San Francisco", country: "United States", region: "North America", timeZone: "America/Los_Angeles" },
  { id: "vancouver", city: "Vancouver", country: "Canada", region: "North America", timeZone: "America/Vancouver" },
  { id: "new-york", city: "New York", country: "United States", region: "North America", timeZone: "America/New_York" },
  { id: "toronto", city: "Toronto", country: "Canada", region: "North America", timeZone: "America/Toronto" },
  { id: "mexico-city", city: "Mexico City", country: "Mexico", region: "North America", timeZone: "America/Mexico_City" },
  { id: "honolulu", city: "Honolulu", country: "United States", region: "Pacific", timeZone: "Pacific/Honolulu" },
  { id: "bogota", city: "Bogota", country: "Colombia", region: "South America", timeZone: "America/Bogota" },
  { id: "lima", city: "Lima", country: "Peru", region: "South America", timeZone: "America/Lima" },
  { id: "santiago", city: "Santiago", country: "Chile", region: "South America", timeZone: "America/Santiago" },
  { id: "sao-paulo", city: "Sao Paulo", country: "Brazil", region: "South America", timeZone: "America/Sao_Paulo" },
  { id: "buenos-aires", city: "Buenos Aires", country: "Argentina", region: "South America", timeZone: "America/Argentina/Buenos_Aires" },
  { id: "london", city: "London", country: "United Kingdom", region: "Europe", timeZone: "Europe/London" },
  { id: "lisbon", city: "Lisbon", country: "Portugal", region: "Europe", timeZone: "Europe/Lisbon" },
  { id: "geneva", city: "Geneva", country: "Switzerland", region: "Europe", timeZone: "Europe/Zurich" },
  { id: "paris", city: "Paris", country: "France", region: "Europe", timeZone: "Europe/Paris" },
  { id: "berlin", city: "Berlin", country: "Germany", region: "Europe", timeZone: "Europe/Berlin" },
  { id: "helsinki", city: "Helsinki", country: "Finland", region: "Europe", timeZone: "Europe/Helsinki" },
  { id: "istanbul", city: "Istanbul", country: "Turkey", region: "Europe / Middle East", timeZone: "Europe/Istanbul" },
  { id: "casablanca", city: "Casablanca", country: "Morocco", region: "Africa", timeZone: "Africa/Casablanca" },
  { id: "lagos", city: "Lagos", country: "Nigeria", region: "Africa", timeZone: "Africa/Lagos" },
  { id: "cairo", city: "Cairo", country: "Egypt", region: "Africa", timeZone: "Africa/Cairo" },
  { id: "nairobi", city: "Nairobi", country: "Kenya", region: "Africa", timeZone: "Africa/Nairobi" },
  { id: "cape-town", city: "Cape Town", country: "South Africa", region: "Africa", timeZone: "Africa/Johannesburg" },
  { id: "tel-aviv", city: "Tel Aviv", country: "Israel", region: "Middle East", timeZone: "Asia/Jerusalem" },
  { id: "dubai", city: "Dubai", country: "United Arab Emirates", region: "Middle East", timeZone: "Asia/Dubai" },
  { id: "karachi", city: "Karachi", country: "Pakistan", region: "Asia", timeZone: "Asia/Karachi" },
  { id: "mumbai", city: "Mumbai", country: "India", region: "Asia", timeZone: "Asia/Kolkata" },
  { id: "kathmandu", city: "Kathmandu", country: "Nepal", region: "Asia", timeZone: "Asia/Kathmandu" },
  { id: "dhaka", city: "Dhaka", country: "Bangladesh", region: "Asia", timeZone: "Asia/Dhaka" },
  { id: "bangkok", city: "Bangkok", country: "Thailand", region: "Asia", timeZone: "Asia/Bangkok" },
  { id: "singapore", city: "Singapore", country: "Singapore", region: "Asia", timeZone: "Asia/Singapore" },
  { id: "denpasar", city: "Denpasar", country: "Indonesia", region: "Asia", timeZone: "Asia/Makassar" },
  { id: "hong-kong", city: "Hong Kong", country: "Hong Kong", region: "Asia", timeZone: "Asia/Hong_Kong" },
  { id: "shanghai", city: "Shanghai", country: "China", region: "Asia", timeZone: "Asia/Shanghai" },
  { id: "seoul", city: "Seoul", country: "South Korea", region: "Asia", timeZone: "Asia/Seoul" },
  { id: "tokyo", city: "Tokyo", country: "Japan", region: "Asia", timeZone: "Asia/Tokyo" },
  { id: "perth", city: "Perth", country: "Australia", region: "Oceania", timeZone: "Australia/Perth" },
  { id: "sydney", city: "Sydney", country: "Australia", region: "Oceania", timeZone: "Australia/Sydney" },
  { id: "auckland", city: "Auckland", country: "New Zealand", region: "Oceania", timeZone: "Pacific/Auckland" },
];

export const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];

export const CITY_MAP = new Map(CITY_CATALOG.map((city) => [city.id, city]));
