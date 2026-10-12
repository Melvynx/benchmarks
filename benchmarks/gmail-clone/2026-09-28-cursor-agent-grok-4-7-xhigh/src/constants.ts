import type { Settings, UserLabel } from "./types";

export const STORAGE_KEY = "grok47-mail-v1";
export const PAGE_SIZE = 50;

export const SYS = {
  INBOX: "INBOX",
  SENT: "SENT",
  DRAFT: "DRAFT",
  TRASH: "TRASH",
  SPAM: "SPAM",
  STARRED: "STARRED",
  SNOOZED: "SNOOZED",
  IMPORTANT: "IMPORTANT",
  SCHEDULED: "SCHEDULED",
  PERSONAL: "CATEGORY_PERSONAL",
  SOCIAL: "CATEGORY_SOCIAL",
  PROMOTIONS: "CATEGORY_PROMOTIONS",
  UPDATES: "CATEGORY_UPDATES",
} as const;

export const LABEL_COLORS: { bg: string; color: string }[] = [
  { bg: "#e8eaed", color: "#3c4043" },
  { bg: "#d3e3fd", color: "#041e49" },
  { bg: "#c2e7ff", color: "#001d35" },
  { bg: "#ceead6", color: "#0d652d" },
  { bg: "#fce8e6", color: "#8c1d18" },
  { bg: "#feefc3", color: "#5c4300" },
  { bg: "#fde7d0", color: "#7a3e00" },
  { bg: "#eaddff", color: "#4a148c" },
  { bg: "#fad2e8", color: "#7a1f4b" },
];

export const DEFAULT_LABELS: UserLabel[] = [
  { id: "work", name: "Work", bg: "#d3e3fd", color: "#041e49" },
  { id: "personal", name: "Personal", bg: "#fad2e8", color: "#7a1f4b" },
  { id: "receipts", name: "Receipts", bg: "#ceead6", color: "#0d652d" },
  { id: "travel", name: "Travel", bg: "#feefc3", color: "#5c4300" },
  { id: "finance", name: "Finance", bg: "#eaddff", color: "#4a148c" },
  { id: "projects", name: "Projects", bg: "#c2e7ff", color: "#001d35" },
];

export const DEFAULT_SETTINGS: Settings = {
  density: "default",
  theme: "light",
  inboxType: "default",
  readingPane: false,
  vacationOn: false,
  vacationSubject: "Out of office",
  vacationMessage:
    "I'm in Lisbon the week of October 18 and will read mail twice a day. For launch blockers, text Maya.",
  signature: "Alex Chen\nProduct Design, Northwind",
};

export const AVATAR_COLORS = [
  "#1a73e8",
  "#188038",
  "#d93025",
  "#e37400",
  "#9334e6",
  "#129eaf",
  "#c5221f",
  "#0b57d0",
  "#7b1fa2",
  "#00897b",
];
