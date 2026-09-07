import React, { useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  SlidersHorizontal,
  X,
  HelpCircle,
  Settings,
  Grid,
  Sun,
  Moon,
  Keyboard,
} from 'lucide-react';
import { useMail } from '../context/MailContext';

export const TopBar: React.FC = () => {
  const {
    sidebarExpanded,
    setSidebarExpanded,
    setMobileMenuOpen,
    searchQuery,
    setSearchQuery,
    clearSearch,
    setIsSearchModalOpen,
    setIsSettingsOpen,
    setIsShortcutsOpen,
    theme,
    toggleTheme,
    currentUser,
    activeAccountModal,
    setActiveAccountModal,
    googleAppsOpen,
    setGoogleAppsOpen,
  } = useMail();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search when pressing '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-16 px-4 flex items-center justify-between border-b border-gray-200/80 dark:border-gray-800 bg-[#f6f8fc] dark:bg-[#1f1f1f] select-none shrink-0 z-30 transition-colors">
      {/* Left section: Hamburger & Primary Visible Title */}
      <div className="flex items-center gap-3 min-w-[240px] pr-4">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 rounded-full transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          onClick={() => setSidebarExpanded((prev) => !prev)}
          className="hidden md:flex p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 rounded-full transition-colors"
          title={sidebarExpanded ? 'Collapse menu' : 'Expand menu'}
          aria-label="Main menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Primary Visible Title: EXACTLY model name */}
        <a
          href="#/inbox"
          className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          title="gemini-3.8-flash-high"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
            <svg className="w-6 h-6" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M45 16.2l-5-3.75v21.55c0 2.2-1.8 4-4 4h-6v-18l-6 4.5-6-4.5v18h-6c-2.2 0-4-1.8-4-4V12.45l-5 3.75C1.15 17.58 0 19.86 0 22.34V38c0 3.31 2.69 6 6 6h36c3.31 0 6-2.69 6-6V22.34c0-2.48-1.15-4.76-3-6.14z"
              />
              <path
                fill="#4285F4"
                d="M6 10c0-1.87 1.05-3.56 2.7-4.4 1.66-.83 3.65-.67 5.15.42L24 13.5l10.15-7.48c1.5-1.09 3.49-1.25 5.15-.42C40.95 6.44 42 8.13 42 10v2.45L24 26 6 12.45V10z"
              />
            </svg>
          </div>
          <h1 className="text-[20px] font-normal tracking-[-0.3px] text-gray-700 dark:text-gray-200">
            gemini-3.8-flash-high
          </h1>
        </a>
      </div>

      {/* Middle section: Omnibox Search Bar */}
      <div className="flex-1 max-w-2xl px-2">
        <div className="relative group">
          <div className="flex items-center bg-[#eaf1fb] dark:bg-[#2c2d30] focus-within:bg-white dark:focus-within:bg-[#1a1a1a] focus-within:shadow-md focus-within:ring-1 focus-within:ring-blue-500/30 rounded-full h-12 px-3.5 transition-all">
            <Search className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in mail (e.g. from:sarah, has:attachment, is:starred)"
              className="w-full bg-transparent px-3 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
              title="Show search options"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right section: Action Buttons & User Profile */}
      <div className="flex items-center gap-1 sm:gap-1.5 ml-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 rounded-full transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Shortcuts Guide */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="hidden sm:flex p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 rounded-full transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-5 h-5" />
        </button>

        {/* Help / Support */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 rounded-full transition-colors"
          title="Support & Info"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Settings */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 rounded-full transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Google Apps Menu */}
        <button
          onClick={() => {
            setGoogleAppsOpen(!googleAppsOpen);
            setActiveAccountModal(false);
          }}
          className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 rounded-full transition-colors relative"
          title="Google apps"
        >
          <Grid className="w-5 h-5" />
        </button>

        {/* Profile Avatar & Account Switcher Trigger */}
        <button
          onClick={() => {
            setActiveAccountModal(!activeAccountModal);
            setGoogleAppsOpen(false);
          }}
          className="ml-1 p-1 rounded-full hover:ring-4 hover:ring-gray-200/70 dark:hover:ring-gray-800 transition-all focus:outline-none"
          title={`Google Account: ${currentUser.name}\n(${currentUser.email})`}
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-700"
          />
        </button>
      </div>
    </header>
  );
};
