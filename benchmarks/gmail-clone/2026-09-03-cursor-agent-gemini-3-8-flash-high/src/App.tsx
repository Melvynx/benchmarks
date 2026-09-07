import React, { useEffect, useState } from 'react';
import { MailProvider, useMail } from './context/MailContext';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { CategoryTabs } from './components/CategoryTabs';
import { MailToolbar } from './components/MailToolbar';
import { MailList } from './components/MailList';
import { ThreadView } from './components/ThreadView';
import { RightSidebar } from './components/RightSidebar';
import { ComposeModal } from './components/ComposeModal';
import { SearchFilterModal } from './components/SearchFilterModal';
import { SnoozeModal } from './components/SnoozeModal';
import { LabelManagerModal } from './components/LabelManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { AccountSwitcherModal } from './components/AccountSwitcherModal';
import { GoogleAppsPopover } from './components/GoogleAppsPopover';
import { Snackbar } from './components/Snackbar';

const MailApp: React.FC = () => {
  const {
    activeThreadId,
    setActiveThreadId,
    openCompose,
    archiveThread,
    deleteThread,
    toggleStarThread,
    selectedThreadIds,
    bulkArchive,
    bulkDelete,
    filteredThreads,
    settings,
    setIsShortcutsOpen,
    setCurrentFolder,
  } = useMail();

  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [gKeyPressed, setGKeyPressed] = useState<boolean>(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!settings.keyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // 'g' key prefix sequence: gi (inbox), gs (starred), gt (sent), gd (drafts)
      if (key === 'g') {
        setGKeyPressed(true);
        setTimeout(() => setGKeyPressed(false), 1500);
        return;
      }

      if (gKeyPressed) {
        setGKeyPressed(false);
        if (key === 'i') {
          setCurrentFolder('inbox');
          return;
        } else if (key === 's') {
          setCurrentFolder('starred');
          return;
        } else if (key === 't') {
          setCurrentFolder('sent');
          return;
        } else if (key === 'd') {
          setCurrentFolder('drafts');
          return;
        }
      }

      // '?' opens shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // 'c' opens compose
      if (key === 'c') {
        e.preventDefault();
        openCompose();
        return;
      }

      // 'u' returns to list from thread
      if (key === 'u' && activeThreadId) {
        e.preventDefault();
        setActiveThreadId(null);
        return;
      }

      // 'j' next conversation
      if (key === 'j') {
        e.preventDefault();
        if (activeThreadId) {
          const currentIndex = filteredThreads.findIndex((t) => t.id === activeThreadId);
          if (currentIndex < filteredThreads.length - 1) {
            setActiveThreadId(filteredThreads[currentIndex + 1].id);
          }
        } else {
          setFocusedIndex((prev) => Math.min(prev + 1, filteredThreads.length - 1));
        }
        return;
      }

      // 'k' previous conversation
      if (key === 'k') {
        e.preventDefault();
        if (activeThreadId) {
          const currentIndex = filteredThreads.findIndex((t) => t.id === activeThreadId);
          if (currentIndex > 0) {
            setActiveThreadId(filteredThreads[currentIndex - 1].id);
          }
        } else {
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        }
        return;
      }

      // 'o' or Enter opens focused conversation
      if ((key === 'o' || e.key === 'Enter') && !activeThreadId) {
        if (filteredThreads[focusedIndex]) {
          e.preventDefault();
          setActiveThreadId(filteredThreads[focusedIndex].id);
        }
        return;
      }

      // 'e' or 'y' archives conversation
      if (key === 'e' || key === 'y') {
        e.preventDefault();
        if (activeThreadId) {
          archiveThread(activeThreadId);
        } else if (selectedThreadIds.length > 0) {
          bulkArchive();
        } else if (filteredThreads[focusedIndex]) {
          archiveThread(filteredThreads[focusedIndex].id);
        }
        return;
      }

      // '#' or 'd' deletes conversation
      if (key === '#' || key === 'd') {
        e.preventDefault();
        if (activeThreadId) {
          deleteThread(activeThreadId);
        } else if (selectedThreadIds.length > 0) {
          bulkDelete();
        } else if (filteredThreads[focusedIndex]) {
          deleteThread(filteredThreads[focusedIndex].id);
        }
        return;
      }

      // 's' toggles star
      if (key === 's') {
        e.preventDefault();
        if (activeThreadId) {
          toggleStarThread(activeThreadId);
        } else if (filteredThreads[focusedIndex]) {
          toggleStarThread(filteredThreads[focusedIndex].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    settings.keyboardShortcuts,
    gKeyPressed,
    activeThreadId,
    filteredThreads,
    focusedIndex,
    selectedThreadIds,
    openCompose,
    setActiveThreadId,
    setCurrentFolder,
    setIsShortcutsOpen,
    archiveThread,
    deleteThread,
    toggleStarThread,
    bulkArchive,
    bulkDelete,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f6f8fc] dark:bg-[#1f1f1f] text-[#202124] dark:text-[#e3e3e3] select-none font-sans">
      {/* Top Application Bar */}
      <TopBar />

      {/* Main Mail Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Center Mailbox Content: Thread List OR Thread Details */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1a1a1a] rounded-t-2xl md:rounded-tl-2xl overflow-hidden shadow-sm border-t border-l border-gray-200/60 dark:border-gray-800">
          {activeThreadId ? (
            <ThreadView />
          ) : (
            <>
              <MailToolbar />
              <CategoryTabs />
              <MailList />
            </>
          )}
        </main>

        {/* Right Companion Sidebar (Calendar, Keep, Tasks, Contacts) */}
        <RightSidebar />
      </div>

      {/* Overlays, Modals, & Compose */}
      <ComposeModal />
      <SearchFilterModal />
      <SnoozeModal />
      <LabelManagerModal />
      <SettingsModal />
      <KeyboardShortcutsModal />
      <AccountSwitcherModal />
      <GoogleAppsPopover />
      <Snackbar />
    </div>
  );
};

export function App() {
  return (
    <MailProvider>
      <MailApp />
    </MailProvider>
  );
}

export default App;
