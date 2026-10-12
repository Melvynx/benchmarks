import { PAGE_SIZE, SYS } from "./constants";
import type {
  Attachment,
  Category,
  Draft,
  MailView,
  Message,
  Person,
  Settings,
  Thread,
  UserLabel,
} from "./types";

export function uniq(list: string[]): string[] {
  return [...new Set(list)];
}

export function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function uniquePeople(people: Person[]): Person[] {
  const out: Person[] = [];
  for (const person of people) {
    if (!out.some((p) => sameEmail(p.email, person.email))) out.push(person);
  }
  return out;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

let idSeq = 1;
export function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  idSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${idSeq}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\u00a0/g, " ");
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function parseRecipientToken(raw: string, people: Person[]): Person | null {
  const s = raw.trim().replace(/,$/, "").replace(/^"|"$/g, "");
  if (!s) return null;
  const wrapped = s.match(/^(.*)<([^>]+)>$/);
  if (wrapped) {
    const email = wrapped[2].trim();
    if (!isEmail(email)) return null;
    const name = wrapped[1].trim().replace(/^"|"$/g, "") || email;
    return { name, email };
  }
  if (isEmail(s)) {
    const known = people.find((p) => sameEmail(p.email, s));
    return known ? { name: known.name, email: known.email } : { name: s, email: s };
  }
  const byName = people.filter((p) => p.name.toLowerCase() === s.toLowerCase());
  if (byName.length === 1) return { name: byName[0].name, email: byName[0].email };
  const partial = people.filter(
    (p) =>
      p.name.toLowerCase().startsWith(s.toLowerCase()) ||
      p.email.toLowerCase().startsWith(s.toLowerCase()),
  );
  if (partial.length === 1) return { name: partial[0].name, email: partial[0].email };
  return null;
}

export function suggestPeople(query: string, people: Person[], existing: Person[]): Person[] {
  const n = query.trim().toLowerCase();
  const pool = people.filter((p) => !existing.some((e) => sameEmail(e.email, p.email)));
  if (!n) return pool.slice(0, 6);
  return pool
    .filter((p) => p.name.toLowerCase().includes(n) || p.email.toLowerCase().includes(n))
    .slice(0, 6);
}

export function signatureHtml(signature: string): string {
  if (!signature.trim()) return "";
  return `<div class="sig" contenteditable="false">${signature
    .split("\n")
    .map((line) => escapeHtml(line) || "<br>")
    .join("<br>")}</div>`;
}

