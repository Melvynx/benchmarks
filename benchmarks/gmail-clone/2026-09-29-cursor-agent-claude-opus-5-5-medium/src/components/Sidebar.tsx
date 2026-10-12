import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  Inbox, Star, Clock, Send, File, ChevronDown, ChevronUp, Mail, AlertOctagon, Trash2, Pencil, Plus, Tag, MoreVertical,
  Bookmark, CalendarClock, Users, Info, Settings, Keyboard,
} from "lucide-react";
import { useMail } from "../lib/store";
import { navigate, useRoute } from "../lib/router";
import { inView } from "../lib/query";
import type { Category, Route, SystemView } from "../lib/types";
import { IconButton, MenuDivider, MenuItem, Popover, useAnchor, useIsMobile } from "./ui";
import { Logo } from "./TopBar";

export const DRAG_TYPE = "application/x-mail-threads";

const PRIMARY_NAV: { view: SystemView; label: string; icon: ReactNode }[] = [
  { view: "inbox", label: "Inbox", icon: <Inbox size={20} /> },
  { view: "starred", label: "Starred", icon: <Star size={20} /> },
  { view: "snoozed", label: "Snoozed", icon: <Clock size={20} /> },
  { view: "important", label: "Important", icon: <Bookmark size={20} /> },
  { view: "sent", label: "Sent", icon: <Send size={20} /> },
  { view: "scheduled", label: "Scheduled", icon: <CalendarClock size={20} /> },
  { view: "drafts", label: "Drafts", icon: <File size={20} /> },
];
const MORE_NAV: { view: SystemView; label: string; icon: ReactNode }[] = [
  { view: "all", label: "All Mail", icon: <Mail size={20} /> },
  { view: "spam", label: "Spam", icon: <AlertOctagon size={20} /> },
  { view: "trash", label: "Trash", icon: <Trash2 size={20} /> },
];

const CATEGORY_NAV: { cat: Category; label: string; icon: ReactNode }[] = [
  { cat: "promotions", label: "Promotions", icon: <Tag size={20} /> },
  { cat: "social", label: "Social", icon: <Users size={20} /> },
  { cat: "updates", label: "Updates", icon: <Info size={20} /> },
];

function useCounts() {
  const threads = useMail((s) => s.threads);
  const drafts = useMail((s) => s.drafts);
  const labels = useMail((s) => s.labels);
  const now = useMail((s) => s.now);
  const tabs = useMail((s) => s.settings.inboxTabs);
  return useMemo(() => {
    const list = Object.values(threads);
    const unread = (v: SystemView | "label", labelId?: string, cat?: Category) =>
      list.filter((t) => t.unread && inView(t, v, now, labelId, cat)).length;
    const counts: Record<string, number> = {
      inbox: unread("inbox", undefined, tabs ? "primary" : undefined),
      spam: unread("spam"),
      snoozed: list.filter((t) => inView(t, "snoozed", now)).length,
      drafts: Object.values(drafts).filter((d) => !d.scheduledAt && !d.sending).length,
      scheduled: Object.values(drafts).filter((d) => d.scheduledAt && !d.sending).length,
      promotions: unread("inbox", undefined, "promotions"),
      social: unread("inbox", undefined, "social"),
      updates: unread("inbox", undefined, "updates"),
    };
    for (const l of labels) counts["label:" + l.id] = unread("label", l.id);
    return counts;
  }, [threads, drafts, labels, now, tabs]);
}

function useDrop(onDrop: (ids: string[]) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        setOver(false);
        const raw = e.dataTransfer.getData(DRAG_TYPE);
        if (raw) onDrop(JSON.parse(raw));
      },
    },
  };
}

