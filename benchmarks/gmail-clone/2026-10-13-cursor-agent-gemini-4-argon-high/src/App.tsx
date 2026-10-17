import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  Attachment,
  ComposeDraft,
  Contact,
  CustomLabel,
  EmailMessage,
  EmailThread,
  InboxCategory,
  MailSettings,
  SearchFilters,
  SystemFolder,
  UndoToast,
} from './types/mail';
import {
  CONTACTS,
  CURRENT_USER,
  INITIAL_LABELS,
  INITIAL_THREADS,
} from './data/seedData';
import { DEFAULT_SEARCH_FILTERS, filterThreads } from './utils/searchParser';
import { Header } from './components/Header';
import { Sidebar, LABEL_COLOR_PRESETS } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { ThreadList } from './components/ThreadList';
import { ThreadView } from './components/ThreadView';
import { ComposeDock } from './components/ComposeDock';
import { AttachmentPreviewModal } from './components/AttachmentPreviewModal';
import { QuickSettingsDrawer } from './components/QuickSettingsDrawer';
import { ShortcutsModal } from './components/ShortcutsModal';

const STORAGE_KEYS = {
  THREADS: 'g4a_mail_threads_v1',
  LABELS: 'g4a_mail_labels_v1',
  SETTINGS: 'g4a_mail_settings_v1',
};

const DEFAULT_SETTINGS: MailSettings = {
  theme: 'light',
  density: 'default',
  readingPane: 'none',
  showCategoryTabs: true,
  keyboardShortcuts: true,
  vacationResponder: false,
};