export function isBlankHtml(html: string, signature: string): boolean {
  const text = htmlToText(html).replace(/\s+/g, " ").trim();
  const sig = signature.replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (sig && (text === sig || text === `-- ${sig}`)) return true;
  return false;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    const kb = size / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function formatListTime(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (d.getFullYear() === n.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatFuture(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  const tomorrow = new Date(n);
  tomorrow.setDate(n.getDate() + 1);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === n.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

export function formatMessageDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFor(seed: string): string {
  const colors = ["#1a73e8", "#188038", "#c5221f", "#e37400", "#9334e6", "#129eaf", "#7b1fa2", "#00897b"];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

export function activityOf(thread: Thread): number {
  const times = thread.messages.map((m) => m.date);
  if (thread.draft) times.push(thread.draft.updatedAt);
  return times.length ? Math.max(...times) : 0;
}

export function messageText(message: Message): string {
  return message.format === "html" ? htmlToText(message.body) : message.body;
}

export function draftText(draft: Draft | null): string {
  if (!draft) return "";
  return htmlToText(draft.body);
}

function personHit(person: Person, value: string): boolean {
  return (
    person.name.toLowerCase().includes(value) || person.email.toLowerCase().includes(value)
  );
}

export type Token = {
  op: "text" | "from" | "to" | "subject" | "label" | "in" | "is" | "has";
  value: string;
  neg: boolean;
};

export function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  const re = /(-)?(?:(from|to|subject|label|in|is|has):)?(?:"([^"]+)"|(\S+))/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(query))) {
    const op = (match[2]?.toLowerCase() ?? "text") as Token["op"];
    const value = (match[3] ?? match[4] ?? "").trim();
    if (!value) continue;
    tokens.push({ op, value, neg: Boolean(match[1]) });
  }
  return tokens;
}

function inMailbox(thread: Thread, name: string): boolean {
  switch (name) {
    case "inbox":
      return (
        thread.labels.includes(SYS.INBOX) &&
        !thread.labels.includes(SYS.TRASH) &&
        !thread.labels.includes(SYS.SPAM) &&
        !thread.labels.includes(SYS.SNOOZED)
      );
    case "trash":
      return thread.labels.includes(SYS.TRASH);
    case "spam":
      return thread.labels.includes(SYS.SPAM);
    case "sent":
      return thread.labels.includes(SYS.SENT);
    case "draft":
    case "drafts":
      return thread.labels.includes(SYS.DRAFT);
    case "snoozed":
      return thread.labels.includes(SYS.SNOOZED);
    case "starred":
      return thread.labels.includes(SYS.STARRED);
    case "scheduled":
      return thread.labels.includes(SYS.SCHEDULED);
    case "anywhere":
    case "all":
      return true;
    default:
      return false;
  }
}

function tokenMatches(thread: Thread, labels: UserLabel[], token: Token): boolean {
  const value = token.value.toLowerCase();
  const texts = [
    thread.subject,
    thread.draft?.subject ?? "",
    draftText(thread.draft),
    ...thread.messages.map(messageText),
    ...thread.messages.flatMap((m) => m.attachments.map((a) => `${a.filename} ${a.text ?? ""}`)),
    ...(thread.draft?.attachments.map((a) => a.filename) ?? []),
  ]
    .join("\n")
    .toLowerCase();
  let ok = false;
  switch (token.op) {
    case "text":
      ok = texts.includes(value);
      break;
    case "from":
      ok = thread.messages.some((m) => personHit(m.from, value));
      break;
    case "to": {
      const people = [
        ...thread.messages.flatMap((m) => [...m.to, ...m.cc, ...m.bcc]),
        ...(thread.draft ? [...thread.draft.to, ...thread.draft.cc, ...thread.draft.bcc] : []),
      ];
      ok = people.some((p) => personHit(p, value));
      break;
    }
    case "subject":
      ok = (thread.subject || thread.draft?.subject || "").toLowerCase().includes(value);
      break;
    case "label":
      ok = thread.labels.some((id) => {
        if (id.toLowerCase() === value) return true;
        const label = labels.find((l) => l.id === id);
        return label ? label.name.toLowerCase() === value || label.id.toLowerCase() === value : false;
      });
      break;
    case "is":
      if (value === "unread") ok = thread.unread;
      else if (value === "read") ok = !thread.unread;
      else if (value === "starred") ok = thread.labels.includes(SYS.STARRED);
      else if (value === "important") ok = thread.labels.includes(SYS.IMPORTANT);
      break;
    case "has":
      ok =
        value === "attachment" &&
        (thread.messages.some((m) => m.attachments.length > 0) ||
          (thread.draft?.attachments.length ?? 0) > 0);
      break;
    case "in":
      ok = inMailbox(thread, value);
      break;
    default:
      ok = false;
  }
  return token.neg ? !ok : ok;
}

export function searchThreads(threads: Thread[], labels: UserLabel[], query: string): Thread[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const explicitTrash = tokens.some((t) => !t.neg && t.op === "in" && t.value.toLowerCase() === "trash");
  const explicitSpam = tokens.some((t) => !t.neg && t.op === "in" && t.value.toLowerCase() === "spam");
  const explicitAnywhere = tokens.some(
    (t) => !t.neg && t.op === "in" && ["all", "anywhere"].includes(t.value.toLowerCase()),
  );
  return threads.filter((thread) => {
    if (!explicitAnywhere) {
      if (thread.labels.includes(SYS.TRASH) && !explicitTrash) return false;
      if (thread.labels.includes(SYS.SPAM) && !explicitSpam) return false;
    }
    return tokens.every((token) => tokenMatches(thread, labels, token));
  });
}

export function inView(thread: Thread, view: MailView): boolean {
  const trash = thread.labels.includes(SYS.TRASH);
  const spam = thread.labels.includes(SYS.SPAM);
  if (view === "trash") return trash;
  if (trash) return false;
  if (view === "spam") return spam;
  if (spam && view !== "all") return false;
  switch (view) {
    case "inbox":
      return thread.labels.includes(SYS.INBOX) && !thread.labels.includes(SYS.SNOOZED);
    case "starred":
      return thread.labels.includes(SYS.STARRED);
    case "snoozed":
      return thread.labels.includes(SYS.SNOOZED);
    case "sent":
      return thread.labels.includes(SYS.SENT);
    case "drafts":
      return thread.labels.includes(SYS.DRAFT);
    case "scheduled":
      return thread.labels.includes(SYS.SCHEDULED);
    case "important":
      return thread.labels.includes(SYS.IMPORTANT);
    case "all":
      return !spam;
    default:
      if (view.startsWith("label:")) return thread.labels.includes(view.slice(6));
      return false;
  }
}

export function matchesCategory(thread: Thread, category: Category): boolean {
  const cats = thread.labels.filter((l) => l.startsWith("CATEGORY_"));
  if (category === "primary") return cats.length === 0 || cats.includes(SYS.PERSONAL);
  if (category === "promotions") return cats.includes(SYS.PROMOTIONS);
  if (category === "social") return cats.includes(SYS.SOCIAL);
  return cats.includes(SYS.UPDATES);
}

export function sortThreads(list: Thread[], view: MailView): Thread[] {
  const copy = [...list];
  if (view === "snoozed") {
    copy.sort((a, b) => (a.snoozedUntil ?? 0) - (b.snoozedUntil ?? 0));
    return copy;
  }
  if (view === "scheduled") {
    copy.sort((a, b) => (a.scheduledFor ?? 0) - (b.scheduledFor ?? 0));
    return copy;
  }
  copy.sort((a, b) => activityOf(b) - activityOf(a));
  return copy;
}

export function visibleThreads(
  threads: Thread[],
  labels: UserLabel[],
  view: MailView,
  category: Category,
  search: string,
): Thread[] {
  if (search.trim()) return sortThreads(searchThreads(threads, labels, search), "all");
  let list = threads.filter((thread) => inView(thread, view));
  if (view === "inbox") list = list.filter((thread) => matchesCategory(thread, category));
  return sortThreads(list, view);
}

export function pageOf(list: Thread[], page: number): { page: number; pages: number; slice: Thread[] } {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safe = Math.min(Math.max(0, page), pages - 1);
  return { page: safe, pages, slice: list.slice(safe * PAGE_SIZE, safe * PAGE_SIZE + PAGE_SIZE) };
}

export type Section = { id: string; title: string | null; threads: Thread[] };

export function groupThreads(
  list: Thread[],
  inboxType: Settings["inboxType"],
  view: MailView,
  searching: boolean,
): Section[] {
  if (searching || view !== "inbox" || inboxType === "default") {
    return [{ id: "all", title: null, threads: list }];
  }
  if (inboxType === "important") {
    const top = list.filter((t) => t.unread && t.labels.includes(SYS.IMPORTANT));
    const rest = list.filter((t) => !(t.unread && t.labels.includes(SYS.IMPORTANT)));
    return [
      { id: "imp", title: "Important and unread", threads: top },
      { id: "rest", title: "Everything else", threads: rest },
    ].filter((g) => g.threads.length);
  }
  return [
    { id: "un", title: "Unread", threads: list.filter((t) => t.unread) },
    { id: "rest", title: "Everything else", threads: list.filter((t) => !t.unread) },
  ].filter((g) => g.threads.length);
}

export function viewTitle(view: MailView, labels: UserLabel[], searching: boolean): string {
  if (searching) return "Search results";
  switch (view) {
    case "inbox":
      return "Inbox";
    case "starred":
      return "Starred";
    case "snoozed":
      return "Snoozed";
    case "sent":
      return "Sent";
    case "drafts":
      return "Drafts";
    case "scheduled":
      return "Scheduled";
    case "trash":
      return "Trash";
    case "spam":
      return "Spam";
    case "important":
      return "Important";
    case "all":
      return "All Mail";
    default:
      return labels.find((l) => `label:${l.id}` === view)?.name ?? "Label";
  }
}

export function emptyCopy(view: MailView, searching: boolean, category: Category): { title: string; body: string } {
  if (searching) {
    return { title: "No messages matched your search.", body: "Try a name, a subject, or from:someone." };
  }
  if (view === "inbox" && category !== "primary") {
    return { title: "Nothing in this tab.", body: "Mail with this category will show up here." };
  }
  switch (view) {
    case "inbox":
      return { title: "You're all caught up.", body: "New mail lands here. Archived conversations stay in All Mail." };
    case "starred":
      return { title: "No starred conversations.", body: "Stars keep a short list of things you don't want to lose." };
    case "snoozed":
      return { title: "Nothing snoozed.", body: "Snooze a conversation and it comes back to the inbox later." };
    case "sent":
      return { title: "No sent mail yet.", body: "Messages you send are kept here." };
    case "drafts":
      return { title: "No drafts.", body: "Unsent messages are saved automatically." };
    case "scheduled":
      return { title: "Nothing scheduled.", body: "Use the arrow next to Send to pick a time." };
    case "trash":
      return { title: "Trash is empty.", body: "Deleted conversations sit here until you remove them for good." };
    case "spam":
      return { title: "Spam is clear.", body: "Messages you report as spam land here." };
    default:
      return { title: "Nothing here.", body: "Conversations with this label will show up in this list." };
  }
}

function shortName(person: Person): string {
  return person.name.split(" ")[0] || person.email;
}

export function listSender(thread: Thread, me: Person): string {
  if (thread.messages.length === 0) {
    const to = thread.draft?.to ?? [];
    if (!to.length) return "(no recipient)";
    return to.map((p) => p.name).join(", ");
  }
  const ordered: Person[] = [];
  for (let i = thread.messages.length - 1; i >= 0; i -= 1) {
    const from = thread.messages[i].from;
    if (!ordered.some((p) => sameEmail(p.email, from.email))) ordered.push(from);
  }
  if (ordered.length === 1 && sameEmail(ordered[0].email, me.email)) {
    const last = thread.messages[thread.messages.length - 1];
    const tos = last.to.map((p) => p.name || p.email);
    return `To: ${tos.join(", ") || me.email}`;
  }
  return ordered
    .map((p) => (sameEmail(p.email, me.email) ? "me" : ordered.length > 1 ? shortName(p) : p.name))
    .join(", ");
}

export function listSubject(thread: Thread): string {
  if (thread.messages.length === 0) return thread.draft?.subject?.trim() || thread.subject || "(no subject)";
  return thread.subject || "(no subject)";
}

export function listSnippet(thread: Thread, query = ""): string {
  const draftNewer =
    thread.draft &&
    (thread.messages.length === 0 || thread.draft.updatedAt >= activityOf({ ...thread, draft: null }));
  const raw = draftNewer
    ? draftText(thread.draft)
    : messageText(thread.messages[thread.messages.length - 1] ?? { body: "", format: "text" } as Message);
  const clean = raw.replace(/\s+/g, " ").trim();
  const free = tokenize(query).filter((t) => t.op === "text" && !t.neg).map((t) => t.value);
  const needle = free[0]?.toLowerCase() ?? "";
  if (!needle) return clean.slice(0, 140);
  const index = clean.toLowerCase().indexOf(needle);
  if (index <= 20) return clean.slice(0, 140);
  const start = Math.max(0, index - 28);
  return `${start > 0 ? "…" : ""}${clean.slice(start, start + 140)}`;
}

export function hasDraftBadge(thread: Thread): boolean {
  return Boolean(thread.draft) && (thread.labels.includes(SYS.DRAFT) || thread.messages.length > 0);
}

export function hasAttachment(thread: Thread): boolean {
  return (
    thread.messages.some((m) => m.attachments.length > 0) || (thread.draft?.attachments.length ?? 0) > 0
  );
}

export function userLabelIds(thread: Thread, labels: UserLabel[]): UserLabel[] {
  return labels.filter((label) => thread.labels.includes(label.id));
}

export function countUnread(threads: Thread[], view: MailView, category?: Category): number {
  return threads.filter((thread) => {
    if (!thread.unread || !inView(thread, view)) return false;
    if (view === "inbox" && category) return matchesCategory(thread, category);
    return true;
  }).length;
}

function stripSystem(labels: string[], extra: string[] = []): string[] {
  const drop = new Set([
    SYS.DRAFT,
    SYS.SCHEDULED,
    SYS.SNOOZED,
    SYS.TRASH,
    SYS.SPAM,
    ...extra,
  ]);
  return labels.filter((label) => !drop.has(label));
}

export function archiveThreads(threads: Thread[], ids: string[]): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) =>
    set.has(thread.id)
      ? {
          ...thread,
          snoozedUntil: null,
          labels: thread.labels.filter((l) => l !== SYS.INBOX && l !== SYS.SNOOZED && l !== SYS.SPAM),
        }
      : thread,
  );
}

