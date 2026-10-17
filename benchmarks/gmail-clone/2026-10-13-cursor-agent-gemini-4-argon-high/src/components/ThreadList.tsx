import React from 'react';
import {
  Inbox,
  Tag as TagIcon,
  Users,
  Info,
  Star,
  Bookmark,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  Paperclip,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  CheckSquare,
  Square,
  Sparkles,
  SearchX,
} from 'lucide-react';
import {
  Attachment,
  CustomLabel,
  DensityMode,
  EmailThread,
  InboxCategory,
  SearchFilters,
  SystemFolder,
  ThemeMode,
} from '../types/mail';
import { getThreadAllAttachments, hasActiveSearch } from '../utils/searchParser';

interface ThreadListProps {
  threads: EmailThread[];
  allInboxThreads: EmailThread[];
  activeFolder: SystemFolder;
  activeLabelId: string | null;
  activeCategory: InboxCategory;
  onSelectCategory: (cat: InboxCategory) => void;
  showCategoryTabs: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey?: boolean) => void;
  onToggleStar: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onArchiveThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onToggleReadThread: (id: string) => void;
  onSnoozeThread: (id: string, until: string) => void;
  onOpenThread: (thread: EmailThread) => void;
  onPreviewAttachment: (att: Attachment) => void;
  activeThreadId: string | null;
  focusedIndex: number;
  onSetFocusedIndex: (idx: number) => void;
  labels: CustomLabel[];
  density: DensityMode;
  filters: SearchFilters;
  onResetFilters: () => void;
  theme: ThemeMode;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  allInboxThreads,
  activeFolder,
  activeLabelId,
  activeCategory,
  onSelectCategory,
  showCategoryTabs,
  selectedIds,
  onToggleSelect,
  onToggleStar,
  onToggleImportant,
  onArchiveThread,
  onDeleteThread,
  onToggleReadThread,
  onSnoozeThread,
  onOpenThread,
  onPreviewAttachment,
  activeThreadId,
  focusedIndex,
  onSetFocusedIndex,
  labels,
  density,
  filters,
  onResetFilters,
  theme,
}) => {
  const isDark = theme === 'dark';
  const searching = hasActiveSearch(filters);

  const categories: {
    id: InboxCategory;
    label: string;
    icon: React.FC<{ className?: string }>;
    badgeColor: string;
  }[] = [
    { id: 'primary', label: 'Primary', icon: Inbox, badgeColor: 'bg-[#0B57D0] text-white' },
    { id: 'promotions', label: 'Promotions', icon: TagIcon, badgeColor: 'bg-[#188038] text-white' },
    { id: 'social', label: 'Social', icon: Users, badgeColor: 'bg-[#1A73E8] text-white' },
    { id: 'updates', label: 'Updates', icon: Info, badgeColor: 'bg-[#E37400] text-white' },
  ];

  const getAttachmentIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-[#D93025] shrink-0" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-[#188038] shrink-0" />;
      case 'code':
        return <FileCode className="w-3.5 h-3.5 text-[#0B57D0] shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-[#EA4335] shrink-0" />;
    }
  };

  const activeCustomLabel = activeLabelId ? labels.find((l) => l.id === activeLabelId) : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto select-none">
      {/* Category Tabs (Only in Inbox when enabled & not searching) */}
      {activeFolder === 'inbox' && !activeLabelId && showCategoryTabs && !searching && (
        <div
          role="tablist"
          aria-label="Inbox categories"
          className={`flex items-center border-b shrink-0 overflow-x-auto no-scrollbar ${
            isDark ? 'border-[#282A2C] bg-[#1E1F20]' : 'border-[#E8EAED] bg-white'
          }`}
        >
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            const isSelected = activeCategory === cat.id;
            const catThreads = allInboxThreads.filter(
              (t) => t.folder === 'inbox' && t.category === cat.id
            );
            const unreadCatThreads = catThreads.filter((t) => t.isUnread);
            const unreadCount = unreadCatThreads.length;
            const previewSenders = unreadCatThreads
              .slice(0, 2)
              .map((t) => t.messages[t.messages.length - 1].sender.name.split(' ')[0])
              .join(', ');

            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`relative flex-1 min-w-[155px] max-w-[250px] h-14 px-4 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'text-[#A8C7FA] font-semibold'
                      : 'text-[#0B57D0] font-semibold'
                    : isDark
                    ? 'text-[#C4C7C5] hover:bg-[#282A2C]'
                    : 'text-[#444746] hover:bg-[#F2F6FC]'
                }`}
              >
                <CatIcon className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] truncate">{cat.label}</span>
                    {unreadCount > 0 && (
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold tabular-nums ${cat.badgeColor}`}
                      >
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {previewSenders && (
                    <div className="text-[11px] font-normal opacity-65 truncate">
                      {previewSenders}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <span
                    className={`absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full ${
                      isDark ? 'bg-[#A8C7FA]' : 'bg-[#0B57D0]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Active Search / Label Context Banner */}
      {(searching || activeCustomLabel) && (
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs border-b shrink-0 ${
            isDark
              ? 'bg-[#282A2C]/70 border-[#3C4043] text-[#E3E3E3]'
              : 'bg-[#F8FAFD] border-[#E8EAED] text-[#444746]'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {activeCustomLabel && (
              <span className="inline-flex items-center gap-1.5 font-medium">
                Label:
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-semibold"
                  style={{
                    backgroundColor: isDark
                      ? activeCustomLabel.darkBgColor
                      : activeCustomLabel.color,
                    color: isDark ? activeCustomLabel.darkTextColor : activeCustomLabel.textColor,
                  }}
                >
                  {activeCustomLabel.name}
                </span>
              </span>
            )}
            {searching && (
              <span className="font-medium">
                Showing {threads.length} matching conversation{threads.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {searching && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[#0B57D0] dark:text-[#A8C7FA] font-medium hover:underline cursor-pointer"
            >
              Clear search filters
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {threads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
              isDark ? 'bg-[#282A2C] text-[#A8C7FA]' : 'bg-[#EAF1FB] text-[#0B57D0]'
            }`}
          >
            {searching ? <SearchX className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
          </div>
          <div className="text-base font-medium mb-1">
            {searching
              ? 'No messages matched your search'
              : activeFolder === 'inbox'
              ? `Your ${activeCategory} tab is empty`
              : `No conversations in ${activeFolder}`}
          </div>
          <p className="text-xs opacity-65 max-w-sm">
            {searching
              ? 'Try broadening your search terms or clearing active filter chips.'
              : 'New messages and updates will appear here automatically.'}
          </p>
          {searching && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 px-4 py-1.5 rounded-full text-xs font-medium bg-[#0B57D0] text-white hover:bg-[#0842A0] transition-colors cursor-pointer"
            >
              Reset search
            </button>
          )}
        </div>
      ) : (
        /* Thread Rows */
        <div role="list" className="divide-y divide-current/5">
          {threads.map((thread, idx) => {
            const isSelected = selectedIds.has(thread.id);
            const isActivePane = activeThreadId === thread.id;
            const isFocused = focusedIndex === idx;
            const isUnread = thread.isUnread;
            const lastMsg = thread.messages[thread.messages.length - 1];
            const attachments = getThreadAllAttachments(thread);
            const hasAttachments = attachments.length > 0;

            // Format sender list
            const uniqueSenders = Array.from(
              new Set(
                thread.messages.map((m) =>
                  m.sender.id === 'user-me' ? 'me' : m.sender.name.split(' ')[0]
                )
              )
            );
            const senderDisplay =
              thread.folder === 'drafts'
                ? 'Draft'
                : thread.folder === 'sent' || thread.folder === 'scheduled'
                ? `To: ${lastMsg.to.map((r) => r.name.split(' ')[0]).join(', ')}`
                : uniqueSenders.length === 1 && uniqueSenders[0] !== 'me'
                ? thread.messages[thread.messages.length - 1].sender.name
                : uniqueSenders.join(', ');

            const rowPaddingClass =
              density === 'compact'
                ? 'py-1 min-h-[32px]'
                : density === 'comfortable'
                ? 'py-2 min-h-[40px]'
                : 'py-2 min-h-[40px]';

            // Row background state
            const rowBgClass =
              isSelected || isActivePane
                ? isDark
                  ? 'bg-[#004A77]/65 hover:bg-[#004A77]/80'
                  : 'bg-[#C2DBFF] hover:bg-[#B4D2FF]'
                : isUnread
                ? isDark
                  ? 'bg-[#1E1F20] hover:bg-[#282A2C]'
                  : 'bg-white hover:bg-[#F5F8FD]'
                : isDark
                ? 'bg-[#16181B] hover:bg-[#232528]'
                : 'bg-[#F2F6FC] hover:bg-[#E9F0FA]';

            return (
              <div
                key={thread.id}
                role="listitem"
                onClick={() => {
                  onSetFocusedIndex(idx);
                  onOpenThread(thread);
                }}
                className={`group relative px-2 md:px-3 ${rowPaddingClass} flex flex-col justify-center transition-colors cursor-pointer ${rowBgClass} ${
                  isDark ? 'border-[#282A2C]' : 'border-[#ECEFF1]'
                }`}
              >
                {/* Left Keyboard Focus Indicator */}
                {isFocused && (
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                      isDark ? 'bg-[#A8C7FA]' : 'bg-[#0B57D0]'
                    }`}
                  />
                )}

                <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(thread.id, e.shiftKey);
                    }}
                    aria-label={`Select conversation ${thread.subject}`}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      isSelected
                        ? 'text-[#0B57D0] dark:text-[#A8C7FA]'
                        : 'opacity-40 group-hover:opacity-85 hover:opacity-100'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Star Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(thread.id);
                    }}
                    aria-label={thread.isStarred ? 'Starred' : 'Not starred'}
                    title={thread.isStarred ? 'Starred' : 'Not starred'}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      thread.isStarred
                        ? 'text-[#F4B400] opacity-100'
                        : 'opacity-35 group-hover:opacity-80 hover:opacity-100'
                    }`}
                  >
                    <Star
                      className="w-4 h-4"
                      fill={thread.isStarred ? '#F4B400' : 'none'}
                    />
                  </button>

                  {/* Important Marker */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleImportant(thread.id);
                    }}
                    aria-label={thread.isImportant ? 'Important' : 'Not important'}
                    title={
                      thread.isImportant
                        ? 'Important mainly because of people in the conversation'
                        : 'Click to teach this conversation is important'
                    }
                    className={`hidden sm:inline-flex p-1 rounded transition-colors cursor-pointer ${
                      thread.isImportant
                        ? 'text-[#F4B400] opacity-95'
                        : 'opacity-25 group-hover:opacity-65 hover:opacity-100'
                    }`}
                  >
                    <Bookmark
                      className="w-3.5 h-3.5"
                      fill={thread.isImportant ? '#F4B400' : 'none'}
                    />
                  </button>

                  {/* Sender Column */}
                  <div className="w-[130px] sm:w-[175px] md:w-[195px] shrink-0 flex items-center gap-1.5 pr-2 min-w-0">
                    <span
                      className={`text-[14px] truncate ${
                        thread.folder === 'drafts'
                          ? 'text-[#D93025] font-normal'
                          : isUnread
                          ? isDark
                            ? 'font-semibold text-white'
                            : 'font-semibold text-[#1F1F1F]'
                          : isDark
                          ? 'font-normal text-[#C4C7C5]'
                          : 'font-normal text-[#444746]'
                      }`}
                    >
                      {senderDisplay}
                    </span>
                    {thread.messages.length > 1 && (
                      <span
                        className={`text-[11px] tabular-nums shrink-0 ${
                          isDark ? 'text-[#8E918F]' : 'text-[#5F6368]'
                        }`}
                      >
                        {thread.messages.length}
                      </span>
                    )}
                  </div>

                  {/* Subject + Labels + Snippet Column */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 pr-2">
                    {/* Label Chips */}
                    {thread.labels.map((lblId) => {
                      const lbl = labels.find((l) => l.id === lblId);
                      if (!lbl) return null;
                      return (
                        <span
                          key={lbl.id}
                          className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[11px] font-medium leading-none shrink-0"
                          style={{
                            backgroundColor: isDark ? lbl.darkBgColor : lbl.color,
                            color: isDark ? lbl.darkTextColor : lbl.textColor,
                          }}
                        >
                          {lbl.name}
                        </span>
                      );
                    })}

                    {/* Subject & Snippet Inline */}
                    <div className="truncate text-[14px]">
                      <span
                        className={
                          isUnread
                            ? isDark
                              ? 'font-semibold text-white'
                              : 'font-semibold text-[#1F1F1F]'
                            : isDark
                            ? 'font-normal text-[#C4C7C5]'
                            : 'font-normal text-[#1F1F1F]'
                        }
                      >
                        {thread.subject || '(no subject)'}
                      </span>
                      <span
                        className={`font-normal ${
                          isDark ? 'text-[#8E918F]' : 'text-[#5F6368]'
                        }`}
                      >
                        {' '}
                        — {lastMsg.snippet}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Timestamp (default) OR Hover Quick Action Rail */}
                  <div className="shrink-0 flex items-center justify-end min-w-[78px] relative">
                    {/* Default Timestamp + Paperclip */}
                    <div className="flex items-center gap-1.5 group-hover:opacity-0 transition-opacity">
                      {hasAttachments && density !== 'default' && (
                        <Paperclip className="w-3.5 h-3.5 opacity-60" />
                      )}
                      {thread.snoozedUntil ? (
                        <span className="text-xs font-semibold text-[#E37400] tabular-nums">
                          {thread.snoozedUntil}
                        </span>
                      ) : thread.scheduledFor ? (
                        <span className="text-xs font-semibold text-[#0B57D0] dark:text-[#A8C7FA] tabular-nums">
                          {thread.scheduledFor}
                        </span>
                      ) : (
                        <span
                          className={`text-xs tabular-nums ${
                            isUnread
                              ? isDark
                                ? 'font-semibold text-white'
                                : 'font-semibold text-[#1F1F1F]'
                              : isDark
                              ? 'font-normal text-[#8E918F]'
                              : 'font-normal text-[#5F6368]'
                          }`}
                        >
                          {thread.displayDate}
                        </span>
                      )}
                    </div>

                    {/* Hover Action Rail (Zero Layout Shift) */}
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 flex items-center gap-0.5 pl-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onArchiveThread(thread.id)}
                        aria-label="Archive"
                        title="Archive"
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-black/10'
                        }`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteThread(thread.id)}
                        aria-label="Delete"
                        title="Delete"
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-black/10'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleReadThread(thread.id)}
                        aria-label={isUnread ? 'Mark as read' : 'Mark as unread'}
                        title={isUnread ? 'Mark as read' : 'Mark as unread'}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-black/10'
                        }`}
                      >
                        {isUnread ? (
                          <MailOpen className="w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSnoozeThread(thread.id, 'Tomorrow, 8:00 AM')}
                        aria-label="Snooze"
                        title="Snooze until tomorrow"
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-black/10'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Default Density Attachment Chips Row */}
                {density === 'default' && hasAttachments && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-[88px] sm:pl-[268px] md:pl-[288px] mt-1.5">
                    {attachments.slice(0, 3).map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewAttachment(att);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer max-w-[210px] ${
                          isDark
                            ? 'bg-[#282A2C] border-[#444746] hover:bg-[#3C4043] text-[#E3E3E3]'
                            : 'bg-white border-[#DADCE0] hover:bg-[#F1F3F4] text-[#3C4043]'
                        }`}
                      >
                        {getAttachmentIcon(att.type)}
                        <span className="truncate font-medium">{att.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
