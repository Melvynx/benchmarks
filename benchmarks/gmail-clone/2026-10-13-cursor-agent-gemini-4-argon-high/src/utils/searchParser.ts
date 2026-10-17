import { CustomLabel, EmailThread, InboxCategory, SearchFilters, SystemFolder } from '../types/mail';

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  query: '',
  from: '',
  to: '',
  subject: '',
  hasWords: '',
  doesntHave: '',
  hasAttachment: false,
  isUnread: false,
  isStarred: false,
  dateRange: 'any',
  labelId: '',
};

export function hasActiveSearch(filters: SearchFilters): boolean {
  return Boolean(
    filters.query.trim() ||
      filters.from.trim() ||
      filters.to.trim() ||
      filters.subject.trim() ||
      filters.hasWords.trim() ||
      filters.doesntHave.trim() ||
      filters.hasAttachment ||
      filters.isUnread ||
      filters.isStarred ||
      filters.dateRange !== 'any' ||
      filters.labelId
  );
}

export function threadHasAttachments(thread: EmailThread): boolean {
  return thread.messages.some((m) => m.attachments && m.attachments.length > 0);
}

export function getThreadAllAttachments(thread: EmailThread) {
  return thread.messages.flatMap((m) => m.attachments || []);
}

export function filterThreads(
  threads: EmailThread[],
  activeFolder: SystemFolder,
  activeLabelId: string | null,
  activeCategory: InboxCategory,
  showCategoryTabs: boolean,
  filters: SearchFilters,
  labels: CustomLabel[]
): EmailThread[] {
  const searching = hasActiveSearch(filters);

  // Parse inline tokens from filters.query
  const rawQuery = filters.query.trim();
  const inlineTokens = rawQuery ? rawQuery.split(/\s+/) : [];
  const freeTextTerms: string[] = [];

  let inlineFrom = '';
  let inlineTo = '';
  let inlineSubject = '';
  let inlineLabel = '';
  let inlineCategory = '';
  let inlineInFolder = '';
  let inlineUnread: boolean | null = null;
  let inlineStarred: boolean | null = null;
  let inlineImportant: boolean | null = null;
  let inlineHasAttachment = false;

  for (const token of inlineTokens) {
    const lower = token.toLowerCase();
    if (lower.startsWith('from:')) {
      inlineFrom = lower.slice(5);
    } else if (lower.startsWith('to:')) {
      inlineTo = lower.slice(3);
    } else if (lower.startsWith('subject:')) {
      inlineSubject = lower.slice(8);
    } else if (lower.startsWith('label:')) {
      inlineLabel = lower.slice(6);
    } else if (lower.startsWith('category:')) {
      inlineCategory = lower.slice(9);
    } else if (lower.startsWith('in:')) {
      inlineInFolder = lower.slice(3);
    } else if (lower === 'is:unread') {
      inlineUnread = true;
    } else if (lower === 'is:read') {
      inlineUnread = false;
    } else if (lower === 'is:starred') {
      inlineStarred = true;
    } else if (lower === 'is:important') {
      inlineImportant = true;
    } else if (lower === 'has:attachment') {
      inlineHasAttachment = true;
    } else {
      freeTextTerms.push(lower);
    }
  }

  return threads.filter((thread) => {
    // 1. Folder / Label scoping when not searching globally
    if (inlineInFolder) {
      if (inlineInFolder === 'anywhere' || inlineInFolder === 'all') {
        // include everything
      } else if (inlineInFolder === 'starred') {
        if (!thread.isStarred || thread.folder === 'trash') return false;
      } else if (thread.folder !== inlineInFolder) {
        return false;
      }
    } else if (!searching) {
      if (activeLabelId) {
        if (thread.folder === 'trash' || thread.folder === 'spam') return false;
        if (!thread.labels.includes(activeLabelId)) return false;
      } else {
        switch (activeFolder) {
          case 'inbox':
            if (thread.folder !== 'inbox') return false;
            if (showCategoryTabs && thread.category !== activeCategory) return false;
            break;
          case 'starred':
            if (!thread.isStarred || thread.folder === 'trash' || thread.folder === 'spam') return false;
            break;
          case 'snoozed':
            if (thread.folder !== 'snoozed') return false;
            break;
          case 'important':
            if (!thread.isImportant || thread.folder === 'trash' || thread.folder === 'spam') return false;
            break;
          case 'sent':
            if (thread.folder !== 'sent') return false;
            break;
          case 'scheduled':
            if (thread.folder !== 'scheduled') return false;
            break;
          case 'drafts':
            if (thread.folder !== 'drafts') return false;
            break;
          case 'all':
            if (thread.folder === 'trash' || thread.folder === 'spam') return false;
            break;
          case 'spam':
            if (thread.folder !== 'spam') return false;
            break;
          case 'trash':
            if (thread.folder !== 'trash') return false;
            break;
        }
      }
    } else {
      // When searching without explicit `in:trash` or `in:spam`, exclude trash/spam unless currently in trash/spam
      if (activeFolder !== 'trash' && activeFolder !== 'spam') {
        if (thread.folder === 'trash' || thread.folder === 'spam') return false;
      }
    }

    // 2. Structured + inline filters
    const fromFilter = (filters.from || inlineFrom).toLowerCase().trim();
    if (fromFilter) {
      const matchesSender = thread.messages.some(
        (m) =>
          m.sender.name.toLowerCase().includes(fromFilter) ||
          m.sender.email.toLowerCase().includes(fromFilter)
      );
      if (!matchesSender) return false;
    }

    const toFilter = (filters.to || inlineTo).toLowerCase().trim();
    if (toFilter) {
      const matchesTo = thread.messages.some((m) =>
        [...m.to, ...(m.cc || [])].some(
          (r) => r.name.toLowerCase().includes(toFilter) || r.email.toLowerCase().includes(toFilter)
        )
      );
      if (!matchesTo) return false;
    }

    const subjectFilter = (filters.subject || inlineSubject).toLowerCase().trim();
    if (subjectFilter && !thread.subject.toLowerCase().includes(subjectFilter)) {
      return false;
    }

    if (filters.hasAttachment || inlineHasAttachment) {
      if (!threadHasAttachments(thread)) return false;
    }

    if (filters.isUnread || inlineUnread === true) {
      if (!thread.isUnread) return false;
    } else if (inlineUnread === false) {
      if (thread.isUnread) return false;
    }

    if (filters.isStarred || inlineStarred === true) {
      if (!thread.isStarred) return false;
    }

    if (inlineImportant === true && !thread.isImportant) {
      return false;
    }

    if (inlineCategory && thread.category !== inlineCategory) {
      return false;
    }

    if (filters.labelId) {
      if (!thread.labels.includes(filters.labelId)) return false;
    }

    if (inlineLabel) {
      const matchedLbl = labels.find(
        (l) => l.name.toLowerCase().includes(inlineLabel) || l.id.toLowerCase() === inlineLabel
      );
      if (!matchedLbl || !thread.labels.includes(matchedLbl.id)) return false;
    }

    if (filters.dateRange !== 'any') {
      const refNow = new Date('2026-10-14T12:00:00Z').getTime();
      const threadTime = new Date(thread.lastActivityIso).getTime();
      const diffDays = (refNow - threadTime) / (1000 * 60 * 60 * 24);
      if (filters.dateRange === '1d' && diffDays > 1.5) return false;
      if (filters.dateRange === '7d' && diffDays > 7) return false;
      if (filters.dateRange === '30d' && diffDays > 30) return false;
    }

    // Build searchable corpus for free text
    const threadLabelNames = thread.labels
      .map((id) => labels.find((l) => l.id === id)?.name || '')
      .join(' ');
    const corpus = [
      thread.subject,
      threadLabelNames,
      ...thread.messages.flatMap((m) => [
        m.sender.name,
        m.sender.email,
        m.snippet,
        m.body.replace(/<[^>]+>/g, ' '),
        ...(m.attachments || []).map((a) => a.name),
      ]),
    ]
      .join(' ')
      .toLowerCase();

    for (const term of freeTextTerms) {
      if (!corpus.includes(term)) return false;
    }

    if (filters.hasWords.trim()) {
      const words = filters.hasWords.toLowerCase().trim().split(/\s+/);
      if (!words.every((w) => corpus.includes(w))) return false;
    }

    if (filters.doesntHave.trim()) {
      const excluded = filters.doesntHave.toLowerCase().trim().split(/\s+/);
      if (excluded.some((w) => corpus.includes(w))) return false;
    }

    return true;
  });
}
