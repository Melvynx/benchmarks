import { Keyboard, Monitor, Moon, RefreshCw, Settings, Sun, WifiOff } from 'lucide-react';
import type { Settings as SettingsData } from '../../domain/types';
import { resetData, updateSettings } from '../../store/actions';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';
import { Avatar, Dropdown, MenuItem } from '../ui/primitives';
import { cn } from '../../lib/cn';

const THEMES: Array<{ value: SettingsData['theme']; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function AccountMenu() {
  const account = useMail((s) => s.data.account);
  const settings = useMail((s) => s.data.settings);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const setShortcutsOpen = useUI((s) => s.setShortcutsOpen);
  const ask = useUI((s) => s.ask);

  return (
    <Dropdown
      align="end"
      panelClassName="w-[300px] p-2"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Account: ${account.name}`}
          className="ml-1 flex size-9 items-center justify-center rounded-full hover:bg-hover"
        >
          <Avatar name={account.name} email={account.email} size={32} />
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex flex-col items-center px-4 pb-4 pt-5 text-center">
            <Avatar name={account.name} email={account.email} size={56} />
            <p className="mt-3 font-medium">{account.name}</p>
            <p className="text-sm text-ink-3">{account.email}</p>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                close();
              }}
              className="mt-3 h-8 rounded-full border border-line px-4 text-sm font-medium text-primary hover:bg-hover"
            >
              Manage account
            </button>
          </div>

          <div className="mx-1 mb-2 grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={settings.theme === value}
                onClick={() => updateSettings({ theme: value })}
                className={cn(
                  'flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-medium',
                  settings.theme === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="border-t border-line pt-1.5">
            <MenuItem
              icon={<WifiOff />}
              onSelect={() => updateSettings({ offline: !settings.offline })}
            >
              <span className="flex items-center justify-between">
                <span>Offline mode</span>
                <span className="text-xs text-ink-3">{settings.offline ? 'On' : 'Off'}</span>
              </span>
            </MenuItem>
            <MenuItem
              icon={<Keyboard />}
              shortcut="?"
              onSelect={() => {
                setShortcutsOpen(true);
                close();
              }}
            >
              Keyboard shortcuts
            </MenuItem>
            <MenuItem
              icon={<Settings />}
              onSelect={() => {
                setSettingsOpen(true);
                close();
              }}
            >
              Settings
            </MenuItem>
            <MenuItem
              icon={<RefreshCw />}
              danger
              onSelect={() => {
                close();
                ask({
                  title: 'Reset demo mailbox?',
                  body: 'Every change, draft and label will be replaced with the original sample mailbox.',
                  confirmLabel: 'Reset',
                  danger: true,
                  onConfirm: resetData,
                });
              }}
            >
              Reset demo mailbox
            </MenuItem>
          </div>
        </div>
      )}
    </Dropdown>
  );
}
