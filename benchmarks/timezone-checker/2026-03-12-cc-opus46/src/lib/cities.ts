export interface City {
  id: string;
  name: string;
  country: string;
  timezone: string;
  emoji: string;
}

export const CITIES: City[] = [
  // North America
  { id: "san-francisco", name: "San Francisco", country: "United States", timezone: "America/Los_Angeles", emoji: "🇺🇸" },
  { id: "los-angeles", name: "Los Angeles", country: "United States", timezone: "America/Los_Angeles", emoji: "🇺🇸" },
  { id: "denver", name: "Denver", country: "United States", timezone: "America/Denver", emoji: "🇺🇸" },
  { id: "chicago", name: "Chicago", country: "United States", timezone: "America/Chicago", emoji: "🇺🇸" },
  { id: "new-york", name: "New York", country: "United States", timezone: "America/New_York", emoji: "🇺🇸" },
  { id: "toronto", name: "Toronto", country: "Canada", timezone: "America/Toronto", emoji: "🇨🇦" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", timezone: "America/Mexico_City", emoji: "🇲🇽" },
  // South America
  { id: "bogota", name: "Bogota", country: "Colombia", timezone: "America/Bogota", emoji: "🇨🇴" },
  { id: "lima", name: "Lima", country: "Peru", timezone: "America/Lima", emoji: "🇵🇪" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", timezone: "America/Sao_Paulo", emoji: "🇧🇷" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", timezone: "America/Argentina/Buenos_Aires", emoji: "🇦🇷" },
  // Europe
  { id: "london", name: "London", country: "United Kingdom", timezone: "Europe/London", emoji: "🇬🇧" },
  { id: "paris", name: "Paris", country: "France", timezone: "Europe/Paris", emoji: "🇫🇷" },
  { id: "geneva", name: "Geneva", country: "Switzerland", timezone: "Europe/Zurich", emoji: "🇨🇭" },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", timezone: "Europe/Amsterdam", emoji: "🇳🇱" },
  { id: "berlin", name: "Berlin", country: "Germany", timezone: "Europe/Berlin", emoji: "🇩🇪" },
  { id: "madrid", name: "Madrid", country: "Spain", timezone: "Europe/Madrid", emoji: "🇪🇸" },
  { id: "stockholm", name: "Stockholm", country: "Sweden", timezone: "Europe/Stockholm", emoji: "🇸🇪" },
  { id: "moscow", name: "Moscow", country: "Russia", timezone: "Europe/Moscow", emoji: "🇷🇺" },
  // Africa
  { id: "lagos", name: "Lagos", country: "Nigeria", timezone: "Africa/Lagos", emoji: "🇳🇬" },
  { id: "cairo", name: "Cairo", country: "Egypt", timezone: "Africa/Cairo", emoji: "🇪🇬" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", timezone: "Africa/Johannesburg", emoji: "🇿🇦" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", timezone: "Africa/Nairobi", emoji: "🇰🇪" },
  // Middle East
  { id: "istanbul", name: "Istanbul", country: "Turkey", timezone: "Europe/Istanbul", emoji: "🇹🇷" },
  { id: "dubai", name: "Dubai", country: "UAE", timezone: "Asia/Dubai", emoji: "🇦🇪" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", timezone: "Asia/Riyadh", emoji: "🇸🇦" },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", timezone: "Asia/Jerusalem", emoji: "🇮🇱" },
  // Asia
  { id: "mumbai", name: "Mumbai", country: "India", timezone: "Asia/Kolkata", emoji: "🇮🇳" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", timezone: "Asia/Kathmandu", emoji: "🇳🇵" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", emoji: "🇹🇭" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", timezone: "Asia/Makassar", emoji: "🇮🇩" },
  { id: "singapore", name: "Singapore", country: "Singapore", timezone: "Asia/Singapore", emoji: "🇸🇬" },
  { id: "hong-kong", name: "Hong Kong", country: "China", timezone: "Asia/Hong_Kong", emoji: "🇭🇰" },
  { id: "shanghai", name: "Shanghai", country: "China", timezone: "Asia/Shanghai", emoji: "🇨🇳" },
  { id: "seoul", name: "Seoul", country: "South Korea", timezone: "Asia/Seoul", emoji: "🇰🇷" },
  { id: "tokyo", name: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", emoji: "🇯🇵" },
  // Oceania
  { id: "sydney", name: "Sydney", country: "Australia", timezone: "Australia/Sydney", emoji: "🇦🇺" },
  { id: "auckland", name: "Auckland", country: "New Zealand", timezone: "Pacific/Auckland", emoji: "🇳🇿" },
];
