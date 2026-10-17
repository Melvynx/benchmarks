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
  CalendarClock,
  Bookmark,
  X,
  Check,
} from 'lucide-react';
import { CustomLabel, EmailThread, SystemFolder, ThemeMode } from '../types/mail';

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  activeFolder: SystemFolder;
  activeLabelId: string | null;
  onSelectFolder: (folder: SystemFolder) => void;
  onSelectLabel: (labelId: string) => void;
  onCompose: () => void;
  threads: EmailThread[];
  openDraftsCount: number;
  labels: CustomLabel[];
  onCreateLabel: (name: string, colorPresetIndex: number) => void;
  onDeleteLabel: (id: string) => void;
  theme: ThemeMode;
}

export const LABEL_COLOR_PRESETS = [
  { color: '#D3E3FD', textColor: '#041E49', darkBgColor: '#0842A0', darkTextColor: '#D3E3FD', dot: '#0B57D0' },
  { color: '#CEEAD6', textColor: '#0D652D', darkBgColor: '#0F5223', darkTextColor: '#C4EED0', dot: '#188038' },
  { color: '#F9DEDC', textColor: '#8C1D18', darkBgColor: '#8C1D18', darkTextColor: '#F9DEDC', dot: '#D93025' },
  { color: '#FEF7E0', textColor: '#7A4F01', darkBgColor: '#5B3F00', darkTextColor: '#FDE293', dot: '#E37400' },
  { color: '#E8DEF8', textColor: '#1D192B', darkBgColor: '#4A4458', darkTextColor: '#E8DEF8', dot: '#9334E6' },
  { color: '#E4F7FB', textColor: '#005A68', darkBgColor: '#004F5C', darkTextColor: '#C4EEF7', dot: '#007B83' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isMobileOpen,
  onCloseMobile,
  activeFolder,
  activeLabelId,
  onSelectFolder,
  onSelectLabel,
  onCompose,
  threads,
  openDraftsCount,
  labels,
  onCreateLabel,
  onDeleteLabel,
  theme,
}) => {
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const isDark = theme === 'dark';

  // Calculate live folder counts
  const inboxUnread = threads.filter((t) => t.folder === 'inbox' && t.isUnread).length;
  const starredCount = threads.filter(
    (t) => t.isStarred && t.folder !== 'trash' && t.folder !== 'spam'
  ).length;
  const snoozedCount = threads.filter((t) => t.folder === 'snoozed').length;
  const scheduledCount = threads.filter((t) => t.folder === 'scheduled').length;
  const draftsCount = threads.filter((t) => t.folder === 'drafts').length + openDraftsCount;
  const spamCount = threads.filter((t) => t.folder === 'spam' && t.isUnread).length;
  const trashCount = threads.filter((t) => t.folder === 'trash').length;

  const navItems: {
    id: SystemFolder;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
    boldCount?: boolean;
  }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: inboxUnread, boldCount: true },
    { id: 'starred', label: 'Starred', icon: Star, count: starredCount },
    { id: 'snoozed', label: 'Snoozed', icon: Clock, count: snoozedCount },
    { id: 'important', label: 'Important', icon: Bookmark },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'scheduled', label: 'Scheduled', icon: CalendarClock, count: scheduledCount },
    { id: 'drafts', label: 'Drafts', icon: FileText, count: draftsCount, boldCount: true },
    { id: 'all', label: 'All Mail', icon: Mail },
    { id: 'spam', label: 'Spam', icon: AlertOctagon, count: spamCount },
    { id: 'trash', label: 'Trash', icon: Trash2, count: trashCount },
  ];

  const handleCreateLabelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    onCreateLabel(newLabelName.trim(), selectedColorIdx);
    setNewLabelName('');
    setIsCreatingLabel(false);
  };

  const renderSidebarContent = (expanded: boolean) => (
    <div className="flex flex-col h-full py-2 select-none overflow-y-auto overflow-x-hidden">
      {/* Compose CTA Pill */}
      <div className={`px-3 mb-3 ${expanded ? '' : 'flex justify-center'}`}>
        <button
          type="button"
          onClick={() => {
            onCompose();
            onCloseMobile();
          }}
          className={`flex items-center gap-3.5 font-medium transition-all cursor-pointer shadow-sm hover:shadow-md ${
            expanded
              ? 'h-14 px-5 rounded-2xl text-[14px]'
              : 'w-14 h-14 rounded-2xl justify-center'
          } ${
            isDark
              ? 'bg-[#004A77] text-[#C2E7FF] hover:bg-[#005B92]'
              : 'bg-[#C2E7FF] text-[#001D35] hover:bg-[#B3DFFC]'
          }`}
          title="Compose (c)"
        >
          <Pencil className="w-5 h-5 shrink-0" />
          {expanded && <span>Compose</span>}
        </button>
      </div>

      {/* System Folders */}
      <nav aria-label="Mailbox folders" className="space-y-0.5 pr-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFolder === item.id && !activeLabelId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectFolder(item.id);
                onCloseMobile();
              }}
              title={item.label}
              className={`w-full flex items-center justify-between transition-colors cursor-pointer ${
                expanded
                  ? 'h-8 pl-6 pr-3.5 rounded-r-full text-[14px]'
                  : 'h-10 w-12 mx-auto rounded-full justify-center'
              } ${
                isActive
                  ? isDark
                    ? 'bg-[#004A77] text-[#C2E7FF] font-semibold'
                    : 'bg-[#D3E3FD] text-[#041E49] font-semibold'
                  : isDark
                  ? 'text-[#C4C7C5] hover:bg-[#282A2C]'
                  : 'text-[#444746] hover:bg-[#EAEBEF]'
              }`}
            >
              <span className="flex items-center gap-4 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </span>
              {expanded && item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-xs tabular-nums ml-2 ${
                    item.boldCount || isActive ? 'font-semibold' : 'opacity-75'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Labels Section */}
      {expanded && (
        <div className="mt-5 pt-3 border-t border-current/10 pr-3">
          <div className="flex items-center justify-between pl-6 pr-2 mb-1.5">
            <span className="text-[13px] font-medium tracking-tight opacity-80">Labels</span>
            <button
              type="button"
              onClick={() => setIsCreatingLabel((p) => !p)}
              aria-label="Create new label"
              title="Create new label"
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#282A2C]' : 'hover:bg-[#E8EAED]'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {isCreatingLabel && (
            <form
              onSubmit={handleCreateLabelSubmit}
              className={`ml-4 mr-1 mb-2 p-2.5 rounded-xl border text-xs ${
                isDark
                  ? 'bg-[#1E1F20] border-[#444746]'
                  : 'bg-white border-[#D3E3FD] shadow-sm'
              }`}
            >
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="New label name..."
                autoFocus
                className={`w-full px-2 py-1 rounded border outline-none mb-2 ${
                  isDark
                    ? 'bg-[#282A2C] border-[#5F6368] text-white'
                    : 'bg-[#F8FAFD] border-[#C4C7C5] text-[#1F1F1F]'
                }`}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {LABEL_COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.dot}
                      type="button"
                      onClick={() => setSelectedColorIdx(idx)}
                      className={`w-4 h-4 rounded-full flex items-center justify-center cursor-pointer ${
                        selectedColorIdx === idx ? 'ring-2 ring-offset-1 ring-[#0B57D0]' : ''
                      }`}
                      style={{ backgroundColor: preset.dot }}
                    >
                      {selectedColorIdx === idx && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingLabel(false)}
                    className="px-2 py-0.5 rounded hover:underline opacity-75 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-0.5 rounded bg-[#0B57D0] text-white font-medium cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-0.5">
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
                  className={`group flex items-center justify-between h-8 pl-6 pr-3.5 rounded-r-full text-[13.5px] transition-colors cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-[#004A77] text-[#C2E7FF] font-semibold'
                        : 'bg-[#D3E3FD] text-[#041E49] font-semibold'
                      : isDark
                      ? 'text-[#C4C7C5] hover:bg-[#282A2C]'
                      : 'text-[#444746] hover:bg-[#EAEBEF]'
                  }`}
                  onClick={() => {
                    onSelectLabel(lbl.id);
                    onCloseMobile();
                  }}
                >
                  <span className="flex items-center gap-3.5 min-w-0">
                    <Tag
                      className="w-4 h-4 shrink-0"
                      style={{ color: isDark ? lbl.darkTextColor : lbl.textColor }}
                    />
                    <span className="truncate">{lbl.name}</span>
                  </span>

                  <span className="flex items-center gap-1">
                    {count > 0 && (
                      <span className="text-xs tabular-nums opacity-75 group-hover:hidden">
                        {count}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLabel(lbl.id);
                      }}
                      title={`Remove label ${lbl.name}`}
                      className="hidden group-hover:inline-flex p-0.5 rounded hover:bg-black/10 opacity-70 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-150 ${
          isOpen ? 'w-[248px]' : 'w-[72px]'
        }`}
      >
        {renderSidebarContent(isOpen)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <aside
            className={`relative w-[272px] max-w-[82vw] h-full z-10 shadow-2xl ${
              isDark ? 'bg-[#111318] text-[#E3E3E3]' : 'bg-[#F8FAFD] text-[#1F1F1F]'
            }`}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-semibold tracking-tight opacity-80">Mailboxes</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-full hover:bg-current/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
