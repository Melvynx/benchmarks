import type { Mail, Folder, Attachment } from './data.ts';
import { USER } from './data.ts';
import { emailValid } from './utils.ts';

export type Action = 'archive' | 'trash' | 'spam' | 'restore' | 'read' | 'unread' | 'star' | 'important' | 'label' | 'unlabel' | 'move' | 'snooze';

export function updateMail(mails: Mail[], ids: string[], action: Action, value = ''): Mail[] {
  const selected = new Set(ids);
  return mails.map(mail => {
    if (!selected.has(mail.id)) return mail;
    switch (action) {
      case 'archive': return { ...mail, folder: 'archive', wakeAt: undefined };
      case 'trash': return { ...mail, previousFolder: mail.folder === 'trash' ? mail.previousFolder : mail.folder, folder: 'trash' };
      case 'spam': return { ...mail, previousFolder: mail.folder, folder: 'spam' };
      case 'restore': return { ...mail, folder: mail.previousFolder ?? 'inbox', previousFolder: undefined, wakeAt: ['scheduled', 'snoozed'].includes(mail.previousFolder ?? '') ? mail.wakeAt : undefined };
      case 'read': return { ...mail, read: true };
      case 'unread': return { ...mail, read: false };
      case 'star': return { ...mail, starred: !mail.starred };
      case 'important': return { ...mail, important: !mail.important };
      case 'label': return { ...mail, labels: [...new Set([...mail.labels, value])] };
      case 'unlabel': return { ...mail, labels: mail.labels.filter(label => label !== value) };
      case 'move': return { ...mail, folder: value as Folder, wakeAt: undefined };
      case 'snooze': return { ...mail, previousFolder: mail.folder, folder: 'snoozed', wakeAt: value };
    }
  });
}

export type Outgoing = { id?: string; to: string; cc?: string; bcc?: string; subject: string; body: string; bodyHtml?: string; attachments: Attachment[]; replyTo?: string };

export function recipientsValid(to: string) {
  const recipients = to.split(/[,;]+/).map(item => item.trim()).filter(Boolean);
  return recipients.length > 0 && recipients.every(emailValid);
}

export function createOutgoingMail(outgoing: Outgoing, folder: 'drafts' | 'sent' | 'scheduled' = 'drafts'): Mail {
  const date = new Date().toISOString();
  return {
    id: outgoing.id ?? `local-${crypto.randomUUID()}`, sender: USER.name, email: USER.email,
    initials: USER.initials, color: '#deebe4', subject: outgoing.subject || '(no subject)',
    preview: outgoing.body.replace(/\n/g, ' '), date, folder, category: 'primary',
    read: true, starred: false, important: false, labels: [], attachments: outgoing.attachments,
    to: outgoing.to, cc: outgoing.cc, bcc: outgoing.bcc, replyTo: outgoing.replyTo,
    messages: [{ id: `message-${outgoing.id ?? crypto.randomUUID()}`, sender: USER.name, email: USER.email, own: true, body: outgoing.body, bodyHtml: outgoing.bodyHtml, date }],
  };
}

export function wakeMail(mails: Mail[], now = Date.now()) {
  const date = new Date(now).toISOString();
  const dueReplies = mails.filter(mail => mail.folder === 'scheduled' && mail.replyTo && mail.wakeAt && new Date(mail.wakeAt).getTime() <= now);
  return mails.map(mail => {
    let next = mail;
    if ((mail.folder === 'snoozed' || mail.folder === 'scheduled') && mail.wakeAt && new Date(mail.wakeAt).getTime() <= now) {
      next = { ...mail, folder: mail.folder === 'scheduled' ? 'sent' : mail.previousFolder ?? 'inbox', wakeAt: undefined };
      if (mail.folder === 'scheduled') next = { ...next, date, messages: mail.messages.map(message => ({ ...message, date })) };
    }
    const replies = dueReplies.filter(reply => reply.replyTo === mail.id && !mail.messages.some(message => message.id === reply.messages[0].id));
    if (replies.length) {
      const last = replies.at(-1)!;
      return { ...next, messages: [...next.messages, ...replies.map(reply => ({ ...reply.messages[0], date }))], preview: last.preview, date, read: true };
    }
    return next;
  });
}
