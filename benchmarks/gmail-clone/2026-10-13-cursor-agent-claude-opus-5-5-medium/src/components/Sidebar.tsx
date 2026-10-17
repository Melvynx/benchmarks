import { useState } from "react";
import { useMail } from "../store/mail";
import { counts } from "../lib/views";
import type { Route } from "../types";
import { Icon, IconButton, type IconName } from "../ui/Icon";
import { useUI } from "./uiContext";
import { Popover, usePopover, MenuItem, MenuDivider } from "../ui/Popover";
import { LABEL_COLORS } from "./LabelDialog";
import { Logo } from "./Header";

interface NavDef {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  count?: number;
  strongCount?: boolean;
  active: boolean;
}

export function Sidebar({ route, collapsed, mobileOpen, onNavigate }: { route: Route; collapsed: boolean; mobileOpen: boolean; onNavigate: () => void }) {
  const { state, api, confirm } = useMail();
  const ui = useUI();
  const [more, setMore] = useState(() => localStorage.getItem("opus-mail:nav-more") === "1");
  const c = counts(state);
  const labelMenu = usePopover();
  const [menuLabel, setMenuLabel] = useState<string | null>(null);

  const inboxActive = route.view === "inbox" || route.view === "category";
  const primary: NavDef[] = [
    { id: "inbox", label: "Inbox", icon: "inbox", href: "#/inbox", count: c.inbox, strongCount: true, active: inboxActive },
    { id: "starred", label: "Starred", icon: "star", href: "#/starred", active: route.view === "starred" },
    { id: "snoozed", label: "Snoozed", icon: "clock", href: "#/snoozed", active: route.view === "snoozed" },
    { id: "sent", label: "Sent", icon: "send", href: "#/sent", active: route.view === "sent" },
    { id: "drafts", label: "Drafts", icon: "draft", href: "#/drafts", count: c.drafts, active: route.view === "drafts" },
  ];
  const secondary: NavDef[] = [
    { id: "important", label: "Important", icon: "importantOutline", href: "#/important", active: route.view === "important" },
    { id: "scheduled", label: "Scheduled", icon: "scheduleSend", href: "#/scheduled", count: c.scheduled, active: route.view === "scheduled" },
    { id: "all", label: "All Mail", icon: "allMail", href: "#/all", active: route.view === "all" },
    { id: "spam", label: "Spam", icon: "spam", href: "#/spam", count: c.spam, strongCount: true, active: route.view === "spam" },
    { id: "trash", label: "Trash", icon: "trash", href: "#/trash", active: route.view === "trash" },
  ];
  // Keep the active folder visible even when "More" is collapsed.
  const shownSecondary = more ? secondary : secondary.filter((n) => n.active);

  const item = (n: NavDef) => (
    <a
      key={n.id}
      href={n.href}
      className={"nav-item" + (n.active ? " active" : "") + (n.count && n.strongCount ? " has-unread" : "")}
      onClick={onNavigate}
      data-tip={collapsed ? n.label : undefined}
      aria-current={n.active ? "page" : undefined}
    >
      <Icon name={n.active && n.id === "starred" ? "starFilled" : n.icon} />
      <span className="nav-label">{n.label}</span>
      {!!n.count && <span className="nav-count">{n.count}</span>}
    </a>
  );

  const lbl = state.labels.find((l) => l.id === menuLabel);

  return (
    <nav className={"sidebar" + (collapsed ? " collapsed" : "") + (mobileOpen ? " mobile-open" : "")} aria-label="Mailboxes">
      <div className="brand-mobile" onClick={onNavigate}>
        <Logo />
      </div>
      <div className="compose-wrap">
        <button
          className="compose-btn"
          onClick={() => {
            api.compose();
            onNavigate();
          }}
          data-tip={collapsed ? "Compose (c)" : undefined}
        >
          <Icon name="edit" size={22} />
          <span>Compose</span>
        </button>
      </div>
      <div className="nav-scroll">
        {primary.map(item)}
        {shownSecondary.map(item)}
        <button
          className="nav-item more"
          onClick={() => {
            setMore(!more);
            localStorage.setItem("opus-mail:nav-more", more ? "0" : "1");
          }}
        >
          <Icon name={more ? "expandLess" : "expandMore"} />
          <span className="nav-label">{more ? "Less" : "More"}</span>
        </button>

        <div className="nav-section">
          <span>Labels</span>
          <IconButton icon="plus" label="Create new label" size={18} onClick={() => ui.openCreateLabel()} />
        </div>
        {state.labels.map((l) => {
          const active = route.view === "label" && route.param === l.id;
          const n = c.labels[l.id];
          return (
            <a
              key={l.id}
              href={`#/label/${encodeURIComponent(l.id)}`}
              className={"nav-item label" + (active ? " active" : "") + (n ? " has-unread" : "")}
              onClick={onNavigate}
              data-tip={collapsed ? l.name : undefined}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuLabel(l.id);
                labelMenu.openAt(e.clientX, e.clientY);
              }}
            >
              <Icon name="labelFilled" style={{ color: l.color }} />
              <span className="nav-label">{l.name}</span>
              {!!n && <span className="nav-count">{n}</span>}
              <button
                className="nav-more icon-btn"
                aria-label={`Options for ${l.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuLabel(l.id);
                  labelMenu.open(e);
                }}
              >
                <Icon name="moreVert" size={18} />
              </button>
            </a>
          );
        })}
      </div>
      <Popover anchor={labelMenu.anchor} onClose={labelMenu.close} width={230}>
        {lbl && (
          <>
            <div className="menu-title">Label color</div>
            <div className="swatches">
              {LABEL_COLORS.map((col) => (
                <button
                  key={col}
                  className={"swatch" + (lbl.color === col ? " on" : "")}
                  style={{ background: col }}
                  aria-label={`Color ${col}`}
                  onClick={() => api.updateLabel(lbl.id, { color: col })}
                />
              ))}
            </div>
            <MenuDivider />
            <MenuItem
              icon="search"
              label="Show in search"
              onClick={() => {
                labelMenu.close();
                window.location.hash = `#/search/${encodeURIComponent(`label:${lbl.id}`)}`;
              }}
            />
            <MenuItem
              icon="edit"
              label="Rename"
              onClick={() => {
                labelMenu.close();
                ui.openEditLabel(lbl.id);
              }}
            />
            <MenuItem
              icon="trash"
              label="Remove label"
              danger
              onClick={async () => {
                labelMenu.close();
                if (await confirm({ title: `Remove label "${lbl.name}"?`, body: "Conversations with this label won't be deleted.", confirmLabel: "Delete", danger: true })) {
                  if (route.view === "label" && route.param === lbl.id) window.location.hash = "#/inbox";
                  api.deleteLabel(lbl.id);
                }
              }}
            />
          </>
        )}
      </Popover>
    </nav>
  );
}
