import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Archive,
  AlertOctagon,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  Tag,
  FolderInput,
  RotateCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  Columns,
  Rows,
  Maximize2,
  Check,
  Inbox,
  Star,
} from 'lucide-react';
import {
  CustomLabel,
  EmailThread,
  ReadingPaneMode,
  SystemFolder,
  ThemeMode,
} from '../types/mail';

interface ToolbarProps {
  isDetailViewOnly: boolean;
  onBackToList: () => void;
  visibleThreads: EmailThread[];
  selectedIds: Set<string>;
  onSelectGroup: (mode: 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred') => void;
  onArchiveSelected: () => void;
  onSpamSelected: () => void;
  onDeleteSelected: () => void;
  onDeleteForeverSelected: () => void;
  onMoveToInboxSelected: () => void;
  onMarkReadSelected: (read: boolean) => void;
  onStarSelected: (starred: boolean) => void;
  onSnoozeSelected: (untilLabel: string) => void;
  onToggleLabelSelected: (labelId: string) => void;
  onMoveFolderSelected: (dest: 'inbox' | 'archive' | 'spam' | 'trash') => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  activeFolder: SystemFolder;
  labels: CustomLabel[];
  readingPane: ReadingPaneMode;
  onChangeReadingPane: (mode: ReadingPaneMode) => void;
  currentPage: number;
  pageSize: number;
  totalFiltered: number;
  onPageChange: (nextPage: number) => void;
  onNavigateDetailThread?: (dir: 'prev' | 'next') => void;
  detailThreadIndex?: number;
  theme: ThemeMode;
}

const SNOOZE_PRESETS = [
  { label: 'Later today', time: 'Today, 6:00 PM' },
  { label: 'Tomorrow', time: 'Thu, Oct 15, 8:00 AM' },
  { label: 'This weekend', time: 'Sat, Oct 17, 9:00 AM' },
  { label: 'Next week', time: 'Mon, Oct 19, 8:00 AM' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  isDetailViewOnly,
  onBackToList,
  visibleThreads,
  selectedIds,
  onSelectGroup,
  onArchiveSelected,
  onSpamSelected,
  onDeleteSelected,
  onDeleteForeverSelected,
  onMoveToInboxSelected,
  onMarkReadSelected,
  onStarSelected,
  onSnoozeSelected,
  onToggleLabelSelected,
  onMoveFolderSelected,
  onMarkAllRead,
  onRefresh,
  activeFolder,
  labels,
  readingPane,
  onChangeReadingPane,
  currentPage,
  pageSize,
  totalFiltered,
  onPageChange,
  onNavigateDetailThread,
  detailThreadIndex = -1,
  theme,
}) => {
  const [showSelectDropdown, setShowSelectDropdown] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showLabelsMenu, setShowLabelsMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSplitMenu, setShowSplitMenu] = useState(false);
  const [labelFilterText, setLabelFilterText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowSelectDropdown(false);
        setShowSnoozeMenu(false);
        setShowLabelsMenu(false);
        setShowMoveMenu(false);
        setShowMoreMenu(false);
        setShowSplitMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = theme === 'dark';
  const selectedCount = selectedIds.size;
  const allSelected =
    visibleThreads.length > 0 && visibleThreads.every((t) => selectedIds.has(t.id));
  const someSelected = selectedCount > 0 && !allSelected;

  const selectedThreadsList = visibleThreads.filter((t) => selectedIds.has(t.id));
  const anyUnreadSelected = selectedThreadsList.some((t) => t.isUnread);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const iconBtnClass = `w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
    isDark
      ? 'hover:bg-[#282A2C] text-[#C4C7C5] disabled:opacity-30'
      : 'hover:bg-[#E8EAED] text-[#444746] disabled:opacity-30'
  }`;

  const popoverClass = `absolute left-0 top-10 z-40 min-w-[200px] rounded-xl shadow-xl border py-1.5 text-xs ${
    isDark
      ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
      : 'bg-white border-[#E0E2E0] text-[#1F1F1F]'
  }`;

  const startIdx = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(totalFiltered, currentPage * pageSize);

  return (
    <div
      ref={toolbarRef}
      className={`h-12 px-2 md:px-4 flex items-center justify-between border-b shrink-0 select-none ${
        isDark ? 'border-[#282A2C] bg-[#1E1F20]' : 'border-[#F1F3F4] bg-white'
      }`}
    >
      {/* Left Action Cluster */}
      <div className="flex items-center gap-0.5 md:gap-1 relative">
        {isDetailViewOnly ? (
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Back to thread list"
            title="Back to inbox (u)"
            className={`${iconBtnClass} mr-2`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center mr-1 relative">
            <button
              type="button"
              onClick={() => onSelectGroup(allSelected || someSelected ? 'none' : 'all')}
              aria-label={allSelected ? 'Deselect all threads' : 'Select all threads'}
              title="Select"
              className={`p-2 rounded-l-md transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
              }`}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-[#0B57D0]" />
              ) : someSelected ? (
                <MinusSquare className="w-4 h-4 text-[#0B57D0]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowSelectDropdown((p) => !p)}
              aria-label="Selection options"
              title="Select options"
              className={`py-2 px-1 rounded-r-md transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showSelectDropdown && (
              <div className={popoverClass}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'none', label: 'None' },
                  { id: 'read', label: 'Read' },
                  { id: 'unread', label: 'Unread' },
                  { id: 'starred', label: 'Starred' },
                  { id: 'unstarred', label: 'Unstarred' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelectGroup(
                        opt.id as 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred'
                      );
                      setShowSelectDropdown(false);
                    }}
                    className={`w-full px-4 py-1.5 text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contextual Actions when threads are selected OR in Detail View */}
        {selectedCount > 0 || isDetailViewOnly ? (
          <div className="flex items-center gap-0.5 md:gap-1">
            {!isDetailViewOnly && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-1 tabular-nums ${
                  isDark ? 'bg-[#004A77] text-[#C2E7FF]' : 'bg-[#D3E3FD] text-[#041E49]'
                }`}
              >
                {selectedCount} selected
              </span>
            )}

            {activeFolder === 'trash' || activeFolder === 'spam' ? (
              <>
                <button
                  type="button"
                  onClick={onDeleteForeverSelected}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'hover:bg-[#282A2C] text-[#F2B8B5]'
                      : 'hover:bg-[#FCE8E6] text-[#B3261E]'
                  }`}
                >
                  Delete forever
                </button>
                <button
                  type="button"
                  onClick={onMoveToInboxSelected}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-[#282A2C]' : 'hover:bg-[#E8EAED]'
                  }`}
                >
                  {activeFolder === 'spam' ? 'Not spam' : 'Move to Inbox'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onArchiveSelected}
                  aria-label="Archive"
                  title="Archive (e)"
                  className={iconBtnClass}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onSpamSelected}
                  aria-label="Report spam"
                  title="Report spam (!)"
                  className={iconBtnClass}
                >
                  <AlertOctagon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  aria-label="Delete"
                  title="Delete (#)"
                  className={iconBtnClass}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <div
              className={`h-5 w-px mx-1 ${isDark ? 'bg-[#444746]' : 'bg-[#E0E2E0]'}`}
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={() => onMarkReadSelected(!anyUnreadSelected)}
              aria-label={anyUnreadSelected ? 'Mark as read' : 'Mark as unread'}
              title={anyUnreadSelected ? 'Mark as read (Shift+I)' : 'Mark as unread (Shift+U)'}
              className={iconBtnClass}
            >
              {anyUnreadSelected ? (
                <MailOpen className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
            </button>

            {/* Snooze Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSnoozeMenu((p) => !p);
                  setShowLabelsMenu(false);
                  setShowMoveMenu(false);
                }}
                aria-label="Snooze"
                title="Snooze (b)"
                className={iconBtnClass}
              >
                <Clock className="w-4 h-4" />
              </button>

              {showSnoozeMenu && (
                <div className={`${popoverClass} w-60`}>
                  <div className="px-3.5 py-1.5 font-semibold opacity-70 border-b border-current/10 mb-1">
                    Snooze until...
                  </div>
                  {SNOOZE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        onSnoozeSelected(preset.time);
                        setShowSnoozeMenu(false);
                      }}
                      className={`w-full px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                      }`}
                    >
                      <span className="font-medium">{preset.label}</span>
                      <span className="opacity-65 tabular-nums">{preset.time}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Labels Assignment Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowLabelsMenu((p) => !p);
                  setShowSnoozeMenu(false);
                  setShowMoveMenu(false);
                }}
                aria-label="Labels"
                title="Labels (l)"
                className={iconBtnClass}
              >
                <Tag className="w-4 h-4" />
              </button>

              {showLabelsMenu && (
                <div className={`${popoverClass} w-56 p-2`}>
                  <div className="font-semibold opacity-75 px-1.5 pb-1.5">Label as:</div>
                  <input
                    type="text"
                    value={labelFilterText}
                    onChange={(e) => setLabelFilterText(e.target.value)}
                    placeholder="Filter labels..."
                    className={`w-full px-2 py-1 mb-1.5 rounded border outline-none text-xs ${
                      isDark
                        ? 'bg-[#1E1F20] border-[#5F6368] text-white'
                        : 'bg-[#F8FAFD] border-[#C4C7C5]'
                    }`}
                  />
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {labels
                      .filter((l) =>
                        l.name.toLowerCase().includes(labelFilterText.toLowerCase())
                      )
                      .map((lbl) => {
                        const hasLabelOnAll =
                          selectedThreadsList.length > 0 &&
                          selectedThreadsList.every((t) => t.labels.includes(lbl.id));

                        return (
                          <button
                            key={lbl.id}
                            type="button"
                            onClick={() => onToggleLabelSelected(lbl.id)}
                            className={`w-full px-2 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-sm inline-block"
                                style={{
                                  backgroundColor: isDark ? lbl.darkBgColor : lbl.color,
                                  border: `1px solid ${isDark ? lbl.darkTextColor : lbl.textColor}`,
                                }}
                              />
                              <span>{lbl.name}</span>
                            </span>
                            {hasLabelOnAll && <Check className="w-3.5 h-3.5 text-[#0B57D0]" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Move To Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowMoveMenu((p) => !p);
                  setShowSnoozeMenu(false);
                  setShowLabelsMenu(false);
                }}
                aria-label="Move to"
                title="Move to (v)"
                className={iconBtnClass}
              >
                <FolderInput className="w-4 h-4" />
              </button>

              {showMoveMenu && (
                <div className={popoverClass}>
                  <div className="px-3.5 py-1.5 font-semibold opacity-70 border-b border-current/10 mb-1">
                    Move to:
                  </div>
                  {[
                    { id: 'inbox', label: 'Inbox', icon: Inbox },
                    { id: 'archive', label: 'All Mail (Archive)', icon: Archive },
                    { id: 'spam', label: 'Spam', icon: AlertOctagon },
                    { id: 'trash', label: 'Trash', icon: Trash2 },
                  ].map((dest) => {
                    const DestIcon = dest.icon;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => {
                          onMoveFolderSelected(
                            dest.id as 'inbox' | 'archive' | 'spam' | 'trash'
                          );
                          setShowMoveMenu(false);
                        }}
                        className={`w-full px-3.5 py-2 flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                        }`}
                      >
                        <DestIcon className="w-3.5 h-3.5 opacity-75" />
                        <span>{dest.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Default Unselected Actions */
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleRefreshClick}
              aria-label="Refresh"
              title="Refresh"
              className={iconBtnClass}
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu((p) => !p)}
                aria-label="More email options"
                title="More"
                className={iconBtnClass}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <div className={`${popoverClass} w-52`}>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkAllRead();
                      setShowMoreMenu(false);
                    }}
                    className={`w-full px-3.5 py-2 flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                    }`}
                  >
                    <MailOpen className="w-3.5 h-3.5 opacity-75" />
                    <span>Mark all as read</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectGroup('unread');
                      setShowMoreMenu(false);
                    }}
                    className={`w-full px-3.5 py-2 flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 opacity-75" />
                    <span>Select all unread</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectGroup('starred');
                      setShowMoreMenu(false);
                    }}
                    className={`w-full px-3.5 py-2 flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 opacity-75" />
                    <span>Select all starred</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Cluster: Pagination + Split Pane Mode Switcher */}
      <div className="flex items-center gap-1 md:gap-2">
        {isDetailViewOnly && onNavigateDetailThread ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="opacity-70 tabular-nums mr-1">
              {detailThreadIndex + 1} of {totalFiltered}
            </span>
            <button
              type="button"
              disabled={detailThreadIndex <= 0}
              onClick={() => onNavigateDetailThread('prev')}
              aria-label="Newer conversation"
              title="Newer (k)"
              className={iconBtnClass}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={detailThreadIndex >= totalFiltered - 1}
              onClick={() => onNavigateDetailThread('next')}
              aria-label="Older conversation"
              title="Older (j)"
              className={iconBtnClass}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs">
            <span className="opacity-75 tabular-nums px-1.5">
              {totalFiltered === 0 ? '0–0 of 0' : `${startIdx}–${endIdx} of ${totalFiltered}`}
            </span>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              aria-label="Newer page"
              title="Newer"
              className={iconBtnClass}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={endIdx >= totalFiltered}
              onClick={() => onPageChange(currentPage + 1)}
              aria-label="Older page"
              title="Older"
              className={iconBtnClass}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Split Pane Mode Switcher (Desktop) */}
        <div className="hidden lg:block relative">
          <button
            type="button"
            onClick={() => setShowSplitMenu((p) => !p)}
            aria-label="Toggle split pane mode"
            title="Toggle split pane mode"
            className={`flex items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
            }`}
          >
            {readingPane === 'right' ? (
              <Columns className="w-4 h-4" />
            ) : readingPane === 'bottom' ? (
              <Rows className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {showSplitMenu && (
            <div className={`${popoverClass} left-auto right-0 w-48`}>
              {[
                { id: 'none', label: 'No split', icon: Maximize2 },
                { id: 'right', label: 'Vertical split (Right)', icon: Columns },
                { id: 'bottom', label: 'Horizontal split (Bottom)', icon: Rows },
              ].map((m) => {
                const MIcon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChangeReadingPane(m.id as ReadingPaneMode);
                      setShowSplitMenu(false);
                    }}
                    className={`w-full px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MIcon className="w-3.5 h-3.5 opacity-75" />
                      <span>{m.label}</span>
                    </span>
                    {readingPane === m.id && <Check className="w-3.5 h-3.5 text-[#0B57D0]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
