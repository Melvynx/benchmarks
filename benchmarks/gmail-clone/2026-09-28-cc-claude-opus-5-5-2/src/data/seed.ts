import { CONTACTS, ME } from './contacts';
import { SEED_DRAFTS, SEED_THREADS } from './seedThreads';
import type {
  Ago, Attachment, CalendarEvent, Contact, Draft, Incoming, Label, Message, SeedAttachment, Task, Thread,
} from './types';
import { TIME, htmlToText, kindFromName, textToHtml } from '../lib/format';

export const DEFAULT_LABELS: Label[] = [
  { id: 'work', name: 'Work', color: '#4285f4', textColor: '#174ea6' },
  { id: 'clients', name: 'Clients', color: '#e66550', textColor: '#8a1c0c' },
  { id: 'personal', name: 'Personal', color: '#16a765', textColor: '#0b5f38' },
  { id: 'travel', name: 'Travel', color: '#fa7b17', textColor: '#9c4200' },
  { id: 'finance', name: 'Finance', color: '#8e63ce', textColor: '#4a2a87' },
  { id: 'receipts', name: 'Receipts', color: '#80868b', textColor: '#3c4043' },
];

export const LABEL_PALETTE: { color: string; textColor: string }[] = [
  { color: '#4285f4', textColor: '#174ea6' },
  { color: '#e66550', textColor: '#8a1c0c' },
  { color: '#16a765', textColor: '#0b5f38' },
  { color: '#fa7b17', textColor: '#9c4200' },
  { color: '#8e63ce', textColor: '#4a2a87' },
  { color: '#80868b', textColor: '#3c4043' },
  { color: '#f2b600', textColor: '#7a5a00' },
  { color: '#e07798', textColor: '#8a1d44' },
  { color: '#2da2bb', textColor: '#0b5664' },
  { color: '#a479e2', textColor: '#51309a' },
];

export function resolveAgo(at: Ago, now: number): number {
  const rel = at.match(/^(\d+)([mh])$/);
  if (rel) return now - Number(rel[1]) * (rel[2] === 'm' ? TIME.MIN : TIME.HOUR);
  const abs = at.match(/^(\d+)d@(\d{1,2}):(\d{2})$/);
  if (abs) {
    const d = new Date(now);
    d.setDate(d.getDate() - Number(abs[1]));
    d.setHours(Number(abs[2]), Number(abs[3]), 0, 0);
    return Math.min(d.getTime(), now - TIME.MIN);
  }
  return now;
}

function contact(key: string): Contact {
  if (key === 'me') return ME;
  const c = CONTACTS[key];
  if (!c) throw new Error(`Unknown contact key in seed: ${key}`);
  return c;
}

function attachment(a: SeedAttachment, id: string): Attachment {
  return { id, name: a.name, size: a.size, kind: kindFromName(a.name), preview: a.preview };
}

export function buildThreads(now: number): Record<string, Thread> {
  const threads: Record<string, Thread> = {};
  for (const st of SEED_THREADS) {
    const messages: Message[] = st.messages.map((sm, i) => {
      const html = sm.html ?? textToHtml(sm.body ?? '');
      return {
        id: `${st.id}-m${i}`,
        threadId: st.id,
        from: contact(sm.from),
        to: sm.to.map(contact),
        cc: (sm.cc ?? []).map(contact),
        bcc: [],
        date: resolveAgo(sm.at, now),
        html,
        text: sm.body ?? htmlToText(sm.html ?? ''),
        attachments: (sm.attachments ?? []).map((a, j) => attachment(a, `${st.id}-m${i}-a${j}`)),
      };
    });
    messages.sort((a, b) => a.date - b.date);
    const loc = st.location ?? 'inbox';
    threads[st.id] = {
      id: st.id,
      subject: st.subject,
      messages,
      category: st.category,
      labels: st.labels ?? [],
      unread: st.unread ?? false,
      starred: st.starred ?? false,
      important: st.important ?? false,
      inInbox: loc === 'inbox',
      trashed: loc === 'trash',
      spam: loc === 'spam',
      snoozedUntil: st.snoozeHours ? now + st.snoozeHours * TIME.HOUR : null,
      trashedAt: loc === 'trash' ? messages[messages.length - 1].date : null,
    };
  }
  return threads;
}

