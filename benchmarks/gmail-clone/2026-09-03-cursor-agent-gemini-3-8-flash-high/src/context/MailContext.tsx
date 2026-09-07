import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Thread,
  Label,
  FolderId,
  CategoryId,
  DensityMode,
  ComposeDraft,
  SearchFilters,
  UndoAction,
  MailSettings,
  UserAccount,
  Message,
  Attachment,
} from '../types/mail';
import {
  CURRENT_USER,
  ALTERNATE_ACCOUNTS,
  INITIAL_LABELS,
  INITIAL_SETTINGS,
  INITIAL_THREADS,
} from '../data/initialData';

const STORAGE_KEYS = {
  THREADS: 'gmail_clone_threads_v1',
  LABELS: 'gmail_clone_labels_v1',
  SETTINGS: 'gmail_clone_settings_v1',
  THEME: 'gmail_clone_theme_v1',
  DENSITY: 'gmail_clone_density_v1',
};

interface MailContextType {
  // Navigation
  currentFolder: FolderId;
  setCurrentFolder: (folder: FolderId) => void;
  currentCategory: CategoryId;
  setCurrentCategory: (category: CategoryId) => void;
  selectedCustomLabel: string | null;
  setSelectedCustomLabel: (labelId: string | null) => void;
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;

  // Data
  threads: Thread[];
  activeThread: Thread | null;
  labels: Label[];
  currentUser: UserAccount;
  allAccounts: UserAccount[];
  switchUser: (id: string) => void;

  // Thread actions
  toggleStarThread: (id: string, e?: React.MouseEvent) => void;
  toggleImportantThread: (id: string, e?: React.MouseEvent) => void;
  markThreadRead: (id: string, read: boolean) => void;
  archiveThread: (id: string) => void;
  deleteThread: (id: string) => void;
  restoreThread: (id: string) => void;
  snoozeThread: (id: string, until: number) => void;
  applyLabelToThread: (threadId: string, labelId: string) => void;
  removeLabelFromThread: (threadId: string, labelId: string) => void;

  // Selection & Bulk Actions
  selectedThreadIds: string[];
  toggleSelectThread: (id: string, e?: React.MouseEvent) => void;
  selectAllThreads: (ids: string[]) => void;
  clearSelection: () => void;
  bulkArchive: () => void;
  bulkDelete: () => void;
  bulkMarkRead: (read: boolean) => void;
  bulkStar: (star: boolean) => void;
  bulkApplyLabel: (labelId: string) => void;
  bulkSnooze: (until: number) => void;
  bulkMoveToFolder: (folder: FolderId) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
  filteredThreads: Thread[];

  // Compose
  isComposeOpen: boolean;
  composeState: 'docked' | 'minimized' | 'maximized';
  composeData: ComposeDraft;
  openCompose: (initial?: Partial<ComposeDraft>) => void;
  closeCompose: () => void;
  minimizeCompose: () => void;
  maximizeCompose: () => void;
  restoreCompose: () => void;
  updateComposeData: (partial: Partial<ComposeDraft>) => void;
  sendEmail: (draft?: ComposeDraft) => void;
  scheduleEmail: (draft: ComposeDraft, timestamp: number) => void;
  discardDraft: () => void;

  // Inline Reply / Forward in Thread
  sendReply: (
    threadId: string,
    body: string,
    replyType: 'reply' | 'replyAll' | 'forward',
    attachments?: Attachment[]
  ) => void;

  // Modals & Overlays
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  isCreateLabelModalOpen: boolean;
  setIsCreateLabelModalOpen: (open: boolean) => void;
  snoozeTargetThreadId: string | null;
  setSnoozeTargetThreadId: (id: string | null) => void;
  activeAccountModal: boolean;
  setActiveAccountModal: (open: boolean) => void;
  googleAppsOpen: boolean;
  setGoogleAppsOpen: (open: boolean) => void;

  // Appearance & Settings
  density: DensityMode;
  setDensity: (mode: DensityMode) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  settings: MailSettings;
  updateSettings: (partial: Partial<MailSettings>) => void;

  // Layout
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  activeRightPanel: 'calendar' | 'keep' | 'tasks' | 'contacts' | null;
  setActiveRightPanel: (panel: 'calendar' | 'keep' | 'tasks' | 'contacts' | null) => void;