export function trashThreads(threads: Thread[], ids: string[]): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) =>
    set.has(thread.id)
      ? {
          ...thread,
          snoozedUntil: null,
          scheduledFor: thread.labels.includes(SYS.SCHEDULED) ? null : thread.scheduledFor,
          labels: uniq([...thread.labels.filter((l) => ![SYS.INBOX, SYS.SNOOZED, SYS.SPAM, SYS.SCHEDULED].includes(l as never)), SYS.TRASH]),
        }
      : thread,
  );
}

export function spamThreads(threads: Thread[], ids: string[]): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) =>
    set.has(thread.id)
      ? {
          ...thread,
          snoozedUntil: null,
          labels: uniq([
            ...thread.labels.filter((l) => ![SYS.INBOX, SYS.SNOOZED, SYS.TRASH].includes(l as never)),
            SYS.SPAM,
          ]),
        }
      : thread,
  );
}

export function notSpamThreads(threads: Thread[], ids: string[]): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) => {
    if (!set.has(thread.id)) return thread;
    const labels = thread.labels.filter((l) => l !== SYS.SPAM && l !== SYS.TRASH);
    if (!labels.includes(SYS.INBOX)) labels.push(SYS.INBOX);
    if (!labels.some((l) => l.startsWith("CATEGORY_"))) labels.push(SYS.PERSONAL);
    return { ...thread, labels: uniq(labels) };
  });
}