export function buildDrafts(now: number, threads: Record<string, Thread>): Record<string, Draft> {
  const drafts: Record<string, Draft> = {};
  SEED_DRAFTS.forEach((sd, i) => {
    const id = `d-seed-${i}`;
    const thread = sd.threadId ? threads[sd.threadId] : undefined;
    drafts[id] = {
      id,
      threadId: thread ? thread.id : null,
      mode: thread ? 'reply' : 'new',
      to: sd.to.map(contact),
      cc: (sd.cc ?? []).map(contact),
      bcc: [],
      subject: thread ? (/^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`) : sd.subject,
      html: textToHtml(sd.body),
      attachments: [],
      updatedAt: resolveAgo(sd.at, now),
      scheduledAt: sd.scheduleInHours ? now + sd.scheduleInHours * TIME.HOUR : null,
    };
  });
  return drafts;
}

function at(now: number, dayOffset: number, h: number, m = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function buildEvents(now: number): CalendarEvent[] {
  return [
    { id: 'e1', title: 'Design standup', start: at(now, 0, 9, 30), end: at(now, 0, 9, 45), location: 'Studio · Room Cedar', color: '#039be5' },
    { id: 'e2', title: 'Harbor Health — portal review', start: at(now, 0, 11, 0), end: at(now, 0, 12, 0), location: 'Video call', color: '#e67c73' },
    { id: 'e3', title: 'Lunch with Nora', start: at(now, 0, 12, 30), end: at(now, 0, 13, 30), location: 'Tusk, SE Burnside', color: '#33b679' },
    { id: 'e4', title: 'Q4 roadmap working session', start: at(now, 0, 14, 0), end: at(now, 0, 15, 30), location: 'Studio · Big table', color: '#039be5' },
    { id: 'e5', title: 'Portfolio review — Priya', start: at(now, 0, 17, 0), end: at(now, 0, 17, 30), location: 'Phone', color: '#8e24aa' },
    { id: 'e6', title: 'Atlas design system sync', start: at(now, 1, 10, 0), end: at(now, 1, 11, 0), location: 'Studio · Room Alder', color: '#039be5' },
    { id: 'e7', title: 'Running club — tempo run', start: at(now, 1, 18, 30), end: at(now, 1, 19, 30), location: 'Laurelhurst Park', color: '#f6bf26' },
    { id: 'e8', title: 'Juniper Bank onboarding kickoff', start: at(now, 2, 13, 0), end: at(now, 2, 14, 0), location: 'Juniper HQ, 4th floor', color: '#e67c73' },
  ];
}

export function buildTasks(now: number): Task[] {
  return [
    { id: 'k1', title: 'Send Harbor round-2 feedback summary', done: false, due: at(now, 0, 17, 0), createdAt: now - 2 * TIME.DAY },
    { id: 'k2', title: 'Book flights for the offsite', done: false, due: at(now, 2, 12, 0), createdAt: now - 3 * TIME.DAY },
    { id: 'k3', title: 'Review Atlas token naming RFC', done: false, due: null, createdAt: now - TIME.DAY },
    { id: 'k4', title: 'Renew lease paperwork', done: true, due: null, createdAt: now - 6 * TIME.DAY },
  ];
}

/** A few messages that arrive shortly after the mailbox is first opened, so the inbox feels alive. */
export function buildIncoming(now: number): Incoming[] {
  const people = Object.values(CONTACTS).filter((c) => c.kind !== 'brand' && c.email.endsWith('@fernbrook.co'));
  const colleague = people[0];
  const other = people[1] ?? colleague;
  if (!colleague) return [];
  return [
    {
      id: 'in-seed-1',
      threadId: null,
      from: colleague,
      to: [ME],
      subject: 'Quick sync before the roadmap session?',
      text: `Hey Robin,\n\nDo you have 10 minutes before the roadmap working session this afternoon? I want to walk through the sequencing for Atlas v2 so we're aligned before the rest of the group weighs in.\n\nHappy to grab coffee downstairs.\n\n${colleague.name.split(' ')[0]}`,
      category: 'primary',
      deliverAt: now + 40 * 1000,
      labels: ['work'],
      important: true,
    },
    {
      id: 'in-seed-2',
      threadId: null,
      from: other,
      to: [ME],
      subject: 'Shared: Atlas v2 — component audit',
      text: `${other.name} shared a spreadsheet with you.\n\nAtlas v2 — component audit\n\n"Added the usage counts for every component across the three products. Buttons and inputs are the big consolidation wins."\n\nOpen in Sheets: https://sheets.fernbrook.co/atlas-v2-audit`,
      category: 'updates',
      deliverAt: now + 3 * TIME.MIN,
      labels: ['work'],
    },
  ];
}

export { ME, CONTACTS };
