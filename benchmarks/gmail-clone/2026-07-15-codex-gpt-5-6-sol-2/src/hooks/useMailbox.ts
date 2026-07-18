import { useEffect, useReducer } from 'react';

import { CURRENT_USER, seedThreads } from '../data/seedMailbox';
import { SYSTEM_LABELS } from '../domain/mail';
import type {
  ComposeDraft,
  Contact,
  MailCategory,
  MailMessage,
  MailboxId,
  MailThread,
  StoredFolder,
  ToastState,
} from '../domain/mail';

const STORAGE_KEY = 'gpt-5-6-sol-mailbox-v1';
const PERSISTENCE_VERSION = 1;
const TOAST_DURATION_MS = 4_500;
const UNDO_TOAST_DURATION_MS = 7_000;
const MAX_TIMEOUT_MS = 2_147_483_647;
const DEFAULT_CATEGORY: MailCategory = 'primary';

const MAILBOX_IDS = [
  'inbox',
  'starred',
  'snoozed',
  'sent',
  'drafts',
  'archive',
  'trash',
] as const satisfies readonly MailboxId[];

const STORED_FOLDERS = [
  'inbox',
  'sent',
  'drafts',
  'archive',
  'trash',
] as const satisfies readonly StoredFolder[];

const MAIL_CATEGORIES = [
  'primary',
  'promotions',
  'social',
  'updates',
] as const satisfies readonly MailCategory[];

const CONTACT_COLORS = [
  '#1a73e8',
  '#188038',
  '#a142f4',
  '#c5221f',
  '#b06000',
  '#007b83',
] as const;

export type MailCategoryFilter = MailCategory | 'all';
export type ThreadTarget = string | readonly string[];
export type PersistenceStatus = 'ready' | 'corrupt' | 'unavailable';

export type ComposeDraftPatch = Partial<
  Pick<
    ComposeDraft,
    'replyToThreadId' | 'to' | 'cc' | 'bcc' | 'subject' | 'body' | 'attachments'
  >
>;

export interface CloseComposeOptions {
  discard?: boolean;
}

export type SendMessageResult =
  | { sent: true; threadId: string }
  | { sent: false; reason: 'no-draft' | 'missing-recipient' };

export interface MailboxCountSummary {
  mailboxes: Record<MailboxId, number>;
  unread: Record<MailboxId, number>;
  categories: Record<MailCategory, number>;
  categoryUnread: Record<MailCategory, number>;
}

interface PersistedMailbox {
  version: number;
  threads: MailThread[];
  currentMailbox: MailboxId;
  currentCategory: MailCategoryFilter;
  composeDraft: ComposeDraft | null;
  previousFolders: Record<string, StoredFolder>;
}

interface UndoSnapshot {
  threads: MailThread[];
  selectedThreadIds: string[];
  activeThreadId: string | null;
  composeDraft: ComposeDraft | null;
  previousFolders: Record<string, StoredFolder>;
}

interface MailboxState {
  threads: MailThread[];
  currentMailbox: MailboxId;
  currentCategory: MailCategoryFilter;
  searchQuery: string;
  selectedThreadIds: string[];
  activeThreadId: string | null;
  composeDraft: ComposeDraft | null;
  previousFolders: Record<string, StoredFolder>;
  toast: ToastState | null;
  undo: UndoSnapshot | null;
  toastSequence: number;
  persistenceStatus: PersistenceStatus;
}

type MailboxAction =
  | { type: 'set-mailbox'; mailbox: MailboxId }
  | { type: 'set-category'; category: MailCategoryFilter }
  | { type: 'set-search'; query: string }
  | { type: 'set-selection'; ids: string[] }
  | { type: 'toggle-selection'; id: string }
  | { type: 'open-thread'; id: string }
  | { type: 'close-thread' }
  | { type: 'mark-read'; ids: string[]; isRead: boolean }
  | { type: 'toggle-read'; id: string }
  | { type: 'toggle-star'; id: string }
  | { type: 'archive'; ids: string[] }
  | { type: 'move-to-trash'; ids: string[] }
  | { type: 'restore'; ids: string[] }
  | { type: 'delete-permanently'; ids: string[] }
  | { type: 'toggle-label'; ids: string[]; label: string }
  | { type: 'snooze'; ids: string[]; until: string }
  | { type: 'unsnooze'; ids: string[] }
  | { type: 'wake-snoozed'; now: string }
  | { type: 'start-compose'; draft: ComposeDraft }
  | { type: 'open-draft'; draft: ComposeDraft }
  | { type: 'update-compose'; patch: ComposeDraftPatch; updatedAt: string }
  | { type: 'minimize-compose'; isMinimized: boolean; updatedAt: string }
  | { type: 'close-compose' }
  | { type: 'discard-compose' }
  | {
      type: 'send-message';
      draftId: string;
      thread: MailThread;
      replyToThreadId?: string;
    }
  | { type: 'show-toast'; message: string }
  | { type: 'dismiss-toast'; id: number }
  | { type: 'undo' }
  | { type: 'set-persistence-status'; status: PersistenceStatus };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isMailboxId(value: unknown): value is MailboxId {
  return isString(value) && MAILBOX_IDS.some((mailbox) => mailbox === value);
}

function isStoredFolder(value: unknown): value is StoredFolder {
  return isString(value) && STORED_FOLDERS.some((folder) => folder === value);
}

function isMailCategory(value: unknown): value is MailCategory {
  return (
    isString(value) && MAIL_CATEGORIES.some((category) => category === value)
  );
}

function isCategoryFilter(value: unknown): value is MailCategoryFilter {
  return value === 'all' || isMailCategory(value);
}

function isContact(value: unknown): value is Contact {
  if (!isRecord(value)) return false;

  return (
    isString(value.name) &&
    isString(value.email) &&
    isString(value.avatar) &&
    isString(value.color)
  );
}