export function restoreThreads(threads: Thread[], ids: string[]): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) => {
    if (!set.has(thread.id)) return thread;
    const labels = thread.labels.filter((l) => l !== SYS.TRASH && l !== SYS.SPAM && l !== SYS.SNOOZED);
    if (!labels.includes(SYS.INBOX)) labels.push(SYS.INBOX);
    if (!labels.some((l) => l.startsWith("CATEGORY_"))) labels.push(SYS.PERSONAL);
    return { ...thread, labels: uniq(labels), snoozedUntil: null };
  });
}

export function snoozeThreads(threads: Thread[], ids: string[], until: number): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) =>
    set.has(thread.id)
      ? {
          ...thread,
          snoozedUntil: until,
          labels: uniq([...thread.labels.filter((l) => l !== SYS.INBOX && l !== SYS.SPAM), SYS.SNOOZED]),
        }
      : thread,
  );
}

export function unsnoozeThreads(threads: Thread[], ids: string[]): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) =>
    set.has(thread.id)
      ? {
          ...thread,
          snoozedUntil: null,
          unread: true,
          labels: uniq([...thread.labels.filter((l) => l !== SYS.SNOOZED), SYS.INBOX]),
        }
      : thread,
  );
}

function toggleFlag(threads: Thread[], ids: string[], flag: string): Thread[] {
  const set = new Set(ids);
  const targets = threads.filter((t) => set.has(t.id));
  const allOn = targets.length > 0 && targets.every((t) => t.labels.includes(flag));
  return threads.map((thread) => {
    if (!set.has(thread.id)) return thread;
    const labels = allOn ? thread.labels.filter((l) => l !== flag) : uniq([...thread.labels, flag]);
    return { ...thread, labels };
  });
}

