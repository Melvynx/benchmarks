export type City = {
  id: string;
  name: string;
  country: string;
  timezone: string;
  region: string;
};

export const CITIES: City[] = [
  { id: 'san-francisco', name: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles', region: 'North America' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', region: 'North America' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver', region: 'North America' },
  { id: 'chicago', name: 'Chicago', country: 'United States', timezone: 'America/Chicago', region: 'North America' },
  { id: 'new-york', name: 'New York', country: 'United States', timezone: 'America/New_York', region: 'North America' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', region: 'North America' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', region: 'North America' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', region: 'South America' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', region: 'South America' },
  { id: 'santiago', name: 'Santiago', country: 'Chile', timezone: 'America/Santiago', region: 'South America' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon', region: 'Europe' },
  { id: 'london', name: 'London', country: 'United Kingdom', timezone: 'Europe/London', region: 'Europe' },
  { id: 'dublin', name: 'Dublin', country: 'Ireland', timezone: 'Europe/Dublin', region: 'Europe' },
  { id: 'geneva', name: 'Geneva', country: 'Switzerland', timezone: 'Europe/Zurich', region: 'Europe' },
  { id: 'paris', name: 'Paris', country: 'France', timezone: 'Europe/Paris', region: 'Europe' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', region: 'Europe' },
  { id: 'helsinki', name: 'Helsinki', country: 'Finland', timezone: 'Europe/Helsinki', region: 'Europe' },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', timezone: 'Europe/Istanbul', region: 'Europe' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo', region: 'Africa' },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos', region: 'Africa' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', region: 'Africa' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', timezone: 'Africa/Johannesburg', region: 'Africa' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', region: 'Middle East' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', region: 'Middle East' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', region: 'Asia' },
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', timezone: 'Asia/Kathmandu', region: 'Asia' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', region: 'Asia' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', region: 'Asia' },
  { id: 'denpasar', name: 'Denpasar', country: 'Indonesia', timezone: 'Asia/Makassar', region: 'Asia' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong', region: 'Asia' },
  { id: 'shanghai', name: 'Shanghai', country: 'China', timezone: 'Asia/Shanghai', region: 'Asia' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', region: 'Asia' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', region: 'Asia' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', region: 'Oceania' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne', region: 'Oceania' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland', region: 'Oceania' },
];

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];

const zonedFormatterCache = new Map<string, Intl.DateTimeFormat>();
const localTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getZonedFormatter(timezone: string) {
  let formatter = zonedFormatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    zonedFormatterCache.set(timezone, formatter);
  }
  return formatter;
}

function getLocalTimeFormatter(timezone: string, format: '12h' | '24h') {
  const key = `${timezone}:${format}`;
  let formatter = localTimeFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric', minute: '2-digit',
      hourCycle: format === '24h' ? 'h23' : 'h12',
    });
    localTimeFormatterCache.set(key, formatter);
  }
  return formatter;
}

function zonedParts(date: Date, timezone: string) {
  const parts = getZonedFormatter(timezone).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function zonedPartsAsUtc(parts: Record<string, string>) {
  return Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
}

export function getZonedDate(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

export function getOffsetMinutes(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  const zonedAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return Math.round((zonedAsUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

export function formatOffset(minutes: number) {
  const sign = minutes < 0 ? '−' : '+';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `UTC${sign}${String(hours).padStart(2, '0')}${remainder ? `:${String(remainder).padStart(2, '0')}` : ''}`;
}

export function getInstantForZonedHour(date: ReturnType<typeof getZonedDate>, timezone: string, hour: number) {
  const target = Date.UTC(date.year, date.month - 1, date.day, hour);
  const offsets = new Set<number>();
  const dayMilliseconds = 24 * 60 * 60 * 1000;

  for (const dayOffset of [-1, 0, 1]) {
    offsets.add(getOffsetMinutes(new Date(target + dayOffset * dayMilliseconds), timezone));
  }

  const candidates = [...offsets]
    .map((offset) => new Date(target - offset * 60_000))
    .filter((candidate) => zonedPartsAsUtc(zonedParts(candidate, timezone)) === target)
    .sort((first, second) => first.getTime() - second.getTime());

  // During a fall-back transition, the wall-clock hour occurs twice. Use its first instant.
  return candidates[0];
}

export function formatReferenceHour(hour: number, format: '12h' | '24h') {
  if (format === '24h') return `${String(hour).padStart(2, '0')}:00`;
  const normalized = hour % 12 || 12;
  return `${normalized}${hour < 12 ? 'a' : 'p'}`;
}

export function formatRangeHour(hour: number, format: '12h' | '24h') {
  if (format === '24h') return hour === 24 ? '24:00' : `${String(hour).padStart(2, '0')}:00`;
  const normalized = hour % 12 || 12;
  const period = hour === 24 ? 'am' : hour < 12 ? 'am' : 'pm';
  return `${normalized}${period}`;
}

export function isAwakeAt(date: Date, timezone: string, wakeHour: number, sleepHour: number) {
  if (wakeHour === sleepHour) return true;
  const parts = zonedParts(date, timezone);
  const localMinute = Number(parts.hour) * 60 + Number(parts.minute);
  const wake = wakeHour * 60;
  const sleep = sleepHour * 60;
  return wake < sleep ? localMinute >= wake && localMinute < sleep : localMinute >= wake || localMinute < sleep;
}

export function getContiguousRanges(hours: number[]) {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const hour of hours) {
    const last = ranges[ranges.length - 1];
    if (last && last.end === hour) last.end += 1;
    else ranges.push({ start: hour, end: hour + 1 });
  }
  return ranges;
}

export function formatShortLocalTime(date: Date, timezone: string, format: '12h' | '24h') {
  const parts = getLocalTimeFormatter(timezone, format).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value.toLowerCase() ?? '';
  if (format === '24h') return `${hour.padStart(2, '0')}:${minute}`;
  const minutePart = minute === '00' ? '' : `:${minute}`;
  return `${hour}${minutePart}${dayPeriod[0] ?? ''}`;
}
