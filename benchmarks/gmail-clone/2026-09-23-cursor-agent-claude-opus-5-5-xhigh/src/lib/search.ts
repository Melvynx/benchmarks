export interface Query {
  raw: string;
  text: string[];
  exclude: string[];
  from: string[];
  to: string[];
  subject: string[];
  label: string[];
  in?: string;
  is: string[];
  has: string[];
  filename: string[];
  category?: string;
  before?: number;
  after?: number;
  larger?: number;
  /** AND of groups, each group an OR of single-term queries. */
  any?: Query[][];
}

function parseDate(v: string) {
  const m = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

function parseRelative(v: string, now: number) {
  const m = v.match(/^(\d+)([dwmy])$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  const days = m[2] === "d" ? n : m[2] === "w" ? n * 7 : m[2] === "m" ? n * 30 : n * 365;
  return now - days * 86_400_000;
}

function parseSize(v: string) {
  const m = v.match(/^(\d+(?:\.\d+)?)([kmg]?)b?$/i);
  if (!m) return undefined;
  const mult = { "": 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[m[2].toLowerCase() as "" | "k" | "m" | "g"];
  return Number(m[1]) * mult;
}

const TOKEN = /-?[a-z_]+:"[^"]*"|-?"[^"]*"|\S+/gi;

export function parseQuery(raw: string, now = Date.now()): Query {
  const tokens: string[] = raw.match(TOKEN) ?? [];
  if (!tokens.includes("OR")) return parseTerms(raw, now);
  const groups: string[][] = [];
  let join = false;
  for (const tok of tokens) {
    if (tok === "OR") {
      join = groups.length > 0;
      continue;
    }
    if (join) groups[groups.length - 1].push(tok);
    else groups.push([tok]);
    join = false;
  }
  const q = parseTerms(groups.filter((g) => g.length === 1).map((g) => g[0]).join(" "), now);
  q.raw = raw;
  q.any = groups
    .filter((g) => g.length > 1)
    .map((g) =>
      g.map((tok) => {
        const alt = parseTerms(tok, now);
        // Trash/spam scoping is decided by the outer query.
        alt.in ??= "anywhere";
        return alt;
      }),
    );
  return q;
}

function parseTerms(raw: string, now: number): Query {
  const q: Query = { raw, text: [], exclude: [], from: [], to: [], subject: [], label: [], is: [], has: [], filename: [] };
  const re = /(-?)([a-z_]+):("[^"]*"|\S+)|(-?)"([^"]*)"|(-?)(\S+)/gi;
  for (const m of raw.matchAll(re)) {
    if (m[2]) {
      const key = m[2].toLowerCase();
      const value = m[3].replace(/^"|"$/g, "").toLowerCase();
      const neg = m[1] === "-";
      switch (key) {
        case "from":
          q.from.push(value);
          break;
        case "to":
        case "cc":
          q.to.push(value);
          break;
        case "subject":
          q.subject.push(value);
          break;
        case "label":
          q.label.push(value);
          break;
        case "in":
          q.in = value;
          break;
        case "is":
          q.is.push(neg ? `-${value}` : value);
          break;
        case "has":
          q.has.push(neg ? `-${value}` : value);
          break;
        case "filename":
          q.filename.push(value);
          break;
        case "category":
          q.category = value;
          break;
        case "before":
        case "older":
          q.before = parseDate(value);
          break;
        case "after":
        case "newer":
          q.after = parseDate(value);
          break;
        case "older_than":
          q.before = parseRelative(value, now);
          break;
        case "newer_than":
          q.after = parseRelative(value, now);
          break;
        case "larger":
          q.larger = parseSize(value);
          break;
        default:
          (neg ? q.exclude : q.text).push(`${key}:${value}`);
      }
    } else if (m[5] !== undefined) {
      (m[4] === "-" ? q.exclude : q.text).push(m[5].toLowerCase());
    } else if (m[7]) {
      (m[6] === "-" ? q.exclude : q.text).push(m[7].toLowerCase());
    }
  }
  return q;
}

export function queryTerms(q: Query): string[] {
  const alts = (q.any ?? []).flat().flatMap(queryTerms);
  return [...q.text, ...q.subject, ...alts].filter((t) => t.length > 1);
}

export interface AdvancedFields {
  from: string;
  to: string;
  subject: string;
  hasWords: string;
  notWords: string;
  within: string;
  in: string;
  hasAttachment: boolean;
  unread: boolean;
}

const quote = (s: string) => (/\s/.test(s) ? `"${s}"` : s);

export function buildQuery(f: AdvancedFields) {
  const parts: string[] = [];
  if (f.from.trim()) parts.push(`from:${quote(f.from.trim())}`);
  if (f.to.trim()) parts.push(`to:${quote(f.to.trim())}`);
  if (f.subject.trim()) parts.push(`subject:${quote(f.subject.trim())}`);
  if (f.hasWords.trim()) parts.push(f.hasWords.trim());
  f.notWords
    .split(/\s+/)
    .filter(Boolean)
    .forEach((w) => parts.push(`-${w}`));
  if (f.within) parts.push(`newer_than:${f.within}`);
  if (f.in.startsWith("label:")) parts.push(f.in);
  else if (f.in && f.in !== "all") parts.push(`in:${f.in}`);
  if (f.hasAttachment) parts.push("has:attachment");
  if (f.unread) parts.push("is:unread");
  return parts.join(" ");
}

export function fieldsFromQuery(raw: string): AdvancedFields {
  const q = parseQuery(raw);
  const within = raw.match(/newer_than:(\S+)/)?.[1] ?? "";
  return {
    from: q.from.join(" "),
    to: q.to.join(" "),
    subject: q.subject.join(" "),
    hasWords: q.text.join(" "),
    notWords: q.exclude.join(" "),
    within,
    in: q.label[0] ? `label:${q.label[0]}` : (q.in ?? "all"),
    hasAttachment: q.has.includes("attachment"),
    unread: q.is.includes("unread"),
  };
}

/** Toggle a bare operator token (e.g. "has:attachment") in a query string. */
export function toggleToken(raw: string, token: string) {
  const parts = raw.split(/\s+/).filter(Boolean);
  const i = parts.findIndex((p) => p.toLowerCase() === token);
  if (i >= 0) parts.splice(i, 1);
  else parts.push(token);
  return parts.join(" ");
}

export function replaceOperator(raw: string, key: string, value: string | null) {
  const re = new RegExp(`(^|\\s)${key}:("[^"]*"|\\S+)`, "gi");
  const stripped = raw.replace(re, " ").replace(/\s+/g, " ").trim();
  return value ? `${stripped} ${key}:${value}`.trim() : stripped;
}