export function starThreads(threads: Thread[], ids: string[]): Thread[] {
  return toggleFlag(threads, ids, SYS.STARRED);
}

export function importantThreads(threads: Thread[], ids: string[]): Thread[] {
  return toggleFlag(threads, ids, SYS.IMPORTANT);
}

export function markThreads(threads: Thread[], ids: string[], unread: boolean): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) => {
    if (!set.has(thread.id)) return thread;
    return {
      ...thread,
      unread,
      messages: thread.messages.map((message, index) => ({
        ...message,
        unread: unread ? index === thread.messages.length - 1 : false,
      })),
    };
  });
}

export function toggleUserLabel(threads: Thread[], ids: string[], labelId: string): Thread[] {
  const set = new Set(ids);
  const targets = threads.filter((t) => set.has(t.id));
  const allHave = targets.length > 0 && targets.every((t) => t.labels.includes(labelId));
  return threads.map((thread) => {
    if (!set.has(thread.id)) return thread;
    const labels = allHave
      ? thread.labels.filter((l) => l !== labelId)
      : uniq([...thread.labels, labelId]);
    return { ...thread, labels };
  });
}

export function moveToLabel(threads: Thread[], ids: string[], labelId: string): Thread[] {
  const set = new Set(ids);
  return threads.map((thread) =>
    set.has(thread.id)
      ? {
          ...thread,
          snoozedUntil: null,
          labels: uniq([...thread.labels.filter((l) => l !== SYS.INBOX && l !== SYS.SNOOZED), labelId]),
        }
      : thread,
  );
}

export type SendInput = {
  threadId: string | null;
  to: Person[];
  cc: Person[];
  bcc: Person[];
  subject: string;
  body: string;
  attachments: Attachment[];
  when: number | null;
  now: number;
  me: Person;
};

function sentMessage(input: SendInput, date: number): Message {
  return {
    id: newId("m"),
    from: input.me,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    date,
    body: input.body,
    format: "html",
    attachments: input.attachments,
    unread: false,
  };
}

