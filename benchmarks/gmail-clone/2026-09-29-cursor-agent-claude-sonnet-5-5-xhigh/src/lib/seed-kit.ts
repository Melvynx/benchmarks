import type { Attachment, AttachmentKind, Category, Invite, Message, Person, Thread } from './types';
import { DAY, HOUR, MIN, formatFull } from './date';
import { ME } from './people';
import { escapeHtml, makeSnippet, md } from './text';

export interface MS {
  from: Person;
  to?: Person[];
  cc?: Person[];
  at: number;
  body?: string;
  html?: string;
  att?: Attachment[];
  unread?: boolean;
  star?: boolean;
  invite?: Invite;
  unsub?: boolean;
  quote?: boolean;
  mailedBy?: string;
}

export interface TS {
  subject: string;
  msgs: MS[];
  cat?: Category;
  inbox?: boolean;
  trashed?: boolean;
  spam?: boolean;
  important?: boolean;
  labels?: string[];
  snoozeUntil?: number;
}

export function makeClock(now: number) {
  return (d: number, h = 0, m = 0) => now - (d * DAY + h * HOUR + m * MIN);
}

const KIND_BY_EXT: Record<string, AttachmentKind> = {
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  heic: 'image',
  doc: 'doc',
  docx: 'doc',
  pages: 'doc',
  txt: 'doc',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  ppt: 'slides',
  pptx: 'slides',
  key: 'slides',
  zip: 'zip',
  ics: 'calendar',
  js: 'code',
  ts: 'code',
  json: 'code',
  py: 'code',
  mp3: 'audio',
  wav: 'audio',
  mp4: 'video',
  mov: 'video',
};

let attCounter = 0;
export function att(
  name: string,
  sizeKB: number,
  extra: Partial<Pick<Attachment, 'art' | 'title' | 'lines'>> = {},
): Attachment {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  attCounter += 1;
  return {
    id: `a_seed_${attCounter}`,
    name,
    size: Math.round(sizeKB * 1024),
    kind: KIND_BY_EXT[ext] ?? 'other',
    art: extra.art ?? attCounter * 7,
    title: extra.title,
    lines: extra.lines,
  };
}

export function quoteBlock(prev: { from: Person; date: number; html: string }): string {
  return `<div class="q"><div>On ${formatFull(prev.date).replace(/, (\d{4}),/, ', $1 at')}, ${escapeHtml(
    prev.from.name,
  )} &lt;${escapeHtml(prev.from.email)}&gt; wrote:</div><blockquote>${prev.html}</blockquote></div>`;
}

let threadCounter = 0;

export function buildThread(ts: TS): { thread: Thread; messages: Message[] } {
  threadCounter += 1;
  const threadId = `t_${String(threadCounter).padStart(3, '0')}`;
  const sorted = [...ts.msgs].sort((a, b) => a.at - b.at);
  const messages: Message[] = [];
  sorted.forEach((ms, i) => {
    const baseHtml = ms.html ?? md(ms.body ?? '');
    const prev = messages[i - 1];
    const html = prev && ms.quote !== false && !ms.html ? baseHtml + quoteBlock(prev) : baseHtml;
    const fromMe = ms.from.email === ME.email;
    const defaultTo = fromMe ? (prev ? [prev.from] : []) : [ME];
    messages.push({
      id: `m_${threadId}_${i + 1}`,
      threadId,
      from: ms.from,
      to: ms.to ?? defaultTo,
      cc: ms.cc ?? [],
      bcc: [],
      date: ms.at,
      html,
      snippet: makeSnippet(html),
      unread: !!ms.unread,
      starred: !!ms.star,
      attachments: ms.att ?? [],
      invite: ms.invite,
      unsubscribe: ms.unsub,
      mailedBy: ms.mailedBy,
    });
  });
  const hasIncoming = messages.some((m) => m.from.email !== ME.email);
  const thread: Thread = {
    id: threadId,
    subject: ts.subject,
    messageIds: messages.map((m) => m.id),
    labelIds: ts.labels ?? [],
    inbox: ts.inbox ?? hasIncoming,
    trashed: !!ts.trashed,
    spam: !!ts.spam,
    important: !!ts.important,
    category: ts.cat ?? 'primary',
    snoozeUntil: ts.snoozeUntil,
    snoozedAt: ts.snoozeUntil ? messages[messages.length - 1].date : undefined,
    lastDate: messages[messages.length - 1].date,
  };
  return { thread, messages };
}

