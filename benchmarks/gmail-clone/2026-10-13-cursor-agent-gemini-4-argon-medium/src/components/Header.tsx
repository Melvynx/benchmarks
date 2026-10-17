import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  SlidersHorizontal,
  X,
  HelpCircle,
  Settings,
  Sun,
  Moon,
  Paperclip,
  Star,
  Mail,
  RotateCcw,
  Check,
  Sparkles,
  Clock,
} from 'lucide-react';
import {
  AdvancedSearchFilter,
  Contact,
  CustomLabel,
  EmailThread,
  ThemeMode,
} from '../types/mail';
import { CURRENT_USER } from '../data/seedData';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  searchFilter: AdvancedSearchFilter;
  onUpdateSearchFilter: (updater: (prev: AdvancedSearchFilter) => AdvancedSearchFilter) => void;
  onResetSearchFilter: () => void;
  labels: CustomLabel[];
  contacts: Contact[];
  threads: EmailThread[];
  onSelectThread: (threadId: string) => void;
  onOpenShortcuts: () => void;
  onToggleQuickSettings: () => void;
  showQuickSettings: boolean;
  onResetDemoData: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onToggleSidebar,
  searchFilter,
  onUpdateSearchFilter,
  onResetSearchFilter,
  labels,
  contacts,
  threads,
  onSelectThread,
  onOpenShortcuts,
  onToggleQuickSettings,
  showQuickSettings,
  onResetDemoData,
  searchInputRef,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAdvancedPopover, setShowAdvancedPopover] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
        setShowAdvancedPopover(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters =
    Boolean(searchFilter.query.trim()) ||
    Boolean(searchFilter.from.trim()) ||
    Boolean(searchFilter.to.trim()) ||
    Boolean(searchFilter.subject.trim()) ||
    Boolean(searchFilter.hasWords.trim()) ||
    Boolean(searchFilter.doesntHave.trim()) ||
    searchFilter.hasAttachment ||
    searchFilter.onlyUnread ||
    searchFilter.onlyStarred ||
    searchFilter.dateRange !== 'any' ||
    Boolean(searchFilter.labelId);

  const matchingContacts = searchFilter.query.trim()
    ? contacts
        .filter(
          (c) =>
            c.name.toLowerCase().includes(searchFilter.query.toLowerCase()) ||
            c.email.toLowerCase().includes(searchFilter.query.toLowerCase())
        )
        .slice(0, 3)
    : [];

  const matchingThreadsPreview = searchFilter.query.trim()
    ? threads
        .filter(
          (t) =>
            t.folder !== 'trash' &&
            (t.subject.toLowerCase().includes(searchFilter.query.toLowerCase()) ||
              t.snippet.toLowerCase().includes(searchFilter.query.toLowerCase()))
        )
        .slice(0, 4)
    : [];

  const isDark = theme === 'dark';

  return (
    <header
      className={`h-16 px-3 md:px-4 flex items-center justify-between gap-2 select-none shrink-0 transition-colors ${
        isDark ? 'bg-[#111318] text-[#e3e3e3]' : 'bg-[#f6f8fc] text-[#1f1f1f]'
      }`}
    >
      {/* Left: Hamburger + Brand Logo + Primary Visible Title */}
      <div className="flex items-center gap-1 md:gap-2 min-w-fit md:w-60">
        <button
          onClick={onToggleSidebar}
          title="Main menu"
          aria-label="Main menu"
          className={`p-2.5 rounded-full transition-colors cursor-pointer ${
            isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-[#444746]'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 pl-1 pr-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea4335] via-[#4285f4] to-[#34a853] p-[2px] shadow-xs flex items-center justify-center shrink-0">
            <div
              className={`w-full h-full rounded-[6px] flex items-center justify-center ${
                isDark ? 'bg-[#1e1f23]' : 'bg-white'
              }`}
            >
              <Mail className="w-4 h-4 text-[#ea4335]" />
            </div>
          </div>
          <h1
            className={`font-display text-[19px] font-medium tracking-tight truncate ${
              isDark ? 'text-[#e3e3e3]' : 'text-[#444746]'
            }`}
          >
            Gemini 4 Argon
          </h1>
        </div>
      </div>

      {/* Center: Gmail Search Bar + Quick Filter Chips + Advanced Popover */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-2xl mx-1 md:mx-4">
        <div
          className={`flex items-center h-11 md:h-12 px-3 rounded-full transition-all duration-150 ${
            isSearchFocused || showAdvancedPopover
              ? isDark
                ? 'bg-[#282a2c] shadow-lg ring-1 ring-white/15 rounded-t-2xl rounded-b-2xl'
                : 'bg-white shadow-md ring-1 ring-black/10'
              : isDark
                ? 'bg-[#282a2c] hover:bg-[#303336]'
                : 'bg-[#eaf1fb] hover:bg-[#e2ebf7]'
          }`}
        >
          <Search
            className={`w-5 h-5 ml-1 mr-3 shrink-0 ${
              isDark ? 'text-gray-400' : 'text-[#444746]'
            }`}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchFilter.query}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) =>
              onUpdateSearchFilter((prev) => ({ ...prev, query: e.target.value }))
            }
            placeholder="Search in mail (try from:elena, has:attachment, is:unread)"
            aria-label="Search in mail"
            className={`w-full bg-transparent text-sm md:text-[15px] outline-none placeholder: truncate ${
              isDark
                ? 'text-[#e3e3e3] placeholder:text-gray-400'
                : 'text-[#1f1f1f] placeholder:text-[#444746]/80'
            }`}
          />

          {hasActiveFilters && (
            <button
              onClick={() => {
                onResetSearchFilter();
                searchInputRef.current?.focus();
              }}
              title="Clear search and filters"
              aria-label="Clear search"
              className={`p-1.5 rounded-full mr-0.5 cursor-pointer ${
                isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/10 text-[#444746]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              setShowAdvancedPopover((v) => !v);
              setIsSearchFocused(false);
            }}
            title="Show search options"
            aria-label="Show search options"
            className={`p-2 rounded-full cursor-pointer transition-colors ${
              showAdvancedPopover
                ? 'bg-[#1a73e8]/15 text-[#1a73e8]'
                : isDark
                  ? 'hover:bg-white/10 text-gray-300'
                  : 'hover:bg-black/10 text-[#444746]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Search Suggestion Dropdown when focused */}
        {isSearchFocused && !showAdvancedPopover && (
          <div
            className={`absolute left-0 right-0 top-[52px] z-50 rounded-2xl shadow-xl border overflow-hidden ${
              isDark
                ? 'bg-[#282a2c] border-white/10 text-[#e3e3e3]'
                : 'bg-white border-gray-200 text-[#1f1f1f]'
            }`}
          >
            {/* Quick Filter Pills inside dropdown */}
            <div
              className={`px-3.5 py-2.5 border-b flex flex-wrap items-center gap-1.5 ${
                isDark ? 'border-white/10' : 'border-gray-100'
              }`}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider opacity-60 mr-1">
                Filters:
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateSearchFilter((prev) => ({
                    ...prev,
                    hasAttachment: !prev.hasAttachment,
                  }))
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                  searchFilter.hasAttachment
                    ? 'bg-[#d3e3fd] text-[#041e49] border-[#a8c7fa]'
                    : isDark
                      ? 'border-white/15 hover:bg-white/5 text-gray-300'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                Has attachment
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateSearchFilter((prev) => ({
                    ...prev,
                    onlyUnread: !prev.onlyUnread,
                  }))
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                  searchFilter.onlyUnread
                    ? 'bg-[#d3e3fd] text-[#041e49] border-[#a8c7fa]'
                    : isDark
                      ? 'border-white/15 hover:bg-white/5 text-gray-300'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Is unread
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateSearchFilter((prev) => ({
                    ...prev,
                    onlyStarred: !prev.onlyStarred,
                  }))
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                  searchFilter.onlyStarred
                    ? 'bg-[#d3e3fd] text-[#041e49] border-[#a8c7fa]'
                    : isDark
                      ? 'border-white/15 hover:bg-white/5 text-gray-300'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                Starred
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateSearchFilter((prev) => ({
                    ...prev,
                    dateRange: prev.dateRange === '7d' ? 'any' : '7d',
                  }))
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                  searchFilter.dateRange === '7d'
                    ? 'bg-[#d3e3fd] text-[#041e49] border-[#a8c7fa]'
                    : isDark
                      ? 'border-white/15 hover:bg-white/5 text-gray-300'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Last 7 days
              </button>
            </div>

            {/* Matching Contacts */}
            {matchingContacts.length > 0 && (
              <div className="py-1.5">
                <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider opacity-50">
                  People
                </div>
                {matchingContacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onUpdateSearchFilter((prev) => ({
                        ...prev,
                        query: `from:${c.email}`,
                      }));
                      setIsSearchFocused(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-3 text-left text-sm cursor-pointer ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                      style={{ backgroundColor: c.avatarColor }}
                    >
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs opacity-65 truncate">{c.email}</div>
                    </div>
                    <span className="text-xs text-[#1a73e8] font-medium">Filter sender</span>
                  </button>
                ))}
              </div>
            )}

            {/* Matching Threads */}
            {matchingThreadsPreview.length > 0 ? (
              <div className="py-1.5 border-t border-gray-200/40 dark:border-white/10">
                <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider opacity-50">
                  Matching Conversations
                </div>
                {matchingThreadsPreview.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectThread(t.id);
                      setIsSearchFocused(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center justify-between gap-3 text-left text-sm cursor-pointer ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Mail className="w-4 h-4 opacity-50 shrink-0" />
                      <div className="truncate">
                        <span className="font-medium">{t.subject}</span>
                        <span className="opacity-60 ml-2 text-xs">— {t.snippet}</span>
                      </div>
                    </div>
                    <span className="text-xs opacity-60 shrink-0">{t.displayDate}</span>
                  </button>
                ))}
              </div>
            ) : (
              !searchFilter.query.trim() && (
                <div className="px-4 py-2.5 flex items-center justify-between text-xs opacity-70">
                  <span>
                    Tip: Use operators like <code>from:elena</code>, <code>label:urgent</code>, or{' '}
                    <code>has:attachment</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      setShowAdvancedPopover(true);
                    }}
                    className="text-[#1a73e8] font-medium hover:underline cursor-pointer"
                  >
                    Advanced search
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Advanced Search Popover */}
        {showAdvancedPopover && (
          <div
            className={`absolute left-0 right-0 top-[52px] z-50 rounded-2xl shadow-2xl border p-5 ${
              isDark
                ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                : 'bg-white border-gray-200 text-[#1f1f1f]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold tracking-tight">Advanced Search Filters</h3>
              <button
                onClick={() => setShowAdvancedPopover(false)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs opacity-70 mb-1">From</label>
                <input
                  type="text"
                  value={searchFilter.from}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({ ...prev, from: e.target.value }))
                  }
                  placeholder="Sender name or email"
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm outline-none ${
                    isDark
                      ? 'bg-[#1e1f23] border-white/15 focus:border-[#a8c7fa]'
                      : 'bg-gray-50 border-gray-300 focus:border-[#1a73e8]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs opacity-70 mb-1">To</label>
                <input
                  type="text"
                  value={searchFilter.to}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({ ...prev, to: e.target.value }))
                  }
                  placeholder="Recipient name or email"
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm outline-none ${
                    isDark
                      ? 'bg-[#1e1f23] border-white/15 focus:border-[#a8c7fa]'
                      : 'bg-gray-50 border-gray-300 focus:border-[#1a73e8]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs opacity-70 mb-1">Subject</label>
                <input
                  type="text"
                  value={searchFilter.subject}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Words in subject line"
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm outline-none ${
                    isDark
                      ? 'bg-[#1e1f23] border-white/15 focus:border-[#a8c7fa]'
                      : 'bg-gray-50 border-gray-300 focus:border-[#1a73e8]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs opacity-70 mb-1">Label</label>
                <select
                  value={searchFilter.labelId}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({ ...prev, labelId: e.target.value }))
                  }
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm outline-none ${
                    isDark
                      ? 'bg-[#1e1f23] border-white/15 focus:border-[#a8c7fa]'
                      : 'bg-gray-50 border-gray-300 focus:border-[#1a73e8]'
                  }`}
                >
                  <option value="">All labels</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs opacity-70 mb-1">Includes the words</label>
                <input
                  type="text"
                  value={searchFilter.hasWords}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({ ...prev, hasWords: e.target.value }))
                  }
                  placeholder="e.g. latency, SOC2, contract"
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm outline-none ${
                    isDark
                      ? 'bg-[#1e1f23] border-white/15 focus:border-[#a8c7fa]'
                      : 'bg-gray-50 border-gray-300 focus:border-[#1a73e8]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs opacity-70 mb-1">Date within</label>
                <select
                  value={searchFilter.dateRange}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({
                      ...prev,
                      dateRange: e.target.value as AdvancedSearchFilter['dateRange'],
                    }))
                  }
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm outline-none ${
                    isDark
                      ? 'bg-[#1e1f23] border-white/15 focus:border-[#a8c7fa]'
                      : 'bg-gray-50 border-gray-300 focus:border-[#1a73e8]'
                  }`}
                >
                  <option value="any">Any time</option>
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-200/50 dark:border-white/10">
              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchFilter.hasAttachment}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({
                      ...prev,
                      hasAttachment: e.target.checked,
                    }))
                  }
                  className="rounded accent-[#1a73e8]"
                />
                Has attachment
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchFilter.onlyUnread}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({
                      ...prev,
                      onlyUnread: e.target.checked,
                    }))
                  }
                  className="rounded accent-[#1a73e8]"
                />
                Unread only
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchFilter.onlyStarred}
                  onChange={(e) =>
                    onUpdateSearchFilter((prev) => ({
                      ...prev,
                      onlyStarred: e.target.checked,
                    }))
                  }
                  className="rounded accent-[#1a73e8]"
                />
                Starred only
              </label>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onResetSearchFilter}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvancedPopover(false)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a73e8] text-white hover:bg-[#1557b0] cursor-pointer shadow-xs"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Shortcuts, Theme, Settings, Account */}
      <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
        <div
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mr-1 border ${
            isDark
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
          title="Local workspace synced"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active</span>
        </div>

        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-[#444746]'
          }`}
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isDark ? 'hover:bg-white/10 text-amber-300' : 'hover:bg-black/5 text-[#444746]'
          }`}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleQuickSettings}
          title="Quick settings"
          aria-label="Quick settings"
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            showQuickSettings
              ? 'bg-[#d3e3fd] text-[#041e49]'
              : isDark
                ? 'hover:bg-white/10 text-gray-300'
                : 'hover:bg-black/5 text-[#444746]'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Profile Avatar & Account Popover */}
        <div ref={accountRef} className="relative ml-1">
          <button
            onClick={() => setShowAccountMenu((v) => !v)}
            title={`${CURRENT_USER.name} (${CURRENT_USER.email})`}
            aria-label="Account controls"
            className={`flex items-center gap-2 p-1 pr-2 rounded-full border transition-all cursor-pointer ${
              isDark
                ? 'border-white/15 bg-[#1e1f23] hover:bg-white/10'
                : 'border-gray-300/80 bg-white hover:shadow-xs'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#1a73e8] text-white font-semibold text-xs flex items-center justify-center">
              AC
            </div>
            <span className="hidden sm:inline text-xs font-medium opacity-85">Argon Labs</span>
          </button>

          {showAccountMenu && (
            <div
              className={`absolute right-0 mt-2 w-80 rounded-3xl shadow-2xl border p-5 z-50 ${
                isDark
                  ? 'bg-[#282a2c] border-white/15 text-[#e3e3e3]'
                  : 'bg-[#f8fafd] border-gray-200 text-[#1f1f1f]'
              }`}
            >
              <div className="text-center">
                <div className="text-xs font-medium opacity-70 mb-3">{CURRENT_USER.email}</div>
                <div className="w-16 h-16 rounded-full bg-[#1a73e8] text-white text-xl font-semibold flex items-center justify-center mx-auto mb-2.5 shadow-md">
                  AC
                </div>
                <div className="font-display text-base font-medium">Hi, {CURRENT_USER.name}!</div>
                <div className="text-xs opacity-65 mt-0.5">{CURRENT_USER.role}</div>
              </div>

              <div
                className={`mt-4 p-3.5 rounded-2xl border ${
                  isDark ? 'bg-[#1e1f23] border-white/10' : 'bg-white border-gray-200/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="opacity-75">Workspace Storage</span>
                  <span className="font-medium">
                    {CURRENT_USER.storageUsedGb} GB of {CURRENT_USER.storageTotalGb} GB
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#1a73e8] rounded-full"
                    style={{
                      width: `${(CURRENT_USER.storageUsedGb / CURRENT_USER.storageTotalGb) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] opacity-65">
                  <Sparkles className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Local persistence enabled (auto-saved)</span>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-1.5">
                <button
                  onClick={() => {
                    onResetDemoData();
                    setShowAccountMenu(false);
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border cursor-pointer transition-colors ${
                    isDark
                      ? 'border-white/15 hover:bg-white/5 text-gray-200'
                      : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo Mailbox to Initial Seed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
