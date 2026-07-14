export type CityOption = {
  id: string;
  name: string;
  country: string;
  zone: string;
  region: string;
};

export const CITY_CATALOG: CityOption[] = [
  { id: "san-francisco", name: "San Francisco", country: "United States", zone: "America/Los_Angeles", region: "North America" },
  { id: "vancouver", name: "Vancouver", country: "Canada", zone: "America/Vancouver", region: "North America" },
  { id: "toronto", name: "Toronto", country: "Canada", zone: "America/Toronto", region: "North America" },
  { id: "new-york", name: "New York", country: "United States", zone: "America/New_York", region: "North America" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", zone: "America/Mexico_City", region: "North America" },
  { id: "honolulu", name: "Honolulu", country: "United States", zone: "Pacific/Honolulu", region: "Oceania" },
  { id: "bogota", name: "Bogota", country: "Colombia", zone: "America/Bogota", region: "South America" },
  { id: "lima", name: "Lima", country: "Peru", zone: "America/Lima", region: "South America" },
  { id: "sao-paulo", name: "Sao Paulo", country: "Brazil", zone: "America/Sao_Paulo", region: "South America" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", zone: "America/Argentina/Buenos_Aires", region: "South America" },
  { id: "santiago", name: "Santiago", country: "Chile", zone: "America/Santiago", region: "South America" },
  { id: "reykjavik", name: "Reykjavik", country: "Iceland", zone: "Atlantic/Reykjavik", region: "Europe" },
  { id: "dublin", name: "Dublin", country: "Ireland", zone: "Europe/Dublin", region: "Europe" },
  { id: "london", name: "London", country: "United Kingdom", zone: "Europe/London", region: "Europe" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", zone: "Europe/Lisbon", region: "Europe" },
  { id: "geneva", name: "Geneva", country: "Switzerland", zone: "Europe/Zurich", region: "Europe" },
  { id: "berlin", name: "Berlin", country: "Germany", zone: "Europe/Berlin", region: "Europe" },
  { id: "stockholm", name: "Stockholm", country: "Sweden", zone: "Europe/Stockholm", region: "Europe" },
  { id: "athens", name: "Athens", country: "Greece", zone: "Europe/Athens", region: "Europe" },
  { id: "casablanca", name: "Casablanca", country: "Morocco", zone: "Africa/Casablanca", region: "Africa" },
  { id: "cairo", name: "Cairo", country: "Egypt", zone: "Africa/Cairo", region: "Africa" },
  { id: "lagos", name: "Lagos", country: "Nigeria", zone: "Africa/Lagos", region: "Africa" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", zone: "Africa/Nairobi", region: "Africa" },
  { id: "cape-town", name: "Cape Town", country: "South Africa", zone: "Africa/Johannesburg", region: "Africa" },
  { id: "istanbul", name: "Istanbul", country: "Turkey", zone: "Europe/Istanbul", region: "Middle East" },
  { id: "tel-aviv", name: "Tel Aviv", country: "Israel", zone: "Asia/Jerusalem", region: "Middle East" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", zone: "Asia/Riyadh", region: "Middle East" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", zone: "Asia/Dubai", region: "Middle East" },
  { id: "karachi", name: "Karachi", country: "Pakistan", zone: "Asia/Karachi", region: "Asia" },
  { id: "delhi", name: "Delhi", country: "India", zone: "Asia/Kolkata", region: "Asia" },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", zone: "Asia/Kathmandu", region: "Asia" },
  { id: "dhaka", name: "Dhaka", country: "Bangladesh", zone: "Asia/Dhaka", region: "Asia" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", zone: "Asia/Bangkok", region: "Asia" },
  { id: "singapore", name: "Singapore", country: "Singapore", zone: "Asia/Singapore", region: "Asia" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", zone: "Asia/Hong_Kong", region: "Asia" },
  { id: "shanghai", name: "Shanghai", country: "China", zone: "Asia/Shanghai", region: "Asia" },
  { id: "seoul", name: "Seoul", country: "South Korea", zone: "Asia/Seoul", region: "Asia" },
  { id: "tokyo", name: "Tokyo", country: "Japan", zone: "Asia/Tokyo", region: "Asia" },
  { id: "denpasar", name: "Denpasar", country: "Indonesia", zone: "Asia/Makassar", region: "Asia" },
  { id: "perth", name: "Perth", country: "Australia", zone: "Australia/Perth", region: "Oceania" },
  { id: "adelaide", name: "Adelaide", country: "Australia", zone: "Australia/Adelaide", region: "Oceania" },
  { id: "sydney", name: "Sydney", country: "Australia", zone: "Australia/Sydney", region: "Oceania" },
  { id: "auckland", name: "Auckland", country: "New Zealand", zone: "Pacific/Auckland", region: "Oceania" },
];

export const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"] as const;

export const CITY_LOOKUP = new Map(CITY_CATALOG.map((city) => [city.id, city]));
