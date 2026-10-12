import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdCheck, MdHelpOutline, MdKeyboard, MdMenu, MdOutlineSettings, MdRestartAlt, MdSearch } from 'react-icons/md';
import { useIsMobile } from '../hooks';
import { navigate } from '../lib/router';
import { cn } from '../lib/utils';
import { MY_EMAIL, useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { confirmDialog, showToast, ui, useUI } from '../store/ui';
import { SearchBar } from './SearchBar';
import { Avatar, Button, IconButton, MenuDivider, MenuItem, Popover } from './ui';

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <rect x="4" y="9" width="40" height="30" rx="7" fill="#d97757" />
      <path d="M4 16 24 29 44 16" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16 24 29 44 16V32a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7Z" fill="#c4633f" opacity=".35" />
    </svg>
  );
}

export function AppTitle({ className }: { className?: string }) {
  return (
    <h1 className={cn('font-normal tracking-tight whitespace-nowrap text-fg2', className)} data-testid="app-title">
      Claude Opus 5.5
    </h1>
  );
}

export function Header() {
  const isMobile = useIsMobile();
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const mobileSearch = useUI((s) => s.mobileSearch);
  const quickSettings = useUI((s) => s.quickSettings);

  const toggleNav = () => {
    if (isMobile) ui.set({ drawerOpen: !ui.get().drawerOpen });
    else useSettings.getState().update({ sidebarCollapsed: !collapsed });
  };

  return (
    <header className="print-hide flex h-14 shrink-0 items-center gap-1 pr-2 pl-1 md:h-16 md:gap-2 md:pr-3 md:pl-2">
      <div className="flex min-w-0 shrink items-center md:min-w-[244px] md:shrink-0 md:pr-4">
        <IconButton icon={MdMenu} label="Main menu" onClick={toggleNav} size="lg" aria-expanded={isMobile ? undefined : !collapsed} />
        <a
          href="#inbox"
          className="ml-0.5 flex min-w-0 items-center gap-2 rounded-lg px-1 py-1"
          onClick={() => ui.set({ selected: [], page: 0 })}
          aria-label="Claude Opus 5.5 — go to Inbox"
        >
          <Logo size={isMobile ? 28 : 34} />
          <AppTitle className="text-lg md:text-[22px]" />
        </a>
      </div>
      <div className="hidden max-w-[720px] flex-1 md:block">
        <SearchBar />
      </div>
      <div className="flex-1" />
      {isMobile && <IconButton icon={MdSearch} label="Search mail" onClick={() => ui.set({ mobileSearch: true })} />}
      {!isMobile && <IconButton icon={MdHelpOutline} label="Keyboard shortcuts" onClick={() => ui.set({ shortcutsOpen: true })} />}
      {!isMobile && <IconButton icon={MdOutlineSettings} label="Settings" onClick={() => ui.set({ quickSettings: !quickSettings })} active={quickSettings} />}
      <AccountButton />
      {isMobile &&
        mobileSearch &&
        createPortal(
          <div className="fixed inset-0 z-[65] animate-fade bg-panel">
            <SearchBar variant="mobile" onDone={() => ui.set({ mobileSearch: false })} />
          </div>,
          document.body,
        )}
    </header>
  );
}

const AVATAR_SWATCHES = ['#7b3fa0', '#1a73e8', '#188038', '#d93025', '#e37400', '#00796b', '#c2185b', '#5f6368'];

function AccountButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const name = useSettings((s) => s.displayName);
  const color = useSettings((s) => s.avatarColor);
  const update = useSettings((s) => s.update);
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`Account: ${name} (${MY_EMAIL})`}
        data-tip={`${name}\n${MY_EMAIL}`}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 flex size-10 items-center justify-center rounded-full hover:bg-hover"
      >
        <Avatar person={{ name, email: MY_EMAIL }} size={32} />
      </button>
      <Popover open={open} anchor={ref.current} onClose={() => setOpen(false)} placement="bottom-end" className="w-[340px] rounded-3xl bg-search py-0" role="dialog">
        <div className="px-4 pt-4 text-center text-sm text-fg2">{MY_EMAIL}</div>
        <div className="m-2 rounded-3xl bg-raised p-5 text-center">
          <div className="mx-auto w-fit">
            <Avatar person={{ name, email: MY_EMAIL }} size={76} />
          </div>
          <div className="mt-3 text-[22px] text-fg">Hi, {name.split(' ')[0] || 'there'}!</div>
          <div className="mt-3 flex justify-center gap-1.5" role="radiogroup" aria-label="Profile color">
            {AVATAR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={`Profile color ${c}`}
                onClick={() => update({ avatarColor: c })}
                className="flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-raised hover:ring-2 hover:ring-line-strong"
                style={{ background: c }}
              >
                {c === color && <MdCheck size={14} className="text-white" />}
              </button>
            ))}
          </div>
          <Button
            variant="outlined"
            className="mt-4"
            onClick={() => {
              setOpen(false);
              navigate({ view: 'settings', tab: 'general' });
            }}
          >
            Manage your account
          </Button>
        </div>
        <div className="mx-2 mb-2 overflow-hidden rounded-3xl bg-raised py-2">
          <MenuItem
            icon={MdKeyboard}
            label="Keyboard shortcuts"
            hint="?"
            onClick={() => {
              setOpen(false);
              ui.set({ shortcutsOpen: true });
            }}
          />
          <MenuItem
            icon={MdOutlineSettings}
            label="Quick settings"
            onClick={() => {
              setOpen(false);
              ui.set({ quickSettings: true });
            }}
          />
          <MenuDivider />
          <MenuItem
            icon={MdRestartAlt}
            label="Reset demo mailbox"
            onClick={() => {
              setOpen(false);
              confirmDialog({
                title: 'Reset demo mailbox?',
                message: 'All changes, drafts and sent messages will be replaced with the original sample mailbox.',
                confirmLabel: 'Reset',
                danger: true,
                onConfirm: () => {
                  useMail.getState().reset();
                  ui.set({ composes: [], inline: null, selected: [] });
                  navigate({ view: 'folder', folder: 'inbox' });
                  showToast('Mailbox reset.');
                },
              });
            }}
          />
        </div>
        <div className="pb-3 text-center text-[11px] text-fg3">Local demo account · stored in this browser only</div>
      </Popover>
    </>
  );
}
