import {
  CalendarDays,
  CheckSquare2,
  CircleHelp,
  Grid3X3,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  StickyNote,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { Contact } from '../domain/mail';
import { Avatar } from './Avatar';
import { IconButton } from './IconButton';

interface TopBarProps {
  currentUser: Contact;
  query: string;
  onQueryChange: (query: string) => void;
  onToggleNavigation: () => void;
  onOpenSettings: () => void;
  onOpenTool: (tool: 'calendar' | 'notes' | 'tasks' | 'contacts') => void;
  onNotify: (message: string) => void;
}

const APPS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare2 },
  { id: 'contacts', label: 'Contacts', icon: Users },
] as const;

export function TopBar({
  currentUser,
  query,
  onQueryChange,
  onToggleNavigation,
  onOpenSettings,
  onOpenTool,
  onNotify,
}: TopBarProps) {
  const [isSearchOptionsOpen, setIsSearchOptionsOpen] = useState(false);
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [fromValue, setFromValue] = useState('');
  const [subjectValue, setSubjectValue] = useState('');

  const applySearchOptions = () => {
    const fromQuery = fromValue.trim()
      ? `from:"${fromValue.trim().replaceAll('"', '')}"`
      : '';
    const subjectQuery = subjectValue.trim()
      ? `subject:"${subjectValue.trim().replaceAll('"', '')}"`
      : '';
    onQueryChange([fromQuery, subjectQuery].filter(Boolean).join(' '));
    setIsSearchOptionsOpen(false);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <IconButton label="Toggle navigation" onClick={onToggleNavigation}>
          <Menu aria-hidden="true" />
        </IconButton>
        <span className="brand__mark" aria-hidden="true">
          <span className="brand__mark-fold" />
        </span>
        <h1 className="brand__title">GPT-5.6 Sol</h1>
      </div>

      <div className="search-area">
        <form className="search-box" role="search" onSubmit={(event) => event.preventDefault()}>
          <Search className="search-box__icon" aria-hidden="true" />
          <input
            id="mail-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search mail"
            aria-label="Search mail"
            autoComplete="off"
          />
          {query ? (
            <IconButton
              label="Clear search"
              size="small"
              onClick={() => onQueryChange('')}
            >
              <X aria-hidden="true" />
            </IconButton>
          ) : null}
          <IconButton
            label="Search options"
            size="small"
            aria-expanded={isSearchOptionsOpen}
            onClick={() => setIsSearchOptionsOpen((open) => !open)}
          >
            <SlidersHorizontal aria-hidden="true" />
          </IconButton>
        </form>
        {isSearchOptionsOpen ? (
          <div className="search-options" role="dialog" aria-label="Search options">
            <label>
              <span>From</span>
              <input
                value={fromValue}
                onChange={(event) => setFromValue(event.target.value)}
                placeholder="Name or email"
              />
            </label>
            <label>
              <span>Subject</span>
              <input
                value={subjectValue}
                onChange={(event) => setSubjectValue(event.target.value)}
                placeholder="Words in the subject"
              />
            </label>
            <div className="search-options__footer">
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setFromValue('');
                  setSubjectValue('');
                  onQueryChange('');
                }}
              >
                Clear
              </button>
              <button type="button" className="primary-button" onClick={applySearchOptions}>
                Search mail
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="topbar__actions">
        <IconButton label="Help" onClick={() => onNotify('Keyboard shortcuts: C compose, / search, J or K move, E archive.')}>
          <CircleHelp aria-hidden="true" />
        </IconButton>
        <IconButton label="Quick settings" onClick={onOpenSettings}>
          <Settings aria-hidden="true" />
        </IconButton>
        <div className="menu-anchor">
          <IconButton
            label="Apps"
            aria-expanded={isAppsOpen}
            onClick={() => setIsAppsOpen((open) => !open)}
          >
            <Grid3X3 aria-hidden="true" />
          </IconButton>
          {isAppsOpen ? (
            <div className="apps-menu popover" role="menu">
              {APPS.map(({ id, label, icon: AppIcon }) => (
                <button
                  type="button"
                  role="menuitem"
                  key={id}
                  onClick={() => {
                    onOpenTool(id);
                    setIsAppsOpen(false);
                  }}
                >
                  <span className={`apps-menu__icon apps-menu__icon--${id}`}>
                    <AppIcon aria-hidden="true" />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="menu-anchor">
          <button
            type="button"
            className="account-button"
            aria-label="Account menu"
            aria-expanded={isAccountOpen}
            onClick={() => setIsAccountOpen((open) => !open)}
          >
            <Avatar contact={currentUser} size="medium" />
          </button>
          {isAccountOpen ? (
            <div className="account-menu popover">
              <button
                type="button"
                className="account-menu__close"
                aria-label="Close account menu"
                onClick={() => setIsAccountOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
              <Avatar contact={currentUser} size="large" />
              <strong>{currentUser.name}</strong>
              <span>{currentUser.email}</span>
              <button
                type="button"
                className="outline-button"
                onClick={() => onNotify('Account preferences are saved locally in this demo.')}
              >
                Manage your account
              </button>
              <div className="account-menu__storage">
                <span>Local mailbox</span>
                <span>2.8 GB of 15 GB</span>
                <span className="storage-bar"><span /></span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
