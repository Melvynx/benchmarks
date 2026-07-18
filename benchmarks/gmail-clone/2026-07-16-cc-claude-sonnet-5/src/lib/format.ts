import {
  format,
  isThisYear,
  isToday,
  isYesterday,
  formatDistanceToNowStrict,
} from "date-fns";

export function formatListDate(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

export function formatFullDate(iso: string): string {
  return format(new Date(iso), "EEE, MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  "#c15f3c",
  "#2f6f6f",
  "#5b6bd6",
  "#a04ea0",
  "#2e7d55",
  "#b5871f",
  "#3f7bc4",
  "#8a5a3c",
  "#6b6fb0",
  "#c25a72",
];

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
