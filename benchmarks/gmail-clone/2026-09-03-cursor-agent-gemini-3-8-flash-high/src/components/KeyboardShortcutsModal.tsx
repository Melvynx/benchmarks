import React, { useRef, useEffect } from 'react';
import { useMail } from '../context/MailContext';
import { Keyboard, X } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setIsShortcutsOpen } = useMail();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsShortcutsOpen(false);
      }
    };
    if (isShortcutsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShortcutsOpen, setIsShortcutsOpen]);

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { key: 'j / k', desc: 'Next / previous conversation' },
        { key: 'o or Enter', desc: 'Open conversation' },
        { key: 'u', desc: 'Return to conversation list' },
        { key: '/', desc: 'Focus search bar' },
        { key: 'g then i', desc: 'Go to Inbox' },
        { key: 'g then s', desc: 'Go to Starred' },
        { key: 'g then t', desc: 'Go to Sent' },
        { key: 'g then d', desc: 'Go to Drafts' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { key: 'c', desc: 'Compose new message' },
        { key: 'e or y', desc: 'Archive conversation' },
        { key: '# or d', desc: 'Delete conversation' },
        { key: 's', desc: 'Toggle star' },
        { key: 'x', desc: 'Select / deselect conversation' },
        { key: 'r', desc: 'Reply in thread' },
        { key: 'a', desc: 'Reply all in thread' },
        { key: 'f', desc: 'Forward in thread' },
      ],
    },
    {
      category: 'Application',
      items: [
        { key: '?', desc: 'Show keyboard shortcuts' },
        { key: 'Esc', desc: 'Close dialog / cancel action' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 select-none">
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-white dark:bg-[#282a2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 text-xs text-gray-800 dark:text-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base">Keyboard shortcuts</h3>
          </div>
          <button
            onClick={() => setIsShortcutsOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
          {shortcuts.map((group) => (
            <div key={group.category} className="space-y-2">
              <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                {group.category}
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <span className="text-gray-600 dark:text-gray-300">{item.desc}</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 shadow-sm shrink-0">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={() => setIsShortcutsOpen(false)}
            className="px-5 py-2 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-lg font-medium shadow-sm transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