function isAttachment(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const kinds = ['pdf', 'image', 'document', 'sheet', 'archive'] as const;
  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.size) &&
    isString(value.kind) &&
    kinds.some((kind) => kind === value.kind) &&
    isString(value.accent)
  );
}

function isMailMessage(value: unknown): value is MailMessage {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    isContact(value.sender) &&
    Array.isArray(value.recipients) &&
    value.recipients.every(isContact) &&
    isString(value.timestamp) &&
    Array.isArray(value.body) &&
    value.body.every(isString) &&
    Array.isArray(value.attachments) &&
    value.attachments.every(isAttachment)
  );
}

function isComposeDraft(value: unknown): value is ComposeDraft {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    (value.replyToThreadId === undefined || isString(value.replyToThreadId)) &&
    isString(value.to) &&
    isString(value.cc) &&
    isString(value.bcc) &&
    isString(value.subject) &&
    isString(value.body) &&
    Array.isArray(value.attachments) &&
    value.attachments.every(isAttachment) &&
    typeof value.isMinimized === 'boolean' &&
    isString(value.updatedAt)
  );
}

function isMailThread(value: unknown): value is MailThread {
  if (!isRecord(value)) return false;

  const hasValidSnooze =
    value.snoozedUntil === undefined || isString(value.snoozedUntil);
  const hasValidDraft = value.draft === undefined || isComposeDraft(value.draft);

  return (
    isString(value.id) &&
    isString(value.subject) &&
    isString(value.snippet) &&
    Array.isArray(value.participants) &&
    value.participants.every(isContact) &&
    Array.isArray(value.messages) &&
    value.messages.every(isMailMessage) &&
    isStoredFolder(value.folder) &&
    isMailCategory(value.category) &&
    Array.isArray(value.labels) &&
    value.labels.every(isString) &&
    typeof value.isRead === 'boolean' &&
    typeof value.isStarred === 'boolean' &&
    typeof value.isImportant === 'boolean' &&
    hasValidSnooze &&
    hasValidDraft
  );
}

function isPreviousFolders(
  value: unknown,
): value is Record<string, StoredFolder> {
  if (!isRecord(value)) return false;

  return Object.values(value).every(isStoredFolder);
}

function parsePersistedMailbox(value: string): PersistedMailbox | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== PERSISTENCE_VERSION) return null;
  if (!Array.isArray(parsed.threads) || !parsed.threads.every(isMailThread)) {
    return null;
  }
  if (!isMailboxId(parsed.currentMailbox)) return null;
  if (!isCategoryFilter(parsed.currentCategory)) return null;
  if (parsed.composeDraft !== null && !isComposeDraft(parsed.composeDraft)) {
    return null;
  }
  if (!isPreviousFolders(parsed.previousFolders)) return null;

  return {
    version: PERSISTENCE_VERSION,
    threads: parsed.threads,
    currentMailbox: parsed.currentMailbox,
    currentCategory: parsed.currentCategory,
    composeDraft: parsed.composeDraft,
    previousFolders: parsed.previousFolders,
  };
}

function cloneThread(thread: MailThread): MailThread {
  return {
    ...thread,
    participants: thread.participants.map((contact) => ({ ...contact })),
    messages: thread.messages.map((message) => ({
      ...message,
      sender: { ...message.sender },
      recipients: message.recipients.map((contact) => ({ ...contact })),
      body: [...message.body],
      attachments: message.attachments.map((attachment) => ({ ...attachment })),
    })),
    labels: [...thread.labels],
    draft: thread.draft ? { ...thread.draft } : undefined,
  };
}

function readInitialState(): MailboxState {
  const fallbackThreads = seedThreads.map(cloneThread);
  const baseState: MailboxState = {
    threads: fallbackThreads,
    currentMailbox: 'inbox',
    currentCategory: DEFAULT_CATEGORY,
    searchQuery: '',
    selectedThreadIds: [],
    activeThreadId: null,
    composeDraft: null,
    previousFolders: {},
    toast: null,
    undo: null,
    toastSequence: 0,
    persistenceStatus: 'ready',
  };

  if (typeof window === 'undefined') {
    return { ...baseState, persistenceStatus: 'unavailable' };
  }

  let storedValue: string | null;
  try {
    storedValue = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { ...baseState, persistenceStatus: 'unavailable' };
  }

  if (storedValue === null) return baseState;

  const persisted = parsePersistedMailbox(storedValue);
  if (!persisted) return { ...baseState, persistenceStatus: 'corrupt' };

  return {
    ...baseState,
    threads: persisted.threads.map(cloneThread),
    currentMailbox: persisted.currentMailbox,
    currentCategory: persisted.currentCategory,
    composeDraft: persisted.composeDraft
      ? { ...persisted.composeDraft }
      : null,
    previousFolders: { ...persisted.previousFolders },
  };
}

function createToast(
  state: MailboxState,
  message: string,
  canUndo = false,
): Pick<MailboxState, 'toast' | 'toastSequence'> {
  const toastSequence = state.toastSequence + 1;
  const toast: ToastState = canUndo
    ? { id: toastSequence, message, actionLabel: 'Undo', action: 'undo' }
    : { id: toastSequence, message };

  return { toast, toastSequence };
}

function snapshotState(state: MailboxState): UndoSnapshot {
  return {
    threads: state.threads,
    selectedThreadIds: state.selectedThreadIds,
    activeThreadId: state.activeThreadId,
    composeDraft: state.composeDraft,
    previousFolders: state.previousFolders,
  };
}

