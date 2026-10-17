import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AdvancedSearchFilter,
  Attachment,
  ComposeDraftState,
  CustomLabel,
  DensityMode,
  EmailMessage,
  EmailThread,
  InboxCategory,
  SplitPaneMode,
  SystemFolder,
  ThemeMode,
} from './types/mail';
import {
  CONTACTS,
  CURRENT_USER,
  INITIAL_LABELS,
  INITIAL_THREADS,
} from './data/seedData';
import {
  matchesFolderOrLabel,
  matchesSearchAndFilters,
  stripHtml,
} from './utils/mailSearch';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ThreadList } from './components/ThreadList';
import { ThreadView } from './components/ThreadView';
import { ComposeModal } from './components/ComposeModal';
import { QuickSettingsDrawer } from './components/QuickSettingsDrawer';
import { AttachmentPreviewModal } from './components/AttachmentPreviewModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { Mail, X } from 'lucide-react';

const STORAGE_KEYS = {
  THREADS: 'argon_mail_threads_v1',
  LABELS: 'argon_mail_labels_v1',
  THEME: 'argon_mail_theme_v1',
  DENSITY: 'argon_mail_density_v1',
  SPLIT: 'argon_mail_split_v1',
  CAT_TABS: 'argon_mail_cat_tabs_v1',
};

const DEFAULT_SEARCH_FILTER: AdvancedSearchFilter = {
  query: '',
  from: '',
  to: '',
  subject: '',
  hasWords: '',
  doesntHave: '',
  hasAttachment: false,
  onlyUnread: false,
  onlyStarred: false,
  dateRange: 'any',
  labelId: '',
};

interface ToastNotification {
  id: string;
  message: string;
  undoAction?: () => void;
  viewThreadId?: string;
}

