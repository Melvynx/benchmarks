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
  Clock,
  Check,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Contact, CustomLabel, SearchFilters, ThemeMode } from '../types/mail';
import { DEFAULT_SEARCH_FILTERS, hasActiveSearch } from '../utils/searchParser';

interface HeaderProps {
  onToggleSidebar: () => void;
  filters: SearchFilters;
  onUpdateFilters: (next: SearchFilters) => void;
  onResetFilters: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onResetDemoData: () => void;
  contacts: Contact[];
  labels: CustomLabel[];
  currentUser: Contact;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  filters,
  onUpdateFilters,
  onResetFilters,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenShortcuts,
  onResetDemoData,
  contacts,
  labels,
  currentUser,
  searchInputRef,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [userStatus, setUserStatus] = useState<'active' | 'dnd' | 'away'>('active');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
        setShowAdvancedSearch(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = theme === 'dark';
  const activeSearch = hasActiveSearch(filters);

  const applyQuickOperator = (op: string) => {
    const current = filters.query.trim();
    if (current.includes(op)) {
      onUpdateFilters({
        ...filters,
        query: current.replace(op, '').replace(/\s+/g, ' ').trim(),
      });
    } else {
      onUpdateFilters({
        ...filters,
        query: `${current} ${op}`.trim(),
      });
    }
  };

  const matchingContacts = filters.query.trim()
    ? contacts
        .filter(
          (c) =>
            c.name.toLowerCase().includes(filters.query.toLowerCase()) ||
            c.email.toLowerCase().includes(filters.query.toLowerCase())
        )
        .slice(0, 4)
    : contacts.slice(1, 5);

  return (
    <header
      className={`h-16 px-3 md:px-4 flex items-center justify-between gap-2 select-none shrink-0 transition-colors ${
        isDark ? 'bg-[#111318] text-[#E3E3E3]' : 'bg-[#F8FAFD] text-[#1F1F1F]'
      }`}
    >
      {/* Left: Hamburger + Brand Logo + Model Title */}
      <div className="flex items-center gap-1 md:gap-2 min-w-[200px] md:w-[248px] shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Main menu"
          title="Main menu"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={onResetFilters}
          className="flex items-center gap-2.5 cursor-pointer py-1 px-1.5 rounded-lg"
        >
          {/* Authentic 4-Color Gmail M Envelope Vector */}
          <svg
            className="w-7 h-7 shrink-0"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 12.5V36C6 38.2091 7.79086 40 10 40H14V21.8L24 29.3L34 21.8V40H38C40.2091 40 42 38.2091 42 36V12.5C42 9.18629 38.2173 7.29472 35.5664 9.2829L24 17.9577L12.4336 9.2829C9.7827 7.29472 6 9.18629 6 12.5Z"
              fill="#EA4335"
            />
            <path
              d="M6 12.5V21.8L14 27.8V16.45L12.4336 15.28C9.7827 13.29 6 15.18 6 12.5Z"
              fill="#C5221F"
            />
            <path
              d="M6 14V36C6 38.2091 7.79086 40 10 40H14V21.8L6 15.8V14Z"
              fill="#4285F4"
            />
            <path
              d="M34 21.8V40H38C40.2091 40 42 38.2091 42 36V15.8L34 21.8Z"
              fill="#34A853"
            />
            <path
              d="M42 12.5V15.8L34 21.8V10.45L35.5664 9.2829C38.2173 7.29472 42 9.18629 42 12.5Z"
              fill="#FBBC04"
            />
          </svg>
          <h1
            className={`text-[19px] md:text-[20px] font-medium tracking-[-0.015em] leading-none truncate ${
              isDark ? 'text-[#E3E3E3]' : 'text-[#444746]'
            }`}
            style={{ fontFamily: "'Google Sans', 'Inter', sans-serif" }}
          >
            Gemini 4 Argon
          </h1>
        </div>
      </div>

      {/* Center: Search Bar + Quick Filter Chips + Advanced Popover */}
      <div ref={searchContainerRef} className="flex-1 max-w-[720px] relative">
        <div
          className={`flex items-center h-12 px-3.5 transition-all ${
            isSearchFocused || showAdvancedSearch
              ? isDark
                ? 'bg-[#303134] rounded-t-2xl shadow-lg ring-1 ring-[#444746]'
                : 'bg-white rounded-t-2xl shadow-[0_2px_8px_rgba(0,0,0,0.14)] ring-1 ring-[#E0E2E0]'
              : isDark
              ? 'bg-[#282A2C] hover:bg-[#303134] rounded-full'
              : 'bg-[#EAF1FB] hover:bg-[#E1ECF9] rounded-full'
          } ${
            (isSearchFocused || showAdvancedSearch) && !isSearchFocused && !showAdvancedSearch
              ? 'rounded-full'
              : ''
          }`}
        >
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            aria-label="Search"
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-[#3C4043] text-[#C4C7C5]' : 'hover:bg-[#D3E3FD]/60 text-[#444746]'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>

          <input
            ref={searchInputRef}
            type="text"
            value={filters.query}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => onUpdateFilters({ ...filters, query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsSearchFocused(false);
                searchInputRef.current?.blur();
              } else if (e.key === 'Enter') {
                setIsSearchFocused(false);
              }
            }}
            placeholder="Search mail (try from:elena, has:attachment, is:unread, or press /)"
            aria-label="Search mail"
            className={`w-full bg-transparent px-2 text-[15px] outline-none ${
              isDark
                ? 'text-[#E3E3E3] placeholder-[#8E918F]'
                : 'text-[#1F1F1F] placeholder-[#5F6368]'
            }`}
          />

          {/* Active filter chips inline indicator */}
          {activeSearch && (
            <button
              type="button"
              onClick={onResetFilters}
              aria-label="Clear search"
              title="Clear search and filters"
              className={`p-1.5 rounded-full mr-0.5 transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#3C4043] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowAdvancedSearch((prev) => !prev);
              setIsSearchFocused(false);
            }}
            aria-label="Show search options"
            title="Show search options"
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showAdvancedSearch
                ? isDark
                  ? 'bg-[#004A77] text-[#C2E7FF]'
                  : 'bg-[#D3E3FD] text-[#041E49]'
                : isDark
                ? 'hover:bg-[#3C4043] text-[#C4C7C5]'
                : 'hover:bg-[#D3E3FD]/60 text-[#444746]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Search Suggestions & Quick Filter Chips Dropdown */}
        {isSearchFocused && !showAdvancedSearch && (
          <div
            className={`absolute left-0 right-0 top-12 z-50 rounded-b-2xl border-t px-4 py-3 shadow-xl ${
              isDark
                ? 'bg-[#303134] border-[#444746] text-[#E3E3E3]'
                : 'bg-white border-[#E8EAED] text-[#1F1F1F]'
            }`}
          >
            {/* Structured Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-current/10">
              <span className="text-[11px] font-medium uppercase tracking-wider opacity-60 mr-1">
                Quick Filters:
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateFilters({ ...filters, hasAttachment: !filters.hasAttachment })
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  filters.hasAttachment
                    ? isDark
                      ? 'bg-[#004A77] border-[#004A77] text-[#C2E7FF]'
                      : 'bg-[#D3E3FD] border-[#0B57D0]/30 text-[#041E49]'
                    : isDark
                    ? 'border-[#5F6368] hover:bg-[#3C4043]'
                    : 'border-[#C4C7C5] hover:bg-[#F2F6FC]'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                Has attachment
              </button>

              <button
                type="button"
                onClick={() => onUpdateFilters({ ...filters, isUnread: !filters.isUnread })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  filters.isUnread
                    ? isDark
                      ? 'bg-[#004A77] border-[#004A77] text-[#C2E7FF]'
                      : 'bg-[#D3E3FD] border-[#0B57D0]/30 text-[#041E49]'
                    : isDark
                    ? 'border-[#5F6368] hover:bg-[#3C4043]'
                    : 'border-[#C4C7C5] hover:bg-[#F2F6FC]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Is unread
              </button>

              <button
                type="button"
                onClick={() => onUpdateFilters({ ...filters, isStarred: !filters.isStarred })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  filters.isStarred
                    ? isDark
                      ? 'bg-[#004A77] border-[#004A77] text-[#C2E7FF]'
                      : 'bg-[#D3E3FD] border-[#0B57D0]/30 text-[#041E49]'
                    : isDark
                    ? 'border-[#5F6368] hover:bg-[#3C4043]'
                    : 'border-[#C4C7C5] hover:bg-[#F2F6FC]'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                Starred
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    ...filters,
                    dateRange: filters.dateRange === '7d' ? 'any' : '7d',
                  })
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  filters.dateRange === '7d'
                    ? isDark
                      ? 'bg-[#004A77] border-[#004A77] text-[#C2E7FF]'
                      : 'bg-[#D3E3FD] border-[#0B57D0]/30 text-[#041E49]'
                    : isDark
                    ? 'border-[#5F6368] hover:bg-[#3C4043]'
                    : 'border-[#C4C7C5] hover:bg-[#F2F6FC]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Last 7 days
              </button>

              {['label:Engineering', 'label:Urgent', 'from:elena'].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => applyQuickOperator(op)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                    filters.query.includes(op)
                      ? isDark
                        ? 'bg-[#004A77] border-[#004A77] text-[#C2E7FF]'
                        : 'bg-[#D3E3FD] border-[#0B57D0]/30 text-[#041E49]'
                      : isDark
                      ? 'border-[#5F6368] hover:bg-[#3C4043]'
                      : 'border-[#C4C7C5] hover:bg-[#F2F6FC]'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>

            {/* People Suggestions */}
            <div className="pt-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wider opacity-60 mb-1.5">
                People & Senders
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {matchingContacts.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      onUpdateFilters({
                        ...filters,
                        from: person.email,
                      });
                      setIsSearchFocused(false);
                    }}
                    className={`flex items-center gap-2.5 p-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ backgroundColor: person.avatarColor }}
                    >
                      {person.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{person.name}</div>
                      <div className="text-[11px] opacity-65 truncate">{person.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Search Options Dialog */}
        {showAdvancedSearch && (
          <div
            className={`absolute left-0 right-0 top-12 z-50 rounded-b-2xl border-t p-5 shadow-2xl ${
              isDark
                ? 'bg-[#303134] border-[#444746] text-[#E3E3E3]'
                : 'bg-white border-[#E0E2E0] text-[#1F1F1F]'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block opacity-75 mb-1 font-medium">From</label>
                <input
                  type="text"
                  value={filters.from}
                  onChange={(e) => onUpdateFilters({ ...filters, from: e.target.value })}
                  placeholder="Sender name or email"
                  className={`w-full px-2.5 py-1.5 rounded border outline-none ${
                    isDark
                      ? 'bg-[#202124] border-[#5F6368] focus:border-[#A8C7FA]'
                      : 'bg-white border-[#C4C7C5] focus:border-[#0B57D0]'
                  }`}
                />
              </div>
              <div>
                <label className="block opacity-75 mb-1 font-medium">To</label>
                <input
                  type="text"
                  value={filters.to}
                  onChange={(e) => onUpdateFilters({ ...filters, to: e.target.value })}
                  placeholder="Recipient name or email"
                  className={`w-full px-2.5 py-1.5 rounded border outline-none ${
                    isDark
                      ? 'bg-[#202124] border-[#5F6368] focus:border-[#A8C7FA]'
                      : 'bg-white border-[#C4C7C5] focus:border-[#0B57D0]'
                  }`}
                />
              </div>
              <div>
                <label className="block opacity-75 mb-1 font-medium">Subject</label>
                <input
                  type="text"
                  value={filters.subject}
                  onChange={(e) => onUpdateFilters({ ...filters, subject: e.target.value })}
                  placeholder="Words in subject line"
                  className={`w-full px-2.5 py-1.5 rounded border outline-none ${
                    isDark
                      ? 'bg-[#202124] border-[#5F6368] focus:border-[#A8C7FA]'
                      : 'bg-white border-[#C4C7C5] focus:border-[#0B57D0]'
                  }`}
                />
              </div>
              <div>
                <label className="block opacity-75 mb-1 font-medium">Label</label>
                <select
                  value={filters.labelId}
                  onChange={(e) => onUpdateFilters({ ...filters, labelId: e.target.value })}
                  className={`w-full px-2.5 py-1.5 rounded border outline-none ${
                    isDark
                      ? 'bg-[#202124] border-[#5F6368] focus:border-[#A8C7FA]'
                      : 'bg-white border-[#C4C7C5] focus:border-[#0B57D0]'
                  }`}
                >
                  <option value="">All Labels</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block opacity-75 mb-1 font-medium">Has the words</label>
                <input
                  type="text"
                  value={filters.hasWords}
                  onChange={(e) => onUpdateFilters({ ...filters, hasWords: e.target.value })}
                  placeholder="e.g. Raft, latency, SOC2"
                  className={`w-full px-2.5 py-1.5 rounded border outline-none ${
                    isDark
                      ? 'bg-[#202124] border-[#5F6368] focus:border-[#A8C7FA]'
                      : 'bg-white border-[#C4C7C5] focus:border-[#0B57D0]'
                  }`}
                />
              </div>
              <div>
                <label className="block opacity-75 mb-1 font-medium">Date within</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    onUpdateFilters({
                      ...filters,
                      dateRange: e.target.value as SearchFilters['dateRange'],
                    })
                  }
                  className={`w-full px-2.5 py-1.5 rounded border outline-none ${
                    isDark
                      ? 'bg-[#202124] border-[#5F6368] focus:border-[#A8C7FA]'
                      : 'bg-white border-[#C4C7C5] focus:border-[#0B57D0]'
                  }`}
                >
                  <option value="any">Any time</option>
                  <option value="1d">1 day</option>
                  <option value="7d">1 week</option>
                  <option value="30d">1 month</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-current/10">
              <div className="flex items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasAttachment}
                    onChange={(e) =>
                      onUpdateFilters({ ...filters, hasAttachment: e.target.checked })
                    }
                    className="rounded accent-[#0B57D0]"
                  />
                  Has attachment
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isUnread}
                    onChange={(e) => onUpdateFilters({ ...filters, isUnread: e.target.checked })}
                    className="rounded accent-[#0B57D0]"
                  />
                  Unread only
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isStarred}
                    onChange={(e) => onUpdateFilters({ ...filters, isStarred: e.target.checked })}
                    className="rounded accent-[#0B57D0]"
                  />
                  Starred only
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateFilters(DEFAULT_SEARCH_FILTERS);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                  }`}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSearch(false)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#0B57D0] text-white hover:bg-[#0842A0] transition-colors cursor-pointer"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Utility Cluster */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Status Indicator Pill */}
        <div ref={statusRef} className="relative hidden lg:block mr-1">
          <button
            type="button"
            onClick={() => setShowStatusMenu((p) => !p)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#1E1F20] border-[#444746] hover:bg-[#282A2C]'
                : 'bg-white border-[#E0E2E0] hover:bg-[#F2F6FC]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                userStatus === 'active'
                  ? 'bg-[#188038]'
                  : userStatus === 'dnd'
                  ? 'bg-[#D93025]'
                  : 'bg-[#F9AB00]'
              }`}
            />
            <span>
              {userStatus === 'active'
                ? 'Active'
                : userStatus === 'dnd'
                ? 'Do not disturb'
                : 'Away'}
            </span>
          </button>

          {showStatusMenu && (
            <div
              className={`absolute right-0 mt-1.5 w-44 rounded-xl shadow-xl border py-1.5 z-50 text-xs ${
                isDark
                  ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                  : 'bg-white border-[#E0E2E0] text-[#1F1F1F]'
              }`}
            >
              {[
                { id: 'active', label: 'Active', color: 'bg-[#188038]' },
                { id: 'dnd', label: 'Mute notifications', color: 'bg-[#D93025]' },
                { id: 'away', label: 'Set as away', color: 'bg-[#F9AB00]' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setUserStatus(s.id as 'active' | 'dnd' | 'away');
                    setShowStatusMenu(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-[#3C4043]' : 'hover:bg-[#F2F6FC]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                    {s.label}
                  </span>
                  {userStatus === s.id && <Check className="w-3.5 h-3.5 text-[#0B57D0]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
          }`}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Keyboard Shortcuts / Help */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          aria-label="Keyboard shortcuts and search help"
          title="Keyboard shortcuts (?)"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
          }`}
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Quick Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Quick settings"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDark ? 'hover:bg-[#282A2C] text-[#C4C7C5]' : 'hover:bg-[#E8EAED] text-[#444746]'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Account Profile Pill */}
        <div ref={accountRef} className="relative ml-1">
          <button
            type="button"
            onClick={() => setShowAccountMenu((p) => !p)}
            aria-label="Account controls"
            title={`${currentUser.name} (${currentUser.email})`}
            className={`flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border transition-colors cursor-pointer ${
              isDark
                ? 'border-[#444746] bg-[#1E1F20] hover:bg-[#282A2C]'
                : 'border-[#E0E2E0] bg-white hover:bg-[#F2F6FC]'
            }`}
          >
            <span className="hidden sm:inline text-xs font-medium tracking-tight opacity-85">
              Acme
            </span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              AR
            </div>
          </button>

          {showAccountMenu && (
            <div
              className={`absolute right-0 mt-2 w-80 rounded-3xl p-4 shadow-2xl border z-50 ${
                isDark
                  ? 'bg-[#282A2C] border-[#444746] text-[#E3E3E3]'
                  : 'bg-[#EAF1FB] border-[#D3E3FD] text-[#1F1F1F]'
              }`}
            >
              <div className="text-center text-xs font-medium opacity-75 mb-3">
                {currentUser.email}
              </div>
              <div
                className={`rounded-2xl p-4 flex flex-col items-center text-center ${
                  isDark ? 'bg-[#1E1F20]' : 'bg-white'
                }`}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold mb-2 shadow"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  AR
                </div>
                <div className="text-base font-medium">Hi, {currentUser.name.split(' ')[0]}!</div>
                <div className="text-xs opacity-70 mt-0.5">
                  {currentUser.role} · {currentUser.company}
                </div>

                <div className="w-full mt-4 pt-3 border-t border-current/10 text-left">
                  <div className="flex items-center justify-between text-[11px] opacity-75 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
                      Workspace Enterprise
                    </span>
                    <span className="tabular-nums">4.2 GB of 100 GB</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-current/10 overflow-hidden">
                    <div className="h-full w-[14%] bg-[#0B57D0] rounded-full" />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetDemoData();
                    setShowAccountMenu(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#1E1F20] hover:bg-[#3C4043]'
                      : 'bg-white hover:bg-[#D3E3FD]/50'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo Mailbox
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
