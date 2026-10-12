import type { ComposeMode, DraftFields, Message, Person, Thread } from '../types';
import { formatFullDate, formatLongDate } from './date';
import { realMessages } from './mailbox';
import { escapeHtml, sameEmail, stripQuote } from './utils';

export function buildQuote(m: Message): string {
  return `<div class="mail-quote"><p>On ${formatFullDate(m.date)}, ${escapeHtml(m.from.name || m.from.email)} &lt;${escapeHtml(m.from.email)}&gt; wrote:</p><blockquote>${stripQuote(m.body)}</blockquote></div>`;
}

export function signatureHtml(sig: string): string {
  return sig.trim() ? `<div class="signature">-- <br>${sig}</div>` : '';
}

export function emptyBody(sig: string): string {
  const s = signatureHtml(sig);
  return s ? `<div><br></div><div><br></div>${s}` : '';
}

export function prefixSubject(prefix: 'Re' | 'Fwd', subject: string): string {
  const re = new RegExp(`^${prefix}:\\s*`, 'i');
  const s = subject.trim() || '(no subject)';
  return re.test(s) ? s : `${prefix}: ${s}`;
}

function dedupe(list: Person[], exclude: string[]): Person[] {
  const out: Person[] = [];
  for (const p of list) {
    if (exclude.some((e) => sameEmail(e, p))) continue;
    if (out.some((o) => sameEmail(o, p))) continue;
    out.push(p);
  }
  return out;
}

export function forwardBlock(m: Message, subject: string): string {
  const to = m.to.map((p) => `${escapeHtml(p.name)} &lt;${escapeHtml(p.email)}&gt;`).join(', ');
  return `<div class="forwarded"><div>---------- Forwarded message ---------</div><div>From: <b>${escapeHtml(m.from.name)}</b> &lt;${escapeHtml(m.from.email)}&gt;</div><div>Date: ${formatLongDate(m.date)}</div><div>Subject: ${escapeHtml(subject)}</div><div>To: ${to}</div><br>${stripQuote(m.body)}</div>`;
}

export function replyFields(t: Thread, mode: ComposeMode, meEmail: string, signature: string, source?: Message): DraftFields {
  const real = realMessages(t);
  const src = source ?? real[real.length - 1] ?? t.messages[t.messages.length - 1];
  const fromMe = sameEmail(src.from, meEmail);
  if (mode === 'forward') {
    const block = forwardBlock(src, t.subject);
    return {
      to: [],
      cc: [],
      bcc: [],
      subject: prefixSubject('Fwd', t.subject),
      body: `<div><br></div>${signatureHtml(signature)}<div><br></div>${block}`,
      attachments: src.attachments.map((a) => ({ ...a })),
    };
  }
  let to: Person[];
  let cc: Person[] = [];
  if (mode === 'reply') {
    to = fromMe ? src.to : [src.from];
  } else {
    to = fromMe ? src.to : dedupe([src.from, ...src.to], [meEmail]);
    cc = dedupe(src.cc, [meEmail, ...to.map((p) => p.email)]);
  }
  return {
    to: dedupe(to, fromMe ? [] : [meEmail]),
    cc,
    bcc: [],
    subject: prefixSubject('Re', t.subject),
    body: emptyBody(signature),
    quote: buildQuote(src),
    attachments: [],
  };
}

export function fieldsFromDraft(m: Message, subject: string): DraftFields {
  return { to: m.to, cc: m.cc, bcc: m.bcc, subject, body: m.body, quote: m.quote, attachments: m.attachments };
}

export function isEmptyDraft(f: DraftFields, signature: string): boolean {
  const bodyText = f.body
    .replace(/<div class="signature">[\s\S]*?<\/div>/, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, '')
    .trim();
  const sigOnly = !bodyText || f.body === emptyBody(signature);
  return !f.to.length && !f.cc.length && !f.bcc.length && !f.subject.trim() && sigOnly && !f.attachments.length;
}

export function parseAddress(raw: string): Person | null {
  const s = raw.trim().replace(/[,;]+$/, '');
  if (!s) return null;
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: '', email: s };
}
