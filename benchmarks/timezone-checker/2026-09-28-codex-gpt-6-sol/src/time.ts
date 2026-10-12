export type City = { id: string; name: string; country: string; zone: string };

export const CITIES: City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', zone: 'America/Los_Angeles' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', zone: 'Asia/Makassar' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', zone: 'Europe/Zurich' },
  { id: 'new-york', name: 'New York', country: 'United States', zone: 'America/New_York' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States', zone: 'America/Los_Angeles' },
  { id: 'chicago', name: 'Chicago', country: 'United States', zone: 'America/Chicago' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', zone: 'America/Toronto' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', zone: 'America/Vancouver' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', zone: 'America/Mexico_City' },
  { id: 'bogota', name: 'Bogotá', country: 'Colombia', zone: 'America/Bogota' },
  { id: 'lima', name: 'Lima', country: 'Peru', zone: 'America/Lima' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', zone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', zone: 'America/Argentina/Buenos_Aires' },
  { id: 'london', name: 'London', country: 'United Kingdom', zone: 'Europe/London' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', zone: 'Europe/Lisbon' },
  { id: 'paris', name: 'Paris', country: 'France', zone: 'Europe/Paris' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', zone: 'Europe/Berlin' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', zone: 'Europe/Amsterdam' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', zone: 'Europe/Stockholm' },
  { id: 'athens', name: 'Athens', country: 'Greece', zone: 'Europe/Athens' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', zone: 'Africa/Cairo' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', zone: 'Africa/Lagos' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', zone: 'Africa/Nairobi' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', zone: 'Africa/Johannesburg' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', zone: 'Asia/Dubai' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', zone: 'Asia/Jerusalem' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', zone: 'Asia/Riyadh' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', zone: 'Asia/Kolkata' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', zone: 'Asia/Kathmandu' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', zone: 'Asia/Bangkok' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', zone: 'Asia/Singapore' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', zone: 'Asia/Hong_Kong' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', zone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', zone: 'Asia/Seoul' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', zone: 'Australia/Sydney' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', zone: 'Australia/Melbourne' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', zone: 'Pacific/Auckland' },
];

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(date: Date, zone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const number = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: number('year'), month: number('month'), day: number('day'), hour: number('hour'), minute: number('minute') };
}

export function offsetMinutes(date: Date, zone: string): number {
  const local = zonedParts(date, zone);
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  return Math.round((localAsUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

export function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `UTC${sign}${hours}${remainder ? `:${String(remainder).padStart(2, '0')}` : ''}`;
}

export function referenceInstants(now: Date, zone: string): Date[] {
  const { year, month, day } = zonedParts(now, zone);
  return Array.from({ length: 24 }, (_, hour) => {
    const localAsUtc = Date.UTC(year, month - 1, day, hour);
    let timestamp = localAsUtc - offsetMinutes(new Date(localAsUtc), zone) * 60000;
    timestamp = localAsUtc - offsetMinutes(new Date(timestamp), zone) * 60000;
    return new Date(timestamp);
  });
}

export function localTime(date: Date, zone: string): { hour: number; minute: number } {
  const { hour, minute } = zonedParts(date, zone);
  return { hour, minute };
}

export function isAwake(hour: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return true;
  return wake < sleep ? hour >= wake && hour < sleep : hour >= wake || hour < sleep;
}

export function formatTime(hour: number, minute: number, format: '12h' | '24h'): string {
  const suffix = minute ? `:${String(minute).padStart(2, '0')}` : '';
  if (format === '24h') return `${String(hour % 24).padStart(2, '0')}${suffix}`;
  return `${hour % 12 || 12}${suffix}${hour < 12 ? 'am' : 'pm'}`;
}

export function overlapRanges(hours: boolean[]): [number, number][] {
  const ranges: [number, number][] = [];
  let start = -1;
  for (let hour = 0; hour <= 24; hour += 1) {
    if (hour < 24 && hours[hour]) {
      if (start === -1) start = hour;
    } else if (start !== -1) {
      ranges.push([start, hour]);
      start = -1;
    }
  }
  return ranges;
}
