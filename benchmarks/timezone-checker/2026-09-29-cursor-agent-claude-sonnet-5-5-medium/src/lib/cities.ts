export interface City {
  id: string;
  name: string;
  country: string;
  tz: string;
  region: string;
}

const c = (id: string, name: string, country: string, tz: string, region: string): City => ({
  id,
  name,
  country,
  tz,
  region,
});

export const CITIES: City[] = [
  c("san-francisco", "San Francisco", "United States", "America/Los_Angeles", "North America"),
  c("new-york", "New York", "United States", "America/New_York", "North America"),
  c("chicago", "Chicago", "United States", "America/Chicago", "North America"),
  c("denver", "Denver", "United States", "America/Denver", "North America"),
  c("toronto", "Toronto", "Canada", "America/Toronto", "North America"),
  c("vancouver", "Vancouver", "Canada", "America/Vancouver", "North America"),
  c("mexico-city", "Mexico City", "Mexico", "America/Mexico_City", "North America"),
  c("sao-paulo", "São Paulo", "Brazil", "America/Sao_Paulo", "South America"),
  c("buenos-aires", "Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires", "South America"),
  c("bogota", "Bogotá", "Colombia", "America/Bogota", "South America"),
  c("santiago", "Santiago", "Chile", "America/Santiago", "South America"),
  c("london", "London", "United Kingdom", "Europe/London", "Europe"),
  c("lisbon", "Lisbon", "Portugal", "Europe/Lisbon", "Europe"),
  c("paris", "Paris", "France", "Europe/Paris", "Europe"),
  c("geneva", "Geneva", "Switzerland", "Europe/Zurich", "Europe"),
  c("berlin", "Berlin", "Germany", "Europe/Berlin", "Europe"),
  c("madrid", "Madrid", "Spain", "Europe/Madrid", "Europe"),
  c("athens", "Athens", "Greece", "Europe/Athens", "Europe"),
  c("moscow", "Moscow", "Russia", "Europe/Moscow", "Europe"),
  c("lagos", "Lagos", "Nigeria", "Africa/Lagos", "Africa"),
  c("cairo", "Cairo", "Egypt", "Africa/Cairo", "Africa"),
  c("nairobi", "Nairobi", "Kenya", "Africa/Nairobi", "Africa"),
  c("johannesburg", "Johannesburg", "South Africa", "Africa/Johannesburg", "Africa"),
  c("dubai", "Dubai", "United Arab Emirates", "Asia/Dubai", "Middle East"),
  c("tel-aviv", "Tel Aviv", "Israel", "Asia/Jerusalem", "Middle East"),
  c("istanbul", "Istanbul", "Türkiye", "Europe/Istanbul", "Middle East"),
  c("mumbai", "Mumbai", "India", "Asia/Kolkata", "Asia"),
  c("kathmandu", "Kathmandu", "Nepal", "Asia/Kathmandu", "Asia"),
  c("bangkok", "Bangkok", "Thailand", "Asia/Bangkok", "Asia"),
  c("singapore", "Singapore", "Singapore", "Asia/Singapore", "Asia"),
  c("denpasar", "Denpasar", "Indonesia", "Asia/Makassar", "Asia"),
  c("hong-kong", "Hong Kong", "China", "Asia/Hong_Kong", "Asia"),
  c("tokyo", "Tokyo", "Japan", "Asia/Tokyo", "Asia"),
  c("seoul", "Seoul", "South Korea", "Asia/Seoul", "Asia"),
  c("sydney", "Sydney", "Australia", "Australia/Sydney", "Oceania"),
  c("auckland", "Auckland", "New Zealand", "Pacific/Auckland", "Oceania"),
];

export const CITY_BY_ID = new Map(CITIES.map((x) => [x.id, x]));
export const DEFAULT_CITY_IDS = ["san-francisco", "denpasar", "geneva"];
