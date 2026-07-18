import { Check, X } from 'lucide-react';

import { IconButton } from './IconButton';

export type Density = 'comfortable' | 'compact';
export type ThemePreference = 'light' | 'dark';
export type InboxType = 'default' | 'unread-first';

interface SettingsPanelProps {
  isOpen: boolean;
  density: Density;
  theme: ThemePreference;
  inboxType: InboxType;
  onClose: () => void;
  onDensityChange: (density: Density) => void;
  onThemeChange: (theme: ThemePreference) => void;
  onInboxTypeChange: (type: InboxType) => void;
}

function ChoiceButton({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`settings-choice${isSelected ? ' settings-choice--active' : ''}`}
      aria-pressed={isSelected}
      onClick={onClick}
    >
      <span className="settings-choice__preview" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>{label}</span>
      {isSelected ? <Check aria-hidden="true" /> : null}
    </button>
  );
}

export function SettingsPanel({
  isOpen,
  density,
  theme,
  inboxType,
  onClose,
  onDensityChange,
  onThemeChange,
  onInboxTypeChange,
}: SettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <aside className="settings-panel" aria-label="Quick settings">
      <header className="settings-panel__header">
        <h2>Quick settings</h2>
        <IconButton label="Close quick settings" onClick={onClose}>
          <X aria-hidden="true" />
        </IconButton>
      </header>

      <div className="settings-panel__scroll">
        <section>
          <h3>Density</h3>
          <div className="settings-choices settings-choices--row">
            <ChoiceButton
              label="Comfortable"
              isSelected={density === 'comfortable'}
              onClick={() => onDensityChange('comfortable')}
            />
            <ChoiceButton
              label="Compact"
              isSelected={density === 'compact'}
              onClick={() => onDensityChange('compact')}
            />
          </div>
        </section>

        <section>
          <h3>Theme</h3>
          <div className="settings-choices settings-choices--row">
            <button
              type="button"
              className={`theme-choice theme-choice--light${theme === 'light' ? ' theme-choice--active' : ''}`}
              aria-pressed={theme === 'light'}
              onClick={() => onThemeChange('light')}
            >
              <span className="theme-choice__preview"><span /></span>
              <span>Light</span>
              {theme === 'light' ? <Check aria-hidden="true" /> : null}
            </button>
            <button
              type="button"
              className={`theme-choice theme-choice--dark${theme === 'dark' ? ' theme-choice--active' : ''}`}
              aria-pressed={theme === 'dark'}
              onClick={() => onThemeChange('dark')}
            >
              <span className="theme-choice__preview"><span /></span>
              <span>Dark</span>
              {theme === 'dark' ? <Check aria-hidden="true" /> : null}
            </button>
          </div>
        </section>

        <section>
          <h3>Inbox type</h3>
          <div className="settings-choices">
            <ChoiceButton
              label="Default"
              isSelected={inboxType === 'default'}
              onClick={() => onInboxTypeChange('default')}
            />
            <ChoiceButton
              label="Unread first"
              isSelected={inboxType === 'unread-first'}
              onClick={() => onInboxTypeChange('unread-first')}
            />
          </div>
        </section>

        <section className="settings-panel__info">
          <h3>Local experience</h3>
          <p>Mail state, drafts, labels, density, and theme are stored in this browser.</p>
        </section>
      </div>
    </aside>
  );
}
