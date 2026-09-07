import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  Tag,
  FolderInput,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  Sliders,
  Check,
} from 'lucide-react';
import { useMail } from '../context/MailContext';
import { DensityMode } from '../types/mail';

export const MailToolbar: React.FC = () => {
  const {
    filteredThreads,
    selectedThreadIds,
    selectAllThreads,
    clearSelection,
    bulkArchive,
    bulkDelete,
    bulkMarkRead,
    bulkApplyLabel,
    bulkMoveToFolder,
    setSnoozeTargetThreadId,
    labels,
    setIsCreateLabelModalOpen,
    density,
    setDensity,
    showToast,
  } = useMail();

  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const [isLabelsMenuOpen, setIsLabelsMenuOpen] = useState(false);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDensityMenuOpen, setIsDensityMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectMenuRef = useRef<HTMLDivElement>(null);
  const labelsMenuRef = useRef<HTMLDivElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const densityMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectMenuRef.current && !selectMenuRef.current.contains(e.target as Node)) {
        setIsSelectMenuOpen(false);
      }
      if (labelsMenuRef.current && !labelsMenuRef.current.contains(e.target as Node)) {
        setIsLabelsMenuOpen(false);
      }
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setIsMoveMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (densityMenuRef.current && !densityMenuRef.current.contains(e.target as Node)) {
        setIsDensityMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalVisible = filteredThreads.length;
  const numSelected = selectedThreadIds.length;
  const allSelected = totalVisible > 0 && numSelected === totalVisible;
  const isIndeterminate = numSelected > 0 && numSelected < totalVisible;

  const handleToggleSelectAll = () => {
    if (allSelected || isIndeterminate) {
      clearSelection();
    } else {
      selectAllThreads(filteredThreads.map((t) => t.id));
    }
  };

  const handleSelectFiltered = (type: 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred') => {
    setIsSelectMenuOpen(false);
    if (type === 'all') {
      selectAllThreads(filteredThreads.map((t) => t.id));
    } else if (type === 'none') {
      clearSelection();
    } else if (type === 'read') {
      selectAllThreads(filteredThreads.filter((t) => t.unreadCount === 0).map((t) => t.id));
    } else if (type === 'unread') {
      selectAllThreads(filteredThreads.filter((t) => t.unreadCount > 0).map((t) => t.id));
    } else if (type === 'starred') {
      selectAllThreads(filteredThreads.filter((t) => t.isStarred).map((t) => t.id));
    } else if (type === 'unstarred') {
      selectAllThreads(filteredThreads.filter((t) => !t.isStarred).map((t) => t.id));
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Mailbox updated');
    }, 600);
  };

  return (
    <div className="h-12 px-3 sm:px-4 flex items-center justify-between border-b border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] select-none text-gray-700 dark:text-gray-300 text-sm z-10 shrink-0">
      {/* Left controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Selection Checkbox & Dropdown */}
        <div className="relative flex items-center" ref={selectMenuRef}>
          <button
            onClick={handleToggleSelectAll}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300 transition-colors"
            title={allSelected ? 'Select none' : 'Select all'}
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : isIndeterminate ? (
              <MinusSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <button
            onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="Select options"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Selection Dropdown Menu */}
          {isSelectMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
              <button
                onClick={() => handleSelectFiltered('all')}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                All
              </button>
              <button
                onClick={() => handleSelectFiltered('none')}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                None
              </button>
              <button
                onClick={() => handleSelectFiltered('read')}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                Read
              </button>
              <button
                onClick={() => handleSelectFiltered('unread')}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                Unread
              </button>
              <button
                onClick={() => handleSelectFiltered('starred')}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                Starred
              </button>
              <button
                onClick={() => handleSelectFiltered('unstarred')}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                Unstarred
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Actions when Items Selected */}
        {numSelected > 0 ? (
          <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
            <button
              onClick={bulkArchive}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={bulkDelete}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => bulkMarkRead(true)}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Mark as read"
            >
              <MailOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => bulkMarkRead(false)}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Mark as unread"
            >
              <Mail className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSnoozeTargetThreadId(selectedThreadIds[0])}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Snooze"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Labels Dropdown */}
            <div className="relative" ref={labelsMenuRef}>
              <button
                onClick={() => setIsLabelsMenuOpen(!isLabelsMenuOpen)}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Labels"
              >
                <Tag className="w-4 h-4" />
              </button>
              {isLabelsMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
                  <div className="px-3 py-1 font-semibold text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    Label as:
                  </div>
                  {labels.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        bulkApplyLabel(l.id);
                        setIsLabelsMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="truncate">{l.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsLabelsMenuOpen(false);
                        setIsCreateLabelModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium"
                    >
                      + Create new label
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Move to Folder Dropdown */}
            <div className="relative" ref={moveMenuRef}>
              <button
                onClick={() => setIsMoveMenuOpen(!isMoveMenuOpen)}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Move to"
              >
                <FolderInput className="w-4 h-4" />
              </button>
              {isMoveMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
                  <div className="px-3 py-1 font-semibold text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    Move to:
                  </div>
                  <button
                    onClick={() => {
                      bulkMoveToFolder('inbox');
                      setIsMoveMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Inbox
                  </button>
                  <button
                    onClick={() => {
                      bulkMoveToFolder('spam');
                      setIsMoveMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Spam
                  </button>
                  <button
                    onClick={() => {
                      bulkMoveToFolder('trash');
                      setIsMoveMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Trash
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Default state when nothing selected */
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className={`p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${
                isRefreshing ? 'animate-spin text-blue-600' : ''
              }`}
              title="Refresh"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* More Menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="More"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isMoreMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      selectAllThreads(filteredThreads.map((t) => t.id));
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Select all messages
                  </button>
                  <button
                    onClick={() => {
                      bulkMarkRead(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right controls: Pagination & Density Switcher */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="hidden sm:inline">
          {totalVisible === 0 ? '0 of 0' : `1–${totalVisible} of ${totalVisible}`}
        </span>

        <div className="flex items-center">
          <button
            disabled
            className="p-1 text-gray-400 dark:text-gray-600 cursor-not-allowed rounded"
            title="Newer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled
            className="p-1 text-gray-400 dark:text-gray-600 cursor-not-allowed rounded"
            title="Older"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Density Selector */}
        <div className="relative" ref={densityMenuRef}>
          <button
            onClick={() => setIsDensityMenuOpen(!isDensityMenuOpen)}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-1"
            title="Display density"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {isDensityMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 text-xs">
              <div className="px-3 py-1 font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
                Display Density
              </div>
              {(['default', 'comfortable', 'compact'] as DensityMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setDensity(mode);
                    setIsDensityMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-between capitalize"
                >
                  <span>{mode}</span>
                  {density === mode && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
