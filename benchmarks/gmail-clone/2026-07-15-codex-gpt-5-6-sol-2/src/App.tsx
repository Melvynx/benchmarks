import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ComposeWindow } from './components/ComposeWindow';
import { MailboxView } from './components/MailboxView';
import { SettingsPanel } from './components/SettingsPanel';
import type { Density, InboxType, ThemePreference } from './components/SettingsPanel';
import { Sidebar } from './components/Sidebar';
import { ThreadView } from './components/ThreadView';
import { Toast } from './components/Toast';
import { TopBar } from './components/TopBar';
import { WorkspaceRail } from './components/WorkspaceRail';
import type { WorkspaceTool } from './components/WorkspaceRail';
import { CONTACT_SUGGESTIONS, CURRENT_USER } from './data/seedMailbox';
import type { ComposeDraft, MailCategory, ToastState } from './domain/mail';
import { useMailbox } from './hooks/useMailbox';

const UI_PREFERENCES_KEY = 'gpt-5-6-sol-ui-v1';
const DEFAULT_SNOOZE_HOUR = 9;

interface UiPreferences {
  density: Density;
  theme: ThemePreference;
  inboxType: InboxType;
}

const DEFAULT_PREFERENCES: UiPreferences = {
  density: 'comfortable',
  theme: 'light',
  inboxType: 'default',
};

