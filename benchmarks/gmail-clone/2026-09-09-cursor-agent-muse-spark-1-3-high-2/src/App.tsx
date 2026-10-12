import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONTACTS, LABEL_DEFS, ME, MY_EMAIL, seedThreads, type Attachment, type Thread } from "./mail";

type Mailbox = "inbox" | "starred" | "snoozed" | "sent" | "drafts" | "spam" | "trash" | "all" | `label:${string}`;
type Density = "comfortable" | "cozy" | "compact";
type Theme = "light" | "dark";
type Category = "primary" | "promotions" | "social" | "updates" | "forums";

interface ComposeWin {
  id: string;
  to: string;
  cc: string;
  bcc: string;
  showCc: boolean;
  showBcc: boolean;
  subject: string;
  body: string;
  minimized: boolean;
  maximized: boolean;
  fullscreen?: boolean;
  fromDraftId?: string;
  replyToId?: string;
  kind: "new" | "reply" | "forward" | "draft";
  scheduleOpen?: boolean;
}

interface Toast { id: number; text: string; action?: string; onAction?: () => void; }

const STORE_KEY = "muse-spark-mail-v1";
const AVATAR_COLORS = ["#7b1fa2", "#0b57d0", "#006a6a", "#b06000", "#a50e0e", "#3c8039", "#e8710a", "#9334e6", "#0097a7", "#5c6bc0", "#c2185b", "#558b2f"];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "A") + (p[1]?.[0] ?? "")).toUpperCase();
}
function fmtListDate(ts: number, now = Date.now()): string {
  const d = new Date(ts), n = new Date(now);
  const sameDay = d.toDateString() === n.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(" ", "");
  const y = new Date(now - 86400000);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  if (now - ts < 7 * 86400000) return d.toLocaleDateString([], { weekday: "short" });
  if (d.getFullYear() === n.getFullYear()) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" });
}
function fmtFullDate(ts: number): string {
  return new Date(ts).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function threadDate(t: Thread): number {
  return t.messages[t.messages.length - 1].date;
}
function participants(t: Thread): string {
  const names = t.messages.map((m) => m.from);
  const uniq = [...new Set(names)];
  const count = t.messages.length;
  return count > 1 ? `${uniq.slice(0, 2).join(", ")} (${count})` : uniq[0];
}
let uid = 1000;
const nid = (p = "id") => `${p}-${Date.now().toString(36)}-${uid++}`;

function parseQuery(q: string): { text: string[]; from?: string; label?: string; hasAttach?: boolean; isStarred?: boolean; isUnread?: boolean } {
  const out: { text: string[]; from?: string; label?: string; hasAttach?: boolean; isStarred?: boolean; isUnread?: boolean } = { text: [] };
  for (const tok of q.split(/\s+/)) {
    const low = tok.toLowerCase();
    if (low.startsWith("from:")) out.from = tok.slice(5);
    else if (low.startsWith("label:")) out.label = tok.slice(6);
    else if (low === "has:attachment" || low === "has:attachments") out.hasAttach = true;
    else if (low === "is:starred") out.isStarred = true;
    else if (low === "is:unread") out.isUnread = true;
    else if (tok.trim()) out.text.push(tok);
  }
  return out;
}

function matchesSearch(t: Thread, q: string): boolean {
  if (!q.trim()) return true;
  const p = parseQuery(q);
  if (p.from && !t.messages.some((m) => (m.from + " " + m.fromEmail).toLowerCase().includes(p.from!.toLowerCase()))) return false;
  if (p.label && !t.labels.some((l) => l.toLowerCase() === p.label!.toLowerCase())) return false;
  if (p.hasAttach && !t.hasAttachment) return false;
  if (p.isStarred && !t.starred) return false;
  if (p.isUnread && !t.unread) return false;
  const hay = (t.subject + " " + t.snippet + " " + t.messages.map((m) => m.from + " " + m.fromEmail + " " + m.body).join(" ")).toLowerCase();
  return p.text.every((w) => hay.includes(w.toLowerCase()));
}

function mailboxFilter(t: Thread, mb: Mailbox): boolean {
  if (t.spam && mb !== "spam") return false;
  if (t.trashed && mb !== "trash") return false;
  switch (mb) {
    case "inbox": return !t.archived && !t.trashed && !t.spam && !t.draft && !t.sent && !(t.snoozedUntil && t.snoozedUntil > Date.now());
    case "starred": return t.starred && !t.trashed && !t.spam;
    case "snoozed": return !!t.snoozedUntil && t.snoozedUntil > Date.now() && !t.trashed && !t.spam;
    case "sent": return !!t.sent && !t.trashed;
    case "drafts": return !!t.draft && !t.trashed;
    case "spam": return !!t.spam;
    case "trash": return !!t.trashed;
    case "all": return !t.trashed && !t.spam;
    default:
      if (mb.startsWith("label:")) return t.labels.includes(mb.slice(6)) && !t.trashed && !t.spam;
      return true;
  }
}

const NAV: Array<{ id: Mailbox; label: string; icon: string }> = [
  { id: "inbox", label: "Inbox", icon: "inbox" },
  { id: "starred", label: "Starred", icon: "star" },
  { id: "snoozed", label: "Snoozed", icon: "snooze" },
  { id: "sent", label: "Sent", icon: "send" },
  { id: "drafts", label: "Drafts", icon: "draft" },
  { id: "spam", label: "Spam", icon: "spam" },
  { id: "trash", label: "Trash", icon: "trash" },
  { id: "all", label: "All Mail", icon: "all" },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const s = { width: size, height: size } as const;
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...s };
  switch (name) {
    case "menu": return <svg {...common} viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case "search": return <svg {...common} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case "inbox": return <svg {...common} viewBox="0 0 24 24"><path d="M3 13l2.5-8h13L21 13v6H3v-6Z" /><path d="M3 13h5l1.5 2h5L16 13h5" /></svg>;
    case "star": return <svg {...common} viewBox="0 0 24 24"><path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.1-5.6-3-5.6 3 1.2-6.1L3 9.6l6.3-.8L12 3Z" /></svg>;
    case "starfill": return <svg viewBox="0 0 24 24" style={{ width: size, height: size, fill: "#fbbc04", stroke: "#e37400", strokeWidth: 1.2 }}><path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.1-5.6-3-5.6 3 1.2-6.1L3 9.6l6.3-.8L12 3Z" /></svg>;
    case "snooze": return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="13" r="7" /><path d="M12 9v4l2.5 2.5M9 2h6" /></svg>;
    case "send": return <svg {...common} viewBox="0 0 24 24"><path d="m3 11 18-8-8 18-2.5-7.5L3 11Z" /></svg>;
    case "draft": return <svg {...common} viewBox="0 0 24 24"><path d="M5 4h14v12H5zM5 4l3 3 3-3M9 12h6M9 15h4" /></svg>;
    case "spam": return <svg {...common} viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3ZM12 10v4M12 17.5v.01" /></svg>;
    case "trash": return <svg {...common} viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>;
    case "all": return <svg {...common} viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 7l8 6 8-6" /></svg>;
    case "archive": return <svg {...common} viewBox="0 0 24 24"><path d="M4 4h16v4H4zM5 8v12h14V8M10 12h4" /></svg>;
    case "read": return <svg {...common} viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 7l8 6 8-6" /><path d="m4 19 5-5M20 19l-5-5" /></svg>;
    case "unread": return <svg {...common} viewBox="0 0 24 24"><path d="M4 5c2.5 0 5 1 6 2 1-1 3.5-2 6-2h4v14h-4c-2.5 0-5 1-6 2-1-1-3.5-2-6-2H0V5h4Z" transform="translate(2 0) scale(.92)" /></svg>;
    case "label": return <svg {...common} viewBox="0 0 24 24"><path d="M4 4h7l9 9-7 7-9-9V4ZM8 8h.01" /></svg>;
    case "more": return <svg {...common} viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></svg>;
    case "back": return <svg {...common} viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>;
    case "reply": return <svg {...common} viewBox="0 0 24 24"><path d="M9 10 4 14l5 4v-3c6 0 9 2 11 5-.5-6-4-9-11-10v-0Z" /></svg>;
    case "forward": return <svg {...common} viewBox="0 0 24 24"><path d="m15 10 5 4-5 4v-3c-6 0-9 2-11 5 .5-6 4-9 11-10v-0Z" /></svg>;
    case "attach": return <svg {...common} viewBox="0 0 24 24"><path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 6" /></svg>;
    case "compose": return <svg {...common} viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" /></svg>;
    case "settings": return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z" /></svg>;
    case "apps": return <svg viewBox="0 0 24 24" style={{ width: size, height: size, fill: "currentColor" }}><circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="19" cy="19" r="2" /></svg>;
    case "help": return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5A2.5 2.5 0 0 1 12 8c1.4 0 2.5 1 2.5 2.2 0 1.7-2 2-2.5 3.3M12 17v.01" /></svg>;
    case "refresh": return <svg {...common} viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4" /></svg>;
    case "chevdown": return <svg {...common} viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>;
    case "close": return <svg {...common} viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "check": return <svg {...common} viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>;
    case "important": return <svg {...common} viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3ZM12 10v4M12 17.5v.01" /></svg>;
    case "importantfill": return <svg viewBox="0 0 24 24" style={{ width: size, height: size, fill: "#fbbc04", stroke: "#e37400", strokeWidth: 1 }}><path d="M12 3 2.5 20h19L12 3ZM12 10v4M12 17.5v.01" stroke="#7a5100" fill="none" strokeWidth="1.6" strokeLinecap="round" /></svg>;
    case "print": return <svg {...common} viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z" /></svg>;
    case "image": return <svg {...common} viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 18 5-5 3 3 2-2 4 4" /></svg>;
    case "emoji": return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r=".8" fill="currentColor" /><circle cx="15" cy="10" r=".8" fill="currentColor" /><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" /></svg>;
    case "link": return <svg {...common} viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>;
    case "bold": return <svg viewBox="0 0 24 24" style={{ width: size, height: size }}><text x="7" y="17" fontSize="14" fontWeight="800" fill="currentColor" fontFamily="sans-serif">B</text></svg>;
    case "italic": return <svg viewBox="0 0 24 24" style={{ width: size, height: size }}><text x="9" y="17" fontSize="14" fontStyle="italic" fontWeight="700" fill="currentColor" fontFamily="serif">I</text></svg>;
    case "min": return <svg {...common} viewBox="0 0 24 24"><path d="M5 12h14" /></svg>;
    case "max": return <svg {...common} viewBox="0 0 24 24"><path d="M5 4h14v16H5z" /></svg>;
    case "cal": return <svg {...common} viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M4 10h16M8 3v5M16 3v5" /></svg>;
    case "keep": return <svg {...common} viewBox="0 0 24 24"><path d="M7 3h10l4 4v14H7V3ZM15 3v5h5" /></svg>;
    case "tasks": return <svg {...common} viewBox="0 0 24 24"><path d="m4 13 3 3L11 12M4 6.5 7 9.5 11 5.5M13 6h7M13 12h7M13 18h7" /></svg>;
    case "contacts": return <svg {...common} viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3 2.6 3 4.5" /></svg>;
    case "filter": return <svg {...common} viewBox="0 0 24 24"><path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" /></svg>;
    case "undo": return <svg {...common} viewBox="0 0 24 24"><path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12h-3" /></svg>;
    case "mute": return <svg {...common} viewBox="0 0 24 24"><path d="M4 10v4h3l4 4V6l-4 4H4ZM16 9l5 6M21 9l-5 6" /></svg>;
    default: return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>;
  }
}