function includesMe(people: Person[], me: Person): boolean {
  return people.some((p) => sameEmail(p.email, me.email));
}

export function applySend(threads: Thread[], input: SendInput): { threads: Thread[]; threadId: string } {
  const scheduled = input.when != null && input.when > input.now + 500;
  const subject = input.subject.trim() || "(no subject)";
  const draft: Draft = {
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject,
    body: input.body,
    attachments: input.attachments,
    updatedAt: input.now,
  };
  const existing = input.threadId ? threads.find((t) => t.id === input.threadId) : undefined;

  if (scheduled) {
    if (existing) {
      const next: Thread = {
        ...existing,
        subject: existing.messages.length ? existing.subject : subject,
        draft,
        scheduledFor: input.when,
        labels: uniq([...existing.labels.filter((l) => l !== SYS.DRAFT), SYS.SCHEDULED]),
      };
      return { threadId: existing.id, threads: threads.map((t) => (t.id === existing.id ? next : t)) };
    }
    const id = input.threadId || newId("t");
    const thread: Thread = {
      id,
      subject,
      messages: [],
      labels: [SYS.SCHEDULED],
      unread: false,
      snoozedUntil: null,
      scheduledFor: input.when,
      draft,
    };
    return { threadId: id, threads: [thread, ...threads.filter((t) => t.id !== id)] };
  }

  const message = sentMessage(input, input.now);
  const self = includesMe([...input.to, ...input.cc], input.me);

  if (existing && existing.messages.length > 0) {
    const wasSnoozed = existing.labels.includes(SYS.SNOOZED);
    const labels = new Set(stripSystem(existing.labels));
    labels.add(SYS.SENT);
    if (!existing.labels.includes(SYS.INBOX) && !wasSnoozed && !self) labels.delete(SYS.INBOX);
    if (existing.labels.includes(SYS.INBOX) || wasSnoozed || self) labels.add(SYS.INBOX);
    if (self && ![...labels].some((l) => l.startsWith("CATEGORY_"))) labels.add(SYS.PERSONAL);
    const next: Thread = {
      ...existing,
      messages: [...existing.messages, message],
      labels: [...labels],
      draft: null,
      unread: false,
      scheduledFor: null,
      snoozedUntil: null,
    };
    return { threadId: existing.id, threads: threads.map((t) => (t.id === existing.id ? next : t)) };
  }

  const labels = new Set<string>([SYS.SENT]);
  if (existing) {
    for (const label of existing.labels) {
      if (![SYS.DRAFT, SYS.SCHEDULED, SYS.INBOX, SYS.TRASH, SYS.SPAM, SYS.SNOOZED].includes(label as never) && !label.startsWith("CATEGORY_")) {
        labels.add(label);
      }
    }
  }
  if (self) {
    labels.add(SYS.INBOX);
    labels.add(SYS.PERSONAL);
  }
  const id = existing?.id || input.threadId || newId("t");
  const thread: Thread = {
    id,
    subject,
    messages: [message],
    labels: [...labels],
    unread: false,
    snoozedUntil: null,
    scheduledFor: null,
    draft: null,
  };
  return { threadId: id, threads: [thread, ...threads.filter((t) => t.id !== id)] };
}

export function saveDraft(
  threads: Thread[],
  input: {
    threadId: string | null;
    to: Person[];
    cc: Person[];
    bcc: Person[];
    subject: string;
    body: string;
    attachments: Attachment[];
    now: number;
  },
): { threads: Thread[]; threadId: string } {
  const subject = input.subject.trim() || "(no subject)";
  const draft: Draft = {
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject,
    body: input.body,
    attachments: input.attachments,
    updatedAt: input.now,
  };
  if (input.threadId) {
    const existing = threads.find((t) => t.id === input.threadId);
    if (existing) {
      const labels = existing.labels.includes(SYS.DRAFT) ? existing.labels : [...existing.labels, SYS.DRAFT];
      const next: Thread = {
        ...existing,
        draft,
        labels,
        subject: existing.messages.length ? existing.subject : subject,
      };
      return { threadId: existing.id, threads: threads.map((t) => (t.id === existing.id ? next : t)) };
    }
  }
  const id = input.threadId || newId("t");
  const thread: Thread = {
    id,
    subject,
    messages: [],
    labels: [SYS.DRAFT],
    unread: false,
    snoozedUntil: null,
    scheduledFor: null,
    draft,
  };
  return { threadId: id, threads: [thread, ...threads.filter((t) => t.id !== id)] };
}

