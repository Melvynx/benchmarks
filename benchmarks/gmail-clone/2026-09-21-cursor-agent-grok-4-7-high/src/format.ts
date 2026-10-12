import type { Contact, Thread } from "./types";

export const ME: Contact = {
  name: "Maya Chen",
  email: "maya.chen@northwind.dev",
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatListDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function formatFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function snippetOf(body: string): string {
  return body.replace(/\s+/g, " ").trim();
}

export function htmlToText(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set(["B", "I", "U", "A", "UL", "OL", "LI", "BR", "P", "DIV", "BLOCKQUOTE", "STRONG", "EM", "SPAN"]);
  const walk = (node: Node) => {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      if (!allowed.has(el.tagName)) {
        el.replaceWith(...el.childNodes);
        walk(node);
        return;
      }
      for (const attr of [...el.attributes]) {
        if (el.tagName === "A" && attr.name === "href" && /^(https?:|mailto:)/i.test(attr.value)) continue;
        el.removeAttribute(attr.name);
      }
      if (el.tagName === "A") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noreferrer");
      }
      walk(el);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

export function latestMessage(thread: Thread) {
  return thread.messages[thread.messages.length - 1];
}

export function threadTime(thread: Thread): number {
  return new Date(latestMessage(thread).date).getTime();
}

export function listSender(thread: Thread): string {
  const names: string[] = [];
  for (const message of thread.messages) {
    const name = message.from.email === ME.email ? "me" : message.from.name;
    if (!names.includes(name)) names.push(name);
  }
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")}…`;
}

export function colorFor(seed: string): string {
  const palette = ["#1a73e8", "#d93025", "#188038", "#c5221f", "#9334e6", "#e37400", "#007b83", "#b86000"];
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveContact(email: string, contacts: Contact[]): Contact {
  const found = contacts.find((contact) => contact.email.toLowerCase() === email.toLowerCase());
  if (found) return found;
  const local = email.split("@")[0] ?? email;
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return { name: name || email, email };
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function presetMoments(now = new Date()): { id: string; label: string; hint: string; date: Date }[] {
  const later = new Date(now);
  later.setHours(18, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const monday = new Date(now);
  const day = monday.getDay();
  const add = day === 1 ? 7 : (8 - day) % 7;
  monday.setDate(now.getDate() + add);
  monday.setHours(8, 0, 0, 0);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  nextWeek.setHours(8, 0, 0, 0);
  const items = [
    { id: "later", label: "Later today", hint: formatShort(later.toISOString()), date: later },
    { id: "tomorrow", label: "Tomorrow", hint: formatShort(tomorrow.toISOString()), date: tomorrow },
    { id: "monday", label: "Monday morning", hint: formatShort(monday.toISOString()), date: monday },
    { id: "next-week", label: "Next week", hint: formatShort(nextWeek.toISOString()), date: nextWeek },
  ];
  return items.filter((item) => item.date.getTime() > now.getTime() + 60_000);
}

export function mailboxLabel(id: string, labels: { id: string; name: string }[]): string {
  if (id.startsWith("label:")) {
    const labelId = id.slice(6);
    return labels.find((label) => label.id === labelId)?.name ?? labelId;
  }
  const names: Record<string, string> = {
    inbox: "Inbox",
    starred: "Starred",
    snoozed: "Snoozed",
    sent: "Sent",
    drafts: "Drafts",
    scheduled: "Scheduled",
    all: "All mail",
    spam: "Spam",
    trash: "Trash",
  };
  return names[id] ?? id;
}
