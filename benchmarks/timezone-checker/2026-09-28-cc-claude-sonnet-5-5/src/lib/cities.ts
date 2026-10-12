export interface City {
  id: string;
  name: string;
  country: string;
  tz: string;
}

export const CITIES: City[] = [
  { id: "san-francisco", name: "San Francisco", country: "United States", tz: "America/Los_Angeles" },
  { id: "new-york", name: "New York", country: "United States", tz: "America/New_York" },
  { id: "chicago", name: "Chicago", country: "United States", tz: "America/Chicago" },
  { id: "denver", name: "Denver", country: "United States", tz: "America/Denver" },
  { id: "toronto", name: "Toronto", country: "Canada", tz: "America/Toronto" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", tz: "America/Mexico_City" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", tz: "America/Sao_Paulo" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", tz: "America/Argentina/Buenos_Aires" },
  { id: "bogota", name: "Bogotá", country: "Colombia", tz: "America/Bogota" },
  { id: "santiago", name: "Santiago", country: "Chile", tz: "America/Santiago" },
  { id: "london", name: "London", country: "United Kingdom", tz: "Europe/London" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", tz: "Europe/Lisbon" },
  { id: "paris", name: "Paris", country: "France", tz: "Europe/Paris" },
  { id: "geneva", name: "Geneva", country: "Switzerland", tz: "Europe/Zurich" },
  { id: "berlin", name: "Berlin", country: "Germany", tz: "Europe/Berlin" },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", tz: "Europe/Istanbul" },
  { id: "moscow", name: "Moscow", country: "Russia", tz: "Europe/Moscow" },
  { id: "lagos", name: "Lagos", country: "Nigeria", tz: "Africa/Lagos" },
  { id: "cairo", name: "Cairo", country: "Egypt", tz: "Africa/Cairo" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", tz: "Africa/Nairobi" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", tz: "Africa/Johannesburg" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", tz: "Asia/Dubai" },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", tz: "Asia/Jerusalem" },
  { id: "mumbai", name: "Mumbai", country: "India", tz: "Asia/Kolkata" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", tz: "Asia/Kathmandu" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", tz: "Asia/Bangkok" },
  { id: "singapore", name: "Singapore", country: "Singapore", tz: "Asia/Singapore" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", tz: "Asia/Makassar" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", tz: "Asia/Hong_Kong" },
  { id: "tokyo", name: "Tokyo", country: "Japan", tz: "Asia/Tokyo" },
  { id: "seoul", name: "Seoul", country: "South Korea", tz: "Asia/Seoul" },
  { id: "sydney", name: "Sydney", country: "Australia", tz: "Australia/Sydney" },
  { id: "perth", name: "Perth", country: "Australia", tz: "Australia/Perth" },
  { id: "auckland", name: "Auckland", country: "New Zealand", tz: "Pacific/Auckland" },
  { id: "honolulu", name: "Honolulu", country: "United States", tz: "Pacific/Honolulu" },
];

export const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];

export const cityById = (id: string) => CITIES.find((c) => c.id === id);