function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Thread[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* fresh seed */ }
  return seedThreads();
}

export default function App() {
  const [threads, setThreads] = useState<Thread[]>(loadThreads);
  const [mailbox, setMailbox] = useState<Mailbox>("inbox");
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [density, setDensity] = useState<Density>("comfortable");
  const [theme, setTheme] = useState<Theme>("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const [composes, setComposes] = useState<ComposeWin[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeMsg, setActiveMsg] = useState<Record<string, number>>({});
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [convView, setConvView] = useState(true);
  const [suggestFor, setSuggestFor] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"cal" | "keep" | "tasks" | null>(null);
  const [keepNotes, setKeepNotes] = useState<string[]>(["Call Ingrid about the scarf", "CAB keynote outline", "Buy mochi for Friday 🍡"]);
  const [tasks, setTasks] = useState<Array<{ t: string; done: boolean }>>([
    { t: "Approve Q3 comms timeline", done: false },
    { t: "Reply to James (offer)", done: false },
    { t: "Pay Bloom invoice", done: true },
  ]);
  const [page, setPage] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(threads)); } catch { /* ignore */ }
  }, [threads]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
  }, [theme, density]);
  useEffect(() => { setPage(0); setCursor(0); setSelected(new Set()); }, [mailbox, category, query]);
  useEffect(() => {
    const onClick = () => setOpenMenu(null);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const toast = useCallback((text: string, action?: string, onAction?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, text, action, onAction }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 6000);
  }, []);

  const update = useCallback((id: string, fn: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { inbox: 0, starred: 0, snoozed: 0, sent: 0, drafts: 0, spam: 0, trash: 0 };
    for (const t of threads) {
      if (mailboxFilter(t, "inbox") && t.unread) c.inbox++;
      if (t.starred && !t.trashed && !t.spam) c.starred++;
      if (t.snoozedUntil && t.snoozedUntil > Date.now()) c.snoozed++;
      if (t.sent && !t.trashed) c.sent++;
      if (t.draft && !t.trashed) c.drafts++;
      if (t.spam) c.spam++;
      if (t.trashed) c.trash++;
    }
    return c;
  }, [threads]);

  const filtered = useMemo(() => {
    const searching = query.trim().length > 0;
    let list = threads.filter((t) => searching ? (!t.trashed || mailbox === "trash") && (!t.spam || mailbox === "spam") && matchesSearch(t, query) : mailboxFilter(t, mailbox));
    if (!searching && mailbox === "inbox" && category !== "all") list = list.filter((t) => t.category === category);
    list = [...list].sort((a, b) => threadDate(b) - threadDate(a));
    if (!convView) {
      const flat: Thread[] = [];
      for (const t of list) {
        if (t.messages.length <= 1) { flat.push(t); continue; }
        t.messages.forEach((m, i) => flat.push({ ...t, id: `${t.id}#${i}`, messages: [m], snippet: m.body.slice(0, 90).replace(/\n/g, " "), subject: `${t.subject}` }));
      }
      return flat;
    }
    return list;
  }, [threads, mailbox, category, query, convView]);

  const PAGE_SIZE = 30;
  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const openThread = openThreadId ? threads.find((t) => t.id === openThreadId) ?? null : null;

  const openThreadFn = useCallback((id: string) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)));
    setOpenThreadId(id);
    setActiveMsg((p) => ({ ...p, [id]: -1 }));
  }, []);

  function bulk(ids: string[], fn: (t: Thread) => Thread, msg: string, undoable = true) {
    const before = threads;
    setThreads((prev) => prev.map((t) => (ids.includes(t.id) ? fn(t) : t)));
    setSelected(new Set());
    if (undoable) toast(msg, "Undo", () => setThreads(before));
    else toast(msg);
  }
  const selIds = useMemo(() => [...selected].filter((id) => filtered.some((t) => t.id === id)), [selected, filtered]);

  function archiveIds(ids: string[]) { bulk(ids, (t) => ({ ...t, archived: true, snoozedUntil: null }), ids.length > 1 ? `${ids.length} conversations archived` : "Conversation archived"); }
  function trashIds(ids: string[]) { bulk(ids, (t) => ({ ...t, trashed: true }), ids.length > 1 ? `${ids.length} conversations moved to Trash` : "Conversation moved to Trash"); }
  function spamIds(ids: string[]) { bulk(ids, (t) => ({ ...t, spam: true }), "Reported as spam"); }
  function markRead(ids: string[], read: boolean) { setThreads((p) => p.map((t) => (ids.includes(t.id) ? { ...t, unread: !read } : t))); setSelected(new Set()); toast(read ? "Marked as read" : "Marked as unread"); }
  function snoozeIds(ids: string[], until: number) {
    const label = until - Date.now() > 3 * 86400000 ? "Snoozed until " + new Date(until).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Snoozed";
    setThreads((p) => p.map((t) => (ids.includes(t.id) ? { ...t, snoozedUntil: until, archived: false } : t)));
    setSelected(new Set());
    if (openThreadId && ids.includes(openThreadId)) setOpenThreadId(null);
    toast(label, "Undo", () => setThreads(threads));
  }
  function labelIds(ids: string[], label: string) {
    setThreads((p) => p.map((t) => (ids.includes(t.id) ? { ...t, labels: t.labels.includes(label) ? t.labels.filter((l) => l !== label) : [...t.labels, label] } : t)));
    setSelected(new Set());
    toast(`Label "${label}" toggled`);
  }

  function openCompose(partial: Partial<ComposeWin> = {}) {
    const w: ComposeWin = { id: nid("compose"), to: "", cc: "", bcc: "", showCc: false, showBcc: false, subject: "", body: "", minimized: false, maximized: false, kind: "new", ...partial };
    setComposes((p) => [...p.slice(-2), w]);
    return w.id;
  }
  function sendCompose(id: string, scheduled?: number) {
    const w = composes.find((c) => c.id === id);
    if (!w) return;
    if (!w.to.trim() && !w.subject.trim() && !w.body.trim()) { setComposes((p) => p.filter((c) => c.id !== id)); return; }
    const toList = w.to.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const thread: Thread = {
      id: nid("t"), subject: w.subject.trim() || "(no subject)",
      messages: [{ id: nid("m"), from: ME, fromEmail: MY_EMAIL, to: toList.length ? toList : ["(draft)"], date: scheduled ?? Date.now(), body: w.body || "" }],
      labels: [], category: "primary", snippet: (w.body || "").slice(0, 90).replace(/\n/g, " ") || "(no body)",
      unread: false, starred: false, important: false, hasAttachment: false, sent: true,
    };
    if (w.fromDraftId) {
      setThreads((p) => p.map((t) => (t.id === w.fromDraftId ? { ...thread, id: t.id } : t)));
    } else {
      setThreads((p) => [thread, ...p]);
    }
    setComposes((p) => p.filter((c) => c.id !== id));
    const before = threads;
    toast(scheduled ? `Scheduled for ${new Date(scheduled).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "Message sent", "Undo", () => setThreads(before));
    if (mailbox !== "sent" && !scheduled) setMailbox("sent");
  }

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "Escape") { setShowShortcuts(false); setSettingsOpen(false); setAdvOpen(false); return; }
      if (typing) return;
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (showShortcuts) return;
      const cur = paged[cursor];
      const curId = openThreadId ?? cur?.id;
      switch (e.key) {
        case "j": if (!openThreadId) setCursor((c) => Math.min(c + 1, paged.length - 1)); break;
        case "k": if (!openThreadId) setCursor((c) => Math.max(c - 1, 0)); break;
        case "x": if (cur && !openThreadId) setSelected((p) => { const n = new Set(p); if (n.has(cur.id)) n.delete(cur.id); else n.add(cur.id); return n; }); break;
        case "s": if (curId) update(curId, (t) => ({ ...t, starred: !t.starred })); break;
        case "e": if (curId) { archiveIds([curId]); setOpenThreadId(null); } break;
        case "#": if (curId) { trashIds([curId]); setOpenThreadId(null); } break;
        case "u": if (openThreadId) setOpenThreadId(null); break;
        case "c": openCompose(); break;
        case "r": if (openThread) startReply(openThread); break;
        case "?": setShowShortcuts(true); break;
        case "Enter": if (cur && !openThreadId) openThreadFn(cur.id); break;
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged, cursor, openThreadId, openThread, composes, threads, showShortcuts]);

  function startReply(t: Thread, forward = false) {
    const last = t.messages[t.messages.length - 1];
    const q = `\n\n— — —\nOn ${fmtFullDate(last.date)}, ${last.from} wrote:\n> ${last.body.split("\n").join("\n> ")}`;
    openCompose({
      kind: forward ? "forward" : "reply",
      subject: (forward ? "Fwd: " : "Re: ") + t.subject.replace(/^(Re: |Fwd: )/, ""),
      body: forward ? q : "",
      to: forward ? "" : last.from === ME ? t.messages[0].fromEmail ?? "" : last.fromEmail,
      replyToId: t.id,
    });
  }

  const allChecked = paged.length > 0 && paged.every((t) => selected.has(t.id));
  const someChecked = paged.some((t) => selected.has(t.id));

  const storagePct = Math.min(87, 41 + Math.round(threads.length / 3));

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <div className="tb-left">
          <button className="icon-btn" aria-label="Menu" onClick={() => { setSidebarOpen(!sidebarOpen); setMobileNav(!mobileNav); }}><Icon name="menu" /></button>
          <div className="brand" onClick={() => { setMailbox("inbox"); setOpenThreadId(null); setQuery(""); }}>
            <svg width="30" height="22" viewBox="0 0 30 22"><path d="M2 3h26v16H2z" fill="none" /><path d="M1 4 15 13 29 4" stroke="#0b57d0" strokeWidth="2.4" fill="none" strokeLinecap="round" /><rect x="1" y="3" width="28" height="17" rx="2.5" stroke="#5f6368" strokeWidth="1.6" fill="none" /><path d="M1 5 11 13M29 5 19 13" stroke="#ea4335" strokeWidth="1.4" /></svg>
            <span className="brand-name">Muse Spark 1.3</span>
          </div>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <button className="icon-btn sm" aria-label="Search"><Icon name="search" size={18} /></button>
            <input ref={searchRef} value={query} onChange={(e) => { setQuery(e.target.value); setOpenThreadId(null); }} placeholder="Search mail" aria-label="Search mail" />
            {query && <button className="icon-btn sm" onClick={() => setQuery("")} aria-label="Clear"><Icon name="close" size={16} /></button>}
            <button className="icon-btn sm" aria-label="Advanced search" onClick={(e) => { e.stopPropagation(); setAdvOpen(!advOpen); }}><Icon name="filter" size={18} /></button>
          </div>
          {advOpen && (
            <div className="adv" onClick={(e) => e.stopPropagation()}>
              <AdvRow label="From"><input id="adv-from" placeholder="e.g. priya" onKeyDown={(e) => { if (e.key === "Enter") applyAdv(); }} /></AdvRow>
              <AdvRow label="Has attachment"><button className="chip-btn" onClick={() => { setQuery((q) => (q + " has:attachment").trim()); setAdvOpen(false); setOpenThreadId(null); }}>Add filter</button></AdvRow>
              <AdvRow label="Is unread"><button className="chip-btn" onClick={() => { setQuery((q) => (q + " is:unread").trim()); setAdvOpen(false); setOpenThreadId(null); }}>Add filter</button></AdvRow>
              <div className="adv-actions">
                <button className="btn" onClick={() => { setAdvOpen(false); }}>Cancel</button>
                <button className="btn primary" onClick={applyAdv}>Search</button>
              </div>
            </div>
          )}
        </div>
        <div className="tb-right">
          <button className="icon-btn" aria-label="Help" onClick={() => setShowShortcuts(true)}><Icon name="help" /></button>
          <button className="icon-btn" aria-label="Settings" onClick={(e) => { e.stopPropagation(); setSettingsOpen(!settingsOpen); }}><Icon name="settings" /></button>
          <button className="icon-btn hide-sm" aria-label="Apps"><Icon name="apps" /></button>
          <div className="avatar" style={{ background: "#0b57d0" }} title={MY_EMAIL}>A</div>
        </div>
      </header>

      {settingsOpen && (
        <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
          <h3>Quick settings</h3>
          <div className="set-row"><span>Theme</span><div className="seg">{injectSeg(["light", "dark"], theme, (v) => setTheme(v as Theme))}</div></div>
          <div className="set-row"><span>Density</span><div className="seg">{injectSeg(["comfortable", "cozy", "compact"], density, (v) => setDensity(v as Density))}</div></div>
          <div className="set-row"><span>Conversation view</span><button className={`toggle ${convView ? "on" : ""}`} onClick={() => setConvView(!convView)} aria-label="Conversation view"><span /></button></div>
          <div className="set-row"><span>Keyboard shortcuts (?)</span><button className="chip-btn" onClick={() => { setShowShortcuts(true); setSettingsOpen(false); }}>View all</button></div>
          <button className="btn danger-ghost" onClick={() => { localStorage.removeItem(STORE_KEY); setThreads(seedThreads()); setOpenThreadId(null); toast("Demo data reset"); setSettingsOpen(false); }}>Reset demo data</button>
        </div>
      )}

      <div className="body">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"} ${mobileNav ? "mopen" : ""}`}>
          <button className="compose-btn" onClick={() => openCompose()}><Icon name="compose" size={18} /><span>Compose</span></button>
          <nav className="nav">
            {NAV.map((n) => (
              <button key={n.id} className={`nav-item ${mailbox === n.id ? "active" : ""}`} onClick={() => { setMailbox(n.id); setOpenThreadId(null); setCategory("all"); setMobileNav(false); }}>
                <Icon name={n.icon} size={19} />
                <span className="nav-label">{n.label}</span>
                {(n.id === "inbox" || n.id === "drafts") && counts[n.id] > 0 && <span className="nav-count">{counts[n.id]}</span>}
                {n.id === "starred" && counts.starred > 0 && <span className="nav-count dim">{counts.starred}</span>}
              </button>
            ))}
            <div className="nav-sep"><span>Labels</span><button className="icon-btn sm" aria-label="Manage labels"><Icon name="chevdown" size={14} /></button></div>
            {Object.keys(LABEL_DEFS).map((l) => (
              <button key={l} className={`nav-item ${mailbox === `label:${l}` ? "active" : ""}`} onClick={() => { setMailbox(`label:${l}`); setOpenThreadId(null); setMobileNav(false); }}>
                <span className="label-dot" style={{ background: LABEL_DEFS[l].color }} />
                <span className="nav-label">{l}</span>
              </button>
            ))}
          </nav>
          <div className="storage">
            <div className="storage-bar"><span style={{ width: `${storagePct}%` }} /></div>
            <span>Storage · {storagePct}% of 15 GB used</span>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {!openThread ? (
            <>
              {/* Category tabs for inbox */}
              {(mailbox === "inbox" && !query) && (
                <div className="cats">
                  <CatTab active={category === "all"} onClick={() => setCategory("all")} icon="inbox" label="Inbox" count={threads.filter((t) => mailboxFilter(t, "inbox") && t.unread).length} />
                  {(["primary", "promotions", "social", "updates"] as Category[]).map((c) => (
                    <CatTab key={c} active={category === c} onClick={() => setCategory(category === c ? "all" : c)} icon={c === "primary" ? "inbox" : c === "promotions" ? "label" : c === "social" ? "contacts" : "spam"} label={c[0].toUpperCase() + c.slice(1)} count={threads.filter((t) => mailboxFilter(t, "inbox") && t.category === c && t.unread).length} />
                  ))}
                </div>
              )}
              {/* Toolbar */}
              <div className="toolbar">
                <div className="tb-group">
                  <label className={`check ${someChecked ? "some" : ""}`}>
                    <input type="checkbox" checked={allChecked} onChange={() => { if (allChecked) setSelected(new Set()); else setSelected(new Set(paged.map((t) => t.id))); }} aria-label="Select all" />
                    <span className="box">{allChecked ? <Icon name="check" size={13} /> : someChecked ? <span className="dash" /> : null}</span>
                  </label>
                  <button className="icon-btn sm" aria-label="Refresh" onClick={() => toast("Inbox refreshed — you're all caught up-ish")}><Icon name="refresh" size={18} /></button>
                  <button className="icon-btn sm" aria-label="More select"><Icon name="chevdown" size={16} /></button>
                </div>
                {selIds.length > 0 ? (
                  <div className="tb-group actions">
                    <button className="icon-btn sm" title="Archive (e)" onClick={() => archiveIds(selIds)}><Icon name="archive" size={19} /></button>
                    <button className="icon-btn sm" title="Report spam" onClick={() => spamIds(selIds)}><Icon name="spam" size={19} /></button>
                    <button className="icon-btn sm" title="Delete (#)" onClick={() => trashIds(selIds)}><Icon name="trash" size={19} /></button>
                    <span className="vdiv" />
                    <button className="icon-btn sm" title="Mark as read" onClick={() => markRead(selIds, true)}><Icon name="read" size={19} /></button>
                    <button className="icon-btn sm" title="Mark as unread" onClick={() => markRead(selIds, false)}><Icon name="unread" size={19} /></button>
                    <button className="icon-btn sm" title="Snooze" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === "snooze" ? null : "snooze"); }}><Icon name="snooze" size={19} /></button>
                    <button className="icon-btn sm" title="Label" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === "label" ? null : "label"); }}><Icon name="label" size={19} /></button>
                    {openMenu === "snooze" && <Menu><SnoozeItems onPick={(u) => { snoozeIds(selIds, u); setOpenMenu(null); }} /></Menu>}
                    {openMenu === "label" && <Menu><LabelItems threads={threads} onPick={(l) => { labelIds(selIds, l); setOpenMenu(null); }} /></Menu>}
                  </div>
                ) : (
                  <div className="tb-group actions"><span className="tb-hint">{query ? `${filtered.length} result${filtered.length === 1 ? "" : "s"} for “${query}”` : mailboxTitle(mailbox)}</span></div>
                )}
                <div className="tb-right2">
                  <span className="page-info">{filtered.length === 0 ? "0" : `${page * PAGE_SIZE + 1}–${Math.min(filtered.length, (page + 1) * PAGE_SIZE)}`} of {filtered.length}</span>
                  <button className="icon-btn sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous"><span className="flip"><Icon name="back" size={16} /></span></button>
                  <button className="icon-btn sm" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage((p) => p + 1)} aria-label="Next"><span className="flip r"><Icon name="back" size={16} /></span></button>
                </div>
              </div>
              {/* List */}
              <div className="list" ref={listRef}>
                {paged.length === 0 && (
                  <div className="empty">
                    <svg width="120" height="90" viewBox="0 0 120 90"><rect x="15" y="20" width="90" height="55" rx="8" fill="#e8f0fe" /><path d="M15 28 60 58l45-30" stroke="#0b57d0" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
                    <h2>{query ? "No messages matched your search" : mailbox === "snoozed" ? "Snoozed mail lives here" : "You're all caught up"}</h2>
                    <p>{query ? "Try different keywords or search operators like from:, label:, has:attachment." : "Nothing here right now. Enjoy the calm — or compose something new."}</p>
                    {query ? <button className="btn primary" onClick={() => setQuery("")}>Clear search</button> : <button className="btn primary" onClick={() => openCompose()}>Compose</button>}
                  </div>
                )}
                {paged.map((t, i) => (
                  <div key={t.id} className={`row ${t.unread ? "unread" : ""} ${selected.has(t.id) ? "sel" : ""} ${cursor === i ? "cursor" : ""}`} onMouseEnter={() => setCursor(i)} onClick={() => { if (t.draft) openDraft(t); else openThreadFn(t.id); }}>
                    <label className="check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => setSelected((p) => { const n = new Set(p); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })} aria-label="Select" />
                      <span className="box">{selected.has(t.id) ? <Icon name="check" size={13} /> : null}</span>
                    </label>
                    <button className={`star ${t.starred ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); update(t.id, (x) => ({ ...x, starred: !x.starred })); }} aria-label="Star"><Icon name={t.starred ? "starfill" : "star"} size={18} /></button>
                    <button className={`imp ${t.important ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); update(t.id, (x) => ({ ...x, important: !x.important })); }} aria-label="Important"><Icon name={t.important ? "importantfill" : "important"} size={18} /></button>
                    <span className="sender">{t.draft ? <em className="draft-tag">Draft</em> : null}{participants(t)}</span>
                    <span className="subj-snip">
                      <span className="subj">{t.subject}</span>
                      {t.labels.map((l) => <span key={l} className="pill" style={{ color: LABEL_DEFS[l]?.color, background: LABEL_DEFS[l]?.bg }}>{l}</span>)}
                      <span className="snip"> — {t.snippet}</span>
                    </span>
                    <span className="row-meta">
                      {t.hasAttachment && <span className="att" title="Has attachment"><Icon name="attach" size={15} /></span>}
                      {t.snoozedUntil && t.snoozedUntil > Date.now() && <span className="snoozed-ic" title="Snoozed"><Icon name="snooze" size={15} /></span>}
                      <span className="date">{fmtListDate(threadDate(t))}</span>
                    </span>
                    <span className="hover-actions" onClick={(e) => e.stopPropagation()}>
                      <button title="Archive" onClick={() => archiveIds([t.id])}><Icon name="archive" size={17} /></button>
                      <button title="Delete" onClick={() => trashIds([t.id])}><Icon name="trash" size={17} /></button>
                      <button title={t.unread ? "Mark read" : "Mark unread"} onClick={() => update(t.id, (x) => ({ ...x, unread: !x.unread }))}><Icon name={t.unread ? "read" : "unread"} size={17} /></button>
                      <button title="Snooze" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `sn-${t.id}` ? null : `sn-${t.id}`); }}><Icon name="snooze" size={17} /></button>
                      {openMenu === `sn-${t.id}` && <Menu><SnoozeItems onPick={(u) => { snoozeIds([t.id], u); setOpenMenu(null); }} /></Menu>}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : openThread ? (
            <ThreadView
              thread={openThread}
              onBack={() => setOpenThreadId(null)}
              onUpdate={(fn) => update(openThread.id, fn)}
              onArchive={() => { archiveIds([openThread.id]); setOpenThreadId(null); }}
              onTrash={() => { trashIds([openThread.id]); setOpenThreadId(null); }}
              onSnooze={(u) => snoozeIds([openThread.id], u)}
              onLabel={(l) => labelIds([openThread.id], l)}
              onReply={(f) => startReply(openThread, f)}
              onOpenDraft={() => openDraft(openThread)}
              activeIdx={activeMsg[openThread.id] ?? -1}
              toast={toast}
              threads={threads}
            />
          ) : null}
        </main>

        {/* Right rail */}
        <aside className="rail">
          <button className={`rail-btn ${rightTab === "cal" ? "on" : ""}`} onClick={() => setRightTab(rightTab === "cal" ? null : "cal")} title="Calendar"><Icon name="cal" size={20} /></button>
          <button className={`rail-btn ${rightTab === "keep" ? "on" : ""}`} onClick={() => setRightTab(rightTab === "keep" ? null : "keep")} title="Keep"><Icon name="keep" size={20} /></button>
          <button className={`rail-btn ${rightTab === "tasks" ? "on" : ""}`} onClick={() => setRightTab(rightTab === "tasks" ? null : "tasks")} title="Tasks"><Icon name="tasks" size={20} /></button>
          <button className="rail-btn" title="Contacts" onClick={() => toast(`${CONTACTS.length} contacts synced`)}><Icon name="contacts" size={20} /></button>
          {rightTab && (
            <div className="rail-panel">
              <div className="rail-head"><span>{rightTab === "cal" ? "Calendar" : rightTab === "keep" ? "Keep notes" : "Tasks"}</span><button className="icon-btn sm" onClick={() => setRightTab(null)}><Icon name="close" size={15} /></button></div>
              {rightTab === "cal" && <MiniCal />}
              {rightTab === "keep" && (
                <div className="notes">
                  {keepNotes.map((n, i) => <div key={i} className="note">{n}<button onClick={() => setKeepNotes((p) => p.filter((_, j) => j !== i))} aria-label="Delete note"><Icon name="close" size={13} /></button></div>)}
                  <button className="chip-btn" onClick={() => { const v = prompt("New note:"); if (v) setKeepNotes((p) => [...p, v]); }}>+ Take a note</button>
                </div>
              )}
              {rightTab === "tasks" && (
                <div className="notes">
                  {tasks.map((tk, i) => (
                    <label key={i} className={`task ${tk.done ? "done" : ""}`}><input type="checkbox" checked={tk.done} onChange={() => setTasks((p) => p.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />{tk.t}</label>
                  ))}
                  <button className="chip-btn" onClick={() => { const v = prompt("New task:"); if (v) setTasks((p) => [...p, { t: v, done: false }]); }}>+ Add a task</button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Compose windows */}
      <div className="composes">
        {composes.map((c) => (
          <ComposeCard key={c.id} w={c} setComposes={setComposes} onSend={sendCompose} onSuggest={(id) => setSuggestFor(id)} suggestOpen={suggestFor === c.id} closeSuggest={() => setSuggestFor(null)} toast={toast} />
        ))}
      </div>

      {/* Toasts */}
      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className="toast"><span>{t.text}</span>{t.action && <button onClick={() => { t.onAction?.(); setToasts((p) => p.filter((x) => x.id !== t.id)); }}>{t.action}</button>}</div>)}
      </div>

      {showShortcuts && (
        <div className="overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts" onClick={(e) => e.stopPropagation()}>
            <h2>Keyboard shortcuts</h2>
            <div className="sc-grid">
              {[["/", "Search mail"], ["j / k", "Newer / older conversation"], ["Enter", "Open conversation"], ["x", "Select conversation"], ["s", "Star"], ["e", "Archive"], ["#", "Delete"], ["r", "Reply"], ["c", "Compose"], ["u", "Back to list"], ["?", "This panel"], ["Esc", "Close dialogs"]].map(([k, d]) => (
                <div key={k} className="sc-row"><kbd>{k}</kbd><span>{d}</span></div>
              ))}
            </div>
            <button className="btn primary" onClick={() => setShowShortcuts(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );

  function applyAdv() {
    const el = document.getElementById("adv-from") as HTMLInputElement | null;
    const v = el?.value.trim();
    if (v) setQuery((q) => (q + ` from:${v}`).trim());
    setAdvOpen(false); setOpenThreadId(null);
  }
  function openDraft(t: Thread) {
    openCompose({ kind: "draft", subject: t.subject, body: t.draftBody ?? t.messages[0].body, to: t.draftTo ?? "", fromDraftId: t.id });
  }
}

function mailboxTitle(mb: Mailbox): string {
  if (mb.startsWith("label:")) return mb.slice(6);
  return mb[0].toUpperCase() + mb.slice(1);
}

function injectSeg(opts: string[], val: string, set: (v: string) => void) {
  return opts.map((o) => <button key={o} className={`seg-btn ${val === o ? "on" : ""}`} onClick={() => set(o)}>{o}</button>);
}

function AdvRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="adv-row"><span>{label}</span>{children}</label>;
}

function CatTab({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: string; label: string; count: number }) {
  return (
    <button className={`cat ${active ? "active" : ""}`} onClick={onClick}>
      <Icon name={icon} size={18} />
      <span>{label}</span>
      {count > 0 && <em>{count} unread</em>}
    </button>
  );
}

function Menu({ children }: { children: React.ReactNode }) {
  return <div className="menu" onClick={(e) => e.stopPropagation()}>{children}</div>;
}

function SnoozeItems({ onPick }: { onPick: (u: number) => void }) {
  const now = Date.now();
  const items: Array<[string, string, number]> = [
    ["Later today", "8:00 PM", now + 6 * 3600000],
    ["Tomorrow", "8:00 AM", now + 20 * 3600000],
    ["This weekend", "Sat 8 AM", now + 3 * 86400000],
    ["Next week", "Mon 8 AM", now + 6 * 86400000],
  ];
  return (
    <>
      <div className="menu-title">Snooze until</div>
      {items.map(([a, b, u]) => <button key={a} className="menu-item" onClick={() => onPick(u)}><span>{a}</span><em>{b}</em></button>)}
    </>
  );
}

function LabelItems({ threads: _t, onPick }: { threads: Thread[]; onPick: (l: string) => void }) {
  return (
    <>
      <div className="menu-title">Label as</div>
      {Object.keys(LABEL_DEFS).map((l) => (
        <button key={l} className="menu-item" onClick={() => onPick(l)}><span className="label-dot" style={{ background: LABEL_DEFS[l].color }} />{l}</button>
      ))}
    </>
  );
}

function MiniCal() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="minical">
      <strong>{now.toLocaleDateString([], { month: "long", year: "numeric" })}</strong>
      <div className="cal-grid">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="dow">{d}</span>)}{cells.map((c, i) => <span key={i} className={`day ${c === now.getDate() ? "today" : ""}`}>{c ?? ""}</span>)}</div>
      <div className="cal-ev"><span className="label-dot" style={{ background: "#0b57d0" }} />Design sync · Thu 10:00</div>
      <div className="cal-ev"><span className="label-dot" style={{ background: "#b06000" }} />Flight to Tokyo · Oct 14</div>
    </div>
  );
}

