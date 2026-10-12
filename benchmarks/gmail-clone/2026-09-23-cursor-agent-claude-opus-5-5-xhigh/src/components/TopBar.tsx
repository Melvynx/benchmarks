import { useEffect, useState } from "react";
import { ME } from "../lib/contacts";
import { formatSize } from "../lib/format";
import { useIsMobile, useIsNarrow } from "../lib/hooks";
import { navigate } from "../lib/router";
import { useMail } from "../lib/store";
import type { Theme } from "../lib/types";
import { useUI } from "../lib/ui";
import { cn } from "../lib/utils";
import { SearchBar } from "./SearchBar";
import { Avatar, Icon, IconButton, Popover, useMenu } from "./ui";

export const APP_TITLE = "Claude Opus 5.5";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <a
      href="#inbox"
      onClick={(e) => {
        e.preventDefault();
        navigate("#inbox");
      }}
      className="flex min-w-0 items-center gap-2.5 rounded-lg pr-2"
      aria-label={APP_TITLE}
    >
      <svg viewBox="0 0 48 48" className="h-8 w-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="lg-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4f7cff" />
            <stop offset="1" stopColor="#1a4fd6" />
          </linearGradient>
        </defs>
        <rect x="3" y="9" width="42" height="31" rx="7" fill="url(#lg-logo)" />
        <path d="M6 14l18 13 18-13" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="39" cy="12" r="6" fill="#ff7a59" stroke="var(--app-bg)" strokeWidth="2.5" />
      </svg>
      {!compact && <h1 className="whitespace-nowrap font-display text-[20px] leading-none tracking-tight text-fg-2">{APP_TITLE}</h1>}
    </a>
  );
}

export function TopBar() {
  const isMobile = useIsMobile();
  const isNarrow = useIsNarrow();
  const collapsed = useMail((s) => s.settings.sidebarCollapsed);
  const updateSettings = useMail((s) => s.updateSettings);
  const setNavOpen = useUI((s) => s.setNavOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const openDialog = useUI((s) => s.openDialog);
  const [mobileSearch, setMobileSearch] = useState(false);

  if (isMobile) {
    if (mobileSearch) {
      return (
        <header className="flex h-16 shrink-0 items-center px-2">
          <SearchBar autoFocus onClose={() => setMobileSearch(false)} />
        </header>
      );
    }
    return (
      <header className="flex h-16 shrink-0 items-center gap-1 px-2">
        <IconButton icon="menu" label="Main menu" size="lg" onClick={() => setNavOpen(true)} />
        <div className="min-w-0 flex-1">
          <Logo />
        </div>
        <IconButton icon="search" label="Search mail" size="lg" onClick={() => setMobileSearch(true)} />
        <AccountButton />
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 pl-2 pr-3">
      <div className={cn("flex shrink-0 items-center gap-1", isNarrow ? "w-auto" : "w-[248px]")}>
        <IconButton
          icon="menu"
          label="Main menu"
          size="lg"
          onClick={() => (isNarrow ? setNavOpen(true) : updateSettings({ sidebarCollapsed: !collapsed }))}
        />
        <Logo />
      </div>
      <div className="flex min-w-0 flex-1 items-center pl-2">
        <SearchBar />
      </div>
      <div className="flex shrink-0 items-center gap-0.5 pl-2">
        <OnlineStatus />
        <IconButton icon="help" label="Keyboard shortcuts" onClick={() => openDialog({ type: "shortcuts" })} />
        <IconButton icon="settings" label="Settings" active={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)} />
        <AccountButton />
      </div>
    </header>
  );
}

function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return (
    <div
      data-tip={online ? "Changes are saved in this browser" : "You're offline. Changes are still saved locally."}
      className="mr-1 hidden h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-fg-2 lg:flex"
    >
      <span className={cn("h-2 w-2 rounded-full", online ? "bg-[#1e8e3e]" : "bg-[#f29900]")} />
      {online ? "Saved locally" : "Offline"}
    </div>
  );
}

function storageUsed() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    total += (localStorage.getItem(k)?.length ?? 0) * 2;
  }
  return total;
}

