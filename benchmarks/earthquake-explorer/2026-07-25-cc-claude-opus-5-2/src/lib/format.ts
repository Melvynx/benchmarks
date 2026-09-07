/** Display formatting helpers. All pure, all unit-tested. */

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** "just now", "12m ago", "3h ago", "6d ago". */
export function relativeTime(from: number, now: number): string {
  const delta = Math.max(0, now - from);
  if (delta < MINUTE) return "just now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m ago`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h ago`;
  const days = Math.floor(delta / DAY);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

/** Compact duration without the "ago" suffix, for axis ticks. */
export function shortDuration(ms: number): string {
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  return `${Math.round(ms / DAY)}d`;
}

export function magnitudeLabel(mag: number): string {
  return mag.toFixed(1);
}

export function depthLabel(depth: number): string {
  return depth < 10 ? `${depth.toFixed(1)} km` : `${Math.round(depth)} km`;
}

/** –17.482 → "17.482° S" */
export function latLabel(lat: number): string {
  return `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"}`;
}

export function lonLabel(lon: number): string {
  return `${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? "E" : "W"}`;
}

const ABS_TIME = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const UTC_TIME = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const CLOCK = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function localTime(ms: number): string {
  return ABS_TIME.format(new Date(ms));
}

export function utcTime(ms: number): string {
  return `${UTC_TIME.format(new Date(ms))} UTC`;
}

export function clockTime(ms: number): string {
  return CLOCK.format(new Date(ms));
}

const COMPACT = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

export function compactNumber(value: number): string {
  return COMPACT.format(value);
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

/**
 * Radiated seismic energy from magnitude (Gutenberg–Richter):
 *   log10(E in joules) = 1.5·M + 4.8
 * Expressed as an equivalent mass of TNT, which is how energy release is
 * usually communicated to non-specialists.
 */
export function energyJoules(mag: number): number {
  return 10 ** (1.5 * mag + 4.8);
}

export function tntEquivalent(mag: number): string {
  const kg = energyJoules(mag) / 4.184e6; // 1 kg TNT = 4.184 MJ
  if (kg < 1) return `${(kg * 1000).toFixed(0)} g of TNT`;
  if (kg < 1000) return `${kg.toFixed(kg < 10 ? 1 : 0)} kg of TNT`;
  const tons = kg / 1000;
  if (tons < 1000) return `${tons.toFixed(tons < 10 ? 1 : 0)} tons of TNT`;
  const kilotons = tons / 1000;
  if (kilotons < 1000) return `${kilotons.toFixed(kilotons < 10 ? 1 : 0)} kilotons of TNT`;
  return `${(kilotons / 1000).toFixed(1)} megatons of TNT`;
}

/**
 * Modified Mercalli intensity → the descriptor USGS prints on ShakeMaps.
 * Input may be fractional (instrumental MMI is interpolated).
 */
export function mmiDescriptor(mmi: number): string {
  const level = Math.round(mmi);
  if (level <= 1) return "Not felt";
  if (level === 2) return "Weak";
  if (level === 3) return "Weak";
  if (level === 4) return "Light";
  if (level === 5) return "Moderate";
  if (level === 6) return "Strong";
  if (level === 7) return "Very strong";
  if (level === 8) return "Severe";
  if (level === 9) return "Violent";
  return "Extreme";
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function mmiRoman(mmi: number): string {
  return ROMAN[Math.max(1, Math.min(12, Math.round(mmi)))] ?? "I";
}

/** Split "68 km SSW of Whitehorse, Canada" into distance prefix and region. */
export function splitPlace(place: string): { prefix: string | null; region: string } {
  const match = /^(\d[\d.]*\s*km\s+[NSEW]{1,3})\s+of\s+(.+)$/i.exec(place);
  if (match) return { prefix: match[1].replace(/\s+/g, " "), region: match[2] };
  return { prefix: null, region: place };
}

/** Sentence-case an event type token: "quarry blast" → "Quarry blast". */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