export interface PromoOpts {
  brand: string;
  accent: string;
  headline: string;
  sub?: string;
  art?: string;
  body?: string;
  cta?: string;
  footer?: string;
  sections?: { title: string; text: string; art?: string }[];
}

export function promo(o: PromoOpts): string {
  const sections = (o.sections ?? [])
    .map(
      (s) =>
        `<div style="padding:18px 0;border-top:1px solid #ececec">${
          s.art ? `<img src="${s.art}" alt="" style="width:100%;border-radius:10px;display:block;margin-bottom:12px">` : ''
        }<div style="font-weight:700;font-size:16px;margin-bottom:4px;color:#1f1f1f">${escapeHtml(s.title)}</div><div style="color:#555;font-size:14px;line-height:1.5">${escapeHtml(
          s.text,
        )}</div></div>`,
    )
    .join('');
  return `<div style="max-width:560px;margin:0 auto;background:#ffffff;color:#1f1f1f;border-radius:14px;overflow:hidden;border:1px solid #e4e4e4">
<div style="padding:18px 24px;font-weight:800;letter-spacing:.08em;font-size:13px;color:${o.accent}">${escapeHtml(o.brand.toUpperCase())}</div>
${o.art ? `<img src="${o.art}" alt="" style="width:100%;display:block">` : ''}
<div style="padding:24px 24px 8px">
<h2 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:#1f1f1f">${escapeHtml(o.headline)}</h2>
${o.sub ? `<p style="margin:0 0 14px;color:#555;font-size:15px;line-height:1.5">${escapeHtml(o.sub)}</p>` : ''}
${o.body ? `<div style="color:#333;font-size:14px;line-height:1.6">${o.body}</div>` : ''}
${o.cta ? `<p style="margin:18px 0"><a href="https://example.com" style="display:inline-block;background:${o.accent};color:#ffffff;padding:12px 24px;border-radius:24px;font-weight:600;text-decoration:none">${escapeHtml(o.cta)}</a></p>` : ''}
${sections}
</div>
<div style="padding:16px 24px;background:#f6f6f6;color:#7a7a7a;font-size:12px;line-height:1.5">${escapeHtml(
    o.footer ?? `You are receiving this email because you signed up at ${o.brand}.`,
  )}</div></div>`;
}

export function receipt(o: {
  brand: string;
  accent: string;
  title: string;
  lines: [string, string][];
  total: [string, string];
  note?: string;
}): string {
  const rows = o.lines
    .map(
      ([a, b]) =>
        `<tr><td style="padding:8px 0;color:#444;border-bottom:1px solid #eee">${escapeHtml(a)}</td><td style="padding:8px 0;text-align:right;color:#222;border-bottom:1px solid #eee">${escapeHtml(b)}</td></tr>`,
    )
    .join('');
  return `<div style="max-width:520px;margin:0 auto;background:#fff;color:#1f1f1f;border-radius:12px;border:1px solid #e4e4e4;padding:24px">
<div style="font-weight:800;letter-spacing:.08em;font-size:13px;color:${o.accent};margin-bottom:12px">${escapeHtml(o.brand.toUpperCase())}</div>
<h2 style="margin:0 0 14px;font-size:20px">${escapeHtml(o.title)}</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>${rows}<tr><td style="padding:12px 0;font-weight:700">${escapeHtml(o.total[0])}</td><td style="padding:12px 0;text-align:right;font-weight:700">${escapeHtml(o.total[1])}</td></tr></tbody></table>
${o.note ? `<p style="color:#666;font-size:13px;line-height:1.5;margin:14px 0 0">${escapeHtml(o.note)}</p>` : ''}</div>`;
}