function withUndo(
  state: MailboxState,
  patch: Partial<UndoSnapshot>,
  message: string,
): MailboxState {
  return {
    ...state,
    ...patch,
    ...createToast(state, message, true),
    undo: snapshotState(state),
  };
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

function withoutIds(values: readonly string[], ids: readonly string[]): string[] {
  const excluded = new Set(ids);
  return values.filter((value) => !excluded.has(value));
}

function closeActiveIfAffected(
  activeThreadId: string | null,
  ids: readonly string[],
): string | null {
  if (!activeThreadId) return null;
  return ids.includes(activeThreadId) ? null : activeThreadId;
}

function updateThreads(
  threads: readonly MailThread[],
  ids: readonly string[],
  update: (thread: MailThread) => MailThread,
): MailThread[] {
  const selected = new Set(ids);
  return threads.map((thread) =>
    selected.has(thread.id) ? update(thread) : thread,
  );
}

function formatConversationCount(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function archiveThreads(
  state: MailboxState,
  requestedIds: readonly string[],
): MailboxState {
  const eligibleIds = state.threads
    .filter(
      (thread) =>
        requestedIds.includes(thread.id) &&
        thread.folder !== 'drafts' &&
        thread.folder !== 'sent' &&
        thread.folder !== 'trash',
    )
    .map((thread) => thread.id);

  if (eligibleIds.length === 0) return state;

  const threads = updateThreads(state.threads, eligibleIds, (thread) => ({
    ...thread,
    folder: 'archive',
    snoozedUntil: undefined,
  }));
  const message = `${formatConversationCount(eligibleIds.length, 'conversation')} archived`;

  return withUndo(
    state,
    {
      threads,
      selectedThreadIds: withoutIds(state.selectedThreadIds, eligibleIds),
      activeThreadId: closeActiveIfAffected(state.activeThreadId, eligibleIds),
    },
    message,
  );
}

function trashThreads(
  state: MailboxState,
  requestedIds: readonly string[],
): MailboxState {
  const eligibleThreads = state.threads.filter(
    (thread) =>
      requestedIds.includes(thread.id) && thread.folder !== 'trash',
  );
  if (eligibleThreads.length === 0) return state;

  const eligibleIds = eligibleThreads.map((thread) => thread.id);
  const previousFolders = { ...state.previousFolders };
  eligibleThreads.forEach((thread) => {
    previousFolders[thread.id] = thread.folder;
  });
  const threads = updateThreads(state.threads, eligibleIds, (thread) => ({
    ...thread,
    folder: 'trash',
    snoozedUntil: undefined,
  }));
  const composeDraft =
    state.composeDraft && eligibleIds.includes(state.composeDraft.id)
      ? null
      : state.composeDraft;

  return withUndo(
    state,
    {
      threads,
      previousFolders,
      composeDraft,
      selectedThreadIds: withoutIds(state.selectedThreadIds, eligibleIds),
      activeThreadId: closeActiveIfAffected(state.activeThreadId, eligibleIds),
    },
    'Moved to Trash',
  );
}

function restoreThreads(
  state: MailboxState,
  requestedIds: readonly string[],
): MailboxState {
  const eligibleThreads = state.threads.filter(
    (thread) => requestedIds.includes(thread.id) && thread.folder === 'trash',
  );
  if (eligibleThreads.length === 0) return state;

  const eligibleIds = eligibleThreads.map((thread) => thread.id);
  const threads = updateThreads(state.threads, eligibleIds, (thread) => ({
    ...thread,
    folder:
      state.previousFolders[thread.id] ??
      (thread.draft ? 'drafts' : ('inbox' satisfies StoredFolder)),
  }));
  const restoredIds = new Set(eligibleIds);
  const previousFolders = Object.fromEntries(
    Object.entries(state.previousFolders).filter(([id]) => !restoredIds.has(id)),
  );

  return withUndo(
    state,
    {
      threads,
      previousFolders,
      selectedThreadIds: withoutIds(state.selectedThreadIds, eligibleIds),
      activeThreadId: closeActiveIfAffected(state.activeThreadId, eligibleIds),
    },
    'Restored from Trash',
  );
}

function permanentlyDeleteThreads(
  state: MailboxState,
  requestedIds: readonly string[],
): MailboxState {
  const eligibleIds = state.threads
    .filter(
      (thread) =>
        requestedIds.includes(thread.id) && thread.folder === 'trash',
    )
    .map((thread) => thread.id);
  if (eligibleIds.length === 0) return state;

  const deleted = new Set(eligibleIds);
  const threads = state.threads.filter((thread) => !deleted.has(thread.id));
  const previousFolders = Object.fromEntries(
    Object.entries(state.previousFolders).filter(([id]) => !deleted.has(id)),
  );
  const composeDraft =
    state.composeDraft && deleted.has(state.composeDraft.id)
      ? null
      : state.composeDraft;

  return withUndo(
    state,
    {
      threads,
      previousFolders,
      composeDraft,
      selectedThreadIds: withoutIds(state.selectedThreadIds, eligibleIds),
      activeThreadId: closeActiveIfAffected(state.activeThreadId, eligibleIds),
    },
    'Deleted permanently',
  );
}

function toggleThreadsLabel(
  state: MailboxState,
  requestedIds: readonly string[],
  label: string,
): MailboxState {
  const eligibleThreads = state.threads.filter((thread) =>
    requestedIds.includes(thread.id),
  );
  if (eligibleThreads.length === 0) return state;

  const shouldRemove = eligibleThreads.every((thread) =>
    thread.labels.includes(label),
  );
  const eligibleIds = eligibleThreads.map((thread) => thread.id);
  const threads = updateThreads(state.threads, eligibleIds, (thread) => ({
    ...thread,
    labels: shouldRemove
      ? thread.labels.filter((value) => value !== label)
      : [...new Set([...thread.labels, label])],
  }));
  const message = shouldRemove
    ? `Label “${label}” removed`
    : `Label “${label}” applied`;

  return withUndo(state, { threads }, message);
}

function snoozeThreads(
  state: MailboxState,
  requestedIds: readonly string[],
  until: string,
): MailboxState {
  const eligibleIds = state.threads
    .filter(
      (thread) =>
        requestedIds.includes(thread.id) &&
        thread.folder !== 'drafts' &&
        thread.folder !== 'sent' &&
        thread.folder !== 'trash',
    )
    .map((thread) => thread.id);
  if (eligibleIds.length === 0) return state;

  const threads = updateThreads(state.threads, eligibleIds, (thread) => ({
    ...thread,
    snoozedUntil: until,
  }));

  return withUndo(
    state,
    {
      threads,
      selectedThreadIds: withoutIds(state.selectedThreadIds, eligibleIds),
      activeThreadId: closeActiveIfAffected(state.activeThreadId, eligibleIds),
    },
    `Snoozed until ${formatSnoozeTime(until)}`,
  );
}

function unsnoozeThreads(
  state: MailboxState,
  requestedIds: readonly string[],
): MailboxState {
  const eligibleIds = state.threads
    .filter(
      (thread) =>
        requestedIds.includes(thread.id) && thread.snoozedUntil !== undefined,
    )
    .map((thread) => thread.id);
  if (eligibleIds.length === 0) return state;

  const threads = updateThreads(state.threads, eligibleIds, (thread) => ({
    ...thread,
    snoozedUntil: undefined,
  }));

  return withUndo(
    state,
    {
      threads,
      selectedThreadIds: withoutIds(state.selectedThreadIds, eligibleIds),
    },
    'Snooze removed',
  );
}

function splitBodyIntoParagraphs(body: string): string[] {
  if (!body.trim()) return [''];
  return body.split(/\n\s*\n/).map((paragraph) => paragraph.trim());
}

function draftSnippet(draft: ComposeDraft): string {
  const snippet = draft.body.replace(/\s+/g, ' ').trim();
  if (!snippet) return 'Draft';
  return snippet.length > 150 ? `${snippet.slice(0, 147)}…` : snippet;
}

function hasMeaningfulDraft(draft: ComposeDraft): boolean {
  return (
    draft.attachments.length > 0 ||
    [draft.to, draft.cc, draft.bcc, draft.subject, draft.body].some(
      (value) => value.trim().length > 0,
    )
  );
}

function draftToThread(draft: ComposeDraft): MailThread {
  const recipients = parseRecipients([draft.to, draft.cc, draft.bcc].join(','));

  return {
    id: draft.id,
    subject: draft.subject.trim() || '(no subject)',
    snippet: draftSnippet(draft),
    participants: recipients.length > 0 ? recipients : [CURRENT_USER],
    messages: [
      {
        id: `${draft.id}-message`,
        sender: CURRENT_USER,
        recipients,
        timestamp: draft.updatedAt,
        body: splitBodyIntoParagraphs(draft.body),
        attachments: draft.attachments,
      },
    ],
    folder: 'drafts',
    category: 'primary',
    labels: [],
    isRead: true,
    isStarred: false,
    isImportant: false,
    draft,
  };
}

function syncDraftThread(
  threads: readonly MailThread[],
  draft: ComposeDraft,
): MailThread[] {
  const existingIndex = threads.findIndex((thread) => thread.id === draft.id);
  if (existingIndex < 0 && !hasMeaningfulDraft(draft)) return [...threads];

  const draftThread = draftToThread(draft);
  if (existingIndex < 0) return [draftThread, ...threads];

  return threads.map((thread) =>
    thread.id === draft.id
      ? {
          ...draftThread,
          labels: thread.labels,
          isStarred: thread.isStarred,
          isImportant: thread.isImportant,
        }
      : thread,
  );
}

function mailboxReducer(
  state: MailboxState,
  action: MailboxAction,
): MailboxState {
  const preservesPendingUndo =
    action.type === 'undo' ||
    action.type === 'set-persistence-status';

  if (state.undo && !preservesPendingUndo) {
    state = {
      ...state,
      undo: null,
      toast: state.toast?.action === 'undo' ? null : state.toast,
    };
  }

  switch (action.type) {
    case 'set-mailbox':
      return {
        ...state,
        currentMailbox: action.mailbox,
        searchQuery: '',
        selectedThreadIds: [],
        activeThreadId: null,
      };

    case 'set-category':
      return {
        ...state,
        currentMailbox: 'inbox',
        currentCategory: action.category,
        searchQuery: '',
        selectedThreadIds: [],
        activeThreadId: null,
      };

    case 'set-search':
      return {
        ...state,
        searchQuery: action.query,
        selectedThreadIds: [],
        activeThreadId: null,
      };

    case 'set-selection':
      return { ...state, selectedThreadIds: uniqueIds(action.ids) };

    case 'toggle-selection': {
      const isSelected = state.selectedThreadIds.includes(action.id);
      return {
        ...state,
        selectedThreadIds: isSelected
          ? state.selectedThreadIds.filter((id) => id !== action.id)
          : [...state.selectedThreadIds, action.id],
      };
    }

    case 'open-thread':
      return {
        ...state,
        threads: updateThreads(state.threads, [action.id], (thread) => ({
          ...thread,
          isRead: true,
        })),
        activeThreadId: action.id,
        selectedThreadIds: [],
      };

    case 'close-thread':
      return { ...state, activeThreadId: null };

    case 'mark-read':
      return {
        ...state,
        threads: updateThreads(state.threads, action.ids, (thread) => ({
          ...thread,
          isRead: action.isRead,
        })),
      };

    case 'toggle-read':
      return {
        ...state,
        threads: updateThreads(state.threads, [action.id], (thread) => ({
          ...thread,
          isRead: !thread.isRead,
        })),
      };

    case 'toggle-star':
      return {
        ...state,
        threads: updateThreads(state.threads, [action.id], (thread) => ({
          ...thread,
          isStarred: !thread.isStarred,
        })),
      };

    case 'archive':
      return archiveThreads(state, action.ids);

    case 'move-to-trash':
      return trashThreads(state, action.ids);

    case 'restore':
      return restoreThreads(state, action.ids);

    case 'delete-permanently':
      return permanentlyDeleteThreads(state, action.ids);

    case 'toggle-label':
      return toggleThreadsLabel(state, action.ids, action.label);

    case 'snooze':
      return snoozeThreads(state, action.ids, action.until);

    case 'unsnooze':
      return unsnoozeThreads(state, action.ids);

    case 'wake-snoozed': {
      const now = Date.parse(action.now);
      let hasWokenThread = false;
      const threads = state.threads.map((thread) => {
        if (!thread.snoozedUntil) return thread;
        if (Date.parse(thread.snoozedUntil) > now) return thread;
        hasWokenThread = true;
        return { ...thread, snoozedUntil: undefined };
      });
      return hasWokenThread ? { ...state, threads } : state;
    }

    case 'start-compose':
      return {
        ...state,
        threads: state.composeDraft
          ? syncDraftThread(state.threads, state.composeDraft)
          : state.threads,
        composeDraft: action.draft,
        activeThreadId: null,
        selectedThreadIds: [],
      };

    case 'open-draft': {
      const composeDraft = { ...action.draft, isMinimized: false };
      const threadsWithCurrentDraft = state.composeDraft
        ? syncDraftThread(state.threads, state.composeDraft)
        : state.threads;
      return {
        ...state,
        composeDraft,
        threads: syncDraftThread(threadsWithCurrentDraft, composeDraft),
        activeThreadId: null,
        selectedThreadIds: [],
      };
    }

    case 'update-compose': {
      if (!state.composeDraft) return state;
      const composeDraft: ComposeDraft = {
        ...state.composeDraft,
        ...action.patch,
        updatedAt: action.updatedAt,
      };
      return {
        ...state,
        composeDraft,
        threads: syncDraftThread(state.threads, composeDraft),
      };
    }

    case 'minimize-compose': {
      if (!state.composeDraft) return state;
      const composeDraft: ComposeDraft = {
        ...state.composeDraft,
        isMinimized: action.isMinimized,
        updatedAt: action.updatedAt,
      };
      return {
        ...state,
        composeDraft,
        threads: syncDraftThread(state.threads, composeDraft),
      };
    }

    case 'close-compose': {
      if (!state.composeDraft) return state;
      const threads = hasMeaningfulDraft(state.composeDraft)
        ? syncDraftThread(state.threads, state.composeDraft)
        : state.threads.filter((thread) => thread.id !== state.composeDraft?.id);
      return { ...state, threads, composeDraft: null };
    }

    case 'discard-compose': {
      if (!state.composeDraft) return state;
      const draftId = state.composeDraft.id;
      const hasStoredDraft = state.threads.some((thread) => thread.id === draftId);
      if (!hasStoredDraft && !hasMeaningfulDraft(state.composeDraft)) {
        return { ...state, composeDraft: null };
      }
      return withUndo(
        state,
        {
          threads: state.threads.filter((thread) => thread.id !== draftId),
          composeDraft: null,
        },
        'Draft discarded',
      );
    }

    case 'send-message': {
      const threadsWithoutDraft = state.threads.filter(
        (thread) => thread.id !== action.draftId,
      );
      const replyTarget = action.replyToThreadId
        ? threadsWithoutDraft.find((thread) => thread.id === action.replyToThreadId)
        : undefined;
      const sentMessage = action.thread.messages[0];
      const threads = replyTarget && sentMessage
        ? threadsWithoutDraft.map((thread) => {
            if (thread.id !== replyTarget.id) return thread;

            const contacts = [...thread.participants, ...action.thread.participants];
            const participants = contacts.filter(
              (contact, index) =>
                contacts.findIndex(
                  (candidate) => normalize(candidate.email) === normalize(contact.email),
                ) === index,
            );

            return {
              ...thread,
              participants,
              messages: [...thread.messages, sentMessage],
              snippet: action.thread.snippet,
              isRead: true,
            };
          })
        : [action.thread, ...threadsWithoutDraft];

      return withUndo(
        state,
        {
          threads,
          composeDraft: null,
          selectedThreadIds: [],
          activeThreadId: null,
        },
        'Message sent',
      );
    }

    case 'show-toast':
      return { ...state, ...createToast(state, action.message) };

    case 'dismiss-toast':
      return state.toast?.id === action.id ? { ...state, toast: null } : state;

    case 'undo':
      if (!state.undo) return state;
      return {
        ...state,
        ...state.undo,
        ...createToast(state, 'Action undone'),
        undo: null,
      };

    case 'set-persistence-status':
      return { ...state, persistenceStatus: action.status };

    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKD');
}

function searchableContacts(contacts: readonly Contact[]): string {
  return contacts.map((contact) => `${contact.name} ${contact.email}`).join(' ');
}

function threadSearchText(thread: MailThread): string {
  const messageText = thread.messages
    .map((message) =>
      [
        message.sender.name,
        message.sender.email,
        searchableContacts(message.recipients),
        message.body.join(' '),
        message.attachments.map((attachment) => attachment.name).join(' '),
      ].join(' '),
    )
    .join(' ');

  return normalize(
    [
      thread.subject,
      thread.snippet,
      thread.labels.join(' '),
      searchableContacts(thread.participants),
      messageText,
    ].join(' '),
  );
}

function tokenizeSearch(query: string): string[] {
  return query.match(/(?:[^\s"]+:"[^"]*"|"[^"]*"|\S+)/g) ?? [];
}

function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function isActivelySnoozed(thread: MailThread, now: number): boolean {
  if (!thread.snoozedUntil) return false;
  const snoozedUntil = Date.parse(thread.snoozedUntil);
  return Number.isFinite(snoozedUntil) && snoozedUntil > now;
}

function matchesSearchOperator(
  thread: MailThread,
  field: string,
  rawValue: string,
  now: number,
): boolean | null {
  const value = normalize(unquote(rawValue));

  switch (field) {
    case 'from': {
      const senders = thread.messages.map((message) => message.sender);
      return normalize(searchableContacts(senders)).includes(value);
    }
    case 'to': {
      const recipients = thread.messages.flatMap((message) => message.recipients);
      return normalize(searchableContacts(recipients)).includes(value);
    }
    case 'subject':
      return normalize(thread.subject).includes(value);
    case 'label':
      return thread.labels.some((label) => normalize(label) === value);
    case 'has':
      return value === 'attachment'
        ? thread.messages.some((message) => message.attachments.length > 0)
        : null;
    case 'is':
      if (value === 'read') return thread.isRead;
      if (value === 'unread') return !thread.isRead;
      if (value === 'starred') return thread.isStarred;
      if (value === 'important') return thread.isImportant;
      if (value === 'snoozed') return isActivelySnoozed(thread, now);
      return null;
    case 'in':
      if (value === 'anywhere') return true;
      if (value === 'starred') return thread.isStarred;
      if (value === 'snoozed') return isActivelySnoozed(thread, now);
      if (value === 'sent') return matchesMailbox(thread, 'sent', now);
      return isStoredFolder(value) ? thread.folder === value : null;
    default:
      return null;
  }
}

function matchesSearch(thread: MailThread, query: string, now: number): boolean {
  const searchableText = threadSearchText(thread);

  return tokenizeSearch(query).every((rawToken) => {
    const separatorIndex = rawToken.indexOf(':');
    if (separatorIndex > 0) {
      const field = normalize(rawToken.slice(0, separatorIndex));
      const value = rawToken.slice(separatorIndex + 1);
      const operatorResult = matchesSearchOperator(thread, field, value, now);
      if (operatorResult !== null) return operatorResult;
    }

    return searchableText.includes(normalize(unquote(rawToken)));
  });
}

function searchIncludesTrash(query: string): boolean {
  return tokenizeSearch(query).some((token) => {
    const normalizedToken = normalize(token);
    return normalizedToken === 'in:trash' || normalizedToken === 'in:anywhere';
  });
}

function matchesMailbox(
  thread: MailThread,
  mailbox: MailboxId,
  now: number,
): boolean {
  const isSnoozed = isActivelySnoozed(thread, now);

  if (mailbox === 'starred') {
    return thread.folder !== 'trash' && thread.isStarred;
  }
  if (mailbox === 'snoozed') {
    return thread.folder !== 'trash' && isSnoozed;
  }
  if (mailbox === 'sent') {
    return (
      thread.folder !== 'trash' &&
      thread.folder !== 'drafts' &&
      thread.messages.some(
        (message) => normalize(message.sender.email) === normalize(CURRENT_USER.email),
      )
    );
  }
  if (mailbox === 'inbox' || mailbox === 'archive') {
    return thread.folder === mailbox && !isSnoozed;
  }
  return thread.folder === mailbox;
}

function latestThreadTime(thread: MailThread): number {
  const timestamp = thread.draft?.updatedAt ?? thread.messages.at(-1)?.timestamp;
  if (!timestamp) return 0;

  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveVisibleThreads(
  state: MailboxState,
  now: number,
): MailThread[] {
  const query = state.searchQuery.trim();
  const filtered = query
    ? state.threads.filter((thread) => {
        const canSearchTrash = searchIncludesTrash(query);
        if (thread.folder === 'trash' && !canSearchTrash) return false;
        return matchesSearch(thread, query, now);
      })
    : state.threads.filter((thread) => {
        if (!matchesMailbox(thread, state.currentMailbox, now)) return false;
        if (state.currentMailbox !== 'inbox') return true;
        if (state.currentCategory === 'all') return true;
        return thread.category === state.currentCategory;
      });

  return [...filtered].sort(
    (first, second) => latestThreadTime(second) - latestThreadTime(first),
  );
}

function countThreads(
  threads: readonly MailThread[],
  predicate: (thread: MailThread) => boolean,
): number {
  return threads.reduce(
    (count, thread) => count + (predicate(thread) ? 1 : 0),
    0,
  );
}

function deriveCounts(
  threads: readonly MailThread[],
  now: number,
): MailboxCountSummary {
  const mailboxes = Object.fromEntries(
    MAILBOX_IDS.map((mailbox) => [
      mailbox,
      countThreads(threads, (thread) => matchesMailbox(thread, mailbox, now)),
    ]),
  ) as Record<MailboxId, number>;

  const unread = Object.fromEntries(
    MAILBOX_IDS.map((mailbox) => [
      mailbox,
      countThreads(
        threads,
        (thread) => !thread.isRead && matchesMailbox(thread, mailbox, now),
      ),
    ]),
  ) as Record<MailboxId, number>;

  const categories = Object.fromEntries(
    MAIL_CATEGORIES.map((category) => [
      category,
      countThreads(
        threads,
        (thread) =>
          thread.folder === 'inbox' &&
          !isActivelySnoozed(thread, now) &&
          thread.category === category,
      ),
    ]),
  ) as Record<MailCategory, number>;

  const categoryUnread = Object.fromEntries(
    MAIL_CATEGORIES.map((category) => [
      category,
      countThreads(
        threads,
        (thread) =>
          thread.folder === 'inbox' &&
          !isActivelySnoozed(thread, now) &&
          thread.category === category &&
          !thread.isRead,
      ),
    ]),
  ) as Record<MailCategory, number>;

  return { mailboxes, unread, categories, categoryUnread };
}

function formatSnoozeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'later';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function createId(prefix: string): string {
  const fallback = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const identifier = globalThis.crypto?.randomUUID?.() ?? fallback;
  return `${prefix}-${identifier}`;
}

function contactInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase() ?? '')
    .join('');
}

function contactFromRecipient(value: string, index: number): Contact {
  const match = value.match(/^(.+?)\s*<([^>]+)>$/);
  const email = (match?.[2] ?? value).trim();
  const emailName = email
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
  const name = match?.[1]?.replace(/^"|"$/g, '').trim() || emailName || email;

  return {
    name,
    email,
    avatar: contactInitials(name),
    color: CONTACT_COLORS[index % CONTACT_COLORS.length] ?? CONTACT_COLORS[0],
  };
}

function parseRecipients(value: string): Contact[] {
  const recipients = value
    .split(/[,;]+/)
    .map((recipient) => recipient.trim())
    .filter(Boolean)
    .map(contactFromRecipient);
  const uniqueEmails = new Set<string>();

  return recipients.filter((contact) => {
    const email = normalize(contact.email);
    if (uniqueEmails.has(email)) return false;
    uniqueEmails.add(email);
    return true;
  });
}

function createSentThread(draft: ComposeDraft, timestamp: string): MailThread {
  const recipients = parseRecipients([draft.to, draft.cc, draft.bcc].join(','));
  const body = splitBodyIntoParagraphs(draft.body);

  return {
    id: createId('sent'),
    subject: draft.subject.trim() || '(no subject)',
    snippet: draftSnippet(draft),
    participants: recipients,
    messages: [
      {
        id: createId('message'),
        sender: CURRENT_USER,
        recipients,
        timestamp,
        body,
        attachments: draft.attachments,
      },
    ],
    folder: 'sent',
    category: 'primary',
    labels: [],
    isRead: true,
    isStarred: false,
    isImportant: false,
  };
}

function resolveTargetIds(
  target: ThreadTarget | undefined,
  state: MailboxState,
): string[] {
  if (typeof target === 'string') return [target];
  if (target) return uniqueIds(target);
  if (state.selectedThreadIds.length > 0) return state.selectedThreadIds;
  return state.activeThreadId ? [state.activeThreadId] : [];
}

function serializeState(state: MailboxState): string {
  const persisted: PersistedMailbox = {
    version: PERSISTENCE_VERSION,
    threads: state.threads,
    currentMailbox: state.currentMailbox,
    currentCategory: state.currentCategory,
    composeDraft: state.composeDraft,
    previousFolders: state.previousFolders,
  };

  return JSON.stringify(persisted);
}

export function useMailbox() {
  const [state, dispatch] = useReducer(mailboxReducer, undefined, readInitialState);
  const now = Date.now();
  const visibleThreads = deriveVisibleThreads(state, now);
  const counts = deriveCounts(state.threads, now);
  const activeThread =
    state.threads.find((thread) => thread.id === state.activeThreadId) ?? null;
  const selectedThreads = state.threads.filter((thread) =>
    state.selectedThreadIds.includes(thread.id),
  );
  const visibleIds = visibleThreads.map((thread) => thread.id);
  const isAllVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => state.selectedThreadIds.includes(id));
  const availableLabels = [
    ...new Set([
      ...SYSTEM_LABELS,
      ...state.threads.flatMap((thread) => thread.labels),
    ]),
  ].sort((first, second) => first.localeCompare(second));
  const persistedState = serializeState(state);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, persistedState);
      if (state.persistenceStatus !== 'ready') {
        dispatch({ type: 'set-persistence-status', status: 'ready' });
      }
    } catch {
      if (state.persistenceStatus !== 'unavailable') {
        dispatch({ type: 'set-persistence-status', status: 'unavailable' });
      }
    }
  }, [persistedState, state.persistenceStatus]);

  useEffect(() => {
    if (!state.toast) return undefined;

    const timeout = window.setTimeout(
      () => dispatch({ type: 'dismiss-toast', id: state.toast?.id ?? -1 }),
      state.toast.action === 'undo'
        ? UNDO_TOAST_DURATION_MS
        : TOAST_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [state.toast]);

  useEffect(() => {
    const snoozeSchedule = state.threads.reduce<{
      nextWakeTime: number | null;
      hasExpired: boolean;
    }>((schedule, thread) => {
      if (!thread.snoozedUntil) return schedule;
      const wakeTime = Date.parse(thread.snoozedUntil);
      if (!Number.isFinite(wakeTime) || wakeTime <= Date.now()) {
        return { ...schedule, hasExpired: true };
      }
      if (schedule.nextWakeTime === null || wakeTime < schedule.nextWakeTime) {
        return { ...schedule, nextWakeTime: wakeTime };
      }
      return schedule;
    }, { nextWakeTime: null, hasExpired: false });

    if (snoozeSchedule.hasExpired) {
      dispatch({ type: 'wake-snoozed', now: new Date().toISOString() });
      return undefined;
    }
    if (snoozeSchedule.nextWakeTime === null) return undefined;

    const delay = Math.min(
      Math.max(snoozeSchedule.nextWakeTime - Date.now(), 0),
      MAX_TIMEOUT_MS,
    );
    const timeout = window.setTimeout(
      () => dispatch({ type: 'wake-snoozed', now: new Date().toISOString() }),
      delay,
    );
    return () => window.clearTimeout(timeout);
  }, [state.threads]);

  function setCurrentMailbox(mailbox: MailboxId): void {
    dispatch({ type: 'set-mailbox', mailbox });
  }

  function setCurrentCategory(category: MailCategoryFilter): void {
    dispatch({ type: 'set-category', category });
  }

  function setSearchQuery(query: string): void {
    dispatch({ type: 'set-search', query });
  }

  function clearSearch(): void {
    dispatch({ type: 'set-search', query: '' });
  }

  function toggleThreadSelection(threadId: string): void {
    dispatch({ type: 'toggle-selection', id: threadId });
  }

  function clearSelection(): void {
    dispatch({ type: 'set-selection', ids: [] });
  }

  function selectAllVisible(): void {
    dispatch({ type: 'set-selection', ids: visibleIds });
  }

  function toggleSelectAllVisible(): void {
    if (isAllVisibleSelected) {
      dispatch({
        type: 'set-selection',
        ids: withoutIds(state.selectedThreadIds, visibleIds),
      });
      return;
    }
    dispatch({
      type: 'set-selection',
      ids: uniqueIds([...state.selectedThreadIds, ...visibleIds]),
    });
  }

  function openThread(threadId: string): void {
    const thread = state.threads.find((candidate) => candidate.id === threadId);
    if (thread?.draft) {
      dispatch({ type: 'open-draft', draft: thread.draft });
      return;
    }
    dispatch({ type: 'open-thread', id: threadId });
  }

  function closeThread(): void {
    dispatch({ type: 'close-thread' });
  }

  function markAsRead(target?: ThreadTarget): void {
    dispatch({ type: 'mark-read', ids: resolveTargetIds(target, state), isRead: true });
  }

  function markAsUnread(target?: ThreadTarget): void {
    dispatch({
      type: 'mark-read',
      ids: resolveTargetIds(target, state),
      isRead: false,
    });
  }

  function toggleRead(threadId: string): void {
    dispatch({ type: 'toggle-read', id: threadId });
  }

  function toggleStar(threadId: string): void {
    dispatch({ type: 'toggle-star', id: threadId });
  }

  function archive(target?: ThreadTarget): void {
    dispatch({ type: 'archive', ids: resolveTargetIds(target, state) });
  }

  function moveToTrash(target?: ThreadTarget): void {
    dispatch({ type: 'move-to-trash', ids: resolveTargetIds(target, state) });
  }

  function restore(target?: ThreadTarget): void {
    dispatch({ type: 'restore', ids: resolveTargetIds(target, state) });
  }

  function deletePermanently(target?: ThreadTarget): void {
    dispatch({
      type: 'delete-permanently',
      ids: resolveTargetIds(target, state),
    });
  }

  function toggleLabel(label: string, target?: ThreadTarget): void {
    const normalizedLabel = label.trim();
    if (!normalizedLabel) return;
    dispatch({
      type: 'toggle-label',
      ids: resolveTargetIds(target, state),
      label: normalizedLabel,
    });
  }

  function snooze(until: string | Date, target?: ThreadTarget): void {
    const date = until instanceof Date ? until : new Date(until);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      dispatch({ type: 'show-toast', message: 'Choose a future snooze time' });
      return;
    }
    dispatch({
      type: 'snooze',
      ids: resolveTargetIds(target, state),
      until: date.toISOString(),
    });
  }

  function unsnooze(target?: ThreadTarget): void {
    dispatch({ type: 'unsnooze', ids: resolveTargetIds(target, state) });
  }

  function startCompose(initial: ComposeDraftPatch = {}): void {
    const timestamp = new Date().toISOString();
    dispatch({
      type: 'start-compose',
      draft: {
        id: createId('draft'),
        replyToThreadId: initial.replyToThreadId,
        to: initial.to ?? '',
        cc: initial.cc ?? '',
        bcc: initial.bcc ?? '',
        subject: initial.subject ?? '',
        body: initial.body ?? '',
        attachments: initial.attachments ?? [],
        isMinimized: false,
        updatedAt: timestamp,
      },
    });
  }

  function openDraft(threadId: string): void {
    const draft = state.threads.find((thread) => thread.id === threadId)?.draft;
    if (!draft) return;
    dispatch({ type: 'open-draft', draft });
  }

  function updateCompose(patch: ComposeDraftPatch): void {
    dispatch({
      type: 'update-compose',
      patch,
      updatedAt: new Date().toISOString(),
    });
  }

  function minimizeCompose(): void {
    dispatch({
      type: 'minimize-compose',
      isMinimized: true,
      updatedAt: new Date().toISOString(),
    });
  }

  function restoreCompose(): void {
    dispatch({
      type: 'minimize-compose',
      isMinimized: false,
      updatedAt: new Date().toISOString(),
    });
  }

  function closeCompose(options: CloseComposeOptions = {}): void {
    dispatch({ type: options.discard ? 'discard-compose' : 'close-compose' });
  }

  function discardCompose(): void {
    dispatch({ type: 'discard-compose' });
  }

  function sendMessage(): SendMessageResult {
    const draft = state.composeDraft;
    if (!draft) return { sent: false, reason: 'no-draft' };
    if (parseRecipients(draft.to).length === 0) {
      dispatch({ type: 'show-toast', message: 'Add at least one recipient' });
      return { sent: false, reason: 'missing-recipient' };
    }

    const timestamp = new Date().toISOString();
    const thread = createSentThread(draft, timestamp);
    dispatch({
      type: 'send-message',
      draftId: draft.id,
      thread,
      replyToThreadId: draft.replyToThreadId,
    });
    return { sent: true, threadId: draft.replyToThreadId ?? thread.id };
  }

  function dismissToast(): void {
    if (!state.toast) return;
    dispatch({ type: 'dismiss-toast', id: state.toast.id });
  }

  function undoLastAction(): void {
    dispatch({ type: 'undo' });
  }

  return {
    threads: state.threads,
    visibleThreads,
    selectedThreads,
    selectedThreadIds: state.selectedThreadIds,
    activeThread,
    activeThreadId: state.activeThreadId,
    currentMailbox: state.currentMailbox,
    currentCategory: state.currentCategory,
    searchQuery: state.searchQuery,
    composeDraft: state.composeDraft,
    toast: state.toast,
    persistenceStatus: state.persistenceStatus,
    counts,
    mailboxCounts: counts.mailboxes,
    unreadCounts: counts.unread,
    categoryCounts: counts.categories,
    categoryUnreadCounts: counts.categoryUnread,
    availableLabels,
    hasSelection: state.selectedThreadIds.length > 0,
    isAllVisibleSelected,
    canUndo: state.undo !== null,
    setCurrentMailbox,
    setCurrentCategory,
    setSearchQuery,
    clearSearch,
    toggleThreadSelection,
    clearSelection,
    selectAllVisible,
    toggleSelectAllVisible,
    openThread,
    closeThread,
    markAsRead,
    markAsUnread,
    toggleRead,
    toggleStar,
    archive,
    moveToTrash,
    restore,
    deletePermanently,
    toggleLabel,
    snooze,
    unsnooze,
    startCompose,
    openCompose: startCompose,
    openDraft,
    updateCompose,
    minimizeCompose,
    restoreCompose,
    closeCompose,
    discardCompose,
    sendMessage,
    dismissToast,
    undoLastAction,
  };
}

export type UseMailboxResult = ReturnType<typeof useMailbox>;