  // Custom Labels
  createCustomLabel: (name: string, color: string) => void;
  deleteCustomLabel: (id: string) => void;

  // Undo & Reset
  undoAction: UndoAction | null;
  triggerUndo: () => void;
  dismissUndo: () => void;
  showToast: (message: string, onUndo?: () => void) => void;
  resetDemoData: () => void;

  // Folder Counts
  folderCounts: Record<string, number>;
}

const MailContext = createContext<MailContextType | undefined>(undefined);

const DEFAULT_COMPOSE_DRAFT: ComposeDraft = {
  to: '',
  cc: '',
  bcc: '',
  showCc: false,
  showBcc: false,
  subject: '',
  body: '',
  attachments: [],
};

export const MailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation State
  const [currentFolder, setCurrentFolderState] = useState<FolderId>('inbox');
  const [currentCategory, setCurrentCategory] = useState<CategoryId>('primary');
  const [selectedCustomLabel, setSelectedCustomLabel] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);

  // Accounts
  const [currentUser, setCurrentUser] = useState<UserAccount>(CURRENT_USER);
  const [allAccounts] = useState<UserAccount[]>([CURRENT_USER, ...ALTERNATE_ACCOUNTS]);

  // Threads State (Initialized from localStorage if available)
  const [threads, setThreads] = useState<Thread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THREADS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load threads from localStorage', e);
    }
    return INITIAL_THREADS;
  });

  // Labels State
  const [labels, setLabels] = useState<Label[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LABELS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load labels from localStorage', e);
    }
    return INITIAL_LABELS;
  });

  // Settings & Theme
  const [settings, setSettings] = useState<MailSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    }
    return INITIAL_SETTINGS;
  });

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // fallback
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const [density, setDensityState] = useState<DensityMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DENSITY);
      if (saved === 'compact' || saved === 'comfortable' || saved === 'default') return saved;
    } catch {
      // fallback
    }
    return 'default';
  });

  // Selection
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ query: '' });

  // Compose State
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeState, setComposeState] = useState<'docked' | 'minimized' | 'maximized'>('docked');
  const [composeData, setComposeData] = useState<ComposeDraft>(DEFAULT_COMPOSE_DRAFT);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateLabelModalOpen, setIsCreateLabelModalOpen] = useState(false);
  const [snoozeTargetThreadId, setSnoozeTargetThreadId] = useState<string | null>(null);
  const [activeAccountModal, setActiveAccountModal] = useState(false);
  const [googleAppsOpen, setGoogleAppsOpen] = useState(false);

  // Layout
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState<'calendar' | 'keep' | 'tasks' | 'contacts' | null>(null);

  // Undo System
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threads));
    } catch (e) {
      console.warn('Failed to persist threads', e);
    }
  }, [threads]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(labels));
    } catch (e) {
      console.warn('Failed to persist labels', e);
    }
  }, [labels]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to persist settings', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
      console.warn('Failed to persist theme', e);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DENSITY, density);
    } catch (e) {
      console.warn('Failed to persist density', e);
    }
  }, [density]);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setDensity = (mode: DensityMode) => {
    setDensityState(mode);
  };

  const updateSettings = (partial: Partial<MailSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const setCurrentFolder = (folder: FolderId) => {
    setCurrentFolderState(folder);
    setSelectedCustomLabel(null);
    setActiveThreadIdState(null);
    setSelectedThreadIds([]);
    setMobileMenuOpen(false);
  };

  const setActiveThreadId = (id: string | null) => {
    setActiveThreadIdState(id);
    if (id) {
      // Automatically mark as read when opened
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === id && t.unreadCount > 0) {
            return {
              ...t,
              unreadCount: 0,
              messages: t.messages.map((m) => ({ ...m, read: true })),
            };
          }
          return t;
        })
      );
    }
  };

  const showToast = useCallback((message: string, onUndo?: () => void) => {
    const id = Math.random().toString(36).substring(7);
    const action: UndoAction = {
      id,
      message,
      action: onUndo || (() => {}),
      timestamp: Date.now(),
    };
    setUndoAction(action);
  }, []);

  const triggerUndo = () => {
    if (undoAction) {
      undoAction.action();
      setUndoAction(null);
    }
  };

  const dismissUndo = () => {
    setUndoAction(null);
  };

  // Toggle Star
  const toggleStarThread = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newStarred = !t.isStarred;
          return {
            ...t,
            isStarred: newStarred,
            messages: t.messages.map((m, idx) =>
              idx === t.messages.length - 1 ? { ...m, starred: newStarred } : m
            ),
          };
        }
        return t;
      })
    );
  };

  // Toggle Important
  const toggleImportantThread = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            isImportant: !t.isImportant,
          };
        }
        return t;
      })
    );
  };

  // Mark Read/Unread
  const markThreadRead = (id: string, read: boolean) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            unreadCount: read ? 0 : 1,
            messages: t.messages.map((m) => ({ ...m, read })),
          };
        }
        return t;
      })
    );
  };

  // Archive
  const archiveThread = (id: string) => {
    const prevThreads = [...threads];
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return { ...t, folder: 'all' as FolderId };
        }
        return t;
      })
    );
    if (activeThreadId === id) {
      setActiveThreadId(null);
    }
    showToast('Conversation archived', () => setThreads(prevThreads));
  };

  // Delete
  const deleteThread = (id: string) => {
    const prevThreads = [...threads];
    setThreads((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      if (target.folder === 'trash') {
        // Permanently delete
        return prev.filter((t) => t.id !== id);
      }
      return prev.map((t) => (t.id === id ? { ...t, folder: 'trash' as FolderId } : t));
    });
    if (activeThreadId === id) {
      setActiveThreadId(null);
    }
    showToast('Conversation moved to Trash', () => setThreads(prevThreads));
  };

  // Restore from Trash
  const restoreThread = (id: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, folder: 'inbox' as FolderId } : t))
    );
    showToast('Conversation restored to Inbox');
  };

  // Snooze
  const snoozeThread = (id: string, until: number) => {
    const prevThreads = [...threads];
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              folder: 'snoozed' as FolderId,
              snoozedUntil: until,
            }
          : t
      )
    );
    if (activeThreadId === id) {
      setActiveThreadId(null);
    }
    showToast('Conversation snoozed', () => setThreads(prevThreads));
  };

  // Label Management on Thread
  const applyLabelToThread = (threadId: string, labelId: string) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === threadId) {
          if (t.labels.includes(labelId)) return t;
          return { ...t, labels: [...t.labels, labelId] };
        }
        return t;
      })
    );
  };

  const removeLabelFromThread = (threadId: string, labelId: string) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === threadId) {
          return { ...t, labels: t.labels.filter((l) => l !== labelId) };
        }
        return t;
      })
    );
  };

  // Bulk Selection
  const toggleSelectThread = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedThreadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllThreads = (ids: string[]) => {
    setSelectedThreadIds(ids);
  };

  const clearSelection = () => {
    setSelectedThreadIds([]);
  };

  // Bulk Actions
  const bulkArchive = () => {
    if (selectedThreadIds.length === 0) return;
    const prevThreads = [...threads];
    const count = selectedThreadIds.length;
    setThreads((prev) =>
      prev.map((t) => (selectedThreadIds.includes(t.id) ? { ...t, folder: 'all' as FolderId } : t))
    );
    clearSelection();
    showToast(`${count} conversations archived`, () => setThreads(prevThreads));
  };

  const bulkDelete = () => {
    if (selectedThreadIds.length === 0) return;
    const prevThreads = [...threads];
    const count = selectedThreadIds.length;
    setThreads((prev) =>
      prev.map((t) => (selectedThreadIds.includes(t.id) ? { ...t, folder: 'trash' as FolderId } : t))
    );
    clearSelection();
    showToast(`${count} conversations moved to Trash`, () => setThreads(prevThreads));
  };

  const bulkMarkRead = (read: boolean) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (selectedThreadIds.includes(t.id)) {
          return {
            ...t,
            unreadCount: read ? 0 : 1,
            messages: t.messages.map((m) => ({ ...m, read })),
          };
        }
        return t;
      })
    );
    clearSelection();
  };

  const bulkStar = (star: boolean) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (selectedThreadIds.includes(t.id)) {
          return {
            ...t,
            isStarred: star,
            messages: t.messages.map((m) => ({ ...m, starred: star })),
          };
        }
        return t;
      })
    );
  };

  const bulkApplyLabel = (labelId: string) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (selectedThreadIds.includes(t.id) && !t.labels.includes(labelId)) {
          return { ...t, labels: [...t.labels, labelId] };
        }
        return t;
      })
    );
    clearSelection();
    showToast(`Label applied to ${selectedThreadIds.length} conversations`);
  };

  const bulkSnooze = (until: number) => {
    const prevThreads = [...threads];
    const count = selectedThreadIds.length;
    setThreads((prev) =>
      prev.map((t) =>
        selectedThreadIds.includes(t.id)
          ? { ...t, folder: 'snoozed' as FolderId, snoozedUntil: until }
          : t
      )
    );
    clearSelection();
    showToast(`${count} conversations snoozed`, () => setThreads(prevThreads));
  };

  const bulkMoveToFolder = (folder: FolderId) => {
    const prevThreads = [...threads];
    const count = selectedThreadIds.length;
    setThreads((prev) =>
      prev.map((t) => (selectedThreadIds.includes(t.id) ? { ...t, folder } : t))
    );
    clearSelection();
    showToast(`Moved ${count} conversations to ${folder}`, () => setThreads(prevThreads));
  };

  // Custom Labels Management
  const createCustomLabel = (name: string, color: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const newLabel: Label = {
      id,
      name,
      color,
      bgColor: `${color}15`,
      textColor: color,
    };
    setLabels((prev) => [...prev, newLabel]);
    showToast(`Label "${name}" created`);
  };

  const deleteCustomLabel = (id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    // Remove label from all threads
    setThreads((prev) =>
      prev.map((t) => ({ ...t, labels: t.labels.filter((l) => l !== id) }))
    );
    if (selectedCustomLabel === id) {
      setSelectedCustomLabel(null);
      setCurrentFolder('inbox');
    }
  };

  // Compose Functions
  const openCompose = (initial?: Partial<ComposeDraft>) => {
    setComposeData({
      ...DEFAULT_COMPOSE_DRAFT,
      ...initial,
    });
    setComposeState('docked');
    setIsComposeOpen(true);
  };

  const closeCompose = () => {
    // If draft has subject or body, auto-save to drafts
    if (composeData.subject.trim() || composeData.body.trim() || composeData.to.trim()) {
      saveDraft(composeData);
    }
    setIsComposeOpen(false);
  };

  const minimizeCompose = () => {
    setComposeState('minimized');
  };

  const maximizeCompose = () => {
    setComposeState((prev) => (prev === 'maximized' ? 'docked' : 'maximized'));
  };

  const restoreCompose = () => {
    setComposeState('docked');
  };

  const updateComposeData = (partial: Partial<ComposeDraft>) => {
    setComposeData((prev) => ({ ...prev, ...partial }));
  };

  const discardDraft = () => {
    setComposeData(DEFAULT_COMPOSE_DRAFT);
    setIsComposeOpen(false);
    showToast('Draft discarded');
  };

  const saveDraft = (draft: ComposeDraft) => {
    const draftMessage: Message = {
      id: `draft-${Date.now()}`,
      threadId: draft.threadId || `thread-draft-${Date.now()}`,
      from: { name: currentUser.name, email: currentUser.email, avatar: currentUser.avatar },
      to: draft.to ? [{ name: draft.to.split('@')[0], email: draft.to }] : [],
      subject: draft.subject || '(no subject)',
      body: draft.body || '',
      snippet: draft.body.replace(/<[^>]*>?/gm, '').substring(0, 100) || '(no content)',
      date: Date.now(),
      read: true,
      starred: false,
      important: false,
      labels: [],
      category: 'primary',
      attachments: draft.attachments,
      isDraft: true,
    };

    const newThread: Thread = {
      id: draftMessage.threadId,
      subject: draftMessage.subject,
      snippet: `Draft: ${draftMessage.snippet}`,
      messages: [draftMessage],
      lastMessageDate: Date.now(),
      participants: [draftMessage.from],
      unreadCount: 0,
      isStarred: false,
      isImportant: false,
      labels: [],
      category: 'primary',
      folder: 'drafts',
      hasAttachments: (draft.attachments?.length || 0) > 0,
    };

    setThreads((prev) => [newThread, ...prev]);
    showToast('Draft saved in Drafts folder');
  };

  const sendEmail = (draftToSend?: ComposeDraft) => {
    const data = draftToSend || composeData;
    if (!data.to.trim() && !data.subject.trim() && !data.body.trim()) {
      showToast('Please specify a recipient');
      return;
    }

    const newMessage: Message = {
      id: `sent-${Date.now()}`,
      threadId: data.threadId || `thread-sent-${Date.now()}`,
      from: { name: currentUser.name, email: currentUser.email, avatar: currentUser.avatar },
      to: data.to.split(',').map((email) => ({
        name: email.trim().split('@')[0],
        email: email.trim(),
      })),
      subject: data.subject || '(no subject)',
      body: data.body ? (data.body.startsWith('<') ? data.body : `<p>${data.body.replace(/\n/g, '<br>')}</p>`) : '<p></p>',
      snippet: data.body.replace(/<[^>]*>?/gm, '').substring(0, 100) || '(no content)',
      date: Date.now(),
      read: true,
      starred: false,
      important: false,
      labels: [],
      category: 'primary',
      attachments: data.attachments,
    };

    const newThread: Thread = {
      id: newMessage.threadId,
      subject: newMessage.subject,
      snippet: newMessage.snippet,
      messages: [newMessage],
      lastMessageDate: Date.now(),
      participants: [newMessage.from, ...newMessage.to],
      unreadCount: 0,
      isStarred: false,
      isImportant: false,
      labels: [],
      category: 'primary',
      folder: 'sent',
      hasAttachments: (data.attachments?.length || 0) > 0,
    };

    const prevThreads = [...threads];
    setThreads((prev) => [newThread, ...prev]);
    setIsComposeOpen(false);
    setComposeData(DEFAULT_COMPOSE_DRAFT);

    showToast('Message sent', () => {
      setThreads(prevThreads);
    });
  };

  const scheduleEmail = (_draft: ComposeDraft, timestamp: number) => {
    const dateStr = new Date(timestamp).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    setIsComposeOpen(false);
    setComposeData(DEFAULT_COMPOSE_DRAFT);
    showToast(`Message scheduled for ${dateStr}`);
  };

  // Reply within thread view
  const sendReply = (
    threadId: string,
    body: string,
    replyType: 'reply' | 'replyAll' | 'forward',
    attachments?: Attachment[]
  ) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    const lastMsg = thread.messages[thread.messages.length - 1];
    let toRecipients: { name: string; email: string }[] = [];

    if (replyType === 'reply') {
      toRecipients = [lastMsg.from];
    } else if (replyType === 'replyAll') {
      toRecipients = [lastMsg.from, ...lastMsg.to.filter((r) => r.email !== currentUser.email)];
    } else {
      toRecipients = [{ name: 'Recipient', email: 'recipient@example.com' }];
    }

    const newMsg: Message = {
      id: `msg-reply-${Date.now()}`,
      threadId,
      from: { name: currentUser.name, email: currentUser.email, avatar: currentUser.avatar },
      to: toRecipients,
      subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
      body: body.startsWith('<') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`,
      snippet: body.replace(/<[^>]*>?/gm, '').substring(0, 100),
      date: Date.now(),
      read: true,
      starred: false,
      important: false,
      labels: thread.labels,
      category: thread.category,
      attachments,
    };

    const prevThreads = [...threads];
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === threadId) {
          const updatedMessages = [...t.messages, newMsg];
          return {
            ...t,
            messages: updatedMessages,
            lastMessageDate: Date.now(),
            snippet: newMsg.snippet,
            participants: [
              ...t.participants.filter((p) => p.email !== currentUser.email),
              newMsg.from,
            ],
            hasAttachments: t.hasAttachments || (attachments?.length || 0) > 0,
          };
        }
        return t;
      })
    );

    showToast('Reply sent', () => setThreads(prevThreads));
  };

  // Switch User
  const switchUser = (id: string) => {
    const user = allAccounts.find((a) => a.id === id);
    if (user) {
      setCurrentUser(user);
      setActiveAccountModal(false);
      showToast(`Switched account to ${user.email}`);
    }
  };

  // Reset demo data
  const resetDemoData = () => {
    setThreads(INITIAL_THREADS);
    setLabels(INITIAL_LABELS);
    setSettings(INITIAL_SETTINGS);
    setCurrentFolder('inbox');
    setCurrentCategory('primary');
    setSelectedCustomLabel(null);
    setActiveThreadId(null);
    setSelectedThreadIds([]);
    localStorage.removeItem(STORAGE_KEYS.THREADS);
    localStorage.removeItem(STORAGE_KEYS.LABELS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    showToast('Mailbox reset to fresh demo data');
  };

  // Filter threads based on folder, category, custom label, and search
  const filteredThreads = useMemo(() => {
    let result = threads;

    // 1. Search Query Filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      // Parse query operators
      const fromMatch = query.match(/from:([^\s]+)/);
      const toMatch = query.match(/to:([^\s]+)/);
      const subjectMatch = query.match(/subject:([^\s]+)/);
      const labelMatch = query.match(/label:([^\s]+)/);
      const hasAttachment = query.includes('has:attachment');
      const isStarred = query.includes('is:starred');
      const isUnread = query.includes('is:unread');
      const isRead = query.includes('is:read');

      // Strip operators for free text matching
      const cleanText = query
        .replace(/from:[^\s]+/g, '')
        .replace(/to:[^\s]+/g, '')
        .replace(/subject:[^\s]+/g, '')
        .replace(/label:[^\s]+/g, '')
        .replace(/has:attachment/g, '')
        .replace(/is:starred/g, '')
        .replace(/is:unread/g, '')
        .replace(/is:read/g, '')
        .trim();

      result = result.filter((thread) => {
        if (fromMatch && !thread.participants.some((p) => p.name.toLowerCase().includes(fromMatch[1]) || p.email.toLowerCase().includes(fromMatch[1]))) {
          return false;
        }
        if (toMatch && !thread.messages.some((m) => m.to.some((t) => t.email.toLowerCase().includes(toMatch[1])))) {
          return false;
        }
        if (subjectMatch && !thread.subject.toLowerCase().includes(subjectMatch[1])) {
          return false;
        }
        if (labelMatch && !thread.labels.includes(labelMatch[1])) {
          return false;
        }
        if (hasAttachment && !thread.hasAttachments) {
          return false;
        }
        if (isStarred && !thread.isStarred) {
          return false;
        }
        if (isUnread && thread.unreadCount === 0) {
          return false;
        }
        if (isRead && thread.unreadCount > 0) {
          return false;
        }

        if (cleanText) {
          const matchSubject = thread.subject.toLowerCase().includes(cleanText);
          const matchSnippet = thread.snippet.toLowerCase().includes(cleanText);
          const matchSender = thread.participants.some(
            (p) => p.name.toLowerCase().includes(cleanText) || p.email.toLowerCase().includes(cleanText)
          );
          const matchBody = thread.messages.some((m) => m.body.toLowerCase().includes(cleanText));
          if (!matchSubject && !matchSnippet && !matchSender && !matchBody) {
            return false;
          }
        }
        return true;
      });

      return result.sort((a, b) => b.lastMessageDate - a.lastMessageDate);
    }

    // 2. Custom Label Filter
    if (selectedCustomLabel) {
      return result
        .filter((t) => t.labels.includes(selectedCustomLabel) && t.folder !== 'trash')
        .sort((a, b) => b.lastMessageDate - a.lastMessageDate);
    }

    // 3. System Folder Filter
    if (currentFolder === 'inbox') {
      result = result.filter((t) => t.folder === 'inbox' && t.category === currentCategory);
    } else if (currentFolder === 'starred') {
      result = result.filter((t) => t.isStarred && t.folder !== 'trash');
    } else if (currentFolder === 'snoozed') {
      result = result.filter((t) => t.folder === 'snoozed');
    } else if (currentFolder === 'sent') {
      result = result.filter((t) => t.folder === 'sent');
    } else if (currentFolder === 'drafts') {
      result = result.filter((t) => t.folder === 'drafts');
    } else if (currentFolder === 'trash') {
      result = result.filter((t) => t.folder === 'trash');
    } else if (currentFolder === 'spam') {
      result = result.filter((t) => t.folder === 'spam');
    } else if (currentFolder === 'important') {
      result = result.filter((t) => t.isImportant && t.folder !== 'trash');
    } else if (currentFolder === 'all') {
      result = result.filter((t) => t.folder !== 'trash' && t.folder !== 'spam');
    }

    return result.sort((a, b) => b.lastMessageDate - a.lastMessageDate);
  }, [threads, searchQuery, selectedCustomLabel, currentFolder, currentCategory]);

  // Active Thread
  const activeThread = useMemo(() => {
    if (!activeThreadId) return null;
    return threads.find((t) => t.id === activeThreadId) || null;
  }, [threads, activeThreadId]);

  // Counts for folders
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      inbox: 0,
      primary: 0,
      promotions: 0,
      social: 0,
      updates: 0,
      starred: 0,
      snoozed: 0,
      sent: 0,
      drafts: 0,
      trash: 0,
      spam: 0,
      important: 0,
    };

    threads.forEach((t) => {
      if (t.folder === 'inbox') {
        if (t.unreadCount > 0) {
          counts.inbox += t.unreadCount;
          if (t.category) counts[t.category] = (counts[t.category] || 0) + t.unreadCount;
        }
      }
      if (t.isStarred && t.folder !== 'trash') counts.starred += 1;
      if (t.folder === 'snoozed') counts.snoozed += 1;
      if (t.folder === 'sent') counts.sent += 1;
      if (t.folder === 'drafts') counts.drafts += 1;
      if (t.folder === 'trash') counts.trash += 1;
      if (t.folder === 'spam') counts.spam += 1;
      if (t.isImportant && t.unreadCount > 0 && t.folder !== 'trash') counts.important += 1;

      // Custom labels
      t.labels.forEach((l) => {
        if (t.unreadCount > 0 && t.folder !== 'trash') {
          counts[l] = (counts[l] || 0) + t.unreadCount;
        }
      });
    });

    return counts;
  }, [threads]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchFilters({ query: '' });
  };

  return (
    <MailContext.Provider
      value={{
        currentFolder,
        setCurrentFolder,
        currentCategory,
        setCurrentCategory,
        selectedCustomLabel,
        setSelectedCustomLabel,
        activeThreadId,
        setActiveThreadId,

        threads,
        activeThread,
        labels,
        currentUser,
        allAccounts,
        switchUser,

        toggleStarThread,
        toggleImportantThread,
        markThreadRead,
        archiveThread,
        deleteThread,
        restoreThread,
        snoozeThread,
        applyLabelToThread,
        removeLabelFromThread,

        selectedThreadIds,
        toggleSelectThread,
        selectAllThreads,
        clearSelection,
        bulkArchive,
        bulkDelete,
        bulkMarkRead,
        bulkStar,
        bulkApplyLabel,
        bulkSnooze,
        bulkMoveToFolder,

        searchQuery,
        setSearchQuery,
        searchFilters,
        setSearchFilters,
        clearSearch,
        filteredThreads,

        isComposeOpen,
        composeState,
        composeData,
        openCompose,
        closeCompose,
        minimizeCompose,
        maximizeCompose,
        restoreCompose,
        updateComposeData,
        sendEmail,
        scheduleEmail,
        discardDraft,
        sendReply,

        isSettingsOpen,
        setIsSettingsOpen,
        isShortcutsOpen,
        setIsShortcutsOpen,
        isSearchModalOpen,
        setIsSearchModalOpen,
        isCreateLabelModalOpen,
        setIsCreateLabelModalOpen,
        snoozeTargetThreadId,
        setSnoozeTargetThreadId,
        activeAccountModal,
        setActiveAccountModal,
        googleAppsOpen,
        setGoogleAppsOpen,

        density,
        setDensity,
        theme,
        setTheme,
        toggleTheme,
        settings,
        updateSettings,

        sidebarExpanded,
        setSidebarExpanded,
        mobileMenuOpen,
        setMobileMenuOpen,
        activeRightPanel,
        setActiveRightPanel,

        createCustomLabel,
        deleteCustomLabel,

        undoAction,
        triggerUndo,
        dismissUndo,
        showToast,
        resetDemoData,

        folderCounts,
      }}
    >
      {children}
    </MailContext.Provider>
  );
};

export const useMail = () => {
  const context = useContext(MailContext);
  if (!context) {
    throw new Error('useMail must be used within a MailProvider');
  }
  return context;
};