export function App() {
  // Ensure document.title is strictly our model name
  useEffect(() => {
    document.title = 'Gemini 4 Argon';
  }, []);

  // Persisted UI & Mailbox State
  const [threads, setThreads] = useState<EmailThread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THREADS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return INITIAL_THREADS;
  });

  const [labels, setLabels] = useState<CustomLabel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LABELS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_LABELS;
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [density, setDensity] = useState<DensityMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DENSITY) as DensityMode;
    return saved || 'default';
  });

  const [splitPane, setSplitPane] = useState<SplitPaneMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SPLIT) as SplitPaneMode;
    return saved || 'none';
  });

  const [showCategoryTabs, setShowCategoryTabs] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CAT_TABS);
    return saved !== null ? saved === 'true' : true;
  });

  // Sync to localStorage
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
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DENSITY, density);
  }, [density]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SPLIT, splitPane);
  }, [splitPane]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAT_TABS, String(showCategoryTabs));
  }, [showCategoryTabs]);

  // Navigation & Selection State
  const [activeFolder, setActiveFolder] = useState<SystemFolder | null>('inbox');
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<InboxCategory>('primary');
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [lastSelectedThreadId, setLastSelectedThreadId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [focusedThreadIndex, setFocusedThreadIndex] = useState<number>(0);

  // Layout & Drawer State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Search State
  const [searchFilter, setSearchFilter] =
    useState<AdvancedSearchFilter>(DEFAULT_SEARCH_FILTER);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compose State
  const [composeDraft, setComposeDraft] = useState<ComposeDraftState | null>(null);

  const showToast = (
    message: string,
    undoAction?: () => void,
    viewThreadId?: string
  ) => {
    const id = String(Date.now());
    setToast({ id, message, undoAction, viewThreadId });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast((prev) => (prev?.id === toast.id ? null : prev));
    }, 6500);
    return () => clearTimeout(timer);
  }, [toast]);

  const hasActiveSearch = useMemo(() => {
    return (
      Boolean(searchFilter.query.trim()) ||
      Boolean(searchFilter.from.trim()) ||
      Boolean(searchFilter.to.trim()) ||
      Boolean(searchFilter.subject.trim()) ||
      Boolean(searchFilter.hasWords.trim()) ||
      Boolean(searchFilter.doesntHave.trim()) ||
      searchFilter.hasAttachment ||
      searchFilter.onlyUnread ||
      searchFilter.onlyStarred ||
      searchFilter.dateRange !== 'any' ||
      Boolean(searchFilter.labelId)
    );
  }, [searchFilter]);

  const allInboxThreads = useMemo(
    () => threads.filter((t) => t.folder === 'inbox' && !t.isSnoozed),
    [threads]
  );

  // Filtered and sorted threads for the current view
  const visibleThreads = useMemo(() => {
    return threads
      .filter((t) =>
        matchesFolderOrLabel(
          t,
          activeFolder,
          activeLabelId,
          activeCategory,
          showCategoryTabs,
          hasActiveSearch
        )
      )
      .filter((t) => matchesSearchAndFilters(t, searchFilter, labels))
      .sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() -
          new Date(a.lastActivityAt).getTime()
      );
  }, [
    threads,
    activeFolder,
    activeLabelId,
    activeCategory,
    showCategoryTabs,
    hasActiveSearch,
    searchFilter,
    labels,
  ]);

  // Keep focused index in bounds
  useEffect(() => {
    if (focusedThreadIndex >= visibleThreads.length) {
      setFocusedThreadIndex(Math.max(0, visibleThreads.length - 1));
    }
  }, [visibleThreads.length, focusedThreadIndex]);

  // Real-time Draft Sync: whenever composeDraft changes and has content, keep a corresponding thread in `drafts`
  useEffect(() => {
    if (!composeDraft) return;
    const hasContent =
      composeDraft.to.length > 0 ||
      composeDraft.subject.trim().length > 0 ||
      composeDraft.body.trim().length > 0 ||
      composeDraft.attachments.length > 0;

    if (!hasContent) return;

    const threadId = composeDraft.threadId || `draft-${composeDraft.id}`;
    const nowIso = new Date().toISOString();

    setThreads((prev) => {
      const existingIdx = prev.findIndex((t) => t.id === threadId);
      const draftMsg: EmailMessage = {
        id: `msg-${composeDraft.id}`,
        threadId,
        sender: {
          name: CURRENT_USER.name,
          email: CURRENT_USER.email,
          avatarColor: CURRENT_USER.avatarColor,
          role: CURRENT_USER.role,
        },
        to: composeDraft.to.map((email) => {
          const found = CONTACTS.find(
            (c) => c.email.toLowerCase() === email.toLowerCase()
          );
          return {
            name: found ? found.name : email.split('@')[0],
            email,
          };
        }),
        cc: composeDraft.cc.map((email) => ({
          name: email.split('@')[0],
          email,
        })),
        bcc: composeDraft.bcc.map((email) => ({
          name: email.split('@')[0],
          email,
        })),
        timestamp: nowIso,
        displayTime: 'Draft',
        fullDate: 'Draft saved just now',
        body: composeDraft.body,
        attachments: composeDraft.attachments,
        isDraft: true,
      };

      const draftThread: EmailThread = {
        id: threadId,
        subject: composeDraft.subject || '(no subject)',
        snippet: `Draft — ${stripHtml(composeDraft.body).slice(0, 120) || 'No body text'}`,
        category: 'primary',
        folder: 'drafts',
        isUnread: false,
        isStarred: existingIdx >= 0 ? prev[existingIdx].isStarred : false,
        isImportant: false,
        labels: existingIdx >= 0 ? prev[existingIdx].labels : [],
        messages: [draftMsg],
        lastActivityAt: nowIso,
        displayDate: 'Draft',
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = draftThread;
        return copy;
      }
      return [draftThread, ...prev];
    });
  }, [
    composeDraft?.id,
    composeDraft?.threadId,
    composeDraft?.to,
    composeDraft?.cc,
    composeDraft?.bcc,
    composeDraft?.subject,
    composeDraft?.body,
    composeDraft?.attachments,
  ]);

  // Open new compose modal
  const handleOpenCompose = (existingThread?: EmailThread) => {
    if (existingThread) {
      const lastMsg =
        existingThread.messages[existingThread.messages.length - 1];
      setComposeDraft({
        id: existingThread.id.replace(/^draft-/, ''),
        threadId: existingThread.id,
        to: lastMsg.to.map((r) => r.email),
        cc: (lastMsg.cc || []).map((r) => r.email),
        bcc: (lastMsg.bcc || []).map((r) => r.email),
        subject:
          existingThread.subject === '(no subject)'
            ? ''
            : existingThread.subject,
        body: stripHtml(lastMsg.body),
        attachments: lastMsg.attachments || [],
        isMinimized: false,
        isMaximized: false,
        lastSavedAt: 'Saved',
      });
      return;
    }

    setComposeDraft({
      id: `${Date.now()}`,
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      body: '',
      attachments: [],
      isMinimized: false,
      isMaximized: false,
    });
  };

  // Send or Schedule Send from Compose Modal
  const handleSendCompose = (scheduledFor?: string) => {
    if (!composeDraft) return;
    const savedDraftSnapshot = { ...composeDraft };
    const threadId = composeDraft.threadId || `draft-${composeDraft.id}`;
    const sentThreadId = `sent-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const htmlBody = (composeDraft.body || '(No content)')
      .split('\n\n')
      .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const recipients =
      composeDraft.to.length > 0
        ? composeDraft.to.map((email) => {
            const c = CONTACTS.find(
              (item) => item.email.toLowerCase() === email.toLowerCase()
            );
            return { name: c ? c.name : email.split('@')[0], email };
          })
        : [{ name: 'Elena Rostova', email: 'elena.rostova@argonlabs.io' }];

    const newMsg: EmailMessage = {
      id: `m-${Date.now()}`,
      threadId: sentThreadId,
      sender: {
        name: CURRENT_USER.name,
        email: CURRENT_USER.email,
        avatarColor: CURRENT_USER.avatarColor,
        role: CURRENT_USER.role,
      },
      to: recipients,
      cc: composeDraft.cc.map((email) => ({
        name: email.split('@')[0],
        email,
      })),
      bcc: composeDraft.bcc.map((email) => ({
        name: email.split('@')[0],
        email,
      })),
      timestamp: nowIso,
      displayTime: scheduledFor ? `Scheduled (${scheduledFor})` : 'Just now',
      fullDate: scheduledFor
        ? `Scheduled for ${scheduledFor}`
        : 'Wed, Oct 14, 2026, Just now',
      body: htmlBody,
      attachments: composeDraft.attachments,
      isDraft: false,
    };

    const newThread: EmailThread = {
      id: sentThreadId,
      subject: composeDraft.subject.trim() || '(no subject)',
      snippet: stripHtml(htmlBody).slice(0, 140),
      category: 'primary',
      folder: scheduledFor ? 'scheduled' : 'sent',
      scheduledFor,
      isUnread: false,
      isStarred: false,
      isImportant: false,
      labels: [],
      messages: [newMsg],
      lastActivityAt: nowIso,
      displayDate: scheduledFor ? 'Scheduled' : 'Just now',
    };

    setThreads((prev) => [
      newThread,
      ...prev.filter((t) => t.id !== threadId),
    ]);
    setComposeDraft(null);

    showToast(
      scheduledFor
        ? `Send scheduled for ${scheduledFor}`
        : 'Message sent',
      () => {
        // Undo Send: remove the sent thread and re-open ComposeModal with the draft
        setThreads((prev) => prev.filter((t) => t.id !== sentThreadId));
        setComposeDraft(savedDraftSnapshot);
      },
      sentThreadId
    );
  };

  const handleDiscardCompose = () => {
    if (!composeDraft) return;
    const threadId = composeDraft.threadId || `draft-${composeDraft.id}`;
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    setComposeDraft(null);
    showToast('Draft discarded');
  };

  // Select Thread from list
  const handleSelectThread = (threadId: string) => {
    const target = threads.find((t) => t.id === threadId);
    if (!target) return;

    // If user clicks a draft in the Drafts folder, open it directly in ComposeModal
    if (
      activeFolder === 'drafts' &&
      (target.folder === 'drafts' || target.messages.some((m) => m.isDraft))
    ) {
      handleOpenCompose(target);
      return;
    }

    setActiveThreadId(threadId);
    const idx = visibleThreads.findIndex((t) => t.id === threadId);
    if (idx >= 0) setFocusedThreadIndex(idx);

    if (target.isUnread) {
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, isUnread: false } : t))
      );
    }
  };

  // Toggle Checkbox Selection (supports Shift+Click range selection)
  const handleToggleSelectThread = (threadId: string, shiftKey?: boolean) => {
    setSelectedThreadIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedThreadId) {
        const startIdx = visibleThreads.findIndex(
          (t) => t.id === lastSelectedThreadId
        );
        const endIdx = visibleThreads.findIndex((t) => t.id === threadId);
        if (startIdx !== -1 && endIdx !== -1) {
          const [low, high] =
            startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          for (let i = low; i <= high; i++) {
            next.add(visibleThreads[i].id);
          }
          return next;
        }
      }
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
    setLastSelectedThreadId(threadId);
  };

  const handleSelectGroup = (
    group: 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred'
  ) => {
    if (group === 'none') {
      setSelectedThreadIds(new Set());
      return;
    }
    const matching = visibleThreads.filter((t) => {
      if (group === 'all') return true;
      if (group === 'read') return !t.isUnread;
      if (group === 'unread') return t.isUnread;
      if (group === 'starred') return t.isStarred;
      if (group === 'unstarred') return !t.isStarred;
      return false;
    });
    setSelectedThreadIds(new Set(matching.map((t) => t.id)));
  };

  const handleToggleStar = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, isStarred: !t.isStarred } : t
      )
    );
  };

  const handleToggleImportant = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, isImportant: !t.isImportant } : t
      )
    );
  };

  const getTargetIds = (explicitIds?: string[]): string[] => {
    if (explicitIds && explicitIds.length > 0) return explicitIds;
    if (selectedThreadIds.size > 0) return Array.from(selectedThreadIds);
    if (activeThreadId) return [activeThreadId];
    return [];
  };

  const handleBulkArchive = (explicitIds?: string[]) => {
    const ids = getTargetIds(explicitIds);
    if (ids.length === 0) return;
    const prevSnapshot = threads;
    setThreads((prev) =>
      prev.map((t) =>
        ids.includes(t.id)
          ? { ...t, folder: 'archive', isSnoozed: false }
          : t
      )
    );
    setSelectedThreadIds(new Set());
    if (activeThreadId && ids.includes(activeThreadId) && splitPane === 'none') {
      setActiveThreadId(null);
    }
    showToast(
      ids.length === 1
        ? 'Conversation archived'
        : `${ids.length} conversations archived`,
      () => setThreads(prevSnapshot)
    );
  };

  const handleBulkDelete = (explicitIds?: string[]) => {
    const ids = getTargetIds(explicitIds);
    if (ids.length === 0) return;
    const prevSnapshot = threads;

    if (activeFolder === 'trash') {
      setThreads((prev) => prev.filter((t) => !ids.includes(t.id)));
      showToast(
        ids.length === 1
          ? 'Conversation deleted forever'
          : `${ids.length} conversations deleted forever`,
        () => setThreads(prevSnapshot)
      );
    } else {
      setThreads((prev) =>
        prev.map((t) =>
          ids.includes(t.id) ? { ...t, folder: 'trash', isSnoozed: false } : t
        )
      );
      showToast(
        ids.length === 1
          ? 'Conversation moved to Trash'
          : `${ids.length} conversations moved to Trash`,
        () => setThreads(prevSnapshot)
      );
    }

    setSelectedThreadIds(new Set());
    if (activeThreadId && ids.includes(activeThreadId)) {
      setActiveThreadId(null);
    }
  };

  const handleBulkSpam = (explicitIds?: string[]) => {
    const ids = getTargetIds(explicitIds);
    if (ids.length === 0) return;
    const prevSnapshot = threads;
    const movingOutOfSpam = activeFolder === 'spam';

    setThreads((prev) =>
      prev.map((t) =>
        ids.includes(t.id)
          ? { ...t, folder: movingOutOfSpam ? 'inbox' : 'spam' }
          : t
      )
    );
    setSelectedThreadIds(new Set());
    if (activeThreadId && ids.includes(activeThreadId)) {
      setActiveThreadId(null);
    }
    showToast(
      movingOutOfSpam
        ? 'Conversation unmarked as spam and moved to Inbox'
        : 'Conversation reported as spam',
      () => setThreads(prevSnapshot)
    );
  };

  const handleBulkMarkRead = (read: boolean, explicitIds?: string[]) => {
    const ids = getTargetIds(explicitIds);
    if (ids.length === 0) return;
    setThreads((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, isUnread: !read } : t))
    );
    showToast(
      read
        ? `Marked ${ids.length} ${ids.length === 1 ? 'conversation' : 'conversations'} as read`
        : `Marked ${ids.length} ${ids.length === 1 ? 'conversation' : 'conversations'} as unread`
    );
  };

  const handleBulkSnooze = (until: string | null, explicitIds?: string[]) => {
    const ids = getTargetIds(explicitIds);
    if (ids.length === 0) return;
    const prevSnapshot = threads;

    setThreads((prev) =>
      prev.map((t) =>
        ids.includes(t.id)
          ? {
              ...t,
              folder: 'inbox',
              isSnoozed: Boolean(until),
              snoozedUntil: until || undefined,
            }
          : t
      )
    );
    setSelectedThreadIds(new Set());
    if (activeThreadId && ids.includes(activeThreadId) && splitPane === 'none') {
      setActiveThreadId(null);
    }
    showToast(
      until ? `Snoozed until ${until}` : 'Conversation unsnoozed',
      () => setThreads(prevSnapshot)
    );
  };

  const handleBulkToggleLabel = (labelId: string, explicitIds?: string[]) => {
    const ids = getTargetIds(explicitIds);
    if (ids.length === 0) return;
    setThreads((prev) => {
      const allHaveLabel = prev
        .filter((t) => ids.includes(t.id))
        .every((t) => t.labels.includes(labelId));

      return prev.map((t) => {
        if (!ids.includes(t.id)) return t;
        const nextLabels = allHaveLabel
          ? t.labels.filter((l) => l !== labelId)
          : t.labels.includes(labelId)
            ? t.labels
            : [...t.labels, labelId];
        return { ...t, labels: nextLabels };
      });
    });
  };

  const handleBulkMoveTo = (
    targetFolder: 'inbox' | 'archive' | 'spam' | 'trash',
    explicitIds?: string[]
  ) => {
    const ids = getTargetIds(explicitIds);
    if (ids.length === 0) return;
    const prevSnapshot = threads;
    setThreads((prev) =>
      prev.map((t) =>
        ids.includes(t.id)
          ? { ...t, folder: targetFolder, isSnoozed: false }
          : t
      )
    );
    setSelectedThreadIds(new Set());
    showToast(`Moved to ${targetFolder}`, () => setThreads(prevSnapshot));
  };

  const handleEmptyFolder = (folder: 'trash' | 'spam') => {
    const prevSnapshot = threads;
    setThreads((prev) => prev.filter((t) => t.folder !== folder));
    setActiveThreadId(null);
    setSelectedThreadIds(new Set());
    showToast(
      folder === 'trash' ? 'Trash emptied' : 'All spam messages deleted',
      () => setThreads(prevSnapshot)
    );
  };

  // Send inline reply inside a conversation
  const handleSendReply = (
    threadId: string,
    bodyHtml: string,
    to: { name: string; email: string }[],
    attachments: Attachment[]
  ) => {
    const nowIso = new Date().toISOString();
    const replyMsg: EmailMessage = {
      id: `m-${Date.now()}`,
      threadId,
      sender: {
        name: CURRENT_USER.name,
        email: CURRENT_USER.email,
        avatarColor: CURRENT_USER.avatarColor,
        role: CURRENT_USER.role,
      },
      to,
      timestamp: nowIso,
      displayTime: 'Just now',
      fullDate: 'Wed, Oct 14, 2026, Just now',
      body: bodyHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          snippet: stripHtml(bodyHtml).slice(0, 140),
          lastActivityAt: nowIso,
          displayDate: 'Just now',
          isUnread: false,
          messages: [...t.messages, replyMsg],
        };
      })
    );

    showToast('Reply sent');
  };

  const handleEditDraftOrScheduled = (thread: EmailThread) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id
          ? { ...t, folder: 'drafts', scheduledFor: undefined }
          : t
      )
    );
    handleOpenCompose(thread);
  };

  const handleCreateLabel = (name: string, color: string) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-2);
    setLabels((prev) => [...prev, { id, name, color }]);
    showToast(`Label "${name}" created`);
  };

  const handleDeleteLabel = (labelId: string) => {
    const target = labels.find((l) => l.id === labelId);
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
    setThreads((prev) =>
      prev.map((t) => ({
        ...t,
        labels: t.labels.filter((lid) => lid !== labelId),
      }))
    );
    if (activeLabelId === labelId) {
      setActiveLabelId(null);
      setActiveFolder('inbox');
    }
    if (target) showToast(`Label "${target.name}" removed`);
  };

  const handleResetDemoData = () => {
    setThreads(INITIAL_THREADS);
    setLabels(INITIAL_LABELS);
    setSearchFilter(DEFAULT_SEARCH_FILTER);
    setSelectedThreadIds(new Set());
    setActiveThreadId(null);
    setActiveFolder('inbox');
    setActiveLabelId(null);
    setActiveCategory('primary');
    showToast('Demo mailbox restored to initial seed');
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (e.key === 'Escape') {
        if (previewAttachment) {
          setPreviewAttachment(null);
          return;
        }
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (activeThreadId && !isInput) {
          setActiveThreadId(null);
          return;
        }
      }

      if (isInput) return;

      if (e.key === 'c') {
        e.preventDefault();
        handleOpenCompose();
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
      } else if (e.key === 'j') {
        e.preventDefault();
        if (visibleThreads.length === 0) return;
        const nextIdx = Math.min(
          visibleThreads.length - 1,
          focusedThreadIndex + 1
        );
        setFocusedThreadIndex(nextIdx);
        if (activeThreadId) {
          handleSelectThread(visibleThreads[nextIdx].id);
        }
      } else if (e.key === 'k') {
        e.preventDefault();
        if (visibleThreads.length === 0) return;
        const prevIdx = Math.max(0, focusedThreadIndex - 1);
        setFocusedThreadIndex(prevIdx);
        if (activeThreadId) {
          handleSelectThread(visibleThreads[prevIdx].id);
        }
      } else if (e.key === 'Enter' || e.key === 'o') {
        if (!activeThreadId && visibleThreads[focusedThreadIndex]) {
          e.preventDefault();
          handleSelectThread(visibleThreads[focusedThreadIndex].id);
        }
      } else if (e.key === 'u') {
        if (activeThreadId) {
          e.preventDefault();
          setActiveThreadId(null);
        }
      } else if (e.key === 'e') {
        e.preventDefault();
        if (selectedThreadIds.size > 0 || activeThreadId) {
          handleBulkArchive();
        } else if (visibleThreads[focusedThreadIndex]) {
          handleBulkArchive([visibleThreads[focusedThreadIndex].id]);
        }
      } else if (e.key === '#') {
        e.preventDefault();
        if (selectedThreadIds.size > 0 || activeThreadId) {
          handleBulkDelete();
        } else if (visibleThreads[focusedThreadIndex]) {
          handleBulkDelete([visibleThreads[focusedThreadIndex].id]);
        }
      } else if (e.key === 's') {
        e.preventDefault();
        const targetId =
          activeThreadId || visibleThreads[focusedThreadIndex]?.id;
        if (targetId) handleToggleStar(targetId);
      } else if (e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleBulkMarkRead(true);
      } else if (e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleBulkMarkRead(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const activeThreadIndex = useMemo(
    () =>
      activeThread
        ? visibleThreads.findIndex((t) => t.id === activeThread.id)
        : -1,
    [visibleThreads, activeThread]
  );

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden transition-colors ${
        isDark ? 'dark bg-[#111318] text-[#e3e3e3]' : 'bg-[#f6f8fc] text-[#1f1f1f]'
      }`}
    >
      {/* Top App Header */}
      <Header
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
        onToggleSidebar={() => {
          if (window.innerWidth < 768) {
            setIsMobileSidebarOpen((v) => !v);
          } else {
            setIsSidebarCollapsed((v) => !v);
          }
        }}
        searchFilter={searchFilter}
        onUpdateSearchFilter={setSearchFilter}
        onResetSearchFilter={() => setSearchFilter(DEFAULT_SEARCH_FILTER)}
        labels={labels}
        contacts={CONTACTS}
        threads={threads}
        onSelectThread={(id) => handleSelectThread(id)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onToggleQuickSettings={() => setShowQuickSettings((v) => !v)}
        showQuickSettings={showQuickSettings}
        onResetDemoData={handleResetDemoData}
        searchInputRef={searchInputRef}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex min-h-0 pr-0 md:pr-3 pb-0 md:pb-3">
        {/* Left Navigation Sidebar */}
        <Sidebar
          theme={theme}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          activeFolder={activeFolder}
          activeLabelId={activeLabelId}
          onSelectFolder={(folder) => {
            setActiveFolder(folder);
            setActiveLabelId(null);
            setSelectedThreadIds(new Set());
            if (splitPane === 'none') setActiveThreadId(null);
          }}
          onSelectLabel={(labelId) => {
            setActiveLabelId(labelId);
            setActiveFolder(null);
            setSelectedThreadIds(new Set());
            if (splitPane === 'none') setActiveThreadId(null);
          }}
          onOpenCompose={() => handleOpenCompose()}
          threads={threads}
          labels={labels}
          onCreateLabel={handleCreateLabel}
          onDeleteLabel={handleDeleteLabel}
        />

        {/* Center Rounded Mail Container */}
        <main
          className={`flex-1 flex min-w-0 min-h-0 md:rounded-2xl border overflow-hidden shadow-2xs ${
            isDark
              ? 'bg-[#1e1f23] border-white/10'
              : 'bg-white border-gray-200/80'
          } ${
            splitPane === 'right'
              ? 'flex-row'
              : splitPane === 'bottom'
                ? 'flex-col'
                : 'flex-col'
          }`}
        >
          {/* No Split Mode: Show either ThreadList or ThreadView */}
          {splitPane === 'none' ? (
            activeThread ? (
              <ThreadView
                theme={theme}
                thread={activeThread}
                labels={labels}
                threadIndex={activeThreadIndex}
                totalThreads={visibleThreads.length}
                isSplitPane={false}
                onBack={() => setActiveThreadId(null)}
                onNavigateThread={(dir) => {
                  const targetIdx =
                    dir === 'prev'
                      ? activeThreadIndex - 1
                      : activeThreadIndex + 1;
                  if (visibleThreads[targetIdx]) {
                    handleSelectThread(visibleThreads[targetIdx].id);
                  }
                }}
                onArchive={(id) => handleBulkArchive([id])}
                onDelete={(id) => handleBulkDelete([id])}
                onSpam={(id) => handleBulkSpam([id])}
                onMarkUnread={(id) => {
                  handleBulkMarkRead(false, [id]);
                  setActiveThreadId(null);
                }}
                onSnooze={(id, until) => handleBulkSnooze(until, [id])}
                onToggleStar={handleToggleStar}
                onToggleImportant={handleToggleImportant}
                onToggleLabel={(tid, lid) => handleBulkToggleLabel(lid, [tid])}
                onSendReply={handleSendReply}
                onEditDraftOrScheduled={handleEditDraftOrScheduled}
                onPreviewAttachment={setPreviewAttachment}
              />
            ) : (
              <ThreadList
                theme={theme}
                threads={visibleThreads}
                allInboxThreads={allInboxThreads}
                selectedThreadIds={selectedThreadIds}
                activeThreadId={activeThreadId}
                focusedThreadIndex={focusedThreadIndex}
                activeFolder={activeFolder}
                activeLabelId={activeLabelId}
                activeCategory={activeCategory}
                showCategoryTabs={showCategoryTabs}
                density={density}
                splitPane={splitPane}
                labels={labels}
                hasActiveSearch={hasActiveSearch}
                onSelectCategory={(cat) => {
                  setActiveCategory(cat);
                  setSelectedThreadIds(new Set());
                }}
                onSelectThread={handleSelectThread}
                onToggleSelectThread={handleToggleSelectThread}
                onSelectGroup={handleSelectGroup}
                onToggleStar={handleToggleStar}
                onToggleImportant={handleToggleImportant}
                onBulkArchive={handleBulkArchive}
                onBulkDelete={handleBulkDelete}
                onBulkMarkRead={handleBulkMarkRead}
                onBulkSnooze={handleBulkSnooze}
                onBulkSpam={handleBulkSpam}
                onBulkToggleLabel={handleBulkToggleLabel}
                onBulkMoveTo={handleBulkMoveTo}
                onEmptyFolder={handleEmptyFolder}
                onRefresh={() => showToast('Mailbox is up to date')}
                onChangeSplitPane={setSplitPane}
                onPreviewAttachment={setPreviewAttachment}
              />
            )
          ) : (
            /* Split Pane Mode (Right or Bottom) */
            <>
              <div
                className={
                  splitPane === 'right'
                    ? 'w-full lg:w-[46%] h-full border-r border-gray-200/80 dark:border-white/10 min-w-0'
                    : 'w-full h-[48%] border-b border-gray-200/80 dark:border-white/10 min-h-0'
                }
              >
                <ThreadList
                  theme={theme}
                  threads={visibleThreads}
                  allInboxThreads={allInboxThreads}
                  selectedThreadIds={selectedThreadIds}
                  activeThreadId={activeThreadId}
                  focusedThreadIndex={focusedThreadIndex}
                  activeFolder={activeFolder}
                  activeLabelId={activeLabelId}
                  activeCategory={activeCategory}
                  showCategoryTabs={showCategoryTabs}
                  density={density}
                  splitPane={splitPane}
                  labels={labels}
                  hasActiveSearch={hasActiveSearch}
                  onSelectCategory={(cat) => {
                    setActiveCategory(cat);
                    setSelectedThreadIds(new Set());
                  }}
                  onSelectThread={handleSelectThread}
                  onToggleSelectThread={handleToggleSelectThread}
                  onSelectGroup={handleSelectGroup}
                  onToggleStar={handleToggleStar}
                  onToggleImportant={handleToggleImportant}
                  onBulkArchive={handleBulkArchive}
                  onBulkDelete={handleBulkDelete}
                  onBulkMarkRead={handleBulkMarkRead}
                  onBulkSnooze={handleBulkSnooze}
                  onBulkSpam={handleBulkSpam}
                  onBulkToggleLabel={handleBulkToggleLabel}
                  onBulkMoveTo={handleBulkMoveTo}
                  onEmptyFolder={handleEmptyFolder}
                  onRefresh={() => showToast('Mailbox is up to date')}
                  onChangeSplitPane={setSplitPane}
                  onPreviewAttachment={setPreviewAttachment}
                />
              </div>

              <div
                className={
                  splitPane === 'right'
                    ? 'hidden lg:flex flex-1 h-full min-w-0'
                    : 'flex-1 w-full min-h-0'
                }
              >
                {activeThread ? (
                  <div className="w-full h-full">
                    <ThreadView
                      theme={theme}
                      thread={activeThread}
                      labels={labels}
                      threadIndex={activeThreadIndex}
                      totalThreads={visibleThreads.length}
                      isSplitPane={true}
                      onBack={() => setActiveThreadId(null)}
                      onNavigateThread={(dir) => {
                        const targetIdx =
                          dir === 'prev'
                            ? activeThreadIndex - 1
                            : activeThreadIndex + 1;
                        if (visibleThreads[targetIdx]) {
                          handleSelectThread(visibleThreads[targetIdx].id);
                        }
                      }}
                      onArchive={(id) => handleBulkArchive([id])}
                      onDelete={(id) => handleBulkDelete([id])}
                      onSpam={(id) => handleBulkSpam([id])}
                      onMarkUnread={(id) => handleBulkMarkRead(false, [id])}
                      onSnooze={(id, until) => handleBulkSnooze(until, [id])}
                      onToggleStar={handleToggleStar}
                      onToggleImportant={handleToggleImportant}
                      onToggleLabel={(tid, lid) =>
                        handleBulkToggleLabel(lid, [tid])
                      }
                      onSendReply={handleSendReply}
                      onEditDraftOrScheduled={handleEditDraftOrScheduled}
                      onPreviewAttachment={setPreviewAttachment}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 select-none opacity-60">
                    <Mail className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm font-medium">
                      No conversation selected
                    </p>
                    <p className="text-xs mt-1">
                      Select a message from the list to read it here.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Right Quick Settings Drawer */}
        {showQuickSettings && (
          <QuickSettingsDrawer
            theme={theme}
            density={density}
            splitPane={splitPane}
            showCategoryTabs={showCategoryTabs}
            onChangeTheme={setTheme}
            onChangeDensity={setDensity}
            onChangeSplitPane={setSplitPane}
            onToggleCategoryTabs={setShowCategoryTabs}
            onClose={() => setShowQuickSettings(false)}
          />
        )}
      </div>

      {/* Floating Compose Modal */}
      {composeDraft && (
        <ComposeModal
          theme={theme}
          draft={composeDraft}
          contacts={CONTACTS}
          onUpdateDraft={(updater) =>
            setComposeDraft((prev) => (prev ? updater(prev) : null))
          }
          onSend={handleSendCompose}
          onCloseAndSave={() => {
            setComposeDraft(null);
            showToast('Draft saved');
          }}
          onDiscardDraft={handleDiscardCompose}
        />
      )}

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        theme={theme}
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardShortcutsModal
        theme={theme}
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Classic Gmail Bottom-Left Action Toast with Undo */}
      {toast && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-4 px-4 py-3 rounded-xl bg-[#202124] text-white text-xs md:text-sm shadow-2xl border border-white/10">
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button
              onClick={() => {
                toast.undoAction?.();
                setToast(null);
              }}
              className="font-semibold text-[#8ab4f8] hover:underline cursor-pointer"
            >
              Undo
            </button>
          )}
          {toast.viewThreadId && (
            <button
              onClick={() => {
                setActiveThreadId(toast.viewThreadId!);
                setToast(null);
              }}
              className="font-semibold text-[#8ab4f8] hover:underline cursor-pointer"
            >
              View message
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="p-0.5 rounded hover:bg-white/10 opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
