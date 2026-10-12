const MAG_TYPES: Record<string, string> = {
  ml: 'local (ml)',
  md: 'duration (md)',
  mb: 'body wave (mb)',
  ms: 'surface wave (ms)',
  mw: 'moment (mw)',
  mww: 'moment W-phase (mww)',
  mwc: 'moment centroid (mwc)',
  mwb: 'moment body (mwb)',
  mwr: 'moment regional (mwr)',
  mi: 'moment intensity (mi)',
  mh: 'hand (mh)',
};

export function relativeTime(ms: number, now: number): string {
  const delta = Math.max(0, now - ms);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < 45_000) return 'just now';
  if (delta < hour) {
    const minutes = Math.max(1, Math.round(delta / minute));
    return `${minutes}m ago`;
  }
  if (delta < day) return `${Math.round(delta / hour)}h ago`;
  const days = Math.round(delta / day);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export function formatStamp(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms);
}

export function formatStampUtc(ms: number): string {
  return `${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(ms)} UTC`;
}

export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

export function formatDepth(km: number): string {
  const abs = Math.abs(km);
  const value = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  if (km < 0) return `${value} km above datum`;
  return `${value} km`;
}

export function depthNumber(km: number): string {
  const abs = Math.abs(km);
  const value = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return km < 0 ? `−${value}` : value;
}

export function depthZone(km: number): { label: string; note: string } {
  if (km < 70) {
    return {
      label: 'Shallow',
      note: 'In the crust. These are the events people are most likely to feel.',
    };
  }
  if (km <= 300) {
    return {
      label: 'Intermediate',
      note: 'Usually inside a slab that is sinking under another plate.',
    };
  }
  return {
    label: 'Deep',
    note: 'Deep in a subducting slab. Large ones are rarely damaging at the surface.',
  };
}

export function significance(sig: number): string {
  if (sig < 100) return 'low';
  if (sig < 300) return 'moderate';
  if (sig < 600) return 'high';
  return 'very high';
}

export function feltLabel(felt: number | null): string {
  if (felt === null || felt <= 0) return 'None reported';
  if (felt === 1) return '1 person';
  return `${felt.toLocaleString()} people`;
}

function intensityWord(value: number): string {
  if (value < 2) return 'not felt';
  if (value < 4) return 'weak';
  if (value < 5) return 'light';
  if (value < 6) return 'moderate';
  if (value < 7) return 'strong';
  if (value < 8) return 'very strong';
  if (value < 9) return 'severe';
  if (value < 10) return 'violent';
  return 'extreme';
}

export function intensityLabel(value: number | null): string {
  if (value === null) return 'Not reported';
  return `${value.toFixed(1)} · ${intensityWord(value)}`;
}

export function magTypeLabel(magType: string): string {
  return MAG_TYPES[magType.toLowerCase()] ?? magType;
}

export function statusLabel(status: string): string {
  if (status === 'reviewed') return 'Reviewed by USGS';
  if (status === 'automatic') return 'Automatic solution';
  return status;
}
