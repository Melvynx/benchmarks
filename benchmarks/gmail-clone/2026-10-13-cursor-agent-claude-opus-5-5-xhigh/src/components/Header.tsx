import { useEffect, useState } from "react";
import { Popover } from "radix-ui";
import { useMail, getMail } from "../lib/store";
import { useUI, ui } from "../lib/ui";
import { navigate } from "../lib/router";
import { actions } from "../lib/actions";
import { formatBytes } from "../lib/utils";
import { Avatar, Icon, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tip } from "./ui";
import { Brand } from "./Logo";
import { SearchBar } from "./SearchBar";
import { useIsMobile, useCompactNav } from "../hooks/useMedia";

/** Real browser storage used by this origin (localStorage + IndexedDB uploads). */
export function useStorage() {
  const messages = useMail((s) => s.messages);
  const [est, setEst] = useState({ used: 0, total: 0 });
  useEffect(() => {
    let alive = true;
    const local = (localStorage.getItem("mail-client-store")?.length ?? 0) * 2;
    const t = window.setTimeout(() => {
      if (!navigator.storage?.estimate) return setEst({ used: local, total: 0 });
      navigator.storage
        .estimate()
        .then((e) => alive && setEst({ used: Math.max(e.usage ?? 0, local), total: e.quota ?? 0 }))
        .catch(() => alive && setEst({ used: local, total: 0 }));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [messages]);
  return est;
}

export function storageLabel(s: { used: number; total: number }) {
  return s.total ? `${formatBytes(s.used)} of ${formatBytes(s.total)} used on this device` : `${formatBytes(s.used)} used on this device`;
}

export function AccountMenu({ size = 32 }: { size?: number }) {
  const account = useMail((s) => s.account);
  const [open, setOpen] = useState(false);
  const storage = useStorage();
  const pct = storage.total ? Math.max(1, Math.min(100, (storage.used / storage.total) * 100)) : 0;
  const go = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label={<span className="block text-left leading-4"><b className="font-medium">Account</b><br />{account.name}<br />{account.email}</span>}>
        <Popover.Trigger asChild>
          <button type="button" aria-label={`Account: ${account.name}`} className="inline-flex size-12 items-center justify-center rounded-full hover:bg-hover">
            <Avatar name={account.name} email={account.email} color={account.color} size={size} />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="no-print z-[70] w-[min(410px,calc(100vw-16px))] rounded-[28px] bg-surface-3 p-2 font-sans text-fg shadow-e3 outline-none animate-pop"
        >
          <div className="relative px-12 py-3 text-center text-sm font-medium text-fg-2">
            {account.email}
            <IconButton icon="close" label="Close" className="absolute right-1 top-1" onClick={() => setOpen(false)} />
          </div>
          <div className="flex flex-col items-center gap-3 pb-5 pt-2">
            <div className="relative">
              <Avatar name={account.name} email={account.email} color={account.color} size={80} />
              <button
                type="button"
                aria-label="Change profile color"
                onClick={go(() => navigate("settings/accounts"))}
                className="absolute -bottom-0.5 -right-0.5 inline-flex size-7 items-center justify-center rounded-full bg-surface text-icon shadow-e1"
              >
                <Icon name="edit" size={16} />
              </button>
            </div>
            <div className="text-[22px]">Hi, {account.name.split(" ")[0]}!</div>
            <button
              type="button"
              onClick={go(() => navigate("settings/accounts"))}
              className="h-10 rounded-full border border-outline px-6 text-sm font-medium text-primary hover:bg-hover"
            >
              Manage your account
            </button>
          </div>
          <div className="overflow-hidden rounded-[20px] bg-surface">
            <AccountRow icon="settings" label="All settings" onClick={go(() => navigate("settings/general"))} />
            <AccountRow icon="keyboard" label="Keyboard shortcuts" onClick={go(() => ui().set({ shortcutsOpen: true }))} />
            <AccountRow
              icon="restart_alt"
              label="Reset demo mailbox"
              onClick={go(() =>
                ui().set({
                  confirm: {
                    title: "Reset mailbox?",
                    body: "This restores the original seeded mailbox and settings. Your drafts, sent mail and changes will be lost.",
                    confirmLabel: "Reset",
                    danger: true,
                    onConfirm: () => {
                      getMail().reset();
                      ui().set({ composers: [], selected: [] });
                      navigate("inbox");
                      ui().showToast({ message: "Mailbox reset to its original state." });
                    },
                  },
                }),
              )}
            />
            <AccountRow icon="logout" label="Sign out" onClick={go(() => getMail().setSignedOut(true))} />
          </div>
          <div className="px-6 pb-3 pt-4">
            <div className="mb-1.5 flex items-center gap-2 text-xs text-fg-2">
              <Icon name="cloud_done" size={18} />
              {storageLabel(storage)}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-hover-strong">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AccountRow({ icon, label, onClick }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-14 w-full items-center gap-5 px-7 text-left text-sm hover:bg-hover">
      <Icon name={icon} size={22} className="text-icon" />
      {label}
    </button>
  );
}

export function HelpMenu() {
  return (
    <Menu>
      <Tip label="Support">
        <MenuTrigger asChild>
          <button type="button" aria-label="Support" className="inline-flex size-12 items-center justify-center rounded-full text-icon hover:bg-hover">
            <Icon name="help" size={24} />
          </button>
        </MenuTrigger>
      </Tip>
      <MenuContent align="end">
        <MenuItem icon="keyboard" shortcut="?" onSelect={() => ui().set({ shortcutsOpen: true })}>Keyboard shortcuts</MenuItem>
        <MenuItem icon="settings" onSelect={() => navigate("settings/general")}>All settings</MenuItem>
        <MenuSeparator />
        <MenuItem
          icon="feedback"
          onSelect={() =>
            actions.compose({ kind: "new", to: [{ name: "Product Feedback", email: "feedback@fieldwork.co" }], subject: "Feedback on the mail app" })
          }
        >
          Send feedback
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function Header() {
  const isMobile = useIsMobile();
  const quick = useUI((s) => s.quickSettings);
  const collapsed = useMail((s) => s.settings.navCollapsed);
  const online = useUI((s) => s.online);
  const compactNav = useCompactNav();
  const navOpen = useUI((s) => s.navOpen);

  if (isMobile) {
    return (
      <header className="no-print flex h-14 shrink-0 items-center gap-1 px-1 pr-2">
        <IconButton icon="menu" size="lg" label="Main menu" onClick={() => ui().set({ navOpen: true })} />
        <Brand compact />
        <div className="ml-auto flex items-center">
          {!online && <Icon name="cloud_off" size={20} className="mr-2 text-fg-3" />}
          <IconButton icon="search" size="lg" label="Search mail" onClick={() => ui().set({ mobileSearch: true })} />
          <AccountMenu size={30} />
        </div>
      </header>
    );
  }

  return (
    <header className="no-print flex h-16 shrink-0 items-center gap-2 py-2 pl-2 pr-3">
      <div className="flex min-w-[232px] shrink-0 items-center gap-1 max-[1099px]:min-w-0">
        <IconButton
          icon="menu"
          size="lg"
          label="Main menu"
          aria-expanded={compactNav ? navOpen : !collapsed}
          onClick={() => (compactNav ? ui().set({ navOpen: !navOpen }) : getMail().updateSettings({ navCollapsed: !getMail().settings.navCollapsed }))}
        />
        <Brand />
      </div>
      <div className="ml-2 flex min-w-0 flex-1 items-center">
        <SearchBar />
      </div>
      <div className="ml-auto flex shrink-0 items-center">
        {!online && (
          <Tip label="You're offline. Changes are saved on this device.">
            <span className="mr-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-3 px-3 text-xs text-fg-2">
              <Icon name="cloud_off" size={16} /> Offline
            </span>
          </Tip>
        )}
        <HelpMenu />
        <Tip label="Settings">
          <button
            type="button"
            aria-label="Settings"
            aria-pressed={quick}
            onClick={() => ui().set({ quickSettings: !quick })}
            className={`inline-flex size-12 items-center justify-center rounded-full text-icon hover:bg-hover ${quick ? "bg-hover-strong" : ""}`}
          >
            <Icon name="settings" size={24} />
          </button>
        </Tip>
        <SidePanelButton />
        <AccountMenu />
      </div>
    </header>
  );
}

function SidePanelButton() {
  const panel = useUI((s) => s.sidePanel);
  return (
    <Menu>
      <Tip label="Apps">
        <MenuTrigger asChild>
          <button type="button" aria-label="Apps" className="inline-flex size-12 items-center justify-center rounded-full text-icon hover:bg-hover">
            <Icon name="apps" size={24} />
          </button>
        </MenuTrigger>
      </Tip>
      <MenuContent align="end">
        <MenuItem icon="calendar_today" onSelect={() => ui().set({ sidePanel: panel === "calendar" ? null : "calendar" })}>Calendar</MenuItem>
        <MenuItem icon="task_alt" onSelect={() => ui().set({ sidePanel: panel === "tasks" ? null : "tasks" })}>Tasks</MenuItem>
        <MenuItem icon="contacts" onSelect={() => ui().set({ sidePanel: panel === "contacts" ? null : "contacts" })}>Contacts</MenuItem>
      </MenuContent>
    </Menu>
  );
}
