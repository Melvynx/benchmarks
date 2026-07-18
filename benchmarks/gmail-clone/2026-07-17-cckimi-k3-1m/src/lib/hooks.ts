import { useEffect, useState } from 'react';

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    onChange();
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** true when typing in an input/textarea/contenteditable */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** Preset snooze times, Gmail-style. */
export function snoozePresets(): Array<{ label: string; hint: string; at: number }> {
  const now = new Date();
  const presets: Array<{ label: string; hint: string; at: number }> = [];

  const later = new Date(now);
  later.setHours(18, 0, 0, 0);
  if (later.getTime() > now.getTime() + 30 * 60_000 && now.getHours() < 18) {
    presets.push({ label: 'Later today', hint: '6:00 PM', at: later.getTime() });
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  presets.push({
    label: 'Tomorrow',
    hint: tomorrow.toLocaleDateString('en-US', { weekday: 'short' }) + ', 8:00 AM',
    at: tomorrow.getTime(),
  });

  const weekend = new Date(now);
  const day = weekend.getDay(); // 0 sun … 6 sat
  const toSat = day === 6 ? 7 : (6 - day + 7) % 7 || 7;
  weekend.setDate(weekend.getDate() + toSat);
  weekend.setHours(8, 0, 0, 0);
  presets.push({
    label: 'This weekend',
    hint: weekend.toLocaleDateString('en-US', { weekday: 'short' }) + ', 8:00 AM',
    at: weekend.getTime(),
  });

  const nextWeek = new Date(now);
  const toMon = (8 - nextWeek.getDay()) % 7 || 7;
  nextWeek.setDate(nextWeek.getDate() + toMon);
  nextWeek.setHours(8, 0, 0, 0);
  presets.push({
    label: 'Next week',
    hint: nextWeek.toLocaleDateString('en-US', { weekday: 'short' }) + ', 8:00 AM',
    at: nextWeek.getTime(),
  });

  return presets;
}

export function downloadAttachment(name: string, mime: string) {
  let blob: Blob;
  if (mime.startsWith('image/')) {
    const hue = Math.abs([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="hsl(${hue},45%,88%)"/><rect x="40" y="40" width="720" height="420" rx="12" fill="hsl(${hue},50%,72%)"/><text x="400" y="260" font-family="sans-serif" font-size="28" fill="hsl(${hue},40%,25%)" text-anchor="middle">${name}</text></svg>`;
    blob = new Blob([svg], { type: 'image/svg+xml' });
  } else {
    const text = [
      `File: ${name}`,
      `Type: ${mime}`,
      '',
      'This is a locally generated placeholder for the seeded attachment in the k3[1m] mail demo.',
      'In a real mailbox this would be the original file content.',
    ].join('\n');
    blob = new Blob([text], { type: 'text/plain' });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
