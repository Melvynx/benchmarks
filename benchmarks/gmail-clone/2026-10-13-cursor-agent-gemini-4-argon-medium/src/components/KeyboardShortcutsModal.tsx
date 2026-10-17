import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { ThemeMode } from '../types/mail';

interface KeyboardShortcutsModalProps {
  theme: ThemeMode;
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  theme,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const shortcuts = [
    { key: 'c', desc: 'Compose new message' },
    { key: '/', desc: 'Focus mail search bar' },
    { key: 'j / k', desc: 'Move focus to older / newer thread' },
    { key: 'Enter / o', desc: 'Open focused conversation' },
    { key: 'u / Esc', desc: 'Back to thread list / close dialog' },
    { key: 'e', desc: 'Archive selected or open conversation' },
    { key: '#', desc: 'Delete selected or open conversation' },
    { key: 's', desc: 'Toggle star on focused or open conversation' },
    { key: 'Shift + I', desc: 'Mark selected as read' },
    { key: 'Shift + U', desc: 'Mark selected as unread' },
    { key: '?', desc: 'Open keyboard shortcuts help' },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl shadow-2xl border p-6 ${
          isDark
            ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
            : 'bg-white border-gray-200 text-[#1f1f1f]'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200/70 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[#1a73e8]" />
            <h3 className="font-display text-lg font-medium">
              Keyboard shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {shortcuts.map((item) => (
            <div
              key={item.key}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                isDark
                  ? 'bg-[#1e1f23] border-white/10'
                  : 'bg-gray-50 border-gray-200/80'
              }`}
            >
              <span className="opacity-85">{item.desc}</span>
              <kbd
                className={`px-2 py-1 rounded-md font-mono text-[11px] font-semibold shrink-0 border ${
                  isDark
                    ? 'bg-[#282a2c] border-white/20 text-[#a8c7fa]'
                    : 'bg-white border-gray-300 text-gray-800 shadow-2xs'
                }`}
              >
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
