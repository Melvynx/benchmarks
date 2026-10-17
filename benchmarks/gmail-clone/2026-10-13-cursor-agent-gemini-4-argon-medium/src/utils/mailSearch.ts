import { AdvancedSearchFilter, CustomLabel, EmailThread, InboxCategory, SystemFolder } from '../types/mail';

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function threadHasAttachments(thread: EmailThread): boolean {
  return thread.messages.some((m) => m.attachments && m.attachments.length > 0);
}

export function getThreadAttachments(thread: EmailThread) {
  const list = [];
  const seen = new Set<string>();
  for (const msg of thread.messages) {
    if (msg.attachments) {
      for (const att of msg.attachments) {
        if (!seen.has(att.name)) {
          seen.add(att.name);
          list.push(att);
        }
      }
    }
  }
  return list;
}

export function matchesFolderOrLabel(
  thread: EmailThread,
  activeFolder: SystemFolder | null,
  activeLabelId: string | null,
  activeCategory: InboxCategory,
  showCategoryTabs: boolean,
  hasActiveSearch: boolean
): boolean {
  // If user is actively searching, search across all non-trash/non-spam threads unless viewing trash/spam specifically
  if (hasActiveSearch) {
    if (activeFolder === 'trash') return thread.folder === 'trash';
    if (activeFolder === 'spam') return thread.folder === 'spam';
    return thread.folder !== 'trash' && thread.folder !== 'spam';
  }

  if (activeLabelId) {
    return (
      thread.labels.includes(activeLabelId) &&
      thread.folder !== 'trash' &&
      thread.folder !== 'spam'
    );
  }

  switch (activeFolder) {
    case 'inbox':
      if (thread.folder !== 'inbox' || thread.isSnoozed) return false;
      if (showCategoryTabs) {
        return thread.category === activeCategory;
      }
      return true;
    case 'starred':
      return thread.isStarred && thread.folder !== 'trash' && thread.folder !== 'spam';
    case 'snoozed':
      return Boolean(thread.isSnoozed) && thread.folder !== 'trash';
    case 'important':
      return thread.isImportant && thread.folder !== 'trash' && thread.folder !== 'spam';
    case 'sent':
      return (
        thread.folder === 'sent' ||
        (thread.folder !== 'trash' &&
          thread.folder !== 'drafts' &&
          thread.folder !== 'scheduled' &&
          thread.messages.some(
            (m) => m.sender.email === 'alex.chen@argonlabs.io' && !m.isDraft
          ))
      );
    case 'scheduled':
      return thread.folder === 'scheduled';
    case 'drafts':
      return thread.folder === 'drafts' || thread.messages.some((m) => m.isDraft);
    case 'all':
      return thread.folder !== 'trash' && thread.folder !== 'spam';
    case 'spam':
      return thread.folder === 'spam';
    case 'trash':
      return thread.folder === 'trash';
    default:
      return true;
  }
}

export function matchesSearchAndFilters(
  thread: EmailThread,
  filter: AdvancedSearchFilter,
  labels: CustomLabel[]
): boolean {
  // Check explicit filter toggles
  if (filter.hasAttachment && !threadHasAttachments(thread)) return false;
  if (filter.onlyUnread && !thread.isUnread) return false;
  if (filter.onlyStarred && !thread.isStarred) return false;
  if (filter.labelId && !thread.labels.includes(filter.labelId)) return false;

  if (filter.from.trim()) {
    const q = filter.from.trim().toLowerCase();
    const matchFrom = thread.messages.some(
      (m) =>
        m.sender.name.toLowerCase().includes(q) ||
        m.sender.email.toLowerCase().includes(q)
    );
    if (!matchFrom) return false;
  }

  if (filter.to.trim()) {
    const q = filter.to.trim().toLowerCase();
    const matchTo = thread.messages.some((m) =>
      m.to.some(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      )
    );
    if (!matchTo) return false;
  }

  if (filter.subject.trim()) {
    const q = filter.subject.trim().toLowerCase();
    if (!thread.subject.toLowerCase().includes(q)) return false;
  }

  if (filter.dateRange !== 'any') {
    const refTime = new Date('2026-10-14T08:00:00Z').getTime();
    const threadTime = new Date(thread.lastActivityAt).getTime();
    const diffDays = (refTime - threadTime) / (1000 * 60 * 60 * 24);
    if (filter.dateRange === '1d' && diffDays > 1.5) return false;
    if (filter.dateRange === '7d' && diffDays > 7) return false;
    if (filter.dateRange === '30d' && diffDays > 30) return false;
  }

  const combinedText = [
    thread.subject,
    thread.snippet,
    ...thread.messages.map(
      (m) =>
        `${m.sender.name} ${m.sender.email} ${m.to
          .map((t) => `${t.name} ${t.email}`)
          .join(' ')} ${stripHtml(m.body)} ${(m.attachments || [])
          .map((a) => a.name)
          .join(' ')}`
    ),
  ]
    .join(' ')
    .toLowerCase();

  if (filter.hasWords.trim()) {
    const words = filter.hasWords.trim().toLowerCase().split(/\s+/);
    if (!words.every((w) => combinedText.includes(w))) return false;
  }

  if (filter.doesntHave.trim()) {
    const excluded = filter.doesntHave.trim().toLowerCase().split(/\s+/);
    if (excluded.some((w) => w && combinedText.includes(w))) return false;
  }

  // Parse inline query operators (from:, to:, subject:, is:, has:, label:, category:)
  const rawQuery = filter.query.trim();
  if (!rawQuery) return true;

  const tokens = rawQuery.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  for (const rawToken of tokens) {
    const token = rawToken.replace(/"/g, '');
    const lower = token.toLowerCase();

    if (lower.startsWith('from:')) {
      const val = lower.slice(5);
      if (
        val &&
        !thread.messages.some(
          (m) =>
            m.sender.name.toLowerCase().includes(val) ||
            m.sender.email.toLowerCase().includes(val)
        )
      ) {
        return false;
      }
    } else if (lower.startsWith('to:')) {
      const val = lower.slice(3);
      if (
        val &&
        !thread.messages.some((m) =>
          m.to.some(
            (r) =>
              r.name.toLowerCase().includes(val) ||
              r.email.toLowerCase().includes(val)
          )
        )
      ) {
        return false;
      }
    } else if (lower.startsWith('subject:')) {
      const val = lower.slice(8);
      if (val && !thread.subject.toLowerCase().includes(val)) return false;
    } else if (lower.startsWith('label:')) {
      const val = lower.slice(6);
      const matchingLabel = labels.find(
        (l) => l.id.toLowerCase() === val || l.name.toLowerCase().includes(val)
      );
      if (!matchingLabel || !thread.labels.includes(matchingLabel.id)) return false;
    } else if (lower.startsWith('category:')) {
      const val = lower.slice(9);
      if (val && thread.category !== val) return false;
    } else if (lower === 'has:attachment') {
      if (!threadHasAttachments(thread)) return false;
    } else if (lower === 'is:unread') {
      if (!thread.isUnread) return false;
    } else if (lower === 'is:read') {
      if (thread.isUnread) return false;
    } else if (lower === 'is:starred') {
      if (!thread.isStarred) return false;
    } else if (lower === 'is:important') {
      if (!thread.isImportant) return false;
    } else {
      if (!combinedText.includes(lower)) return false;
    }
  }

  return true;
}
