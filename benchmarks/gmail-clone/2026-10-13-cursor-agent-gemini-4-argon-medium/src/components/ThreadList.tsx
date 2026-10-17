import React, { useState, useRef, useEffect } from 'react';
import {
  Square,
  CheckSquare,
  MinusSquare,
  ChevronDown,
  RotateCw,
  Archive,
  AlertOctagon,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  Tag,
  FolderInput,
  Star,
  Bookmark,
  Inbox,
  Users,
  Bell,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Table,
  Calendar,
  Code,
  Columns2,
  Rows2,
  Maximize2,
  CheckCheck,
  Sparkles,
} from 'lucide-react';
import {
  Attachment,
  CustomLabel,
  DensityMode,
  EmailThread,
  InboxCategory,
  SplitPaneMode,
  SystemFolder,
  ThemeMode,
} from '../types/mail';
import { getThreadAttachments } from '../utils/mailSearch';

interface ThreadListProps {
  theme: ThemeMode;
  threads: EmailThread[];
  allInboxThreads: EmailThread[];
  selectedThreadIds: Set<string>;
  activeThreadId: string | null;
  focusedThreadIndex: number;
  activeFolder: SystemFolder | null;
  activeLabelId: string | null;
  activeCategory: InboxCategory;
  showCategoryTabs: boolean;
  density: DensityMode;
  splitPane: SplitPaneMode;
  labels: CustomLabel[];
  hasActiveSearch: boolean;
  onSelectCategory: (cat: InboxCategory) => void;
  onSelectThread: (threadId: string) => void;
  onToggleSelectThread: (threadId: string, shiftKey?: boolean) => void;
  onSelectGroup: (group: 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred') => void;
  onToggleStar: (threadId: string) => void;
  onToggleImportant: (threadId: string) => void;
  onBulkArchive: (ids?: string[]) => void;
  onBulkDelete: (ids?: string[]) => void;
  onBulkMarkRead: (read: boolean, ids?: string[]) => void;
  onBulkSnooze: (until: string | null, ids?: string[]) => void;
  onBulkSpam: (ids?: string[]) => void;
  onBulkToggleLabel: (labelId: string, ids?: string[]) => void;
  onBulkMoveTo: (folder: 'inbox' | 'archive' | 'spam' | 'trash', ids?: string[]) => void;
  onEmptyFolder: (folder: 'trash' | 'spam') => void;
  onRefresh: () => void;
  onChangeSplitPane: (mode: SplitPaneMode) => void;
  onPreviewAttachment: (att: Attachment) => void;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  theme,
  threads,
  allInboxThreads,
  selectedThreadIds,
  activeThreadId,
  focusedThreadIndex,
  activeFolder,
  activeLabelId,
  activeCategory,
  showCategoryTabs,
  density,
  splitPane,
  labels,
  hasActiveSearch,
  onSelectCategory,
  onSelectThread,
  onToggleSelectThread,
  onSelectGroup,
  onToggleStar,
  onToggleImportant,
  onBulkArchive,
  onBulkDelete,
  onBulkMarkRead,
  onBulkSnooze,
  onBulkSpam,
  onBulkToggleLabel,
  onBulkMoveTo,
  onEmptyFolder,
  onRefresh,
  onChangeSplitPane,
  onPreviewAttachment,
}) => {
  const [showSelectDropdown, setShowSelectDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);
  const [showSnoozeDropdown, setShowSnoozeDropdown] = useState(false);
  const [rowSnoozeId, setRowSnoozeId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowSelectDropdown(false);
        setShowLabelDropdown(false);
        setShowMoveDropdown(false);
        setShowSnoozeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = theme === 'dark';
  const selectedCount = selectedThreadIds.size;
  const allSelected = threads.length > 0 && selectedCount === threads.length;
  const someSelected = selectedCount > 0 && selectedCount < threads.length;

  const selectedArray = Array.from(selectedThreadIds);
  const anySelectedUnread = threads
    .filter((t) => selectedThreadIds.has(t.id))
    .some((t) => t.isUnread);

  const handleTriggerRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const renderAttachmentIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-3.5 h-3.5 text-[#ea4335] shrink-0" />;
      case 'spreadsheet':
        return <Table className="w-3.5 h-3.5 text-[#188038] shrink-0" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-[#e37400] shrink-0" />;
      case 'calendar':
        return <Calendar className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />;
      case 'code':
        return <Code className="w-3.5 h-3.5 text-[#9334e6] shrink-0" />;
      default:
        return <Paperclip className="w-3.5 h-3.5 text-gray-500 shrink-0" />;
    }
  };

  const categories: {
    id: InboxCategory;
    name: string;
    icon: React.FC<{ className?: string }>;
    badgeColor: string;
  }[] = [
    {
      id: 'primary',
      name: 'Primary',
      icon: Inbox,
      badgeColor: 'bg-[#1a73e8] text-white',
    },
    {
      id: 'promotions',
      name: 'Promotions',
      icon: Tag,
      badgeColor: 'bg-[#188038] text-white',
    },
    {
      id: 'social',
      name: 'Social',
      icon: Users,
      badgeColor: 'bg-[#1a73e8] text-white',
    },
    {
      id: 'updates',
      name: 'Updates',
      icon: Bell,
      badgeColor: 'bg-[#e37400] text-white',
    },
  ];

  const activeCustomLabel = activeLabelId
    ? labels.find((l) => l.id === activeLabelId)
    : null;

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden select-none">
      {/* Top Action Toolbar */}
      <div
        ref={toolbarRef}
        className={`h-12 px-2 md:px-4 flex items-center justify-between border-b shrink-0 ${
          isDark ? 'border-white/10 bg-[#1e1f23]' : 'border-gray-200/80 bg-white'
        }`}
      >
        <div className="flex items-center gap-0.5 md:gap-1">
          {/* Select All Checkbox + Dropdown */}
          <div className="relative flex items-center">
            <button
              onClick={() => onSelectGroup(allSelected || someSelected ? 'none' : 'all')}
              title="Select"
              aria-label="Select all conversations"
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-[#1a73e8]" />
              ) : someSelected ? (
                <MinusSquare className="w-4 h-4 text-[#1a73e8]" />
              ) : (
                <Square className="w-4 h-4 opacity-60" />
              )}
            </button>
            <button
              onClick={() => setShowSelectDropdown((v) => !v)}
              title="Select options"
              aria-label="Select options"
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {showSelectDropdown && (
              <div
                className={`absolute left-0 top-9 w-36 py-1.5 rounded-xl shadow-xl border z-40 text-xs ${
                  isDark
                    ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                    : 'bg-white border-gray-200 text-[#1f1f1f]'
                }`}
              >
                {(
                  [
                    ['all', 'All'],
                    ['none', 'None'],
                    ['read', 'Read'],
                    ['unread', 'Unread'],
                    ['starred', 'Starred'],
                    ['unstarred', 'Unstarred'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onSelectGroup(key);
                      setShowSelectDropdown(false);
                    }}
                    className="w-full px-4 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contextual Bulk Actions when items are selected */}
          {selectedCount > 0 ? (
            <div className="flex items-center gap-0.5 pl-1">
              <span className="text-xs font-semibold text-[#1a73e8] px-2">
                {selectedCount} selected
              </span>

              <button
                onClick={() => onBulkArchive()}
                title="Archive (e)"
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <Archive className="w-4 h-4" />
              </button>

              <button
                onClick={() => onBulkSpam()}
                title={activeFolder === 'spam' ? 'Not spam' : 'Report spam'}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4" />
              </button>

              <button
                onClick={() => onBulkDelete()}
                title={activeFolder === 'trash' ? 'Delete forever' : 'Delete (#)'}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-gray-300 dark:bg-white/15 mx-1" />

              <button
                onClick={() => onBulkMarkRead(!anySelectedUnread)}
                title={anySelectedUnread ? 'Mark as read (Shift+I)' : 'Mark as unread (Shift+U)'}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                {anySelectedUnread ? (
                  <MailOpen className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
              </button>

              {/* Snooze Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSnoozeDropdown((v) => !v);
                    setShowLabelDropdown(false);
                    setShowMoveDropdown(false);
                  }}
                  title="Snooze"
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                </button>
                {showSnoozeDropdown && (
                  <div
                    className={`absolute left-0 top-9 w-52 py-2 rounded-xl shadow-xl border z-40 text-xs ${
                      isDark
                        ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                        : 'bg-white border-gray-200 text-[#1f1f1f]'
                    }`}
                  >
                    <div className="px-3 py-1 font-semibold opacity-60">Snooze until...</div>
                    {[
                      ['Later today, 6:00 PM', 'Today 6:00 PM'],
                      ['Tomorrow, 9:00 AM', 'Thu 9:00 AM'],
                      ['Next week, Mon 9:00 AM', 'Mon 9:00 AM'],
                    ].map(([val, time]) => (
                      <button
                        key={val}
                        onClick={() => {
                          onBulkSnooze(val);
                          setShowSnoozeDropdown(false);
                        }}
                        className="w-full px-3 py-2 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <span>{val.split(',')[0]}</span>
                        <span className="opacity-60">{time}</span>
                      </button>
                    ))}
                    {activeFolder === 'snoozed' && (
                      <button
                        onClick={() => {
                          onBulkSnooze(null);
                          setShowSnoozeDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-[#1a73e8] font-medium border-t border-gray-200/40 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                      >
                        Unsnooze selected
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Labels Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLabelDropdown((v) => !v);
                    setShowSnoozeDropdown(false);
                    setShowMoveDropdown(false);
                  }}
                  title="Labels"
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <Tag className="w-4 h-4" />
                </button>

                {showLabelDropdown && (
                  <div
                    className={`absolute left-0 top-9 w-52 py-2 rounded-xl shadow-xl border z-40 text-xs ${
                      isDark
                        ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                        : 'bg-white border-gray-200 text-[#1f1f1f]'
                    }`}
                  >
                    <div className="px-3 py-1 font-semibold opacity-60">Label as:</div>
                    {labels.map((lbl) => {
                      const hasLabelOnAll = selectedArray.every((id) =>
                        threads.find((t) => t.id === id)?.labels.includes(lbl.id)
                      );
                      return (
                        <button
                          key={lbl.id}
                          onClick={() => onBulkToggleLabel(lbl.id)}
                          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            readOnly
                            checked={hasLabelOnAll}
                            className="rounded accent-[#1a73e8] pointer-events-none"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: lbl.color }}
                          />
                          <span className="truncate">{lbl.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Move To Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMoveDropdown((v) => !v);
                    setShowLabelDropdown(false);
                    setShowSnoozeDropdown(false);
                  }}
                  title="Move to"
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <FolderInput className="w-4 h-4" />
                </button>
                {showMoveDropdown && (
                  <div
                    className={`absolute left-0 top-9 w-44 py-2 rounded-xl shadow-xl border z-40 text-xs ${
                      isDark
                        ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                        : 'bg-white border-gray-200 text-[#1f1f1f]'
                    }`}
                  >
                    <div className="px-3 py-1 font-semibold opacity-60">Move to:</div>
                    {(
                      [
                        ['inbox', 'Inbox'],
                        ['archive', 'All Mail (Archive)'],
                        ['spam', 'Spam'],
                        ['trash', 'Trash'],
                      ] as const
                    ).map(([folderKey, label]) => (
                      <button
                        key={folderKey}
                        onClick={() => {
                          onBulkMoveTo(folderKey);
                          setShowMoveDropdown(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleTriggerRefresh}
                title="Refresh"
                aria-label="Refresh"
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <RotateCw
                  className={`w-4 h-4 opacity-75 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>

              {threads.some((t) => t.isUnread) && (
                <button
                  onClick={() =>
                    onBulkMarkRead(
                      false,
                      threads.filter((t) => t.isUnread).map((t) => t.id)
                    )
                  }
                  title="Mark all visible as read"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all as read</span>
                </button>
              )}

              {activeCustomLabel && (
                <div className="flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activeCustomLabel.color }}
                  />
                  <span>Label: {activeCustomLabel.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Count + Reading Pane Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">
            {threads.length > 0 ? `1–${threads.length} of ${threads.length}` : '0 conversations'}
          </span>

          <div
            className={`hidden lg:flex items-center p-0.5 rounded-lg border ${
              isDark ? 'border-white/10 bg-[#111318]' : 'border-gray-200 bg-gray-100/80'
            }`}
            title="Toggle reading pane layout"
          >
            <button
              onClick={() => onChangeSplitPane('none')}
              title="No split"
              className={`p-1 rounded-md cursor-pointer transition-colors ${
                splitPane === 'none'
                  ? isDark
                    ? 'bg-[#282a2c] text-white shadow-2xs'
                    : 'bg-white text-gray-900 shadow-2xs'
                  : 'opacity-55 hover:opacity-90'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeSplitPane('right')}
              title="Right of inbox"
              className={`p-1 rounded-md cursor-pointer transition-colors ${
                splitPane === 'right'
                  ? isDark
                    ? 'bg-[#282a2c] text-white shadow-2xs'
                    : 'bg-white text-gray-900 shadow-2xs'
                  : 'opacity-55 hover:opacity-90'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeSplitPane('bottom')}
              title="Below inbox"
              className={`p-1 rounded-md cursor-pointer transition-colors ${
                splitPane === 'bottom'
                  ? isDark
                    ? 'bg-[#282a2c] text-white shadow-2xs'
                    : 'bg-white text-gray-900 shadow-2xs'
                  : 'opacity-55 hover:opacity-90'
              }`}
            >
              <Rows2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Trash / Spam Banner */}
      {(activeFolder === 'trash' || activeFolder === 'spam') && threads.length > 0 && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            isDark
              ? 'bg-amber-950/20 border-white/10 text-gray-300'
              : 'bg-[#fef7e0] border-gray-200 text-gray-800'
          }`}
        >
          <span>
            {activeFolder === 'trash'
              ? 'Messages that have been in Trash more than 30 days will be automatically deleted.'
              : 'Messages that have been in Spam more than 30 days will be automatically deleted.'}
          </span>
          <button
            onClick={() => onEmptyFolder(activeFolder)}
            className="text-[#1a73e8] font-semibold hover:underline cursor-pointer ml-3 shrink-0"
          >
            {activeFolder === 'trash' ? 'Empty Trash now' : 'Delete all spam messages now'}
          </button>
        </div>
      )}

      {/* Inbox Category Tabs (Primary, Promotions, Social, Updates) */}
      {activeFolder === 'inbox' && !activeLabelId && showCategoryTabs && !hasActiveSearch && (
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 border-b shrink-0 ${
            isDark ? 'border-white/10 bg-[#1e1f23]' : 'border-gray-200/80 bg-white'
          }`}
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            const catThreads = allInboxThreads.filter((t) => t.category === cat.id);
            const unreadCatThreads = catThreads.filter((t) => t.isUnread);
            const latestUnreadSender =
              unreadCatThreads[0]?.messages[unreadCatThreads[0].messages.length - 1]?.sender
                .name;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`relative px-4 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-[#1a73e8]'
                    : isDark
                      ? 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      : 'text-[#444746] hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                    {unreadCatThreads.length > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold leading-4 ${cat.badgeColor}`}
                      >
                        {unreadCatThreads.length} new
                      </span>
                    )}
                  </div>
                  {latestUnreadSender && (
                    <div className="text-[11px] opacity-60 truncate">{latestUnreadSender}</div>
                  )}
                </div>
                {isSelected && (
                  <div className="absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full bg-[#1a73e8]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Thread Rows List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-200/60 dark:divide-white/8">
        {threads.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center px-6">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">
              {hasActiveSearch
                ? 'No messages matched your search.'
                : `No conversations in ${activeCustomLabel ? activeCustomLabel.name : activeFolder || 'this view'}.`}
            </p>
            <p className="text-xs opacity-60 mt-1 max-w-xs">
              {hasActiveSearch
                ? 'Try clearing some search filters or searching for another sender or keyword.'
                : 'Your mailbox is clean and organized.'}
            </p>
          </div>
        ) : (
          threads.map((thread, idx) => {
            const isSelected = selectedThreadIds.has(thread.id);
            const isActiveOpen = activeThreadId === thread.id;
            const isKeyboardFocused = focusedThreadIndex === idx;
            const attachments = getThreadAttachments(thread);
            const hasDraft =
              thread.folder === 'drafts' || thread.messages.some((m) => m.isDraft);

            // Unique sender names in thread
            const senderNames = Array.from(
              new Set(
                thread.messages.map((m) =>
                  m.sender.email === 'alex.chen@argonlabs.io'
                    ? 'me'
                    : m.sender.name.split(' ')[0]
                )
              )
            );
            const senderDisplay =
              thread.messages.length === 1
                ? thread.messages[0].sender.email === 'alex.chen@argonlabs.io'
                  ? `To: ${thread.messages[0].to.map((r) => r.name).join(', ') || 'me'}`
                  : thread.messages[0].sender.name
                : senderNames.join(', ');

            const rowPadding =
              density === 'compact'
                ? 'py-1.5'
                : density === 'comfortable'
                  ? 'py-2.5'
                  : 'py-2.5';

            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`group relative px-2 md:px-3.5 ${rowPadding} flex flex-col justify-center transition-colors cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-[#004a77]/45'
                      : 'bg-[#c2dbff]/55'
                    : isActiveOpen
                      ? isDark
                        ? 'bg-[#282a2c] ring-1 ring-inset ring-[#a8c7fa]/40'
                        : 'bg-[#e8f0fe]'
                      : thread.isUnread
                        ? isDark
                          ? 'bg-[#1e1f23] hover:bg-[#27292e]'
                          : 'bg-white hover:shadow-xs hover:z-10'
                        : isDark
                          ? 'bg-[#16181c] text-gray-300 hover:bg-[#222429]'
                          : 'bg-[#f2f6fc]/80 text-[#444746] hover:bg-[#eaf1fb]'
                } ${isKeyboardFocused ? 'border-l-[3px] border-l-[#1a73e8]' : ''}`}
              >
                {/* Main Row Line */}
                <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectThread(thread.id, e.shiftKey);
                    }}
                    aria-label={`Select conversation ${thread.subject}`}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#1a73e8]" />
                    ) : (
                      <Square className="w-4 h-4 opacity-40 group-hover:opacity-80" />
                    )}
                  </button>

                  {/* Star Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(thread.id);
                    }}
                    aria-label={thread.isStarred ? 'Starred' : 'Not starred'}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        thread.isStarred
                          ? 'text-[#f4b400] fill-[#f4b400]'
                          : 'opacity-35 group-hover:opacity-75'
                      }`}
                    />
                  </button>

                  {/* Importance Marker */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleImportant(thread.id);
                    }}
                    title={
                      thread.isImportant
                        ? 'Important mainly because of people in the conversation'
                        : 'Click to teach Gemini 4 Argon this conversation is important'
                    }
                    className="hidden sm:inline-flex p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 rotate-90 ${
                        thread.isImportant
                          ? 'text-[#f4b400] fill-[#f4b400]'
                          : 'opacity-25 group-hover:opacity-65'
                      }`}
                    />
                  </button>

                  {/* Senders Column */}
                  <div className="w-32 sm:w-44 md:w-48 shrink-0 flex items-center gap-1.5 pr-2 truncate">
                    {hasDraft && (
                      <span className="text-[#d93025] font-medium text-xs shrink-0">Draft</span>
                    )}
                    <span
                      className={`text-sm truncate ${
                        thread.isUnread
                          ? isDark
                            ? 'font-bold text-white'
                            : 'font-bold text-[#1f1f1f]'
                          : 'font-normal'
                      }`}
                    >
                      {senderDisplay}
                    </span>
                    {thread.messages.length > 1 && (
                      <span className="text-xs opacity-60 shrink-0">
                        {thread.messages.length}
                      </span>
                    )}
                  </div>

                  {/* Subject + Labels + Snippet */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate pr-2">
                    {/* Custom Labels */}
                    {thread.labels.map((lid) => {
                      const lbl = labels.find((l) => l.id === lid);
                      if (!lbl) return null;
                      return (
                        <span
                          key={lid}
                          className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium leading-none shrink-0"
                          style={{
                            backgroundColor: `${lbl.color}1c`,
                            color: isDark ? '#e3e3e3' : lbl.color,
                            border: `1px solid ${lbl.color}40`,
                          }}
                        >
                          {lbl.name}
                        </span>
                      );
                    })}

                    <span
                      className={`text-sm truncate shrink-0 max-w-[65%] ${
                        thread.isUnread
                          ? isDark
                            ? 'font-bold text-white'
                            : 'font-bold text-[#1f1f1f]'
                          : 'font-normal'
                      }`}
                    >
                      {thread.subject || '(no subject)'}
                    </span>

                    <span className="text-sm opacity-60 truncate">
                      — {thread.snippet}
                    </span>
                  </div>

                  {/* Right Side: Date/Snooze or Hover Action Buttons */}
                  <div className="shrink-0 flex items-center justify-end min-w-[76px]">
                    {/* Timestamp (hidden on row hover on desktop) */}
                    <span
                      className={`text-xs group-hover:hidden ${
                        thread.isSnoozed || thread.scheduledFor
                          ? 'text-[#e37400] font-semibold'
                          : thread.isUnread
                            ? isDark
                              ? 'font-bold text-white'
                              : 'font-bold text-[#1f1f1f]'
                            : 'opacity-70'
                      }`}
                    >
                      {thread.isSnoozed
                        ? thread.snoozedUntil
                        : thread.scheduledFor
                          ? thread.scheduledFor
                          : thread.displayDate}
                    </span>

                    {/* Hover Quick Actions Bar */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="hidden group-hover:flex items-center gap-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => onBulkArchive([thread.id])}
                        title="Archive"
                        aria-label="Archive"
                        className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onBulkDelete([thread.id])}
                        title="Delete"
                        aria-label="Delete"
                        className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onBulkMarkRead(!thread.isUnread, [thread.id])}
                        title={thread.isUnread ? 'Mark as read' : 'Mark as unread'}
                        aria-label={thread.isUnread ? 'Mark as read' : 'Mark as unread'}
                        className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                      >
                        {thread.isUnread ? (
                          <MailOpen className="w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setRowSnoozeId((prev) => (prev === thread.id ? null : thread.id))
                          }
                          title="Snooze"
                          aria-label="Snooze"
                          className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        {rowSnoozeId === thread.id && (
                          <div
                            className={`absolute right-0 top-8 w-44 py-1.5 rounded-xl shadow-xl border z-40 text-xs ${
                              isDark
                                ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                                : 'bg-white border-gray-200 text-[#1f1f1f]'
                            }`}
                          >
                            {['Later today, 6:00 PM', 'Tomorrow, 9:00 AM', 'Next week, Mon'].map(
                              (opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    onBulkSnooze(opt, [thread.id]);
                                    setRowSnoozeId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                >
                                  {opt}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachment Chips Row (shown in Default density when thread has attachments) */}
                {density === 'default' && attachments.length > 0 && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 pl-14 sm:pl-[252px] md:pl-[268px] flex flex-wrap items-center gap-1.5"
                  >
                    {attachments.slice(0, 3).map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => onPreviewAttachment(att)}
                        title={`Preview ${att.name} (${att.size})`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer max-w-[210px] ${
                          isDark
                            ? 'border-white/15 bg-white/5 hover:bg-white/10 text-gray-200'
                            : 'border-gray-300/90 bg-white hover:bg-gray-50 text-[#444746]'
                        }`}
                      >
                        {renderAttachmentIcon(att.type)}
                        <span className="truncate font-medium">{att.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