function ThreadView({ thread, onBack, onUpdate, onArchive, onTrash, onSnooze, onLabel, onReply, onOpenDraft, activeIdx, toast, threads }: {
  thread: Thread; onBack: () => void; onUpdate: (fn: (t: Thread) => Thread) => void;
  onArchive: () => void; onTrash: () => void; onSnooze: (u: number) => void; onLabel: (l: string) => void;
  onReply: (fwd: boolean) => void; onOpenDraft: () => void; activeIdx: number; toast: (m: string) => void; threads: Thread[];
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([thread.messages.length - 1]));
  const [menu, setMenu] = useState<string | null>(null);
  const toggle = (i: number) => setExpanded((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  return (
    <div className="thread">
      <div className="toolbar">
        <div className="tb-group">
          <button className="icon-btn sm" onClick={onBack} aria-label="Back to inbox"><Icon name="back" size={18} /></button>
          <button className="icon-btn sm" title="Archive" onClick={onArchive}><Icon name="archive" size={19} /></button>
          <button className="icon-btn sm" title="Spam" onClick={() => { onUpdate((t) => ({ ...t, spam: true })); onBack(); toast("Reported as spam"); }}><Icon name="spam" size={19} /></button>
          <button className="icon-btn sm" title="Delete" onClick={onTrash}><Icon name="trash" size={19} /></button>
        </div>
        <div className="tb-group actions">
          <button className="icon-btn sm" title={thread.unread ? "Mark read" : "Mark unread"} onClick={() => onUpdate((t) => ({ ...t, unread: !t.unread }))}><Icon name={thread.unread ? "read" : "unread"} size={19} /></button>
          <button className="icon-btn sm" title="Snooze" onClick={(e) => { e.stopPropagation(); setMenu(menu === "sn" ? null : "sn"); }}><Icon name="snooze" size={19} /></button>
          <button className="icon-btn sm" title="Add label" onClick={(e) => { e.stopPropagation(); setMenu(menu === "lb" ? null : "lb"); }}><Icon name="label" size={19} /></button>
          {menu === "sn" && <Menu><SnoozeItems onPick={(u) => { onSnooze(u); setMenu(null); }} /></Menu>}
          {menu === "lb" && <Menu><LabelItems threads={threads} onPick={(l) => { onLabel(l); setMenu(null); }} /></Menu>}
        </div>
        <div className="tb-right2"><button className="icon-btn sm" title="Print" onClick={() => window.print()}><Icon name="print" size={18} /></button></div>
      </div>
      <div className="thread-head">
        <h1>{thread.subject}</h1>
        <div className="th-labels">
          {thread.labels.map((l) => <span key={l} className="pill" style={{ color: LABEL_DEFS[l]?.color, background: LABEL_DEFS[l]?.bg }}>{l}</span>)}
          <span className="pill cat-pill">{thread.category}</span>
        </div>
        <div className="th-tools">
          <button className={`star ${thread.starred ? "on" : ""}`} onClick={() => onUpdate((t) => ({ ...t, starred: !t.starred }))} aria-label="Star"><Icon name={thread.starred ? "starfill" : "star"} size={19} /></button>
          <button className="chip-btn" onClick={() => window.print()}><Icon name="print" size={14} /> Print</button>
        </div>
      </div>
      <div className="msgs">
        {thread.messages.map((m, i) => {
          const open = expanded.has(i) || activeIdx === i;
          return (
            <article key={m.id} className={`msg ${open ? "open" : ""}`}>
              <button className="msg-head" onClick={() => toggle(i)}>
                <span className="avatar" style={{ background: avatarColor(m.from) }}>{initials(m.from)}</span>
                <span className="msg-who">
                  <strong>{m.from}{m.from === ME ? " (me)" : ""}</strong>
                  <span className="msg-to">to {m.to.join(", ")}</span>
                </span>
                <span className="msg-date">{fmtFullDate(m.date)}</span>
              </button>
              {open && (
                <div className="msg-body">
                  {m.body.split("\n").map((ln, j) => ln.startsWith(">") ? <p key={j} className="quote">{ln.slice(1)}</p> : ln.trim() ? <p key={j}>{ln}</p> : <br key={j} />)}
                  {m.attachments && (
                    <div className="atts">
                      {m.attachments.map((a) => <AttachmentCard key={a.id} a={a} />)}
                    </div>
                  )}
                  <div className="msg-actions">
                    <button className="btn ghost" onClick={() => onReply(false)}><Icon name="reply" size={15} /> Reply</button>
                    <button className="btn ghost" onClick={() => onReply(true)}><Icon name="forward" size={15} /> Forward</button>
                    <button className="icon-btn sm" title="Star message" onClick={() => onUpdate((t) => ({ ...t, starred: !t.starred }))}><Icon name={thread.starred ? "starfill" : "star"} size={16} /></button>
                    <button className="icon-btn sm" title="Print" onClick={() => window.print()}><Icon name="print" size={16} /></button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="reply-bar">
        {thread.draft ? (
          <button className="btn primary" onClick={onOpenDraft}><Icon name="draft" size={16} /> Continue draft</button>
        ) : (
          <>
            <button className="btn primary" onClick={() => onReply(false)}><Icon name="reply" size={16} /> Reply</button>
            <button className="btn" onClick={() => onReply(true)}><Icon name="forward" size={16} /> Forward</button>
          </>
        )}
      </div>
    </div>
  );
}

function AttachmentCard({ a }: { a: Attachment }) {
  const col = a.kind === "pdf" ? "#a50e0e" : a.kind === "img" ? "#7b1fa2" : a.kind === "xls" ? "#0d652d" : a.kind === "slides" ? "#e37400" : "#0b57d0";
  return (
    <div className="att-card">
      <span className="att-ic" style={{ background: col }}>{a.kind === "pdf" ? "PDF" : a.kind === "img" ? "IMG" : a.kind === "doc" ? "DOC" : a.kind === "xls" ? "XLS" : a.kind === "zip" ? "ZIP" : "PPT"}</span>
      <span className="att-meta"><strong>{a.name}</strong><em>{a.size}</em></span>
      <button className="chip-btn" onClick={() => { const blob = new Blob([`Demo export of ${a.name}`], { type: "text/plain" }); const u = URL.createObjectURL(blob); const el = document.createElement("a"); el.href = u; el.download = a.name.replace(/\.\w+$/, ".txt"); el.click(); URL.revokeObjectURL(u); }}>Download</button>
    </div>
  );
}

function ComposeCard({ w, setComposes, onSend, onSuggest, suggestOpen, closeSuggest, toast }: {
  w: ComposeWin; setComposes: React.Dispatch<React.SetStateAction<ComposeWin[]>>;
  onSend: (id: string, scheduled?: number) => void; onSuggest: (id: string) => void; suggestOpen: boolean;
  closeSuggest: () => void; toast: (m: string) => void;
}) {
  const set = (p: Partial<ComposeWin>) => setComposes((prev) => prev.map((c) => (c.id === w.id ? { ...c, ...p } : c)));
  const sug = CONTACTS.filter((c) => w.to && (c.name.toLowerCase().includes(w.to.split(/[,;]/).pop()!.trim().toLowerCase()) || c.email.toLowerCase().includes(w.to.split(/[,;]/).pop()!.trim().toLowerCase()))).slice(0, 5);
  const lastToken = w.to.split(/[,;]/).pop()!.trim();
  // Autosave draft
  useEffect(() => {
    if (!w.body && !w.subject && !w.to) return;
    const h = setTimeout(() => setComposes((prev) => prev.map((c) => (c.id === w.id ? { ...c, savedAt: Date.now() } as ComposeWin : c))), 1500);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.body, w.subject, w.to]);
  if (w.minimized) {
    return (
      <div className="compose min">
        <button className="compose-title" onClick={() => set({ minimized: false })}>{w.subject || "New Message"}</button>
        <button className="icon-btn sm" onClick={() => setComposes((p) => p.filter((c) => c.id !== w.id))}><Icon name="close" size={15} /></button>
      </div>
    );
  }
  return (
    <div className={`compose ${w.maximized ? "max" : ""}`}>
      <div className="compose-head">
        <span>{w.kind === "reply" ? "Reply" : w.kind === "forward" ? "Forward" : w.kind === "draft" ? "Draft" : "New Message"}</span>
        <span className="compose-head-btns">
          <button className="icon-btn sm inv" onClick={() => set({ minimized: true })} aria-label="Minimize"><Icon name="min" size={15} /></button>
          <button className="icon-btn sm inv" onClick={() => set({ maximized: !w.maximized })} aria-label="Maximize"><Icon name="max" size={15} /></button>
          <button className="icon-btn sm inv" onClick={() => setComposes((p) => p.filter((c) => c.id !== w.id))} aria-label="Close"><Icon name="close" size={15} /></button>
        </span>
      </div>
      <div className="compose-fields">
        <div className="cf-row">
          <input value={w.to} onChange={(e) => { set({ to: e.target.value }); onSuggest(w.id); }} onBlur={() => setTimeout(closeSuggest, 150)} placeholder="To" aria-label="To" />
          <span className="cc-links">{!w.showCc && <button onClick={() => set({ showCc: true })}>Cc</button>}{!w.showBcc && <button onClick={() => set({ showBcc: true })}>Bcc</button>}</span>
        </div>
        {suggestOpen && sug.length > 0 && lastToken && (
          <div className="suggest">
            {sug.map((c) => (
              <button key={c.email} onMouseDown={() => { const parts = w.to.split(/[,;]/); parts[parts.length - 1] = ` ${c.name} <${c.email}>`; set({ to: parts.join(",").replace(/^,/, "") + ", " }); closeSuggest(); }}>
                <span className="avatar xs" style={{ background: avatarColor(c.name) }}>{initials(c.name)}</span>
                <span><strong>{c.name}</strong><em>{c.email}</em></span>
              </button>
            ))}
          </div>
        )}
        {w.showCc && <div className="cf-row"><input value={w.cc} onChange={(e) => set({ cc: e.target.value })} placeholder="Cc" aria-label="Cc" /></div>}
        {w.showBcc && <div className="cf-row"><input value={w.bcc} onChange={(e) => set({ bcc: e.target.value })} placeholder="Bcc" aria-label="Bcc" /></div>}
        <div className="cf-row"><input value={w.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="Subject" aria-label="Subject" /></div>
      </div>
      <textarea className="compose-body" value={w.body} onChange={(e) => set({ body: e.target.value })} placeholder="Write something warm, clear, and short…" aria-label="Body" />
      <div className="compose-foot">
        <div className="send-split">
          <button className="btn primary send" onClick={() => onSend(w.id)}>Send</button>
          <button className="btn primary caret" onClick={(e) => { e.stopPropagation(); set({ scheduleOpen: !w.scheduleOpen }); }} aria-label="Schedule"><Icon name="chevdown" size={14} /></button>
          {w.scheduleOpen && (
            <div className="menu up">
              <div className="menu-title">Schedule send</div>
              {[["Tomorrow morning", Date.now() + 20 * 3600000], ["Monday morning", Date.now() + 4 * 86400000]].map(([l, u]) => (
                <button key={l as string} className="menu-item" onClick={() => onSend(w.id, u as number)}>{l as string}</button>
              ))}
            </div>
          )}
        </div>
        <span className="fmt-btns">
          <button title="Bold" onClick={() => set({ body: w.body + "**bold**" })}><Icon name="bold" size={16} /></button>
          <button title="Italic" onClick={() => set({ body: w.body + "_italic_" })}><Icon name="italic" size={16} /></button>
          <button title="Attach (demo)" onClick={() => toast("Attachments are simulated in this demo")}><Icon name="attach" size={17} /></button>
          <button title="Insert link" onClick={() => set({ body: w.body + " [link](https://example.com)" })}><Icon name="link" size={17} /></button>
          <button title="Insert emoji" onClick={() => set({ body: w.body + " ✨" })}><Icon name="emoji" size={17} /></button>
          <button title="Insert image" onClick={() => toast("Image insert is simulated in this demo")}><Icon name="image" size={17} /></button>
        </span>
        <span className="draft-note">Draft saved</span>
        <button className="icon-btn sm" title="Discard" onClick={() => { if (confirm("Discard draft?")) setComposes((p) => p.filter((c) => c.id !== w.id)); }}><Icon name="trash" size={16} /></button>
      </div>
    </div>
  );
}
