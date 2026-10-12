export interface City {
  id: string;
  name: string;
  country: string;
  timezone: string;
}

// Curated catalog. Timezones are IANA identifiers so DST is resolved by the runtime.
export const CITY_CATALOG: readonly City[] = [
  // North America
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles' },
  { id: 'new-york', name: 'New York', country: 'United States', timezone: 'America/New_York' },
  { id: 'chicago', name: 'Chicago', country: 'United States', timezone: 'America/Chicago' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timezone: 'America/Toronto' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City' },
  // South America
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', timezone: 'America/Bogota' },
  { id: 'lima', name: 'Lima', country: 'Peru', timezone: 'America/Lima' },
  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon' },
  { id: 'paris', name: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', timezone: 'Europe/Zurich' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', timezone: 'Europe/Istanbul' },
  // Africa
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', timezone: 'Africa/Johannesburg' },
  // Middle East
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', timezone: 'Asia/Jerusalem' },
  // Asia
  { id: 'mumbai', name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', timezone: 'Asia/Makassar' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul' },
  // Oceania
  { id: 'sydney', name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
  { id: 'perth', name: 'Perth', country: 'Australia', timezone: 'Australia/Perth' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland' },
];

const CATALOG_BY_ID = new Map(CITY_CATALOG.map((city) => [city.id, city]));

export function findCity(id: string): City | undefined {
  return CATALOG_BY_ID.get(id);
}
