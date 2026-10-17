import React, { useState } from 'react';
import {
  Pencil,
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  Trash2,
  AlertOctagon,
  Mail,
  Tag,
  Plus,
  ChevronDown,
  ChevronUp,
  Bookmark,
  CalendarClock,
  X,
} from 'lucide-react';
import { CustomLabel, EmailThread, SystemFolder, ThemeMode } from '../types/mail';
import { LABEL_COLOR_PALETTE } from '../data/seedData';

interface SidebarProps {
  theme: ThemeMode;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  activeFolder: SystemFolder | null;
  activeLabelId: string | null;
  onSelectFolder: (folder: SystemFolder) => void;
  onSelectLabel: (labelId: string) => void;
  onOpenCompose: () => void;
  threads: EmailThread[];
  labels: CustomLabel[];
  onCreateLabel: (name: string, color: string) => void;
  onDeleteLabel: (labelId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  theme,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  activeFolder,
  activeLabelId,
  onSelectFolder,
  onSelectLabel,
  onOpenCompose,
  threads,
  labels,
  onCreateLabel,
  onDeleteLabel,
}) => {
  const [showMoreFolders, setShowMoreFolders] = useState(true);
  const [showNewLabelModal, setShowNewLabelModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLOR_PALETTE[0]);

  const isDark = theme === 'dark';

  // Calculate counts
  const inboxUnreadCount = threads.filter(
    (t) => t.folder === 'inbox' && !t.isSnoozed && t.isUnread
  ).length;
  const starredCount = threads.filter(
    (t) => t.isStarred && t.folder !== 'trash' && t.folder !== 'spam'
  ).length;
  const snoozedCount = threads.filter(
    (t) => t.isSnoozed && t.folder !== 'trash'
  ).length;
  const scheduledCount = threads.filter((t) => t.folder === 'scheduled').length;
  const draftsCount = threads.filter(
    (t) => t.folder === 'drafts' || t.messages.some((m) => m.isDraft)
  ).length;
  const spamUnreadCount = threads.filter(
    (t) => t.folder === 'spam' && t.isUnread
  ).length;

  const primaryFolders: {
    id: SystemFolder;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
    boldCount?: boolean;
  }[] = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: Inbox,
      count: inboxUnreadCount,
      boldCount: true,
    },
    { id: 'starred', label: 'Starred', icon: Star, count: starredCount },
    { id: 'snoozed', label: 'Snoozed', icon: Clock, count: snoozedCount },
    { id: 'important', label: 'Important', icon: Bookmark },
    { id: 'sent', label: 'Sent', icon: Send },
    {
      id: 'scheduled',
      label: 'Scheduled',
      icon: CalendarClock,
      count: scheduledCount,
    },
    {
      id: 'drafts',
      label: 'Drafts',
      icon: FileText,
      count: draftsCount,
      boldCount: true,
    },
  ];

  const secondaryFolders: {
    id: SystemFolder;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'all', label: 'All Mail', icon: Mail },
    {
      id: 'spam',
      label: 'Spam',
      icon: AlertOctagon,
      count: spamUnreadCount,
    },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const handleCreateLabelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    onCreateLabel(newLabelName.trim(), newLabelColor);
    setNewLabelName('');
    setShowNewLabelModal(false);
  };

  const renderSidebarContent = (expanded: boolean) => (
    <div className="flex flex-col h-full py-2 select-none">
      {/* Compose Button */}
      <div className={`px-3 mb-3 ${expanded ? '' : 'flex justify-center'}`}>
        <button
          onClick={() => {
            onOpenCompose();
            onCloseMobile();
          }}
          aria-label="Compose"
          className={`flex items-center gap-3.5 font-display font-medium text-sm rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer ${
            isDark
              ? 'bg-[#c2e7ff] text-[#001d35] hover:bg-[#b1dffc]'
              : 'bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dffc]'
          } ${expanded ? 'px-5 py-3.5' : 'p-3.5 justify-center'}`}
        >
          <Pencil className="w-5 h-5 shrink-0" />
          {expanded && <span className="pr-1">Compose</span>}
        </button>
      </div>

      {/* Scrollable Nav Items */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-0.5">
        {primaryFolders.map((item) => {
          const Icon = item.icon;
          const isActive = activeFolder === item.id && !activeLabelId;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectFolder(item.id);
                onCloseMobile();
              }}
              title={item.label}
              className={`w-full flex items-center justify-between transition-colors cursor-pointer ${
                expanded
                  ? 'pl-6 pr-3.5 py-1.5 rounded-r-full text-sm'
                  : 'mx-auto w-12 h-10 justify-center rounded-full'
              } ${
                isActive
                  ? isDark
                    ? 'bg-[#004a77] text-[#c2e7ff] font-semibold'
                    : 'bg-[#d3e3fd] text-[#041e49] font-semibold'
                  : isDark
                    ? 'text-[#e3e3e3] hover:bg-white/5 font-normal'
                    : 'text-[#444746] hover:bg-black/5 font-normal'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </div>
              {expanded && item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-xs ml-2 ${
                    item.boldCount || isActive ? 'font-bold' : 'opacity-75'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        {/* More Toggle */}
        <button
          onClick={() => setShowMoreFolders((v) => !v)}
          className={`w-full flex items-center gap-4 transition-colors cursor-pointer ${
            expanded
              ? 'pl-6 pr-3.5 py-1.5 rounded-r-full text-sm'
              : 'mx-auto w-12 h-10 justify-center rounded-full'
          } ${
            isDark
              ? 'text-[#e3e3e3] hover:bg-white/5'
              : 'text-[#444746] hover:bg-black/5'
          }`}
        >
          {showMoreFolders ? (
            <ChevronUp className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" />
          )}
          {expanded && <span>{showMoreFolders ? 'Less' : 'More'}</span>}
        </button>

        {showMoreFolders &&
          secondaryFolders.map((item) => {
            const Icon = item.icon;
            const isActive = activeFolder === item.id && !activeLabelId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectFolder(item.id);
                  onCloseMobile();
                }}
                title={item.label}
                className={`w-full flex items-center justify-between transition-colors cursor-pointer ${
                  expanded
                    ? 'pl-6 pr-3.5 py-1.5 rounded-r-full text-sm'
                    : 'mx-auto w-12 h-10 justify-center rounded-full'
                } ${
                  isActive
                    ? isDark
                      ? 'bg-[#004a77] text-[#c2e7ff] font-semibold'
                      : 'bg-[#d3e3fd] text-[#041e49] font-semibold'
                    : isDark
                      ? 'text-[#e3e3e3] hover:bg-white/5'
                      : 'text-[#444746] hover:bg-black/5'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  {expanded && <span className="truncate">{item.label}</span>}
                </div>
                {expanded && item.count !== undefined && item.count > 0 && (
                  <span className="text-xs font-bold ml-2">{item.count}</span>
                )}
              </button>
            );
          })}

        {/* Labels Section */}
        <div className="pt-4 mt-2">
          {expanded ? (
            <div className="pl-6 pr-2.5 py-1 flex items-center justify-between">
              <span className="text-sm font-medium tracking-tight opacity-85">Labels</span>
              <button
                onClick={() => setShowNewLabelModal(true)}
                title="Create new label"
                aria-label="Create new label"
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <button
                onClick={() => setShowNewLabelModal(true)}
                title="Create new label"
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-0.5 space-y-0.5">
            {labels.map((lbl) => {
              const isSelected = activeLabelId === lbl.id;
              const count = threads.filter(
                (t) =>
                  t.labels.includes(lbl.id) &&
                  t.folder !== 'trash' &&
                  t.folder !== 'spam'
              ).length;

              return (
                <div
                  key={lbl.id}
                  className={`group w-full flex items-center justify-between transition-colors ${
                    expanded
                      ? 'pl-6 pr-3 py-1.5 rounded-r-full text-sm'
                      : 'mx-auto w-12 h-10 justify-center rounded-full'
                  } ${
                    isSelected
                      ? isDark
                        ? 'bg-[#004a77] text-[#c2e7ff] font-semibold'
                        : 'bg-[#d3e3fd] text-[#041e49] font-semibold'
                      : isDark
                        ? 'text-[#e3e3e3] hover:bg-white/5'
                        : 'text-[#444746] hover:bg-black/5'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectLabel(lbl.id);
                      onCloseMobile();
                    }}
                    title={lbl.name}
                    className="flex items-center gap-4 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <Tag
                      className="w-4 h-4 shrink-0"
                      style={{ color: lbl.color, fill: lbl.color }}
                    />
                    {expanded && <span className="truncate">{lbl.name}</span>}
                  </button>

                  {expanded && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs opacity-65 group-hover:hidden">
                        {count > 0 ? count : ''}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLabel(lbl.id);
                        }}
                        title={`Remove label ${lbl.name}`}
                        className="hidden group-hover:inline-flex p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 ${
          isCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {renderSidebarContent(!isCollapsed)}
      </aside>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div
            className={`relative w-72 max-w-[82vw] h-full z-10 shadow-2xl ${
              isDark ? 'bg-[#1e1f23] text-[#e3e3e3]' : 'bg-[#f6f8fc] text-[#1f1f1f]'
            }`}
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200/60 dark:border-white/10">
              <span className="font-display font-medium text-base">Gemini 4 Argon</span>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">{renderSidebarContent(true)}</div>
          </div>
        </div>
      )}

      {/* New Label Modal */}
      {showNewLabelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 border ${
              isDark
                ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                : 'bg-white border-gray-200 text-[#1f1f1f]'
            }`}
          >
            <h3 className="font-display text-lg font-medium mb-4">New label</h3>
            <form onSubmit={handleCreateLabelSubmit}>
              <label className="block text-xs opacity-75 mb-1.5">
                Please enter a new label name:
              </label>
              <input
                type="text"
                autoFocus
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="e.g. Q4 Launch, Legal, Kunden"
                className={`w-full px-3.5 py-2 rounded-xl border text-sm outline-none mb-4 ${
                  isDark
                    ? 'bg-[#1e1f23] border-white/15 focus:border-[#a8c7fa]'
                    : 'bg-gray-50 border-gray-300 focus:border-[#1a73e8]'
                }`}
              />

              <label className="block text-xs opacity-75 mb-2">Label color:</label>
              <div className="flex items-center gap-2 mb-6">
                {LABEL_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewLabelColor(color)}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                      newLabelColor === color
                        ? 'scale-125 ring-2 ring-offset-2 ring-[#1a73e8]'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewLabelModal(false)}
                  className="px-4 py-2 rounded-full text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-sm font-medium bg-[#1a73e8] text-white hover:bg-[#1557b0] cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
