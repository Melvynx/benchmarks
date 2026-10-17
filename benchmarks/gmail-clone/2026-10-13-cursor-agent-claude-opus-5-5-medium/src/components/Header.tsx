import { forwardRef, useEffect, useState } from "react";
import { SearchBar, type SearchHandle } from "./SearchBar";
import { IconButton, Icon } from "../ui/Icon";
import { Avatar } from "../ui/Avatar";
import { ME } from "../data/contacts";
import { Popover, usePopover, MenuDivider, MenuItem } from "../ui/Popover";
import { useMail } from "../store/mail";
import { useUI } from "./uiContext";
import type { Route } from "../types";

export const TITLE = "Claude Opus 5.5";

export function Logo() {
  return (
    <a className="brand" href="#/inbox" aria-label={TITLE}>
      <svg width="32" height="32" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="10" width="40" height="30" rx="6" fill="#d97757" />
        <path d="M9 16l15 11 15-11" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="brand-name">{TITLE}</span>
    </a>
  );
}

function AccountMenu({ anchor, onClose }: { anchor: HTMLElement | null; onClose: () => void }) {
  const { state, api, confirm } = useMail();
  const ui = useUI();
  const bytes = new Blob([JSON.stringify(state)]).size;
  const quota = 5 * 1024 * 1024;
  const pct = Math.min(100, (bytes / quota) * 100);
  const attachBytes = state.threads.reduce((s, t) => s + t.messages.reduce((a, m) => a + m.attachments.reduce((x, y) => x + y.size, 0), 0), 0);
  return (
    <Popover anchor={anchor} onClose={onClose} align="end" width={340} className="account-pop">
      <div className="account-email">{ME.email}</div>
      <div className="account-hero">
        <Avatar contact={ME} size={72} />
        <div className="account-hi">Hi, {ME.name.split(" ")[0]}!</div>
        <div className="muted small">
          {ME.title} · {ME.org}
        </div>
      </div>
      <div className="account-storage">
        <div className="row-between small">
          <span>Local mailbox storage</span>
          <span className="muted">{(bytes / 1024).toFixed(0)} KB of 5 MB</span>
        </div>
        <div className="meter">
          <span style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
        <div className="muted small">
          {state.threads.length} conversations · {(attachBytes / 1024 / 1024).toFixed(1)} MB of attachments indexed
        </div>
      </div>
      <MenuDivider />
      <MenuItem
        icon="dark"
        label={state.settings.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => api.updateSettings({ theme: state.settings.theme === "dark" ? "light" : "dark" })}
      />
      <MenuItem
        icon="keyboard"
        label="Keyboard shortcuts"
        hint="?"
        onClick={() => {
          onClose();
          ui.openShortcuts();
        }}
      />
      <MenuItem
        icon="settings"
        label="All settings"
        onClick={() => {
          onClose();
          window.location.hash = "#/settings";
        }}
      />
      <MenuItem
        icon="restore"
        label="Reset demo mailbox"
        onClick={async () => {
          onClose();
          if (
            await confirm({
              title: "Reset mailbox?",
              body: "All conversations, drafts and labels will be restored to the original demo data. Your settings are kept.",
              confirmLabel: "Reset",
              danger: true,
            })
          )
            api.reset();
        }}
      />
    </Popover>
  );
}

export const Header = forwardRef<SearchHandle, { route: Route; onMenu: () => void }>(function Header({ route, onMenu }, ref) {
  const account = usePopover();
  const ui = useUI();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  const avatarBtn = (
    <button className="avatar-btn" aria-label={`Google Account: ${ME.name}`} data-tip={`${ME.name}\n${ME.email}`} onClick={account.toggle} type="button">
      <Avatar contact={ME} size={32} />
    </button>
  );

  return (
    <header className="header">
      <div className="header-left">
        <IconButton icon="menu" label="Main menu" onClick={onMenu} className="menu-btn" />
        <Logo />
      </div>
      <SearchBar ref={ref} route={route} mobileAvatar={ui.isMobile ? avatarBtn : undefined} onMenu={ui.isMobile ? onMenu : undefined} />
      <div className="header-right">
        {!online && (
          <span className="offline-pill" data-tip="You're offline. Changes are saved on this device.">
            <Icon name="cloudOff" size={18} /> Offline
          </span>
        )}
        <IconButton icon="help" label="Keyboard shortcuts" onClick={ui.openShortcuts} />
        <IconButton icon="settings" label="Settings" onClick={ui.openQuickSettings} />
        {!ui.isMobile && avatarBtn}
      </div>
      <AccountMenu anchor={account.anchor as HTMLElement | null} onClose={account.close} />
    </header>
  );
});