export function discardDraft(threads: Thread[], threadId: string): Thread[] {
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return threads;
  if (thread.messages.length === 0) return threads.filter((t) => t.id !== threadId);
  return threads.map((t) =>
    t.id === threadId
      ? {
          ...t,
          draft: null,
          scheduledFor: null,
          labels: t.labels.filter((l) => l !== SYS.DRAFT && l !== SYS.SCHEDULED),
        }
      : t,
  );
}

function materialize(thread: Thread, now: number, me: Person): Thread {
  if (!thread.draft) return thread;
  const input: SendInput = {
    threadId: thread.id,
    to: thread.draft.to,
    cc: thread.draft.cc,
    bcc: thread.draft.bcc,
    subject: thread.draft.subject,
    body: thread.draft.body,
    attachments: thread.draft.attachments,
    when: null,
    now,
    me,
  };
  const result = applySend([{ ...thread, labels: thread.labels.filter((l) => l !== SYS.SCHEDULED), scheduledFor: null }], input);
  return result.threads[0] ?? thread;
}

export function runClock(threads: Thread[], now: number, me: Person): { threads: Thread[]; notices: string[] } {
  const notices: string[] = [];
  let changed = false;
  const next = threads.map((thread) => {
    let current = thread;
    if (current.labels.includes(SYS.SNOOZED) && current.snoozedUntil != null && current.snoozedUntil <= now) {
      changed = true;
      notices.push("Snoozed mail returned to Inbox");
      current = {
        ...current,
        snoozedUntil: null,
        unread: true,
        labels: uniq([...current.labels.filter((l) => l !== SYS.SNOOZED), SYS.INBOX]),
      };
    }
    if (current.labels.includes(SYS.SCHEDULED) && current.scheduledFor != null && current.scheduledFor <= now && current.draft) {
      changed = true;
      notices.push("Scheduled message sent");
      current = materialize(current, now, me);
    }
    return current;
  });
  return { threads: changed ? next : threads, notices };
}

export function replyRecipients(thread: Thread, me: Person): Person[] {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return thread.draft?.to ?? [];
  if (sameEmail(last.from.email, me.email)) {
    return uniquePeople(last.to.filter((p) => !sameEmail(p.email, me.email)));
  }
  return [{ name: last.from.name, email: last.from.email }];
}

export function replyAllRecipients(thread: Thread, me: Person): { to: Person[]; cc: Person[] } {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return { to: thread.draft?.to ?? [], cc: thread.draft?.cc ?? [] };
  const to = replyRecipients(thread, me);
  const cc = uniquePeople(
    [...last.to, ...last.cc].filter(
      (p) => !sameEmail(p.email, me.email) && !to.some((t) => sameEmail(t.email, p.email)),
    ),
  );
  return { to, cc };
}

export function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

export function forwardSubject(subject: string): string {
  return /^fwd:/i.test(subject.trim()) ? subject : `Fwd: ${subject}`;
}

export function buildReplyHtml(message: Message, signature: string): string {
  const when = escapeHtml(formatMessageDate(message.date));
  const who = escapeHtml(`${message.from.name} <${message.from.email}>`);
  const original = message.format === "html" ? message.body : escapeHtml(message.body).replace(/\n/g, "<br>");
  return `<div data-slot="1"><br></div>${signatureHtml(signature)}<div><br></div><div>On ${when}, ${who} wrote:</div><blockquote class="quote">${original}</blockquote>`;
}

export function buildForwardHtml(thread: Thread, message: Message, signature: string): string {
  const lines = [
    "---------- Forwarded message ---------",
    `From: ${message.from.name} <${message.from.email}>`,
    `Date: ${formatMessageDate(message.date)}`,
    `Subject: ${thread.subject}`,
    `To: ${message.to.map((p) => `${p.name} <${p.email}>`).join(", ")}`,
  ];
  const original = message.format === "html" ? message.body : escapeHtml(message.body).replace(/\n/g, "<br>");
  return `<div data-slot="1"><br></div>${signatureHtml(signature)}<div><br></div><div>${lines.map(escapeHtml).join("<br>")}</div><div><br></div>${original}`;
}

export function emptyComposeBody(signature: string): string {
  return `<div data-slot="1"><br></div>${signatureHtml(signature)}`;
}

export type SnoozePreset = { id: string; label: string; hint: string; until: number };

