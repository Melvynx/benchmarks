import type { City } from './types';

export const CITY_CATALOG: City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', tz: 'America/Los_Angeles', region: 'North America' },
  { id: 'new-york', name: 'New York', country: 'United States', tz: 'America/New_York', region: 'North America' },
  { id: 'chicago', name: 'Chicago', country: 'United States', tz: 'America/Chicago', region: 'North America' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', tz: 'America/Toronto', region: 'North America' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City', region: 'North America' },
  { id: 'honolulu', name: 'Honolulu', country: 'United States', tz: 'Pacific/Honolulu', region: 'Oceania' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', tz: 'America/Sao_Paulo', region: 'South America' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires', region: 'South America' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', tz: 'America/Bogota', region: 'South America' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', tz: 'America/Santiago', region: 'South America' },
  { id: 'london', name: 'London', country: 'United Kingdom', tz: 'Europe/London', region: 'Europe' },
  { id: 'paris', name: 'Paris', country: 'France', tz: 'Europe/Paris', region: 'Europe' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', tz: 'Europe/Berlin', region: 'Europe' },
  { id: 'madrid', name: 'Madrid', country: 'Spain', tz: 'Europe/Madrid', region: 'Europe' },
  { id: 'rome', name: 'Rome', country: 'Italy', tz: 'Europe/Rome', region: 'Europe' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam', region: 'Europe' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', tz: 'Europe/Zurich', region: 'Europe' },
  { id: 'istanbul', name: 'Istanbul', country: 'Turkey', tz: 'Europe/Istanbul', region: 'Europe' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', tz: 'Europe/Moscow', region: 'Europe' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo', region: 'Africa' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', tz: 'Africa/Nairobi', region: 'Africa' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg', region: 'Africa' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', tz: 'Asia/Dubai', region: 'Middle East' },
  { id: 'tehran', name: 'Tehran', country: 'Iran', tz: 'Asia/Tehran', region: 'Middle East' },
  { id: 'delhi', name: 'Delhi', country: 'India', tz: 'Asia/Kolkata', region: 'Asia' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', tz: 'Asia/Kathmandu', region: 'Asia' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok', region: 'Asia' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', tz: 'Asia/Makassar', region: 'Asia' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore', region: 'Asia' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', tz: 'Asia/Shanghai', region: 'Asia' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo', region: 'Asia' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul', region: 'Asia' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', tz: 'Australia/Sydney', region: 'Oceania' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland', region: 'Oceania' },
];

const CATALOG_BY_ID = new Map(CITY_CATALOG.map((c) => [c.id, c]));

export function getCityById(id: string): City | undefined {
  return CATALOG_BY_ID.get(id);
}

function parseOffset(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/(?:GMT|UTC)\s*([+-])?(\d{1,2})(?::(\d{2}))?/i);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const h = parseInt(match[2] ?? '0', 10);
  const m = parseInt(match[3] ?? '0', 10);
  return sign * (h * 60 + m);
}

export function getOffsetMinutes(tz: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const off = parts.find((p) => p.type === 'timeZoneName')?.value;
    return parseOffset(off);
  } catch {
    return 0;
  }
}

export function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

export function getCurrentTimeInZone(tz: string, format: '12h' | '24h'): string {
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    format === '24h'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { hour: 'numeric', minute: '2-digit', hour12: true };
  try {
    return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: tz }).format(now);
  } catch {
    return '';
  }
}
