export interface City {
  id: string;
  name: string;
  country: string;
  flag: string;
  timezone: string;
}

export const CITIES: City[] = [
  {
    id: 'san-francisco',
    name: 'San Francisco',
    country: 'United States',
    flag: '🇺🇸',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    country: 'United States',
    flag: '🇺🇸',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    country: 'Canada',
    flag: '🇨🇦',
    timezone: 'America/Vancouver',
  },
  { id: 'toronto', name: 'Toronto', country: 'Canada', flag: '🇨🇦', timezone: 'America/Toronto' },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    flag: '🇺🇸',
    timezone: 'America/New_York',
  },
  {
    id: 'mexico-city',
    name: 'Mexico City',
    country: 'Mexico',
    flag: '🇲🇽',
    timezone: 'America/Mexico_City',
  },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', flag: '🇨🇴', timezone: 'America/Bogota' },
  { id: 'lima', name: 'Lima', country: 'Peru', flag: '🇵🇪', timezone: 'America/Lima' },
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    country: 'Brazil',
    flag: '🇧🇷',
    timezone: 'America/Sao_Paulo',
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    flag: '🇦🇷',
    timezone: 'America/Argentina/Buenos_Aires',
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    timezone: 'Europe/London',
  },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', flag: '🇵🇹', timezone: 'Europe/Lisbon' },
  { id: 'paris', name: 'Paris', country: 'France', flag: '🇫🇷', timezone: 'Europe/Paris' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', flag: '🇨🇭', timezone: 'Europe/Zurich' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', flag: '🇩🇪', timezone: 'Europe/Berlin' },
  { id: 'helsinki', name: 'Helsinki', country: 'Finland', flag: '🇫🇮', timezone: 'Europe/Helsinki' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', flag: '🇹🇷', timezone: 'Europe/Istanbul' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', flag: '🇪🇬', timezone: 'Africa/Cairo' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', flag: '🇳🇬', timezone: 'Africa/Lagos' },
  {
    id: 'cape-town',
    name: 'Cape Town',
    country: 'South Africa',
    flag: '🇿🇦',
    timezone: 'Africa/Johannesburg',
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    flag: '🇦🇪',
    timezone: 'Asia/Dubai',
  },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', flag: '🇸🇦', timezone: 'Asia/Riyadh' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', flag: '🇳🇵', timezone: 'Asia/Kathmandu' },
  { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', flag: '🇧🇩', timezone: 'Asia/Dhaka' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', flag: '🇹🇭', timezone: 'Asia/Bangkok' },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    flag: '🇸🇬',
    timezone: 'Asia/Singapore',
  },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', flag: '🇮🇩', timezone: 'Asia/Makassar' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', flag: '🇭🇰', timezone: 'Asia/Hong_Kong' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', flag: '🇨🇳', timezone: 'Asia/Shanghai' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', flag: '🇰🇷', timezone: 'Asia/Seoul' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', flag: '🇯🇵', timezone: 'Asia/Tokyo' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', flag: '🇦🇺', timezone: 'Australia/Sydney' },
  {
    id: 'auckland',
    name: 'Auckland',
    country: 'New Zealand',
    flag: '🇳🇿',
    timezone: 'Pacific/Auckland',
  },
];

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];