function NavItem({
  icon, label, count, active, bold, onClick, collapsed, onDrop, trailing, color,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
  bold?: boolean;
  onClick: () => void;
  collapsed: boolean;
  onDrop?: (ids: string[]) => void;
  trailing?: ReactNode;
  color?: string;
}) {
  const drop = useDrop(onDrop ?? (() => {}));
  return (
    <div
      {...(onDrop ? drop.props : {})}
      className={clsx(
        "group/nav relative flex h-8 items-center rounded-full",
        collapsed ? "mx-auto w-14 justify-center" : "mr-2 pl-3 pr-2",
        active ? "bg-nav-active text-nav-active-ink" : "text-ink hover:bg-hover",
        drop.over && "!bg-selected ring-2 ring-primary",
      )}
    >
      <button
        onClick={onClick}
        data-tip={collapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        className={clsx(
          "flex h-full min-w-0 flex-1 items-center gap-4 rounded-full text-left text-sm outline-none",
          collapsed ? "justify-center" : "pl-3",
          (active || (bold && count)) && "font-semibold",
        )}
      >
        <span className="relative shrink-0" style={color ? { color } : undefined}>
          {icon}
          {collapsed && !!count && bold && (
            <span className="absolute -right-2 -top-1.5 rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </span>
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && !!count && <span className={clsx("pr-2 text-xs", !bold && "font-normal")}>{count}</span>}
      </button>
      {!collapsed && trailing}
    </div>
  );
}

const LABEL_SWATCHES = ["#4285f4", "#e91e63", "#16a765", "#fb8c00", "#8e24aa", "#00acc1", "#f4511e", "#7cb342", "#5c6bc0", "#78909c", "#d50000", "#795548"];

function LabelOptions({ id }: { id: string }) {
  const menu = useAnchor();
  const updateLabel = useMail((s) => s.updateLabel);
  const deleteLabel = useMail((s) => s.deleteLabel);
  const set = useMail((s) => s.set);
  const route = useRoute();
  return (
    <>
      <IconButton
        size="sm"
        tip="Label options"
        className={clsx("h-6 w-6 opacity-0 group-hover/nav:opacity-100 focus:opacity-100", menu.anchor && "opacity-100")}
        onClick={menu.open}
      >
        <MoreVertical size={16} />
      </IconButton>
      <Popover anchor={menu.anchor} onClose={menu.close} className="w-60">
        <div className="px-4 pb-2 text-xs font-medium text-ink-3">Label color</div>
        <div className="grid grid-cols-6 gap-2 px-4 pb-2">
          {LABEL_SWATCHES.map((c) => (
            <button
              key={c}
              aria-label={`Color ${c}`}
              className="h-7 w-7 rounded-full ring-offset-2 ring-offset-[var(--menu)] hover:ring-2 hover:ring-ink-3"
              style={{ background: c }}
              onClick={() => {
                updateLabel(id, { color: c });
                menu.close();
              }}
            />
          ))}
        </div>
        <MenuDivider />
        <MenuItem icon={<Pencil size={16} />} label="Edit" onClick={() => { menu.close(); set({ labelDialog: { id } }); }} />
        <MenuItem
          icon={<Trash2 size={16} />}
          label="Remove label"
          onClick={() => {
            menu.close();
            if (route.view === "label" && route.labelId === id) navigate({ view: "inbox" });
            deleteLabel(id);
          }}
        />
      </Popover>
    </>
  );
}

export function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const route = useRoute();
  const counts = useCounts();
  const labels = useMail((s) => s.labels);
  const openCompose = useMail((s) => s.openCompose);
  const set = useMail((s) => s.set);
  const tabs = useMail((s) => s.settings.inboxTabs);
  const a = useMail.getState;
  const isMobile = useIsMobile();
  const [more, setMore] = useState(true);

  const go = (r: Route) => {
    navigate(r);
    onNavigate?.();
  };

  const dropFor = (view: SystemView): ((ids: string[]) => void) | undefined => {
    switch (view) {
      case "inbox": return (ids) => a().moveToInbox(ids);
      case "starred": return (ids) => { a().setStarred(ids, true); a().toast({ text: "Starred." }); };
      case "important": return (ids) => a().setImportant(ids, true);
      case "spam": return (ids) => a().markSpam(ids);
      case "trash": return (ids) => a().trash(ids);
      case "all": return (ids) => a().archive(ids);
      default: return undefined;
    }
  };

  const isActive = (v: SystemView) => route.view === v && (v !== "inbox" || !route.category || route.category === "primary" || !tabs);

  return (
    <nav aria-label="Mailboxes" className="flex flex-col pb-6">
      {!isMobile && (
        <div className={clsx("pb-4 pt-2", collapsed ? "flex justify-center" : "pl-2")}>
          <button
            onClick={() => openCompose()}
            data-tip={collapsed ? "Compose" : undefined}
            className={clsx(
              "flex h-14 items-center gap-3 rounded-2xl bg-compose text-compose-ink transition-shadow hover:shadow-float",
              collapsed ? "w-14 justify-center" : "pl-4 pr-6",
            )}
          >
            <Pencil size={22} />
            {!collapsed && <span className="text-sm font-medium">Compose</span>}
          </button>
        </div>
      )}
      {isMobile && (
        <div className="flex items-center gap-2 px-5 pb-3 pt-4">
          <Logo size={30} />
          <span className="font-display text-xl text-ink-2">Claude Opus 5.5</span>
        </div>
      )}

      {PRIMARY_NAV.map((n) => (
        <NavItem
          key={n.view}
          {...n}
          collapsed={collapsed}
          active={isActive(n.view)}
          count={counts[n.view]}
          bold={n.view === "inbox" || n.view === "spam"}
          onClick={() => go({ view: n.view })}
          onDrop={dropFor(n.view)}
        />
      ))}
      {isMobile && tabs && (
        <>
          <div className="mx-4 my-2 h-px bg-divider" />
          {CATEGORY_NAV.map((c) => (
            <NavItem
              key={c.cat}
              icon={c.icon}
              label={c.label}
              collapsed={false}
              active={route.view === "inbox" && route.category === c.cat}
              count={counts[c.cat]}
              bold
              onClick={() => go({ view: "inbox", category: c.cat })}
            />
          ))}
        </>
      )}
      {!collapsed && (
        <button
          onClick={() => setMore(!more)}
          className="mr-2 flex h-8 items-center gap-4 rounded-full pl-6 text-left text-sm text-ink hover:bg-hover"
        >
          {more ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          {more ? "Less" : "More"}
        </button>
      )}
      {(more || collapsed) &&
        MORE_NAV.map((n) => (
          <NavItem
            key={n.view}
            {...n}
            collapsed={collapsed}
            active={isActive(n.view)}
            count={counts[n.view]}
            bold={n.view === "spam"}
            onClick={() => go({ view: n.view })}
            onDrop={dropFor(n.view)}
          />
        ))}

      <div className={clsx("mt-4 flex items-center pb-1", collapsed ? "justify-center" : "justify-between pl-6 pr-4")}>
        {!collapsed && <span className="font-display text-base text-ink">Labels</span>}
        <IconButton size="sm" tip="Create new label" onClick={() => set({ labelDialog: {} })}>
          <Plus size={18} />
        </IconButton>
      </div>
      {labels.map((l) => (
        <NavItem
          key={l.id}
          icon={<Tag size={18} fill={l.color} strokeWidth={1.5} />}
          color={l.color}
          label={l.name}
          collapsed={collapsed}
          active={route.view === "label" && route.labelId === l.id}
          count={counts["label:" + l.id]}
          onClick={() => go({ view: "label", labelId: l.id })}
          onDrop={(ids) => a().moveToLabel(ids, l.id)}
          trailing={<LabelOptions id={l.id} />}
        />
      ))}

      {isMobile && (
        <>
          <div className="mx-4 my-2 h-px bg-divider" />
          <NavItem icon={<Settings size={20} />} label="Settings" collapsed={false} active={false} onClick={() => { onNavigate?.(); set({ settingsOpen: true }); }} />
          <NavItem icon={<Keyboard size={20} />} label="Keyboard shortcuts" collapsed={false} active={false} onClick={() => { onNavigate?.(); set({ shortcutsOpen: true }); }} />
        </>
      )}
    </nav>
  );
}

export function Sidebar() {
  const collapsed = useMail((s) => s.sidebarCollapsed);
  const [hover, setHover] = useState(false);
  const expanded = !collapsed || hover;
  return (
    <aside
      className={clsx("no-print relative shrink-0 transition-[width] duration-200", collapsed ? "w-[72px]" : "w-[256px]")}
      onMouseLeave={() => setHover(false)}
    >
      <div
        onMouseEnter={() => collapsed && setTimeout(() => setHover(true), 0)}
        className={clsx(
          "scroll-thin absolute inset-y-0 left-0 z-20 overflow-y-auto overflow-x-hidden bg-bg transition-[width,box-shadow] duration-200",
          expanded ? "w-[256px]" : "w-[72px]",
          collapsed && hover && "rounded-r-2xl shadow-float",
        )}
      >
        <SidebarContent collapsed={!expanded} />
      </div>
    </aside>
  );
}

export function MobileDrawer() {
  const open = useMail((s) => s.mobileNavOpen);
  const set = useMail((s) => s.set);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" onClick={() => set({ mobileNavOpen: false })}>
      <div className="anim-fade absolute inset-0 bg-black/40" />
      <div
        className="anim-slide scroll-thin absolute inset-y-0 left-0 w-[300px] max-w-[85vw] overflow-y-auto rounded-r-2xl bg-bg shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <SidebarContent collapsed={false} onNavigate={() => set({ mobileNavOpen: false })} />
      </div>
    </div>
  );
}
