export type City = {
  id: string;
  name: string;
  country: string;
  timezone: string;
};

export const CITY_CATALOG: City[] = [
  // North America
  { id: "san-francisco", name: "San Francisco", country: "USA", timezone: "America/Los_Angeles" },
  { id: "los-angeles", name: "Los Angeles", country: "USA", timezone: "America/Los_Angeles" },
  { id: "denver", name: "Denver", country: "USA", timezone: "America/Denver" },
  { id: "chicago", name: "Chicago", country: "USA", timezone: "America/Chicago" },
  { id: "new-york", name: "New York", country: "USA", timezone: "America/New_York" },
  { id: "toronto", name: "Toronto", country: "Canada", timezone: "America/Toronto" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", timezone: "America/Mexico_City" },

  // South America
  { id: "bogota", name: "Bogota", country: "Colombia", timezone: "America/Bogota" },
  { id: "lima", name: "Lima", country: "Peru", timezone: "America/Lima" },
  { id: "sao-paulo", name: "Sao Paulo", country: "Brazil", timezone: "America/Sao_Paulo" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", timezone: "America/Argentina/Buenos_Aires" },

  // Europe
  { id: "london", name: "London", country: "UK", timezone: "Europe/London" },
  { id: "paris", name: "Paris", country: "France", timezone: "Europe/Paris" },
  { id: "geneva", name: "Geneva", country: "Switzerland", timezone: "Europe/Zurich" },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", timezone: "Europe/Amsterdam" },
  { id: "berlin", name: "Berlin", country: "Germany", timezone: "Europe/Berlin" },
  { id: "stockholm", name: "Stockholm", country: "Sweden", timezone: "Europe/Stockholm" },
  { id: "moscow", name: "Moscow", country: "Russia", timezone: "Europe/Moscow" },

  // Africa
  { id: "lagos", name: "Lagos", country: "Nigeria", timezone: "Africa/Lagos" },
  { id: "cairo", name: "Cairo", country: "Egypt", timezone: "Africa/Cairo" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", timezone: "Africa/Johannesburg" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", timezone: "Africa/Nairobi" },

  // Middle East
  { id: "istanbul", name: "Istanbul", country: "Turkey", timezone: "Europe/Istanbul" },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", timezone: "Asia/Jerusalem" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", timezone: "Asia/Riyadh" },
  { id: "dubai", name: "Dubai", country: "UAE", timezone: "Asia/Dubai" },

  // Asia
  { id: "mumbai", name: "Mumbai", country: "India", timezone: "Asia/Kolkata" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", timezone: "Asia/Kathmandu" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", timezone: "Asia/Makassar" },
  { id: "singapore", name: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
  { id: "hong-kong", name: "Hong Kong", country: "China", timezone: "Asia/Hong_Kong" },
  { id: "shanghai", name: "Shanghai", country: "China", timezone: "Asia/Shanghai" },
  { id: "seoul", name: "Seoul", country: "South Korea", timezone: "Asia/Seoul" },
  { id: "tokyo", name: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },

  // Oceania
  { id: "sydney", name: "Sydney", country: "Australia", timezone: "Australia/Sydney" },
  { id: "auckland", name: "Auckland", country: "New Zealand", timezone: "Pacific/Auckland" },
];

export function getCityById(id: string): City | undefined {
  return CITY_CATALOG.find((c) => c.id === id);
}
