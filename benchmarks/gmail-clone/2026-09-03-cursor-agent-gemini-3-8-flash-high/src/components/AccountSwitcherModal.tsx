import React, { useRef, useEffect } from 'react';
import { useMail } from '../context/MailContext';
import { Check, HardDrive, Shield } from 'lucide-react';

export const AccountSwitcherModal: React.FC = () => {
  const {
    activeAccountModal,
    setActiveAccountModal,
    currentUser,
    allAccounts,
    switchUser,
    resetDemoData,
  } = useMail();

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setActiveAccountModal(false);
      }
    };
    if (activeAccountModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeAccountModal, setActiveAccountModal]);

  if (!activeAccountModal) return null;

  return (
    <div
      ref={modalRef}
      className="absolute top-16 right-4 w-88 bg-white dark:bg-[#282a2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-4 px-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Current Active Account Header */}
      <div className="flex flex-col items-center text-center p-3 border-b border-gray-100 dark:border-gray-700">
        <div className="relative mb-2">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-blue-500/20"
          />
        </div>
        <div className="font-bold text-sm text-gray-900 dark:text-white">{currentUser.name}</div>
        <div className="text-gray-500 dark:text-gray-400 text-xs">{currentUser.email}</div>
        <button
          onClick={() => alert(`Managing Google Account for ${currentUser.email}`)}
          className="mt-3 px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Manage your Google Account
        </button>
      </div>

      {/* Account List */}
      <div className="py-2 space-y-1">
        <div className="px-3 py-1 font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
          Other Accounts
        </div>
        {allAccounts.map((account) => {
          const isCurrent = account.id === currentUser.id;
          return (
            <button
              key={account.id}
              onClick={() => switchUser(account.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                isCurrent
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={account.avatar}
                  alt={account.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">{account.name}</div>
                  <div className="text-gray-500 text-[11px]">{account.email}</div>
                </div>
              </div>
              {isCurrent && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          );
        })}
      </div>

      {/* Storage and Actions */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-[11px] text-gray-600 dark:text-gray-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
            Storage: {currentUser.storageUsed} ({currentUser.storagePercent}%)
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">Buy storage</span>
        </div>

        <button
          onClick={resetDemoData}
          className="w-full text-left p-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2.5 transition-colors font-medium"
        >
          <Shield className="w-4 h-4" />
          Reset Mailbox Demo Data
        </button>
      </div>
    </div>
  );
};