export function App() {
  // Enforce exact browser title
  useEffect(() => {
    document.title = 'Gemini 4 Argon';
  }, []);

  // Persistent State: Threads
  const [threads, setThreads] = useState<EmailThread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THREADS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_THREADS;
  });

  // Persistent State: Custom Labels
  const [labels, setLabels] = useState<CustomLabel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LABELS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_LABELS;
  });

  // Persistent State: Settings
  const [settings, setSettings] = useState<MailSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threads));
    } catch {
      // ignore
    }
  }, [threads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(labels));
    } catch {
      // ignore
    }
  }, [labels]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Navigation & View State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<SystemFolder>('inbox');
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<InboxCategory>('primary');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Modals & Drawers
  const [activeDraft, setActiveDraft] = useState<ComposeDraft | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [toast, setToast] = useState<UndoToast | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (
      message: string,
      onUndo?: () => void,
      actionLabel?: string,
      onAction?: () => void
    ) => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({
        id: String(Date.now()),
        message,
        onUndo,
        actionLabel,
        onAction,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 6500);
    },
    []
  );

  // Filtered & sorted threads
  const filteredThreads = useMemo(() => {
    const matched = filterThreads(
      threads,
      activeFolder,
      activeLabelId,
      activeCategory,
      settings.showCategoryTabs,
      filters,
      labels
    );
    return [...matched].sort(
      (a, b) =>
        new Date(b.lastActivityIso).getTime() - new Date(a.lastActivityIso).getTime()
    );
  }, [
    threads,
    activeFolder,
    activeLabelId,
    activeCategory,
    settings.showCategoryTabs,
    filters,
    labels,
  ]);

  const paginatedThreads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredThreads.slice(start, start + pageSize);
  }, [filteredThreads, currentPage, pageSize]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  // Reset pagination & selection when folder/category/search changes
  const handleSelectFolder = (folder: SystemFolder) => {
    setActiveFolder(folder);
    setActiveLabelId(null);
    setActiveThreadId(null);
    setSelectedIds(new Set());
    setCurrentPage(1);
    setFocusedIndex(0);
  };

  const handleSelectLabel = (labelId: string) => {
    setActiveLabelId(labelId);
    setActiveThreadId(null);
    setSelectedIds(new Set());
    setCurrentPage(1);
    setFocusedIndex(0);
  };

  const handleSelectCategory = (cat: InboxCategory) => {
    setActiveCategory(cat);
    setSelectedIds(new Set());
    setCurrentPage(1);
    setFocusedIndex(0);
  };

  // Open a thread (or resume editing if it's a draft!)
  const handleOpenThread = useCallback((thread: EmailThread) => {
    if (thread.folder === 'drafts') {
      const lastMsg = thread.messages[thread.messages.length - 1];
      setActiveDraft({
        id: `draft-${thread.id}`,
        threadId: thread.id,
        to: lastMsg.to.map((c) => c.email),
        cc: (lastMsg.cc || []).map((c) => c.email),
        bcc: [],
        subject: thread.subject,
        body: lastMsg.body.replace(/<[^>]+>/g, ''),
        attachments: lastMsg.attachments || [],
        isMinimized: false,
        isMaximized: false,
        lastSaved: 'Saved',
      });
      return;
    }

    // Mark thread as read when opened
    if (thread.isUnread) {
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, isUnread: false } : t))
      );
    }
    setActiveThreadId(thread.id);
  }, []);

  // Selection helpers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectGroup = (
    mode: 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred'
  ) => {
    if (mode === 'none') {
      setSelectedIds(new Set());
      return;
    }
    const next = new Set<string>();
    paginatedThreads.forEach((t) => {
      if (mode === 'all') next.add(t.id);
      else if (mode === 'read' && !t.isUnread) next.add(t.id);
      else if (mode === 'unread' && t.isUnread) next.add(t.id);
      else if (mode === 'starred' && t.isStarred) next.add(t.id);
      else if (mode === 'unstarred' && !t.isStarred) next.add(t.id);
    });
    setSelectedIds(next);
  };

  // Determine target IDs for toolbar actions (either selectedIds, or activeThreadId when in detail view)
  const getTargetIds = useCallback((): string[] => {
    if (selectedIds.size > 0) return Array.from(selectedIds);
    if (activeThreadId) return [activeThreadId];
    return [];
  }, [selectedIds, activeThreadId]);

  // Thread Mutations with Undo Support
  const mutateThreadsWithUndo = useCallback(
    (
      targetIds: string[],
      mutator: (t: EmailThread) => EmailThread | null,
      toastText: string,
      closeDetailIfActive = false
    ) => {
      if (targetIds.length === 0) return;
      const snapshot = threads;
      const idSet = new Set(targetIds);

      setThreads((prev) =>
        prev
          .map((t) => (idSet.has(t.id) ? mutator(t) : t))
          .filter((t): t is EmailThread => t !== null)
      );

      setSelectedIds(new Set());
      if (closeDetailIfActive && activeThreadId && idSet.has(activeThreadId)) {
        setActiveThreadId(null);
      }

      showToast(toastText, () => {
        setThreads(snapshot);
      });
    },
    [threads, activeThreadId, showToast]
  );

  const handleArchiveIds = (ids: string[]) => {
    mutateThreadsWithUndo(
      ids,
      (t) => ({ ...t, folder: 'archive', snoozedUntil: undefined }),
      ids.length === 1 ? 'Conversation archived.' : `${ids.length} conversations archived.`,
      true
    );
  };

  const handleDeleteIds = (ids: string[]) => {
    mutateThreadsWithUndo(
      ids,
      (t) => ({ ...t, folder: 'trash', snoozedUntil: undefined }),
      ids.length === 1
        ? 'Conversation moved to Trash.'
        : `${ids.length} conversations moved to Trash.`,
      true
    );
  };

  const handleSpamIds = (ids: string[]) => {
    mutateThreadsWithUndo(
      ids,
      (t) => ({ ...t, folder: 'spam', snoozedUntil: undefined }),
      ids.length === 1
        ? 'Conversation reported as spam.'
        : `${ids.length} conversations reported as spam.`,
      true
    );
  };

  const handleDeleteForeverIds = (ids: string[]) => {
    mutateThreadsWithUndo(
      ids,
      () => null,
      ids.length === 1
        ? 'Conversation permanently deleted.'
        : `${ids.length} conversations permanently deleted.`,
      true
    );
  };

  const handleMoveToInboxIds = (ids: string[]) => {
    mutateThreadsWithUndo(
      ids,
      (t) => ({
        ...t,
        folder: 'inbox',
        snoozedUntil: undefined,
      }),
      ids.length === 1
        ? 'Conversation moved to Inbox.'
        : `${ids.length} conversations moved to Inbox.`,
      false
    );
  };

  const handleMarkReadIds = (ids: string[], markUnread: boolean) => {
    mutateThreadsWithUndo(
      ids,
      (t) => ({ ...t, isUnread: markUnread }),
      markUnread
        ? `Marked ${ids.length === 1 ? 'conversation' : ids.length} as unread.`
        : `Marked ${ids.length === 1 ? 'conversation' : ids.length} as read.`,
      false
    );
  };

  const handleSnoozeIds = (ids: string[], until: string) => {
    mutateThreadsWithUndo(
      ids,
      (t) => ({
        ...t,
        folder: 'snoozed',
        snoozedUntil: until,
      }),
      `Snoozed until ${until}.`,
      true
    );
  };

  const handleToggleStar = (id: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isStarred: !t.isStarred } : t))
    );
  };

  const handleToggleImportant = (id: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isImportant: !t.isImportant } : t))
    );
  };

  const handleToggleLabelOnIds = (ids: string[], labelId: string) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const targetThreads = threads.filter((t) => idSet.has(t.id));
    const allHaveLabel = targetThreads.every((t) => t.labels.includes(labelId));

    setThreads((prev) =>
      prev.map((t) => {
        if (!idSet.has(t.id)) return t;
        const nextLabels = allHaveLabel
          ? t.labels.filter((l) => l !== labelId)
          : Array.from(new Set([...t.labels, labelId]));
        return { ...t, labels: nextLabels };
      })
    );
    const lblName = labels.find((l) => l.id === labelId)?.name || 'Label';
    showToast(allHaveLabel ? `Removed label "${lblName}".` : `Applied label "${lblName}".`);
  };

  // Create / Delete Custom Label
  const handleCreateLabel = (name: string, colorPresetIndex: number) => {
    const preset = LABEL_COLOR_PRESETS[colorPresetIndex % LABEL_COLOR_PRESETS.length];
    const newLbl: CustomLabel = {
      id: `lbl-${Date.now()}`,
      name,
      color: preset.color,
      textColor: preset.textColor,
      darkBgColor: preset.darkBgColor,
      darkTextColor: preset.darkTextColor,
    };
    setLabels((prev) => [...prev, newLbl]);
    showToast(`Label "${name}" created.`);
  };

  const handleDeleteLabel = (id: string) => {
    const lbl = labels.find((l) => l.id === id);
    setLabels((prev) => prev.filter((l) => l.id !== id));
    setThreads((prev) =>
      prev.map((t) => ({ ...t, labels: t.labels.filter((l) => l !== id) }))
    );
    if (activeLabelId === id) setActiveLabelId(null);
    if (lbl) showToast(`Label "${lbl.name}" deleted.`);
  };

  // Compose & Draft Lifecycle
  const handleStartNewCompose = () => {
    setActiveDraft({
      id: `draft-${Date.now()}`,
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      body: '',
      attachments: [],
      isMinimized: false,
      isMaximized: false,
      lastSaved: 'Saved',
    });
  };

  const handleCloseAndSaveDraft = (draft: ComposeDraft) => {
    const hasContent =
      draft.to.length > 0 ||
      draft.subject.trim().length > 0 ||
      draft.body.trim().length > 0 ||
      draft.attachments.length > 0;

    if (!hasContent) {
      setActiveDraft(null);
      return;
    }

    const recipients: Contact[] = draft.to.map(
      (email) =>
        CONTACTS.find((c) => c.email === email) || {
          id: `c-${email}`,
          name: email.split('@')[0],
          email,
          avatarColor: '#0B57D0',
        }
    );

    const draftThreadId = draft.threadId || `th-draft-${Date.now()}`;
    const draftMsg: EmailMessage = {
      id: `msg-${Date.now()}`,
      threadId: draftThreadId,
      sender: CURRENT_USER,
      to: recipients.length > 0 ? recipients : [CURRENT_USER],
      timestamp: new Date().toISOString(),
      displayTime: 'Draft saved just now',
      fullDateStr: 'Wed, Oct 14, 2026',
      isDraft: true,
      snippet: draft.body.slice(0, 120) || '(Empty draft)',
      body: draft.body,
      attachments: draft.attachments,
    };

    setThreads((prev) => {
      const existingIdx = prev.findIndex((t) => t.id === draftThreadId);
      const newThread: EmailThread = {
        id: draftThreadId,
        subject: draft.subject.trim() || '(no subject)',
        folder: 'drafts',
        category: 'primary',
        labels: [],
        isUnread: false,
        isStarred: false,
        isImportant: false,
        lastActivityIso: new Date().toISOString(),
        displayDate: 'Draft',
        messages: [draftMsg],
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newThread;
        return copy;
      }
      return [newThread, ...prev];
    });

    setActiveDraft(null);
    showToast('Draft saved.');
  };

  const handleDiscardDraft = (draftId: string) => {
    if (activeDraft?.threadId) {
      const tid = activeDraft.threadId;
      setThreads((prev) => prev.filter((t) => t.id !== tid));
    }
    setActiveDraft(null);
    showToast('Draft discarded.');
  };

  const handleSendDraft = (draft: ComposeDraft, scheduledFor?: string) => {
    const snapshot = threads;
    const recipients: Contact[] = draft.to.map(
      (email) =>
        CONTACTS.find((c) => c.email === email) || {
          id: `c-${email}`,
          name: email.split('@')[0],
          email,
          avatarColor: '#0B57D0',
        }
    );

    const newThreadId =
      draft.threadId && !draft.threadId.startsWith('th-draft-')
        ? draft.threadId
        : `th-sent-${Date.now()}`;

    const formattedHtml = draft.body
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const newMsg: EmailMessage = {
      id: `msg-sent-${Date.now()}`,
      threadId: newThreadId,
      sender: CURRENT_USER,
      to: recipients,
      timestamp: new Date().toISOString(),
      displayTime: scheduledFor ? `Scheduled for ${scheduledFor}` : 'Just now',
      fullDateStr: 'Wed, Oct 14, 2026, 10:45 AM',
      snippet: draft.body.replace(/\s+/g, ' ').trim().slice(0, 120),
      body: formattedHtml || '<p>(No content)</p>',
      attachments: draft.attachments,
    };

    const newThread: EmailThread = {
      id: newThreadId,
      subject: draft.subject.trim() || '(no subject)',
      folder: scheduledFor ? 'scheduled' : 'sent',
      category: 'primary',
      labels: [],
      isUnread: false,
      isStarred: false,
      isImportant: false,
      scheduledFor,
      lastActivityIso: new Date().toISOString(),
      displayDate: scheduledFor ? 'Scheduled' : 'Just now',
      messages: [newMsg],
    };

    setThreads((prev) => {
      // Remove any existing draft thread if this came from Drafts
      const withoutOldDraft = draft.threadId
        ? prev.filter((t) => t.id !== draft.threadId)
        : prev;
      return [newThread, ...withoutOldDraft];
    });

    setActiveDraft(null);

    showToast(
      scheduledFor ? `Send scheduled for ${scheduledFor}.` : 'Message sent.',
      () => {
        // Undo Send: restore threads & reopen draft in ComposeDock!
        setThreads(snapshot);
        setActiveDraft({
          ...draft,
          isMinimized: false,
          lastSaved: 'Sending undone',
        });
      },
      'View message',
      () => {
        setActiveThreadId(newThread.id);
      }
    );
  };

  // Send inline reply inside ThreadView
  const handleSendInlineReply = (
    threadId: string,
    bodyHtml: string,
    toContacts: Contact[],
    attachments: Attachment[],
    scheduledFor?: string
  ) => {
    const snapshot = threads;
    const plainSnippet = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const replyMsg: EmailMessage = {
      id: `msg-reply-${Date.now()}`,
      threadId,
      sender: CURRENT_USER,
      to: toContacts,
      timestamp: new Date().toISOString(),
      displayTime: scheduledFor ? `Scheduled (${scheduledFor})` : 'Just now',
      fullDateStr: 'Wed, Oct 14, 2026, 10:45 AM',
      snippet: plainSnippet.slice(0, 120),
      body: bodyHtml,
      attachments,
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              scheduledFor: scheduledFor || t.scheduledFor,
              lastActivityIso: new Date().toISOString(),
              displayDate: 'Just now',
              messages: [...t.messages, replyMsg],
            }
          : t
      )
    );

    showToast(
      scheduledFor ? `Reply scheduled for ${scheduledFor}.` : 'Message sent.',
      () => {
        setThreads(snapshot);
      }
    );
  };

  const handleCancelScheduledSend = (thread: EmailThread) => {
    const lastMsg = thread.messages[thread.messages.length - 1];
    setThreads((prev) => prev.filter((t) => t.id !== thread.id));
    setActiveThreadId(null);
    setActiveDraft({
      id: `draft-${thread.id}`,
      to: lastMsg.to.map((c) => c.email),
      cc: (lastMsg.cc || []).map((c) => c.email),
      bcc: [],
      subject: thread.subject,
      body: lastMsg.body.replace(/<[^>]+>/g, ''),
      attachments: lastMsg.attachments || [],
      isMinimized: false,
      isMaximized: false,
      lastSaved: 'Scheduled send cancelled — reverted to draft',
    });
    showToast('Scheduled send cancelled and reverted to draft.');
  };

  const handleUpdateRsvp = (
    threadId: string,
    messageId: string,
    status: 'yes' | 'maybe' | 'no'
  ) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          messages: t.messages.map((m) =>
            m.id === messageId && m.calendarInvite
              ? {
                  ...m,
                  calendarInvite: { ...m.calendarInvite, rsvpStatus: status },
                }
              : m
          ),
        };
      })
    );
    showToast(`Calendar RSVP updated: ${status.toUpperCase()}.`);
  };

  const handleDownloadAttachment = (att: Attachment) => {
    const blob = new Blob(
      [att.previewContent || `Attachment: ${att.name} (${att.size})`],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${att.name}.`);
  };

  const handleResetDemoData = () => {
    setThreads(INITIAL_THREADS);
    setLabels(INITIAL_LABELS);
    setFilters(DEFAULT_SEARCH_FILTERS);
    setSelectedIds(new Set());
    setActiveThreadId(null);
    setActiveFolder('inbox');
    setActiveLabelId(null);
    setActiveCategory('primary');
    localStorage.removeItem(STORAGE_KEYS.THREADS);
    localStorage.removeItem(STORAGE_KEYS.LABELS);
    showToast('Mailbox restored to initial seeded state.');
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!settings.keyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'c': {
          e.preventDefault();
          handleStartNewCompose();
          break;
        }
        case '/': {
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        }
        case '?': {
          e.preventDefault();
          setIsShortcutsOpen((p) => !p);
          break;
        }
        case 'j': {
          e.preventDefault();
          if (paginatedThreads.length > 0) {
            const nextIdx = Math.min(paginatedThreads.length - 1, focusedIndex + 1);
            setFocusedIndex(nextIdx);
            if (activeThreadId) {
              handleOpenThread(paginatedThreads[nextIdx]);
            }
          }
          break;
        }
        case 'k': {
          e.preventDefault();
          if (paginatedThreads.length > 0) {
            const prevIdx = Math.max(0, focusedIndex - 1);
            setFocusedIndex(prevIdx);
            if (activeThreadId) {
              handleOpenThread(paginatedThreads[prevIdx]);
            }
          }
          break;
        }
        case 'Enter':
        case 'o': {
          if (!activeThreadId && paginatedThreads[focusedIndex]) {
            e.preventDefault();
            handleOpenThread(paginatedThreads[focusedIndex]);
          }
          break;
        }
        case 'u':
        case 'Escape': {
          if (previewAttachment) {
            setPreviewAttachment(null);
          } else if (isShortcutsOpen) {
            setIsShortcutsOpen(false);
          } else if (activeThreadId) {
            setActiveThreadId(null);
          }
          break;
        }
        case 'x': {
          if (paginatedThreads[focusedIndex]) {
            e.preventDefault();
            handleToggleSelect(paginatedThreads[focusedIndex].id);
          }
          break;
        }
        case 's': {
          const targetThread =
            activeThread || paginatedThreads[focusedIndex];
          if (targetThread) {
            e.preventDefault();
            handleToggleStar(targetThread.id);
          }
          break;
        }
        case 'e': {
          const ids =
            selectedIds.size > 0
              ? Array.from(selectedIds)
              : activeThreadId
              ? [activeThreadId]
              : paginatedThreads[focusedIndex]
              ? [paginatedThreads[focusedIndex].id]
              : [];
          if (ids.length > 0) {
            e.preventDefault();
            handleArchiveIds(ids);
          }
          break;
        }
        case '#': {
          const ids =
            selectedIds.size > 0
              ? Array.from(selectedIds)
              : activeThreadId
              ? [activeThreadId]
              : paginatedThreads[focusedIndex]
              ? [paginatedThreads[focusedIndex].id]
              : [];
          if (ids.length > 0) {
            e.preventDefault();
            handleDeleteIds(ids);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    settings.keyboardShortcuts,
    paginatedThreads,
    focusedIndex,
    activeThreadId,
    activeThread,
    selectedIds,
    previewAttachment,
    isShortcutsOpen,
    handleOpenThread,
  ]);

  const isDark = settings.theme === 'dark';
  const isDetailViewOnly =
    settings.readingPane === 'none' && Boolean(activeThread);
  const currentDetailIndex = activeThread
    ? filteredThreads.findIndex((t) => t.id === activeThread.id)
    : -1;

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col ${
        isDark ? 'bg-[#111318] text-[#E3E3E3] dark' : 'bg-[#F8FAFD] text-[#1F1F1F]'
      }`}
    >
      {/* Top App Bar */}
      <Header
        onToggleSidebar={() => {
          if (window.innerWidth < 768) {
            setIsMobileSidebarOpen((p) => !p);
          } else {
            setIsSidebarOpen((p) => !p);
          }
        }}
        filters={filters}
        onUpdateFilters={(next) => {
          setFilters(next);
          setCurrentPage(1);
        }}
        onResetFilters={() => {
          setFilters(DEFAULT_SEARCH_FILTERS);
          setActiveLabelId(null);
          setCurrentPage(1);
        }}
        theme={settings.theme}
        onToggleTheme={() =>
          setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
        }
        onOpenSettings={() => setIsSettingsOpen((p) => !p)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onResetDemoData={handleResetDemoData}
        contacts={CONTACTS}
        labels={labels}
        currentUser={CURRENT_USER}
        searchInputRef={searchInputRef}
      />

      {/* Main Workspace Area: Sidebar + Rounded Inbox Card + Optional Quick Settings */}
      <div className="flex-1 flex min-h-0 pb-0 md:pb-3 md:pr-3">
        <Sidebar
          isOpen={isSidebarOpen}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          activeFolder={activeFolder}
          activeLabelId={activeLabelId}
          onSelectFolder={handleSelectFolder}
          onSelectLabel={handleSelectLabel}
          onCompose={handleStartNewCompose}
          threads={threads}
          openDraftsCount={activeDraft && !activeDraft.threadId ? 1 : 0}
          labels={labels}
          onCreateLabel={handleCreateLabel}
          onDeleteLabel={handleDeleteLabel}
          theme={settings.theme}
        />

        {/* Main Content Surface Card */}
        <main
          className={`flex-1 flex flex-col min-w-0 md:rounded-2xl overflow-hidden border shadow-2xs ${
            isDark
              ? 'bg-[#1E1F20] border-[#282A2C]'
              : 'bg-white border-[#E8EAED]'
          }`}
        >
          {/* Contextual Action Toolbar */}
          <Toolbar
            isDetailViewOnly={isDetailViewOnly}
            onBackToList={() => setActiveThreadId(null)}
            visibleThreads={paginatedThreads}
            selectedIds={selectedIds}
            onSelectGroup={handleSelectGroup}
            onArchiveSelected={() => handleArchiveIds(getTargetIds())}
            onSpamSelected={() => handleSpamIds(getTargetIds())}
            onDeleteSelected={() => handleDeleteIds(getTargetIds())}
            onDeleteForeverSelected={() => handleDeleteForeverIds(getTargetIds())}
            onMoveToInboxSelected={() => handleMoveToInboxIds(getTargetIds())}
            onMarkReadSelected={(read) => handleMarkReadIds(getTargetIds(), !read)}
            onStarSelected={(starred) => {
              const ids = new Set(getTargetIds());
              setThreads((prev) =>
                prev.map((t) => (ids.has(t.id) ? { ...t, isStarred: starred } : t))
              );
            }}
            onSnoozeSelected={(until) => handleSnoozeIds(getTargetIds(), until)}
            onToggleLabelSelected={(lblId) => handleToggleLabelOnIds(getTargetIds(), lblId)}
            onMoveFolderSelected={(dest) => {
              const ids = getTargetIds();
              mutateThreadsWithUndo(
                ids,
                (t) => ({ ...t, folder: dest, snoozedUntil: undefined }),
                `Moved to ${dest}.`,
                true
              );
            }}
            onMarkAllRead={() => {
              const unreadIds = filteredThreads.filter((t) => t.isUnread).map((t) => t.id);
              if (unreadIds.length > 0) {
                handleMarkReadIds(unreadIds, false);
              } else {
                showToast('All messages in this view are already read.');
              }
            }}
            onRefresh={() => showToast('Inbox is up to date.')}
            activeFolder={activeFolder}
            labels={labels}
            readingPane={settings.readingPane}
            onChangeReadingPane={(mode) =>
              setSettings((s) => ({ ...s, readingPane: mode }))
            }
            currentPage={currentPage}
            pageSize={pageSize}
            totalFiltered={filteredThreads.length}
            onPageChange={setCurrentPage}
            onNavigateDetailThread={(dir) => {
              const nextIdx =
                dir === 'prev' ? currentDetailIndex - 1 : currentDetailIndex + 1;
              if (filteredThreads[nextIdx]) {
                handleOpenThread(filteredThreads[nextIdx]);
              }
            }}
            detailThreadIndex={currentDetailIndex}
            theme={settings.theme}
          />

          {/* Viewport Content: Full List, Full Detail, or Split Pane */}
          <div
            className={`flex-1 flex min-h-0 ${
              settings.readingPane === 'bottom' ? 'flex-col' : 'flex-row'
            }`}
          >
            {/* Thread List Pane */}
            {!isDetailViewOnly && (
              <div
                className={`flex flex-col min-w-0 min-h-0 ${
                  settings.readingPane === 'right'
                    ? 'w-full lg:w-[46%] lg:border-r'
                    : settings.readingPane === 'bottom'
                    ? 'h-[48%] border-b'
                    : 'flex-1'
                } ${isDark ? 'border-[#282A2C]' : 'border-[#E8EAED]'}`}
              >
                <ThreadList
                  threads={paginatedThreads}
                  allInboxThreads={threads}
                  activeFolder={activeFolder}
                  activeLabelId={activeLabelId}
                  activeCategory={activeCategory}
                  onSelectCategory={handleSelectCategory}
                  showCategoryTabs={settings.showCategoryTabs}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleStar={handleToggleStar}
                  onToggleImportant={handleToggleImportant}
                  onArchiveThread={(id) => handleArchiveIds([id])}
                  onDeleteThread={(id) => handleDeleteIds([id])}
                  onToggleReadThread={(id) => {
                    const target = threads.find((t) => t.id === id);
                    if (target) handleMarkReadIds([id], !target.isUnread);
                  }}
                  onSnoozeThread={(id, until) => handleSnoozeIds([id], until)}
                  onOpenThread={handleOpenThread}
                  onPreviewAttachment={setPreviewAttachment}
                  activeThreadId={activeThreadId}
                  focusedIndex={focusedIndex}
                  onSetFocusedIndex={setFocusedIndex}
                  labels={labels}
                  density={settings.density}
                  filters={filters}
                  onResetFilters={() => {
                    setFilters(DEFAULT_SEARCH_FILTERS);
                    setActiveLabelId(null);
                  }}
                  theme={settings.theme}
                />
              </div>
            )}

            {/* Thread Reader Pane */}
            {(isDetailViewOnly || settings.readingPane !== 'none') && (
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                {activeThread ? (
                  <ThreadView
                    thread={activeThread}
                    labels={labels}
                    currentUser={CURRENT_USER}
                    onToggleStarThread={handleToggleStar}
                    onToggleImportantThread={handleToggleImportant}
                    onToggleLabelOnThread={(tid, lid) => handleToggleLabelOnIds([tid], lid)}
                    onRemoveFromInbox={(tid) => handleArchiveIds([tid])}
                    onUnsnoozeThread={(tid) => handleMoveToInboxIds([tid])}
                    onCancelScheduledSend={handleCancelScheduledSend}
                    onSendReply={handleSendInlineReply}
                    onPopOutReply={(th, mode, bodyText) => {
                      const lastMsg = th.messages[th.messages.length - 1];
                      setActiveDraft({
                        id: `draft-popout-${Date.now()}`,
                        threadId: th.id,
                        to:
                          mode === 'forward'
                            ? []
                            : [
                                lastMsg.sender.id === CURRENT_USER.id
                                  ? lastMsg.to[0]?.email
                                  : lastMsg.sender.email,
                              ].filter(Boolean),
                        cc: [],
                        bcc: [],
                        subject:
                          mode === 'forward'
                            ? `Fwd: ${th.subject}`
                            : `Re: ${th.subject}`,
                        body: bodyText,
                        attachments: [],
                        isMinimized: false,
                        isMaximized: false,
                        lastSaved: 'Saved',
                      });
                    }}
                    onUpdateRsvp={handleUpdateRsvp}
                    onPreviewAttachment={setPreviewAttachment}
                    onDownloadAttachment={handleDownloadAttachment}
                    onClosePane={
                      settings.readingPane !== 'none'
                        ? () => setActiveThreadId(null)
                        : undefined
                    }
                    theme={settings.theme}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none opacity-60">
                    <div className="text-sm font-medium">No conversation selected</div>
                    <div className="text-xs mt-1">
                      Select a conversation from the list to read it here.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Quick Settings Right Drawer */}
        <QuickSettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          onResetDemoData={handleResetDemoData}
        />
      </div>

      {/* Floating Compose Dock */}
      {activeDraft && (
        <ComposeDock
          draft={activeDraft}
          contacts={CONTACTS}
          onUpdateDraft={setActiveDraft}
          onSendDraft={handleSendDraft}
          onDiscardDraft={handleDiscardDraft}
          onCloseAndSaveDraft={handleCloseAndSaveDraft}
          theme={settings.theme}
        />
      )}

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        onDownload={handleDownloadAttachment}
        theme={settings.theme}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        theme={settings.theme}
      />

      {/* Bottom-Left Gmail Undo Snackbar */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-5 z-50 flex items-center gap-4 px-4 py-3 rounded-lg bg-[#202124] text-white text-xs shadow-2xl border border-white/10"
        >
          <span className="font-medium">{toast.message}</span>
          <div className="flex items-center gap-3">
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  setToast(null);
                }}
                className="font-semibold text-[#8AB4F8] hover:underline cursor-pointer"
              >
                Undo
              </button>
            )}
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="font-semibold text-[#8AB4F8] hover:underline cursor-pointer"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
