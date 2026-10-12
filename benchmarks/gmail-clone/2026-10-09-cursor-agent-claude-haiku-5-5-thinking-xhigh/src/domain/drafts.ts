import { escapeHtml, htmlToText } from '../lib/text';
import { formatFullDate } from '../lib/time';
import { lastMessage } from './threads';
import type { Address, ComposeMode, Draft, Thread } from './types';

export function newDraft(id: string, signature: string, now: number): Draft {
  const sig = signature
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br>');
  return {
    id,
    threadId: null,
    mode: 'new',
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    html: sig ? `<p><br></p><p>-- <br>${sig}</p>` : '<p><br></p>',
    attachments: [],
    updatedAt: now,
    pristine: true,
  };
}

const addrKey = (a: Address) => a.email.toLowerCase();

export function replyDraft(
  id: string,
  thread: Thread,
  mode: Extract<ComposeMode, 'reply' | 'replyAll'>,
  me: Address,
  now: number,
): Draft {
  const last = lastMessage(thread);
  const isMe = (a: Address) => addrKey(a) === addrKey(me);
  const to = dedupe((last.from.email === me.email ? last.to : [last.from]).filter((a) => !isMe(a)));
  const toKeys = new Set(to.map(addrKey));
  const cc =
    mode === 'replyAll'
      ? dedupe([...last.to, ...last.cc]).filter((a) => !isMe(a) && !toKeys.has(addrKey(a)))
      : [];
  const subject = /^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`;
  const stamp = `On ${formatFullDate(last.date)}, ${escapeHtml(last.from.name || last.from.email)} &lt;${escapeHtml(
    last.from.email,
  )}&gt; wrote:`;
  return {
    id,
    threadId: thread.id,
    mode,
    to,
    cc,
    bcc: [],
    subject,
    html: `<p><br></p><p>${stamp}</p><blockquote class="quote">${last.html}</blockquote>`,
    attachments: [],
    updatedAt: now,
    pristine: false,
  };
}

export function forwardDraft(id: string, thread: Thread, now: number): Draft {
  const last = lastMessage(thread);
  const subject = /^fwd?:/i.test(thread.subject) ? thread.subject : `Fwd: ${thread.subject}`;
  const header = [
    '---------- Forwarded message ---------',
    `From: ${last.from.name} &lt;${escapeHtml(last.from.email)}&gt;`,
    `Date: ${escapeHtml(formatFullDate(last.date))}`,
    `Subject: ${escapeHtml(thread.subject)}`,
    `To: ${escapeHtml(last.to.map((a) => a.email).join(', '))}`,
  ].join('<br>');
  return {
    id,
    threadId: null,
    mode: 'forward',
    to: [],
    cc: [],
    bcc: [],
    subject,
    html: `<p><br></p><p>${header}</p><blockquote>${last.html}</blockquote>`,
    attachments: [...last.attachments],
    updatedAt: now,
    pristine: false,
  };
}

export function draftHasContent(draft: Draft): boolean {
  if (draft.to.length || draft.cc.length || draft.bcc.length || draft.attachments.length) return true;
  if (draft.subject.trim()) return true;
  return !draft.pristine && htmlToText(draft.html).length > 0;
}

function dedupe(list: Address[]): Address[] {
  const seen = new Set<string>();
  return list.filter((a) => {
    const key = addrKey(a);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
