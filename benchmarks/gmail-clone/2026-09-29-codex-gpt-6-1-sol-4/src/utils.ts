import type { Mail } from './data';

export function formatDate(date: string) {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fullDate(date: string) {
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function matchesSearch(mail: Mail, query: string) {
  const terms = query.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const text = `${mail.sender} ${mail.email} ${mail.to ?? ''} ${mail.subject} ${mail.preview} ${mail.messages.map(m => m.body).join(' ')} ${mail.attachments.map(a => a.name).join(' ')}`.toLowerCase();
  return terms.every(term => {
    const normalized = term.toLowerCase().replace(/"/g, '');
    if (normalized.startsWith('from:')) return `${mail.sender} ${mail.email}`.toLowerCase().includes(normalized.slice(5));
    if (normalized.startsWith('to:')) return (mail.to ?? '').toLowerCase().includes(normalized.slice(3));
    if (normalized.startsWith('subject:')) return mail.subject.toLowerCase().includes(normalized.slice(8));
    if (normalized.startsWith('label:')) return mail.labels.some(l => l.toLowerCase() === normalized.slice(6));
    if (normalized === 'is:unread') return !mail.read;
    if (normalized === 'is:read') return mail.read;
    if (normalized === 'is:starred') return mail.starred;
    if (normalized === 'is:important') return mail.important;
    if (normalized === 'has:attachment') return mail.attachments.length > 0;
    if (normalized.startsWith('in:')) { const folder = normalized.slice(3); return folder === 'all' ? true : mail.folder === folder; }
    if (normalized.startsWith('after:')) return new Date(mail.date) > new Date(normalized.slice(6));
    if (normalized.startsWith('before:')) return new Date(mail.date) < new Date(normalized.slice(7));
    return text.includes(normalized);
  });
}

export function emailValid(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }

export function downloadText(name: string, text: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
