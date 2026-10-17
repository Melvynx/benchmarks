import React from 'react';
import { X, Keyboard, Search } from 'lucide-react';
import { ThemeMode } from '../types/mail';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const shortcuts = [
    { key: 'c', desc: 'Compose new message' },
    { key: '/', desc: 'Focus search bar' },
    { key: 'j / k', desc: 'Move focus to older / newer thread' },
    { key: 'Enter / o', desc: 'Open focused conversation' },
    { key: 'u / Esc', desc: 'Return to thread list' },
    { key: 'x', desc: 'Select or deselect focused thread' },
    { key: 's', desc: 'Star or unstar focused thread' },
    { key: 'e', desc: 'Archive selected or focused thread' },
    { key: '#', desc: 'Move selected or focused thread to Trash' },
    { key: '!', desc: 'Report spam' },
    { key: 'Shift + I', desc: 'Mark selected as read' },
    { key: 'Shift + U', desc: 'Mark selected as unread' },
    { key: '?', desc: 'Open keyboard shortcuts reference' },
  ];

  const operators = [
    { op: 'from:elena', desc: 'Messages from a specific sender' },
    { op: 'to:marcus', desc: 'Messages sent to a specific recipient' },
    { op: 'has:attachment', desc: 'Threads with PDF, spreadsheet, or image files' },
    { op: 'is:unread / is:read', desc: 'Filter by read or unread state' },
    { op: 'is:starred', desc: 'Starred conversations only' },
    { op: 'label:Engineering', desc: 'Filter by custom label name' },
    { op: 'in:sent / in:trash', desc: 'Search within a specific system folder' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts and search operators"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-[#1E1F20] border-[#444746] text-[#E3E3E3]'
            : 'bg-white border-[#DADCE0] text-[#1F1F1F]'
        }`}
      >
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-[#282A2C] border-[#444746]' : 'bg-[#F8FAFD] border-[#E8EAED]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[#0B57D0] dark:text-[#A8C7FA]" />
            <h2 className="text-base font-semibold">Keyboard Shortcuts & Search Syntax</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            className="p-1.5 rounded-full hover:bg-current/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto text-xs">
          <div>
            <h3 className="font-semibold uppercase tracking-wider opacity-65 mb-3 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-2 py-1 border-b border-current/5"
                >
                  <span className="opacity-85">{s.desc}</span>
                  <kbd
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                      isDark
                        ? 'bg-[#282A2C] border-[#5F6368] text-[#A8C7FA]'
                        : 'bg-[#F2F6FC] border-[#C4C7C5] text-[#0B57D0]'
                    }`}
                  >
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold uppercase tracking-wider opacity-65 mb-3 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Search Operators
            </h3>
            <div className="space-y-2">
              {operators.map((o) => (
                <div key={o.op} className="py-1.5 border-b border-current/5">
                  <code className="font-mono font-semibold text-[#0B57D0] dark:text-[#A8C7FA]">
                    {o.op}
                  </code>
                  <div className="opacity-75 mt-0.5">{o.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
