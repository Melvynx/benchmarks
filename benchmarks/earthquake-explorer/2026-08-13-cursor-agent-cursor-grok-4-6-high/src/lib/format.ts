const magFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const intFmt = new Intl.NumberFormat("en-US");

export function formatMag(mag: number | null): string {
  if (mag === null) return "n/a";
  return magFmt.format(mag);
}

export function formatDepth(depth: number | null): string {
  if (depth === null) return "Unknown depth";
  const rounded = Math.abs(depth) < 10 ? depth.toFixed(1) : Math.round(depth).toString();
  return `${rounded} km`;
}

export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}° ${ns}, ${Math.abs(lon).toFixed(3)}° ${ew}`;
}

export function formatWhen(time: number, now = Date.now()): string {
  const delta = now - time;
  if (delta < 45_000) return "Just now";
  if (delta < 60 * 60 * 1000) {
    const m = Math.round(delta / 60_000);
    return `${m} min ago`;
  }
  if (delta < 24 * 60 * 60 * 1000) {
    const h = Math.round(delta / 3_600_000);
    return `${h} hr ago`;
  }
  const d = Math.round(delta / 86_400_000);
  if (d < 8) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
}

export function formatUtc(time: number): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(time) + " UTC"
  );
}

export function formatLocal(time: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(time);
}

export function formatCount(n: number): string {
  return intFmt.format(n);
}

export function splitPlace(place: string): { offset: string | null; region: string } {
  const idx = place.indexOf(" of ");
  if (idx > 0 && idx < 24) {
    return { offset: place.slice(0, idx + 3).trim(), region: place.slice(idx + 4).trim() };
  }
  return { offset: null, region: place };
}