function AccountButton() {
  const menu = useMenu();
  const theme = useMail((s) => s.settings.theme);
  const updateSettings = useMail((s) => s.updateSettings);
  const resetDemo = useMail((s) => s.resetDemo);
  const threads = useMail((s) => s.threads);
  const openDialog = useUI((s) => s.openDialog);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const showToast = useUI((s) => s.showToast);
  const used = menu.open ? storageUsed() : 0;
  const quota = 5 * 1024 * 1024;

  return (
    <>
      <button
        ref={menu.ref}
        type="button"
        onClick={menu.toggle}
        aria-label={`Account: ${ME.name} (${ME.email})`}
        data-tip={`${ME.name}\n${ME.email}`}
        className={cn("ml-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-hover", menu.open && "bg-hover")}
      >
        <Avatar name={ME.name} email={ME.email} size={32} />
      </button>
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} align="end" className="w-[360px] max-w-[calc(100vw-16px)] rounded-[28px] bg-surface-3 p-3">
        <div className="relative px-2 pb-3 pt-1 text-center">
          <div className="text-sm font-medium text-fg-2">{ME.email}</div>
          <IconButton icon="close" label="Close" size="sm" className="absolute right-0 top-0" onClick={menu.close} />
          <div className="mt-4 flex justify-center">
            <Avatar name={ME.name} email={ME.email} size={76} />
          </div>
          <div className="mt-3 font-display text-[22px]">Hi, {ME.name.split(" ")[0]}!</div>
          <div className="mt-1 text-sm text-fg-3">
            {Object.keys(threads).length} conversations · Product Lead at Lumen Labs
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl bg-raised">
          <div className="px-5 pb-2 pt-4 text-xs font-medium uppercase tracking-wider text-fg-3">Theme</div>
          <div className="mx-4 mb-3 grid grid-cols-3 gap-1 rounded-full bg-surface-3 p-1">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => updateSettings({ theme: t })}
                className={cn(
                  "flex h-8 items-center justify-center gap-1.5 rounded-full text-sm capitalize",
                  theme === t ? "bg-raised font-medium text-fg shadow-sm" : "text-fg-2 hover:bg-hover",
                )}
              >
                <Icon name={t === "light" ? "light_mode" : t === "dark" ? "dark_mode" : "contrast"} size={16} />
                {t}
              </button>
            ))}
          </div>
          <div className="h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              menu.close();
              setSettingsOpen(true);
            }}
            className="flex h-12 w-full items-center gap-4 px-5 text-left text-sm hover:bg-hover"
          >
            <Icon name="settings" className="text-fg-2" /> Quick settings
          </button>
          <button
            type="button"
            onClick={() => {
              menu.close();
              openDialog({ type: "shortcuts" });
            }}
            className="flex h-12 w-full items-center gap-4 px-5 text-left text-sm hover:bg-hover"
          >
            <Icon name="keyboard" className="text-fg-2" /> Keyboard shortcuts
          </button>
          <button
            type="button"
            onClick={() => {
              menu.close();
              openDialog({
                type: "confirm",
                title: "Reset demo mailbox?",
                body: "All changes (sent mail, drafts, labels, settings) will be replaced with the original seeded mailbox.",
                confirmLabel: "Reset mailbox",
                danger: true,
                onConfirm: () => {
                  resetDemo();
                  useUI.getState().clearSelection();
                  navigate("#inbox");
                  showToast({ message: "Mailbox reset to the original demo data." });
                },
              });
            }}
            className="flex h-12 w-full items-center gap-4 px-5 text-left text-sm hover:bg-hover"
          >
            <Icon name="restart_alt" className="text-fg-2" /> Reset demo mailbox
          </button>
        </div>
        <div className="px-4 pb-1 pt-4">
          <div className="flex items-center justify-between text-xs text-fg-3">
            <span className="flex items-center gap-1.5">
              <Icon name="cloud_done" size={16} /> Local storage
            </span>
            <span>
              {formatSize(used)} of {formatSize(quota)} used
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (used / quota) * 100).toFixed(1)}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 pb-1 pt-3 text-xs text-fg-3">
          <Icon name="lock" size={14} /> Mail is stored only in this browser
        </div>
      </Popover>
    </>
  );
}
