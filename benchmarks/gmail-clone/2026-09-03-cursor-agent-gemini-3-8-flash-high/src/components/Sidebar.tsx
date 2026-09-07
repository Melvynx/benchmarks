import React, { useState } from 'react';
import {
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertOctagon,
  Tag,
  Mail,
  Plus,
  Edit2,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { useMail } from '../context/MailContext';
import { FolderId } from '../types/mail';

export const Sidebar: React.FC = () => {
  const {
    currentFolder,
    setCurrentFolder,
    selectedCustomLabel,
    setSelectedCustomLabel,
    sidebarExpanded,
    openCompose,
    folderCounts,
    labels,
    setIsCreateLabelModalOpen,
    currentUser,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useMail();

  const [showMore, setShowMore] = useState(false);

  const primaryNavItems: { id: FolderId; name: string; icon: React.ComponentType<{ className?: string }>; countKey?: string }[] = [
    { id: 'inbox', name: 'Inbox', icon: Inbox, countKey: 'inbox' },
    { id: 'starred', name: 'Starred', icon: Star, countKey: 'starred' },
    { id: 'snoozed', name: 'Snoozed', icon: Clock, countKey: 'snoozed' },
    { id: 'sent', name: 'Sent', icon: Send, countKey: 'sent' },
    { id: 'drafts', name: 'Drafts', icon: FileText, countKey: 'drafts' },
  ];

  const secondaryNavItems: { id: FolderId; name: string; icon: React.ComponentType<{ className?: string }>; countKey?: string }[] = [
    { id: 'important', name: 'Important', icon: Tag, countKey: 'important' },
    { id: 'all', name: 'All Mail', icon: Mail },
    { id: 'spam', name: 'Spam', icon: AlertOctagon, countKey: 'spam' },
    { id: 'trash', name: 'Trash', icon: Trash2, countKey: 'trash' },
  ];

  const handleSelectFolder = (folderId: FolderId) => {
    setCurrentFolder(folderId);
  };

  const handleSelectLabel = (labelId: string) => {
    setSelectedCustomLabel(labelId);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full py-2 px-3 overflow-y-auto select-none">
      {/* Compose Button */}
      <div className="mb-4 pt-1">
        <button
          onClick={() => openCompose()}
          className={`flex items-center justify-center gap-3 bg-[#c2e7ff] hover:bg-[#b3dcfc] text-[#001d35] dark:bg-[#004a77] dark:hover:bg-[#005a91] dark:text-[#c2e7ff] font-medium rounded-2xl shadow-sm hover:shadow transition-all ${
            sidebarExpanded ? 'px-6 py-4 min-w-[140px]' : 'w-14 h-14 p-0 mx-auto'
          }`}
          title="Compose"
        >
          <Edit2 className="w-5 h-5 text-[#001d35] dark:text-[#c2e7ff]" />
          {sidebarExpanded && <span className="text-sm font-semibold tracking-wide">Compose</span>}
        </button>
      </div>

      {/* Primary Folders */}
      <nav className="space-y-0.5">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentFolder === item.id && !selectedCustomLabel;
          const count = item.countKey ? folderCounts[item.countKey] : 0;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectFolder(item.id)}
              className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#d3e3fd] text-[#041e49] font-bold dark:bg-[#004a77] dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800'
              } ${!sidebarExpanded ? 'justify-center px-2' : ''}`}
              title={item.name}
            >
              <div className="flex items-center gap-4 min-w-0">
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? 'text-[#041e49] dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                />
                {sidebarExpanded && <span className="truncate">{item.name}</span>}
              </div>
              {sidebarExpanded && count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'font-bold text-[#041e49] dark:text-white'
                      : 'font-normal text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* More / Less Toggle */}
        {sidebarExpanded && (
          <button
            onClick={() => setShowMore(!showMore)}
            className="w-full flex items-center gap-4 px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors"
          >
            {showMore ? (
              <>
                <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span>Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span>More</span>
              </>
            )}
          </button>
        )}

        {/* Expanded Secondary Folders */}
        {showMore &&
          secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentFolder === item.id && !selectedCustomLabel;
            const count = item.countKey ? folderCounts[item.countKey] : 0;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectFolder(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#d3e3fd] text-[#041e49] font-bold dark:bg-[#004a77] dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800'
                } ${!sidebarExpanded ? 'justify-center px-2' : ''}`}
                title={item.name}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive
                        ? 'text-[#041e49] dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  />
                  {sidebarExpanded && <span className="truncate">{item.name}</span>}
                </div>
                {sidebarExpanded && count > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* Labels Section */}
      {sidebarExpanded && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
              Labels
            </span>
            <button
              onClick={() => setIsCreateLabelModalOpen(true)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors"
              title="Create new label"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-0.5">
            {labels.map((label) => {
              const isSelected = selectedCustomLabel === label.id;
              const count = folderCounts[label.id] || 0;

              return (
                <button
                  key={label.id}
                  onClick={() => handleSelectLabel(label.id)}
                  className={`w-full flex items-center justify-between px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#d3e3fd] text-[#041e49] font-bold dark:bg-[#004a77] dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate">{label.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Storage Widget */}
      {sidebarExpanded && (
        <div className="mt-auto pt-6 px-3">
          <div className="p-3 rounded-xl bg-gray-100/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 text-xs">
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-300 font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                Storage
              </span>
              <span>{currentUser.storagePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${currentUser.storagePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>
                {currentUser.storageUsed} of {currentUser.storageLimit}
              </span>
              <a
                href="#/storage"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                Manage
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#f6f8fc] dark:bg-[#1f1f1f] border-r border-gray-200/60 dark:border-gray-800 transition-all duration-200 ease-in-out shrink-0 z-20 ${
          sidebarExpanded ? 'w-64' : 'w-[72px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#1f1f1f] h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
