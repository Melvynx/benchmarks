export type City = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  timezone: string;
  region:
    | "North America"
    | "South America"
    | "Europe"
    | "Africa"
    | "Middle East"
    | "Asia"
    | "Oceania";
};

export const CITIES: City[] = [
  // North America
  { id: "los-angeles",    name: "Los Angeles",    country: "United States",        countryCode: "US", timezone: "America/Los_Angeles",         region: "North America" },
  { id: "san-francisco",  name: "San Francisco",  country: "United States",        countryCode: "US", timezone: "America/Los_Angeles",         region: "North America" },
  { id: "denver",         name: "Denver",         country: "United States",        countryCode: "US", timezone: "America/Denver",              region: "North America" },
  { id: "chicago",        name: "Chicago",        country: "United States",        countryCode: "US", timezone: "America/Chicago",             region: "North America" },
  { id: "new-york",       name: "New York",       country: "United States",        countryCode: "US", timezone: "America/New_York",            region: "North America" },
  { id: "toronto",        name: "Toronto",        country: "Canada",               countryCode: "CA", timezone: "America/Toronto",             region: "North America" },
  { id: "mexico-city",    name: "Mexico City",    country: "Mexico",               countryCode: "MX", timezone: "America/Mexico_City",         region: "North America" },

  // South America
  { id: "lima",           name: "Lima",           country: "Peru",                 countryCode: "PE", timezone: "America/Lima",                region: "South America" },
  { id: "bogota",         name: "Bogotá",         country: "Colombia",             countryCode: "CO", timezone: "America/Bogota",              region: "South America" },
  { id: "sao-paulo",      name: "São Paulo",      country: "Brazil",               countryCode: "BR", timezone: "America/Sao_Paulo",           region: "South America" },
  { id: "buenos-aires",   name: "Buenos Aires",   country: "Argentina",            countryCode: "AR", timezone: "America/Argentina/Buenos_Aires", region: "South America" },
  { id: "santiago",       name: "Santiago",       country: "Chile",                countryCode: "CL", timezone: "America/Santiago",            region: "South America" },

  // Europe
  { id: "reykjavik",      name: "Reykjavík",      country: "Iceland",              countryCode: "IS", timezone: "Atlantic/Reykjavik",          region: "Europe" },
  { id: "lisbon",         name: "Lisbon",         country: "Portugal",             countryCode: "PT", timezone: "Europe/Lisbon",               region: "Europe" },
  { id: "london",         name: "London",         country: "United Kingdom",       countryCode: "GB", timezone: "Europe/London",               region: "Europe" },
  { id: "madrid",         name: "Madrid",         country: "Spain",                countryCode: "ES", timezone: "Europe/Madrid",               region: "Europe" },
  { id: "paris",          name: "Paris",          country: "France",               countryCode: "FR", timezone: "Europe/Paris",                region: "Europe" },
  { id: "geneva",         name: "Geneva",         country: "Switzerland",          countryCode: "CH", timezone: "Europe/Zurich",               region: "Europe" },
  { id: "berlin",         name: "Berlin",         country: "Germany",              countryCode: "DE", timezone: "Europe/Berlin",               region: "Europe" },
  { id: "rome",           name: "Rome",           country: "Italy",                countryCode: "IT", timezone: "Europe/Rome",                 region: "Europe" },
  { id: "athens",         name: "Athens",         country: "Greece",               countryCode: "GR", timezone: "Europe/Athens",               region: "Europe" },
  { id: "istanbul",       name: "Istanbul",       country: "Turkey",               countryCode: "TR", timezone: "Europe/Istanbul",             region: "Europe" },
  { id: "moscow",         name: "Moscow",         country: "Russia",               countryCode: "RU", timezone: "Europe/Moscow",               region: "Europe" },

  // Africa
  { id: "lagos",          name: "Lagos",          country: "Nigeria",              countryCode: "NG", timezone: "Africa/Lagos",                region: "Africa" },
  { id: "cairo",          name: "Cairo",          country: "Egypt",                countryCode: "EG", timezone: "Africa/Cairo",                region: "Africa" },
  { id: "nairobi",        name: "Nairobi",        country: "Kenya",                countryCode: "KE", timezone: "Africa/Nairobi",              region: "Africa" },
  { id: "johannesburg",   name: "Johannesburg",   country: "South Africa",         countryCode: "ZA", timezone: "Africa/Johannesburg",         region: "Africa" },

  // Middle East
  { id: "dubai",          name: "Dubai",          country: "United Arab Emirates", countryCode: "AE", timezone: "Asia/Dubai",                  region: "Middle East" },

  // Asia
  { id: "mumbai",         name: "Mumbai",         country: "India",                countryCode: "IN", timezone: "Asia/Kolkata",                region: "Asia" },
  { id: "kathmandu",      name: "Kathmandu",      country: "Nepal",                countryCode: "NP", timezone: "Asia/Kathmandu",              region: "Asia" },
  { id: "bangkok",        name: "Bangkok",        country: "Thailand",             countryCode: "TH", timezone: "Asia/Bangkok",                region: "Asia" },
  { id: "singapore",      name: "Singapore",      country: "Singapore",            countryCode: "SG", timezone: "Asia/Singapore",              region: "Asia" },
  { id: "denpasar",       name: "Denpasar",       country: "Indonesia",            countryCode: "ID", timezone: "Asia/Makassar",               region: "Asia" },
  { id: "hong-kong",      name: "Hong Kong",      country: "Hong Kong",            countryCode: "HK", timezone: "Asia/Hong_Kong",              region: "Asia" },
  { id: "shanghai",       name: "Shanghai",       country: "China",                countryCode: "CN", timezone: "Asia/Shanghai",               region: "Asia" },
  { id: "tokyo",          name: "Tokyo",          country: "Japan",                countryCode: "JP", timezone: "Asia/Tokyo",                  region: "Asia" },
  { id: "seoul",          name: "Seoul",          country: "South Korea",          countryCode: "KR", timezone: "Asia/Seoul",                  region: "Asia" },

  // Oceania
  { id: "sydney",         name: "Sydney",         country: "Australia",            countryCode: "AU", timezone: "Australia/Sydney",            region: "Oceania" },
  { id: "auckland",       name: "Auckland",       country: "New Zealand",          countryCode: "NZ", timezone: "Pacific/Auckland",            region: "Oceania" },
];

export const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];

export function getCityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}