function readUiPreferences(): UiPreferences {
  try {
    const stored = window.localStorage.getItem(UI_PREFERENCES_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(stored) as Partial<UiPreferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function getTomorrowMorning(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(DEFAULT_SNOOZE_HOUR, 0, 0, 0);
  return tomorrow;
}

function replySubject(subject: string): string {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function forwardSubject(subject: string): string {
  return /^fwd:/i.test(subject) ? subject : `Fwd: ${subject}`;
}

export function App() {
  const mailbox = useMailbox();
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<WorkspaceTool | null>(null);
  const [preferences, setPreferences] = useState(readUiPreferences);
  const [localToast, setLocalToast] = useState<ToastState | null>(null);

  const currentCategory: MailCategory =
    mailbox.currentCategory === 'all' ? 'primary' : mailbox.currentCategory;
  const selectedIds = new Set(mailbox.selectedThreadIds);
  const displayedThreads =
    preferences.inboxType === 'unread-first' && mailbox.currentMailbox === 'inbox'
      ? [...mailbox.visibleThreads].sort((first, second) => Number(first.isRead) - Number(second.isRead))
      : mailbox.visibleThreads;
  const mailboxTotal = mailbox.searchQuery
    ? mailbox.visibleThreads.length
    : mailbox.currentMailbox === 'inbox'
      ? mailbox.categoryCounts[currentCategory]
      : mailbox.mailboxCounts[mailbox.currentMailbox];
  const visibleToast = mailbox.toast ?? localToast;

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.density = preferences.density;
    window.localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!localToast) return undefined;
    const timeout = window.setTimeout(() => setLocalToast(null), 4_500);
    return () => window.clearTimeout(timeout);
  }, [localToast]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (isTyping) return;

      const key = event.key.toLocaleLowerCase();
      if (key === 'c') {
        event.preventDefault();
        mailbox.startCompose();
      } else if (key === '/') {
        event.preventDefault();
        document.getElementById('mail-search')?.focus();
      } else if (key === 'e' && (mailbox.activeThreadId || mailbox.hasSelection)) {
        event.preventDefault();
        mailbox.archive();
      } else if (event.key === '#' && (mailbox.activeThreadId || mailbox.hasSelection)) {
        event.preventDefault();
        mailbox.moveToTrash();
      } else if (key === 'u' && mailbox.activeThreadId) {
        event.preventDefault();
        mailbox.closeThread();
      } else if ((key === 'j' || key === 'k') && displayedThreads.length > 0) {
        event.preventDefault();
        const activeIndex = displayedThreads.findIndex((thread) => thread.id === mailbox.activeThreadId);
        const direction = key === 'j' ? 1 : -1;
        const nextIndex = Math.min(
          Math.max(activeIndex < 0 ? 0 : activeIndex + direction, 0),
          displayedThreads.length - 1,
        );
        mailbox.openThread(displayedThreads[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  });

  const notify = (message: string) => {
    setLocalToast({ id: Date.now(), message });
  };

  const navigateToMailbox = (mailboxId: Parameters<typeof mailbox.setCurrentMailbox>[0]) => {
    mailbox.clearSearch();
    mailbox.setCurrentMailbox(mailboxId);
  };

  const snoozeThread = (threadId: string) => {
    mailbox.snooze(getTomorrowMorning(), threadId);
  };

  const snoozeSelected = () => {
    mailbox.snooze(getTomorrowMorning());
  };

  const openReply = () => {
    const thread = mailbox.activeThread;
    const lastMessage = thread?.messages.at(-1);
    if (!thread || !lastMessage) return;
    const replyContact =
      lastMessage.sender.email === CURRENT_USER.email
        ? lastMessage.recipients.find((contact) => contact.email !== CURRENT_USER.email) ??
          thread.participants.find((contact) => contact.email !== CURRENT_USER.email)
        : lastMessage.sender;
    if (!replyContact) return;
    mailbox.startCompose({
      replyToThreadId: thread.id,
      to: replyContact.email,
      subject: replySubject(thread.subject),
      body: `\n\nOn ${new Date(lastMessage.timestamp).toLocaleDateString()}, ${lastMessage.sender.name} wrote:\n> ${lastMessage.body[0]}`,
    });
  };

  const openForward = () => {
    const thread = mailbox.activeThread;
    const lastMessage = thread?.messages.at(-1);
    if (!thread || !lastMessage) return;
    mailbox.startCompose({
      subject: forwardSubject(thread.subject),
      body: `\n\nForwarded message\nFrom: ${lastMessage.sender.name} <${lastMessage.sender.email}>\n\n${lastMessage.body.join('\n\n')}`,
    });
  };

  const updateCompose = (patch: Partial<ComposeDraft>) => {
    if (patch.isMinimized === true) mailbox.minimizeCompose();
    if (patch.isMinimized === false) mailbox.restoreCompose();
    const { isMinimized: _isMinimized, id: _id, updatedAt: _updatedAt, ...fields } = patch;
    mailbox.updateCompose(fields);
  };

  return (
    <div className="app-shell">
      <TopBar
        currentUser={CURRENT_USER}
        query={mailbox.searchQuery}
        onQueryChange={mailbox.setSearchQuery}
        onToggleNavigation={() => {
          if (window.matchMedia('(max-width: 760px)').matches) {
            setIsMobileNavigationOpen((open) => !open);
          } else {
            setIsNavigationCollapsed((collapsed) => !collapsed);
          }
        }}
        onOpenSettings={() => {
          setActiveTool(null);
          setIsSettingsOpen(true);
        }}
        onOpenTool={(tool) => {
          setIsSettingsOpen(false);
          setActiveTool((current) => (current === tool ? null : tool));
        }}
        onNotify={notify}
      />

      <div className="app-body">
        <Sidebar
          currentMailbox={mailbox.currentMailbox}
          counts={mailbox.mailboxCounts}
          labels={mailbox.availableLabels}
          isCollapsed={isNavigationCollapsed}
          isMobileOpen={isMobileNavigationOpen}
          onCompose={() => mailbox.startCompose()}
          onNavigate={navigateToMailbox}
          onLabelClick={(label) =>
            mailbox.setSearchQuery(`label:"${label.replaceAll('"', '')}"`)
          }
          onCloseMobile={() => setIsMobileNavigationOpen(false)}
          onNotify={notify}
        />

        <main className="mail-surface">
          {mailbox.activeThread ? (
            <ThreadView
              key={mailbox.activeThread.id}
              thread={mailbox.activeThread}
              labels={mailbox.availableLabels}
              onBack={mailbox.closeThread}
              onArchive={() => mailbox.archive(mailbox.activeThread?.id)}
              onTrash={() => mailbox.moveToTrash(mailbox.activeThread?.id)}
              onToggleRead={() => mailbox.toggleRead(mailbox.activeThread?.id ?? '')}
              onStar={() => mailbox.toggleStar(mailbox.activeThread?.id ?? '')}
              onSnooze={() => {
                if (mailbox.activeThread) snoozeThread(mailbox.activeThread.id);
              }}
              onLabel={(label) => mailbox.toggleLabel(label, mailbox.activeThread?.id)}
              onRestore={() => mailbox.restore(mailbox.activeThread?.id)}
              onDeleteForever={() => mailbox.deletePermanently(mailbox.activeThread?.id)}
              onReply={openReply}
              onForward={openForward}
              onNotify={notify}
            />
          ) : (
            <MailboxView
              threads={displayedThreads}
              currentMailbox={mailbox.currentMailbox}
              currentCategory={currentCategory}
              categoryCounts={mailbox.categoryCounts}
              selectedIds={selectedIds}
              totalCount={mailboxTotal}
              query={mailbox.searchQuery}
              labels={mailbox.availableLabels}
              onCategoryChange={mailbox.setCurrentCategory}
              onSelect={mailbox.toggleThreadSelection}
              onToggleAll={mailbox.toggleSelectAllVisible}
              onClearSelection={mailbox.clearSelection}
              onOpen={mailbox.openThread}
              onStar={mailbox.toggleStar}
              onToggleRead={mailbox.toggleRead}
              onArchive={(threadId) => mailbox.archive(threadId)}
              onTrash={(threadId) => mailbox.moveToTrash(threadId)}
              onSnooze={snoozeThread}
              onRestore={(threadId) => mailbox.restore(threadId)}
              onDeleteThreadForever={(threadId) => mailbox.deletePermanently(threadId)}
              onArchiveSelected={() => mailbox.archive()}
              onTrashSelected={() => mailbox.moveToTrash()}
              onMarkSelectedUnread={() => mailbox.markAsUnread()}
              onSnoozeSelected={snoozeSelected}
              onLabelSelected={(label) => mailbox.toggleLabel(label)}
              onRestoreSelected={() => mailbox.restore()}
              onDeleteForever={() => mailbox.deletePermanently()}
              onClearSearch={mailbox.clearSearch}
              onCompose={() => mailbox.startCompose()}
              onNotify={notify}
            />
          )}
        </main>

        <WorkspaceRail
          activeTool={activeTool}
          contacts={CONTACT_SUGGESTIONS}
          onOpenTool={(tool) => {
            setIsSettingsOpen(false);
            setActiveTool((current) => (current === tool ? null : tool));
          }}
          onClose={() => setActiveTool(null)}
          onComposeTo={(email) => {
            mailbox.startCompose({ to: email });
            setActiveTool(null);
          }}
        />
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        density={preferences.density}
        theme={preferences.theme}
        inboxType={preferences.inboxType}
        onClose={() => setIsSettingsOpen(false)}
        onDensityChange={(density) => setPreferences((current) => ({ ...current, density }))}
        onThemeChange={(theme) => setPreferences((current) => ({ ...current, theme }))}
        onInboxTypeChange={(inboxType) => setPreferences((current) => ({ ...current, inboxType }))}
      />

      {mailbox.composeDraft ? (
        <ComposeWindow
          key={mailbox.composeDraft.id}
          draft={mailbox.composeDraft}
          suggestions={CONTACT_SUGGESTIONS}
          onChange={updateCompose}
          onMinimize={mailbox.minimizeCompose}
          onClose={() => mailbox.closeCompose()}
          onDiscard={mailbox.discardCompose}
          onSend={mailbox.sendMessage}
        />
      ) : null}

      <button type="button" className="mobile-compose-button" onClick={() => mailbox.startCompose()}>
        <Pencil aria-hidden="true" />
        <span>Compose</span>
      </button>

      <Toast
        toast={visibleToast}
        onAction={mailbox.toast?.action === 'undo' ? mailbox.undoLastAction : () => undefined}
        onClose={mailbox.toast ? mailbox.dismissToast : () => setLocalToast(null)}
      />
    </div>
  );
}
