import React, { useState, useRef, useEffect } from 'react';
import { useMail } from '../context/MailContext';
import {
  Settings,
  X,
  Trash2,
  Check,
  ShieldAlert,
  Moon,
  Sun,
} from 'lucide-react';
import { DensityMode } from '../types/mail';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    labels,
    deleteCustomLabel,
    density,
    setDensity,
    theme,
    setTheme,
    resetDemoData,
    showToast,
  } = useMail();

  const [activeTab, setActiveTab] = useState<'general' | 'labels' | 'inbox' | 'vacation' | 'data'>('general');
  const [signatureText, setSignatureText] = useState(settings.signature);
  const [vacationEnabled, setVacationEnabled] = useState(settings.vacationResponder.enabled);
  const [vacationSubject, setVacationSubject] = useState(settings.vacationResponder.subject);
  const [vacationMessage, setVacationMessage] = useState(settings.vacationResponder.message);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen, setIsSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSaveSettings = () => {
    updateSettings({
      signature: signatureText,
      vacationResponder: {
        enabled: vacationEnabled,
        subject: vacationSubject,
        message: vacationMessage,
      },
    });
    showToast('Settings saved');
    setIsSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 select-none">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-[#282a2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh] text-xs text-gray-800 dark:text-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="h-14 px-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between font-bold text-base shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span>Settings</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 gap-6 shrink-0 bg-gray-50/50 dark:bg-gray-800/40 font-medium overflow-x-auto no-scrollbar">
          {[
            { id: 'general', label: 'General' },
            { id: 'labels', label: 'Labels' },
            { id: 'inbox', label: 'Inbox & Density' },
            { id: 'vacation', label: 'Vacation Responder' },
            { id: 'data', label: 'Data & Reset' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 border-b-2 text-xs transition-colors shrink-0 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Theme Preference */}
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Appearance</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                      theme === 'light'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 font-bold text-blue-600'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Light theme</span>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                      theme === 'dark'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 font-bold text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-blue-500" />
                    <span>Dark theme</span>
                  </button>
                </div>
              </div>

              {/* Signature */}
              <div className="border-t border-gray-100 dark:border-gray-700/80 pt-4">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Signature</h4>
                <p className="text-gray-500 text-[11px] mb-2">
                  Appended at the end of all outgoing messages
                </p>
                <textarea
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              {/* Keyboard Shortcuts */}
              <div className="border-t border-gray-100 dark:border-gray-700/80 pt-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Keyboard Shortcuts</h4>
                  <p className="text-gray-500 text-[11px]">
                    Enable standard Gmail single-key shortcuts (c, j, k, e, #, etc.)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.keyboardShortcuts}
                  onChange={(e) => updateSettings({ keyboardShortcuts: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 2. LABELS TAB */}
          {activeTab === 'labels' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Custom Labels</h4>
                <p className="text-gray-500 text-[11px] mb-4">
                  Manage colored tags applied to your emails
                </p>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="font-medium">{label.name}</span>
                    </div>

                    <button
                      onClick={() => deleteCustomLabel(label.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                      title="Delete label"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. INBOX & DENSITY TAB */}
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Display Density</h4>
                <p className="text-gray-500 text-[11px] mb-4">
                  Control how tightly packed your conversation list appears
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {(['default', 'comfortable', 'compact'] as DensityMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDensity(mode)}
                      className={`p-4 rounded-xl border text-left capitalize transition-all ${
                        density === mode
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="text-sm font-semibold mb-1 flex items-center justify-between">
                        <span>{mode}</span>
                        {density === mode && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="text-[11px] text-gray-500 font-normal">
                        {mode === 'default'
                          ? 'Shows attachment preview chips'
                          : mode === 'comfortable'
                          ? 'Standard spacing'
                          : 'Compact one-line view'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. VACATION RESPONDER TAB */}
          {activeTab === 'vacation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Vacation Responder</h4>
                  <p className="text-gray-500 text-[11px]">
                    Automatically reply to incoming messages while away
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={vacationEnabled}
                  onChange={(e) => setVacationEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className={vacationEnabled ? 'space-y-3' : 'opacity-50 pointer-events-none space-y-3'}>
                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Subject</label>
                  <input
                    type="text"
                    value={vacationSubject}
                    onChange={(e) => setVacationSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 mb-1 font-medium">Message</label>
                  <textarea
                    value={vacationMessage}
                    onChange={(e) => setVacationMessage(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. DATA & RESET TAB */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                  Local Demo Mailbox Reset
                </h4>
                <p className="text-gray-500 text-[11px] mb-4">
                  Reset your local mailbox state (threads, read states, stars, drafts) back to the clean initial seeded state.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-red-800 dark:text-red-300">Reset Mailbox Demo Data</div>
                  <div className="text-gray-600 dark:text-gray-400 text-[11px] mt-0.5">
                    This will clear all changes and reload the 24 seeded threads.
                  </div>
                  <button
                    onClick={() => {
                      resetDemoData();
                      setIsSettingsOpen(false);
                    }}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                  >
                    Reset Mailbox Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-lg font-medium shadow-sm transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};
