import * as ops from '../domain/ops';
import { createIncomingThread, createSeedData, nextIncomingDelay } from '../domain/seed';
import type {
  Address,
  Draft,
  LabelColor,
  Location,
  MailData,
  Outgoing,
  Settings,
  Thread,
} from '../domain/types';
import { useMail } from './mailStore';

const update = (fn: (d: MailData) => MailData): void => useMail.getState().update(fn);
export const getData = (): MailData => useMail.getState().data;

export const snapshotThreads = (ids: string[]): Thread[] => {
  const set = new Set(ids);
  return getData().threads.filter((t) => set.has(t.id));
};

export const restoreThreads = (snapshot: Thread[]): void => update((d) => ops.replaceThreads(d, snapshot));
export const moveTo = (ids: string[], location: Location): void => update((d) => ops.moveThreads(d, ids, location));
export const setRead = (ids: string[], read: boolean): void => update((d) => ops.setRead(d, ids, read));
export const setMessageUnread = (threadId: string, messageId: string, unread: boolean): void =>
  update((d) => ops.setMessageUnread(d, threadId, messageId, unread));
export const setStarred = (ids: string[], on: boolean): void => update((d) => ops.setStarred(d, ids, on));
export const setImportant = (ids: string[], on: boolean): void => update((d) => ops.setImportant(d, ids, on));
export const snooze = (ids: string[], until: number | null): void => update((d) => ops.snoozeThreads(d, ids, until));
export const toggleLabel = (ids: string[], labelId: string, on: boolean): void =>
  update((d) => ops.toggleLabel(d, ids, labelId, on));
export const removeThreads = (ids: string[]): void => update((d) => ops.removeThreads(d, ids));

export function createLabel(name: string, color: LabelColor): string {
  let id = '';
  update((d) => {
    const result = ops.addLabel(d, name, color);
    id = result.label.id;
    return result.data;
  });
  return id;
}

export const deleteLabel = (labelId: string): void => update((d) => ops.deleteLabel(d, labelId));

export const saveDraft = (draft: Draft): void => update((d) => ops.saveDraft(d, draft));
export const removeDraft = (draftId: string): void => update((d) => ops.removeDraft(d, draftId));
export const queueOutgoing = (out: Outgoing): void => update((d) => ops.queueOutgoing(d, out));

export function cancelOutgoing(outId: string): Draft | null {
  const box: { draft: Draft | null } = { draft: null };
  update((d) => {
    const result = ops.cancelOutgoing(d, outId, Date.now());
    box.draft = result.draft;
    return result.data;
  });
  return box.draft;
}

export const sendOutgoingNow = (outId: string): void =>
  update((d) => ops.rescheduleOutgoing(d, outId, Date.now()));

export const updateSettings = (patch: Partial<Settings>): void => update((d) => ops.updateSettings(d, patch));
export const updateAccount = (patch: Partial<Address>): void => update((d) => ops.updateAccount(d, patch));
export const addRecentSearch = (query: string): void => update((d) => ops.addRecentSearch(d, query));
export const resetData = (): void => {
  useMail.setState({ data: createSeedData(Date.now()) });
};

export interface TickEvents {
  delivered: Outgoing[];
  woke: Thread[];
  incoming: Thread[];
}

/** Time-driven state changes: send due mail, wake snoozes, receive simulated new mail. */
export function tick(now: number, online: boolean): TickEvents {
  const events: TickEvents = { delivered: [], woke: [], incoming: [] };
  const snapshot = getData();
  const due = online ? snapshot.outgoing.filter((o) => o.sendAt <= now) : [];
  const woke = snapshot.threads.filter((t) => t.snoozedUntil !== null && t.snoozedUntil <= now);
  const incomingDue = snapshot.settings.incomingMail && now >= snapshot.nextIncomingAt;
  if (due.length === 0 && woke.length === 0 && !incomingDue) return events;

  update((d) => {
    let next = d;
    for (const out of due) {
      if (!next.outgoing.some((o) => o.id === out.id)) continue;
      next = ops.deliver(next, out, now);
      events.delivered.push(out);
    }
    if (woke.length > 0) {
      next = ops.wakeSnoozed(next, now);
      events.woke.push(...woke);
    }
    if (incomingDue) {
      const thread = createIncomingThread(now);
      next = ops.receiveThread(next, thread);
      next = ops.setNextIncoming(next, now + nextIncomingDelay());
      events.incoming.push(thread);
    }
    return next;
  });
  return events;
}
