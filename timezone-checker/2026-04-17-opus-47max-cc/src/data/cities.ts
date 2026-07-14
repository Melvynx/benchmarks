export type City = {
  id: string;
  name: string;
  country: string;
  region:
    | "North America"
    | "South America"
    | "Europe"
    | "Africa"
    | "Middle East"
    | "Asia"
    | "Oceania";
  timeZone: string; // IANA tz
  flag: string;
};

export const CITIES: City[] = [
  // North America
  { id: "san-francisco", name: "San Francisco", country: "United States", region: "North America", timeZone: "America/Los_Angeles", flag: "🇺🇸" },
  { id: "los-angeles", name: "Los Angeles", country: "United States", region: "North America", timeZone: "America/Los_Angeles", flag: "🇺🇸" },
  { id: "denver", name: "Denver", country: "United States", region: "North America", timeZone: "America/Denver", flag: "🇺🇸" },
  { id: "chicago", name: "Chicago", country: "United States", region: "North America", timeZone: "America/Chicago", flag: "🇺🇸" },
  { id: "new-york", name: "New York", country: "United States", region: "North America", timeZone: "America/New_York", flag: "🇺🇸" },
  { id: "toronto", name: "Toronto", country: "Canada", region: "North America", timeZone: "America/Toronto", flag: "🇨🇦" },
  { id: "vancouver", name: "Vancouver", country: "Canada", region: "North America", timeZone: "America/Vancouver", flag: "🇨🇦" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", region: "North America", timeZone: "America/Mexico_City", flag: "🇲🇽" },

  // South America
  { id: "bogota", name: "Bogotá", country: "Colombia", region: "South America", timeZone: "America/Bogota", flag: "🇨🇴" },
  { id: "lima", name: "Lima", country: "Peru", region: "South America", timeZone: "America/Lima", flag: "🇵🇪" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", region: "South America", timeZone: "America/Sao_Paulo", flag: "🇧🇷" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", region: "South America", timeZone: "America/Argentina/Buenos_Aires", flag: "🇦🇷" },

  // Europe
  { id: "london", name: "London", country: "United Kingdom", region: "Europe", timeZone: "Europe/London", flag: "🇬🇧" },
  { id: "dublin", name: "Dublin", country: "Ireland", region: "Europe", timeZone: "Europe/Dublin", flag: "🇮🇪" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", region: "Europe", timeZone: "Europe/Lisbon", flag: "🇵🇹" },
  { id: "madrid", name: "Madrid", country: "Spain", region: "Europe", timeZone: "Europe/Madrid", flag: "🇪🇸" },
  { id: "paris", name: "Paris", country: "France", region: "Europe", timeZone: "Europe/Paris", flag: "🇫🇷" },
  { id: "geneva", name: "Geneva", country: "Switzerland", region: "Europe", timeZone: "Europe/Zurich", flag: "🇨🇭" },
  { id: "berlin", name: "Berlin", country: "Germany", region: "Europe", timeZone: "Europe/Berlin", flag: "🇩🇪" },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", region: "Europe", timeZone: "Europe/Amsterdam", flag: "🇳🇱" },
  { id: "stockholm", name: "Stockholm", country: "Sweden", region: "Europe", timeZone: "Europe/Stockholm", flag: "🇸🇪" },
  { id: "istanbul", name: "Istanbul", country: "Turkey", region: "Europe", timeZone: "Europe/Istanbul", flag: "🇹🇷" },
  { id: "moscow", name: "Moscow", country: "Russia", region: "Europe", timeZone: "Europe/Moscow", flag: "🇷🇺" },

  // Africa
  { id: "lagos", name: "Lagos", country: "Nigeria", region: "Africa", timeZone: "Africa/Lagos", flag: "🇳🇬" },
  { id: "cairo", name: "Cairo", country: "Egypt", region: "Africa", timeZone: "Africa/Cairo", flag: "🇪🇬" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", region: "Africa", timeZone: "Africa/Nairobi", flag: "🇰🇪" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", region: "Africa", timeZone: "Africa/Johannesburg", flag: "🇿🇦" },

  // Middle East
  { id: "dubai", name: "Dubai", country: "UAE", region: "Middle East", timeZone: "Asia/Dubai", flag: "🇦🇪" },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", region: "Middle East", timeZone: "Asia/Jerusalem", flag: "🇮🇱" },

  // Asia
  { id: "mumbai", name: "Mumbai", country: "India", region: "Asia", timeZone: "Asia/Kolkata", flag: "🇮🇳" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", region: "Asia", timeZone: "Asia/Kathmandu", flag: "🇳🇵" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", region: "Asia", timeZone: "Asia/Bangkok", flag: "🇹🇭" },
  { id: "singapore", name: "Singapore", country: "Singapore", region: "Asia", timeZone: "Asia/Singapore", flag: "🇸🇬" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", region: "Asia", timeZone: "Asia/Makassar", flag: "🇮🇩" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", region: "Asia", timeZone: "Asia/Hong_Kong", flag: "🇭🇰" },
  { id: "shanghai", name: "Shanghai", country: "China", region: "Asia", timeZone: "Asia/Shanghai", flag: "🇨🇳" },
  { id: "seoul", name: "Seoul", country: "South Korea", region: "Asia", timeZone: "Asia/Seoul", flag: "🇰🇷" },
  { id: "tokyo", name: "Tokyo", country: "Japan", region: "Asia", timeZone: "Asia/Tokyo", flag: "🇯🇵" },

  // Oceania
  { id: "sydney", name: "Sydney", country: "Australia", region: "Oceania", timeZone: "Australia/Sydney", flag: "🇦🇺" },
  { id: "auckland", name: "Auckland", country: "New Zealand", region: "Oceania", timeZone: "Pacific/Auckland", flag: "🇳🇿" },
];

export const findCity = (id: string) => CITIES.find((c) => c.id === id);
