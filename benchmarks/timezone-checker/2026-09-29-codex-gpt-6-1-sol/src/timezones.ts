export type City = { id: string; name: string; country: string; zone: string; flag: string };
export type Settings = { cities: string[]; wake: number; sleep: number; format: '12h' | '24h'; mode: 'meeting' | 'base' };

export const cities: City[] = [
  { id: 'sf', name: 'San Francisco', country: 'United States', zone: 'America/Los_Angeles', flag: '🇺🇸' },
  { id: 'ny', name: 'New York', country: 'United States', zone: 'America/New_York', flag: '🇺🇸' },
  { id: 'chi', name: 'Chicago', country: 'United States', zone: 'America/Chicago', flag: '🇺🇸' },
  { id: 'van', name: 'Vancouver', country: 'Canada', zone: 'America/Vancouver', flag: '🇨🇦' },
  { id: 'tor', name: 'Toronto', country: 'Canada', zone: 'America/Toronto', flag: '🇨🇦' },
  { id: 'mex', name: 'Mexico City', country: 'Mexico', zone: 'America/Mexico_City', flag: '🇲🇽' },
  { id: 'bog', name: 'Bogotá', country: 'Colombia', zone: 'America/Bogota', flag: '🇨🇴' },
  { id: 'sao', name: 'São Paulo', country: 'Brazil', zone: 'America/Sao_Paulo', flag: '🇧🇷' },
  { id: 'ba', name: 'Buenos Aires', country: 'Argentina', zone: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
  { id: 'lon', name: 'London', country: 'United Kingdom', zone: 'Europe/London', flag: '🇬🇧' },
  { id: 'par', name: 'Paris', country: 'France', zone: 'Europe/Paris', flag: '🇫🇷' },
  { id: 'gen', name: 'Geneva', country: 'Switzerland', zone: 'Europe/Zurich', flag: '🇨🇭' },
  { id: 'ber', name: 'Berlin', country: 'Germany', zone: 'Europe/Berlin', flag: '🇩🇪' },
  { id: 'lis', name: 'Lisbon', country: 'Portugal', zone: 'Europe/Lisbon', flag: '🇵🇹' },
  { id: 'ist', name: 'Istanbul', country: 'Türkiye', zone: 'Europe/Istanbul', flag: '🇹🇷' },
  { id: 'cai', name: 'Cairo', country: 'Egypt', zone: 'Africa/Cairo', flag: '🇪🇬' },
  { id: 'lag', name: 'Lagos', country: 'Nigeria', zone: 'Africa/Lagos', flag: '🇳🇬' },
  { id: 'nai', name: 'Nairobi', country: 'Kenya', zone: 'Africa/Nairobi', flag: '🇰🇪' },
  { id: 'cap', name: 'Cape Town', country: 'South Africa', zone: 'Africa/Johannesburg', flag: '🇿🇦' },
  { id: 'dub', name: 'Dubai', country: 'United Arab Emirates', zone: 'Asia/Dubai', flag: '🇦🇪' },
  { id: 'riy', name: 'Riyadh', country: 'Saudi Arabia', zone: 'Asia/Riyadh', flag: '🇸🇦' },
  { id: 'del', name: 'New Delhi', country: 'India', zone: 'Asia/Kolkata', flag: '🇮🇳' },
  { id: 'ktm', name: 'Kathmandu', country: 'Nepal', zone: 'Asia/Kathmandu', flag: '🇳🇵' },
  { id: 'bkk', name: 'Bangkok', country: 'Thailand', zone: 'Asia/Bangkok', flag: '🇹🇭' },
  { id: 'sin', name: 'Singapore', country: 'Singapore', zone: 'Asia/Singapore', flag: '🇸🇬' },
  { id: 'den', name: 'Denpasar', country: 'Indonesia', zone: 'Asia/Makassar', flag: '🇮🇩' },
  { id: 'hkg', name: 'Hong Kong', country: 'China', zone: 'Asia/Hong_Kong', flag: '🇭🇰' },
  { id: 'sha', name: 'Shanghai', country: 'China', zone: 'Asia/Shanghai', flag: '🇨🇳' },
  { id: 'tok', name: 'Tokyo', country: 'Japan', zone: 'Asia/Tokyo', flag: '🇯🇵' },
  { id: 'seo', name: 'Seoul', country: 'South Korea', zone: 'Asia/Seoul', flag: '🇰🇷' },
  { id: 'syd', name: 'Sydney', country: 'Australia', zone: 'Australia/Sydney', flag: '🇦🇺' },
  { id: 'per', name: 'Perth', country: 'Australia', zone: 'Australia/Perth', flag: '🇦🇺' },
  { id: 'adl', name: 'Adelaide', country: 'Australia', zone: 'Australia/Adelaide', flag: '🇦🇺' },
  { id: 'auk', name: 'Auckland', country: 'New Zealand', zone: 'Pacific/Auckland', flag: '🇳🇿' },
];

export const defaults: Settings = { cities: ['sf', 'den', 'gen'], wake: 7, sleep: 23, format: '12h', mode: 'meeting' };
export const hours = Array.from({ length: 24 }, (_, index) => index);
export const wrap = (minutes: number) => ((minutes % 1440) + 1440) % 1440;

export function offsetMinutes(zone: string, date = new Date()): number {
  const offset = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  return match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0;
}

export function offsetLabel(minutes: number): string {
  const absolute = Math.abs(minutes);
  return `UTC${minutes >= 0 ? '+' : '−'}${Math.floor(absolute / 60)}${absolute % 60 ? `:${String(absolute % 60).padStart(2, '0')}` : ''}`;
}

export function isAwake(minutes: number, wake: number, sleep: number): boolean {
  const local = wrap(minutes);
  if (wake === sleep) return true;
  return wake < sleep ? local >= wake * 60 && local < sleep * 60 : local >= wake * 60 || local < sleep * 60;
}

export function formatTime(minutes: number, format: Settings['format'], compact = false): string {
  const local = wrap(minutes);
  const hour = Math.floor(local / 60);
  const minute = local % 60;
  if (format === '24h') return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${compact ? '' : hour < 12 ? 'am' : 'pm'}`;
}

export function ranges(overlap: boolean[]): [number, number][] {
  const result: [number, number][] = [];
  let start: number | null = null;
  for (let hour = 0; hour <= 24; hour++) {
    if (overlap[hour] && start === null) start = hour;
    if (!overlap[hour] && start !== null) { result.push([start, hour]); start = null; }
  }
  return result;
}

export function calculate(selected: City[], settings: Settings, date = new Date()) {
  const offsets = selected.map(city => offsetMinutes(city.zone, date));
  const local = offsets.map(offset => hours.map(hour => wrap(hour * 60 + offset - offsets[0])));
  const awake = local.map(row => row.map(minutes => isAwake(minutes, settings.wake, settings.sleep)));
  const meeting = hours.map(hour => awake.every(row => row[hour]));
  const overlap = awake.map((row, index) => hours.map(hour => settings.mode === 'meeting' ? meeting[hour] : index === 0 ? row[hour] && awake.slice(1).some(other => other[hour]) : row[hour] && awake[0][hour]));
  return { offsets, local, awake, overlap, meeting };
}

export function loadSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem('codex-timezones-v1') ?? 'null');
    if (!stored || !Array.isArray(stored.cities)) return defaults;
    const selected = [...new Set<string>(stored.cities.filter((id: unknown) => cities.some(city => city.id === id)))];
    return {
      cities: selected,
      wake: Number.isInteger(stored.wake) && stored.wake >= 0 && stored.wake <= 23 ? stored.wake : 7,
      sleep: Number.isInteger(stored.sleep) && stored.sleep >= 0 && stored.sleep <= 23 ? stored.sleep : 23,
      format: stored.format === '24h' ? '24h' : '12h',
      mode: stored.mode === 'base' ? 'base' : 'meeting',
    };
  } catch { return defaults; }
}