export function snoozePresets(now = Date.now()): SnoozePreset[] {
  const later = new Date(now);
  later.setHours(18, 0, 0, 0);
  if (later.getTime() < now + 30 * 60_000) later.setTime(now + 3 * 3600_000);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const day = new Date(now).getDay();
  const weekend = new Date(now);
  const toSat = (6 - day + 7) % 7 || 7;
  weekend.setDate(weekend.getDate() + toSat);
  weekend.setHours(8, 0, 0, 0);
  const nextWeek = new Date(now);
  const toMon = (8 - day) % 7 || 7;
  nextWeek.setDate(nextWeek.getDate() + toMon);
  nextWeek.setHours(8, 0, 0, 0);
  const morning = new Date(now);
  morning.setDate(morning.getDate() + 1);
  morning.setHours(9, 0, 0, 0);
  const afternoon = new Date(now);
  afternoon.setDate(afternoon.getDate() + 1);
  afternoon.setHours(13, 0, 0, 0);
  return [
    { id: "later", label: "Later today", hint: formatFuture(later.getTime(), now), until: later.getTime() },
    { id: "tomorrow", label: "Tomorrow", hint: formatFuture(tomorrow.getTime(), now), until: tomorrow.getTime() },
    { id: "weekend", label: "This weekend", hint: formatFuture(weekend.getTime(), now), until: weekend.getTime() },
    { id: "week", label: "Next week", hint: formatFuture(nextWeek.getTime(), now), until: nextWeek.getTime() },
    { id: "tmorrow-am", label: "Tomorrow morning", hint: formatFuture(morning.getTime(), now), until: morning.getTime() },
    { id: "tmorrow-pm", label: "Tomorrow afternoon", hint: formatFuture(afternoon.getTime(), now), until: afternoon.getTime() },
  ];
}

export function schedulePresets(now = Date.now()): SnoozePreset[] {
  return snoozePresets(now).filter((p) => ["tmorrow-am", "tmorrow-pm", "week"].includes(p.id));
}

export function collectPeople(threads: Thread[], directory: Person[]): Person[] {
  const found: Person[] = [...directory];
  for (const thread of threads) {
    for (const message of thread.messages) {
      found.push(message.from, ...message.to, ...message.cc, ...message.bcc);
    }
    if (thread.draft) found.push(...thread.draft.to, ...thread.draft.cc, ...thread.draft.bcc);
  }
  return uniquePeople(found);
}

export type Route = {
  view: MailView;
  category: Category;
  threadId: string | null;
  search: string;
  settingsPage: boolean;
};

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [path, qs] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(qs ?? "");
  const search = params.get("q") ?? "";
  const route: Route = {
    view: "inbox",
    category: "primary",
    threadId: null,
    search,
    settingsPage: false,
  };
  if (!parts.length) return route;
  if (parts[0] === "settings") {
    route.settingsPage = true;
    return route;
  }
  const head = parts[0];
  let rest = parts.slice(1);
  if (head === "label" && rest[0]) {
    route.view = `label:${decodeURIComponent(rest[0])}`;
    rest = rest.slice(1);
  } else if (
    ["inbox", "starred", "snoozed", "sent", "drafts", "scheduled", "trash", "spam", "important", "all"].includes(head)
  ) {
    route.view = head as MailView;
  }
  if (route.view === "inbox" && rest[0] && ["primary", "promotions", "social", "updates"].includes(rest[0])) {
    route.category = rest[0] as Category;
    rest = rest.slice(1);
  }
  if (rest[0] === "t" && rest[1]) route.threadId = decodeURIComponent(rest[1]);
  return route;
}

export function buildHash(route: Pick<Route, "view" | "category" | "threadId" | "search" | "settingsPage">): string {
  if (route.settingsPage) return "#/settings";
  const chunks: string[] = [];
  if (route.view.startsWith("label:")) chunks.push("label", encodeURIComponent(route.view.slice(6)));
  else chunks.push(route.view);
  if (route.view === "inbox" && route.category !== "primary") chunks.push(route.category);
  if (route.threadId) chunks.push("t", encodeURIComponent(route.threadId));
  const path = `#/${chunks.join("/")}`;
  if (route.search.trim()) return `${path}?q=${encodeURIComponent(route.search)}`;
  return path;
}

export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const needles = tokenize(query)
    .filter((t) => !t.neg && (t.op === "text" || t.op === "subject"))
    .map((t) => t.value)
    .filter((v) => v.length > 1);
  if (!needles.length) return [{ text, hit: false }];
  const re = new RegExp(`(${needles.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(re);
  return parts.filter(Boolean).map((part) => ({
    text: part,
    hit: needles.some((n) => part.toLowerCase() === n.toLowerCase()),
  }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
