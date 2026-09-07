import React from 'react';
import { MailRow } from './MailRow';
import { useMail } from '../context/MailContext';
import {
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  Trash2,
  AlertOctagon,
  Search,
  Plus,
} from 'lucide-react';

export const MailList: React.FC = () => {
  const {
    filteredThreads,
    density,
    selectedThreadIds,
    toggleSelectThread,
    setActiveThreadId,
    currentFolder,
    currentCategory,
    selectedCustomLabel,
    searchQuery,
    openCompose,
  } = useMail();

  // If no threads match
  if (filteredThreads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#1a1a1a] select-none">
        <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-4 text-blue-500">
          {searchQuery ? (
            <Search className="w-10 h-10" />
          ) : currentFolder === 'starred' ? (
            <Star className="w-10 h-10" />
          ) : currentFolder === 'snoozed' ? (
            <Clock className="w-10 h-10" />
          ) : currentFolder === 'trash' ? (
            <Trash2 className="w-10 h-10" />
          ) : currentFolder === 'sent' ? (
            <Send className="w-10 h-10" />
          ) : currentFolder === 'drafts' ? (
            <FileText className="w-10 h-10" />
          ) : currentFolder === 'spam' ? (
            <AlertOctagon className="w-10 h-10" />
          ) : (
            <Inbox className="w-10 h-10" />
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
          {searchQuery
            ? `No messages matching "${searchQuery}"`
            : selectedCustomLabel
            ? `No messages with label "${selectedCustomLabel}"`
            : currentFolder === 'starred'
            ? 'No starred messages'
            : currentFolder === 'snoozed'
            ? 'No snoozed messages'
            : currentFolder === 'sent'
            ? 'No sent messages'
            : currentFolder === 'drafts'
            ? 'No saved drafts'
            : currentFolder === 'trash'
            ? 'Trash is empty'
            : currentFolder === 'spam'
            ? 'Hooray, no spam here!'
            : `Your ${currentCategory} tab is empty`}
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          {searchQuery
            ? 'Try checking for spelling errors or using fewer keywords.'
            : currentFolder === 'starred'
            ? 'Stars let you give messages a special status to make them easier to find.'
            : currentFolder === 'snoozed'
            ? 'Messages you snooze will appear here until their scheduled time.'
            : currentFolder === 'trash'
            ? 'Messages that have been in Trash more than 30 days are automatically deleted.'
            : 'You have reached inbox zero! Enjoy your day.'}
        </p>

        <button
          onClick={() => openCompose()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-full font-medium text-sm shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Compose an email
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a] relative">
      <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
        {filteredThreads.map((thread) => (
          <MailRow
            key={thread.id}
            thread={thread}
            density={density}
            isSelected={selectedThreadIds.includes(thread.id)}
            onSelect={(e) => toggleSelectThread(thread.id, e)}
            onClick={() => setActiveThreadId(thread.id)}
          />
        ))}
      </div>

      {/* Mobile Floating Action Button (FAB) for Compose */}
      <button
        onClick={() => openCompose()}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#c2e7ff] text-[#001d35] rounded-2xl shadow-hover flex items-center justify-center z-40 active:scale-95 transition-transform"
        aria-label="Compose email"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};
