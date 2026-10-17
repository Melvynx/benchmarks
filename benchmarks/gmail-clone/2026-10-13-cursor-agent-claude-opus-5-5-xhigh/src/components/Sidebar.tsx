import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useMail, getMail } from "../lib/store";
import { useUI, ui } from "../lib/ui";
import { navigate, routeHash, useRoute } from "../lib/router";
import { actions } from "../lib/actions";
import { CATEGORY_META, FOLDER_META, folderCount, labelUnread, tabUnread } from "../lib/selectors";
import type { Category, SystemFolder, ViewRef } from "../lib/types";
import { cn } from "../lib/utils";
import { Icon, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger, Tip, type IconKey } from "./ui";
import { Brand } from "./Logo";
import { useCompactNav, useIsMobile } from "../hooks/useMedia";

export const LABEL_COLORS = [
  "#fb4c2f", "#ffad47", "#fad165", "#16a766", "#43d692", "#4a86e8", "#a479e2", "#f691b3",
  "#cc3a21", "#eaa041", "#f2c960", "#149e60", "#3dc789", "#3c78d8", "#8e63ce", "#e07798",
  "#8e9aaf", "#666666", "#0b804b", "#2a9c68", "#285bac", "#653e9b", "#b65775", "#822111",
];

export const THREAD_DRAG_TYPE = "application/x-mail-threads";

function readDrag(e: DragEvent) {
  try {
    return JSON.parse(e.dataTransfer.getData(THREAD_DRAG_TYPE)) as string[];
  } catch {
    return [];
  }
}

function dropOn(target: SystemFolder | { label: string }, ids: string[]) {
  if (!ids.length) return;
  if (typeof target === "object") return actions.moveTo(ids, target.label);
  if (target === "inbox") return actions.moveToInbox(ids);
  if (target === "trash") return actions.trash(ids);
  if (target === "spam") return actions.spam(ids);
  if (target === "starred") {
    actions.star(ids, true);
    return ui().showToast({ message: `${ids.length === 1 ? "Conversation" : `${ids.length} conversations`} starred.` });
  }
  if (target === "important") return actions.important(ids, true);
}

const DROPPABLE: SystemFolder[] = ["inbox", "starred", "important", "spam", "trash"];

interface ItemProps {
  icon: IconKey;
  label: string;
  count?: number;
  boldCount?: boolean;
  active?: boolean;
  href: string;
  collapsed?: boolean;
  color?: string;
  fillIcon?: boolean;
  onDropIds?: (ids: string[]) => void;
  menu?: ReactNode;
  mobile?: boolean;
}

function NavItem({ icon, label, count, boldCount, active, href, collapsed, color, fillIcon, onDropIds, menu, mobile }: ItemProps) {
  const [over, setOver] = useState(false);
  const dropProps = onDropIds
    ? {
        onDragOver: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes(THREAD_DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          setOver(false);
          onDropIds(readDrag(e));
        },
      }
    : {};
  const showCount = count != null && count > 0;
  if (collapsed) {
    return (
      <Tip label={label} side="right">
        <a
          href={`#${href}`}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          {...dropProps}
          className={cn(
            "relative mx-auto my-0.5 flex h-8 w-14 items-center justify-center rounded-full text-icon hover:bg-hover",
            active && "bg-primary-soft text-on-primary-soft hover:bg-primary-soft",
            over && "bg-primary-soft ring-2 ring-primary",
          )}
        >
          <Icon name={icon} size={20} fill={active || fillIcon} style={color ? { color } : undefined} />
          {showCount && boldCount && (
            <span className="absolute -top-0.5 right-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white dark:text-[#1f1f1f]">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </a>
      </Tip>
    );
  }
  return (
    <div className="group relative">
      <a
        href={`#${href}`}
        aria-current={active ? "page" : undefined}
        onClick={() => mobile && ui().set({ navOpen: false })}
        {...dropProps}
        className={cn(
          "flex items-center gap-4 pr-4 font-sans text-sm text-fg hover:bg-hover",
          mobile ? "mx-3 h-12 rounded-full pl-4" : "h-8 rounded-r-full pl-[26px]",
          active && "bg-primary-soft font-bold text-on-primary-soft hover:bg-primary-soft",
          over && "bg-primary-soft ring-2 ring-inset ring-primary",
        )}
      >
        <Icon name={icon} size={20} fill={active || fillIcon} className={color ? "" : "text-icon"} style={color ? { color } : undefined} />
        <span className="flex-1 truncate">{label}</span>
        {showCount && <span className={cn("text-xs tabular-nums", boldCount ? "font-bold" : "font-normal", menu && "group-hover:invisible")}>{count}</span>}
      </a>
      {menu && <div className="invisible absolute right-1 top-1/2 -translate-y-1/2 group-hover:visible has-[[data-state=open]]:visible">{menu}</div>}
    </div>
  );
}

function LabelMenu({ id }: { id: string }) {
  const label = useMail((s) => s.labels.find((l) => l.id === id));
  if (!label) return null;
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton icon="more_vert" size="xs" label={`Options for ${label.name}`} tip={false} />
      </MenuTrigger>
      <MenuContent align="start" side="right">
        <MenuSub>
          <MenuSubTrigger icon="palette">Label color</MenuSubTrigger>
          <MenuSubContent className="p-3">
            <div className="grid grid-cols-8 gap-1.5">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => getMail().updateLabel(id, { color: c })}
                  className={cn("size-6 rounded-full ring-offset-2 ring-offset-[var(--menu-bg)] hover:ring-2 hover:ring-outline", label.color === c && "ring-2 ring-primary")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </MenuSubContent>
        </MenuSub>
        <MenuItem icon="edit" onSelect={() => ui().set({ labelDialog: { labelId: id } })}>Edit</MenuItem>
        <MenuItem icon="search" onSelect={() => navigate(routeHash({ view: { kind: "search", query: `label:${label.name.toLowerCase().replace(/\s+/g, "-")}` } }))}>Search in label</MenuItem>
        <MenuSeparator />
        <MenuItem
          icon="label_off"
          danger
          onSelect={() =>
            ui().set({
              confirm: {
                title: `Remove label "${label.name}"?`,
                body: "Conversations with this label will keep their other labels and stay in their folders.",
                confirmLabel: "Remove",
                danger: true,
                onConfirm: () => {
                  getMail().deleteLabel(id);
                  ui().showToast({ message: `Label "${label.name}" removed.` });
                },
              },
            })
          }
        >
          Remove label
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function isActive(view: ViewRef, target: ViewRef) {
  if (view.kind !== target.kind) return false;
  if (view.kind === "folder" && target.kind === "folder") return view.folder === target.folder;
  if (view.kind === "label" && target.kind === "label") return view.labelId === target.labelId;
  if (view.kind === "category" && target.kind === "category") return view.category === target.category;
  return false;
}

function useNavData() {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const settings = useMail((s) => s.settings);
  const account = useMail((s) => s.account);
  const labels = useMail((s) => s.labels);
  return useMemo(() => {
    const st = { threads, messages, settings, account, labels };
    const counts = Object.fromEntries((Object.keys(FOLDER_META) as SystemFolder[]).map((f) => [f, folderCount(st, f)])) as Record<SystemFolder, number>;
    const labelCounts = Object.fromEntries(labels.map((l) => [l.id, labelUnread(st, l.id)]));
    const tabCounts = Object.fromEntries((["primary", "promotions", "social", "updates", "forums"] as Category[]).map((c) => [c, tabUnread(st, c)]));
    return { counts, labelCounts, tabCounts, labels, settings };
  }, [threads, messages, settings, account, labels]);
}

function NavContent({ collapsed, mobile }: { collapsed?: boolean; mobile?: boolean }) {
  const route = useRoute();
  const { counts, labelCounts, tabCounts, labels, settings } = useNavData();
  const [more, setMore] = useState(() => localStorage.getItem("nav-more") === "1");
  useEffect(() => localStorage.setItem("nav-more", more ? "1" : "0"), [more]);

  const folder = (f: SystemFolder, extra: Partial<ItemProps> = {}) => (
    <NavItem
      key={f}
      icon={FOLDER_META[f].icon as IconKey}
      label={FOLDER_META[f].name}
      href={f}
      count={counts[f]}
      boldCount={f === "inbox" || f === "spam" || f === "snoozed" || f === "important"}
      active={isActive(route.view, { kind: "folder", folder: f })}
      collapsed={collapsed}
      mobile={mobile}
      onDropIds={DROPPABLE.includes(f) ? (ids) => dropOn(f, ids) : undefined}
      {...extra}
    />
  );

  const mainFolders: SystemFolder[] = ["starred", "snoozed", "important", "sent", ...(counts.scheduled > 0 ? (["scheduled"] as SystemFolder[]) : []), "drafts", "all", "spam", "trash"];
  const cats = (["social", "updates", "forums", "promotions"] as Category[]).filter((c) => settings.categories[c as Exclude<Category, "primary">]);

  return (
    <nav aria-label="Mailboxes" className={cn("flex flex-col", mobile ? "gap-0.5" : "")}>
      {mobile ? (
        <>
          {(["primary", ...cats] as Category[]).map((c) => (
            <NavItem
              key={c}
              icon={CATEGORY_META[c].icon as IconKey}
              label={c === "primary" ? (cats.length ? "Primary" : "Inbox") : CATEGORY_META[c].name}
              href={c === "primary" ? "inbox" : `category/${c}`}
              count={tabCounts[c]}
              boldCount
              active={route.view.kind === "folder" && route.view.folder === "inbox" && route.tab === c}
              mobile
              onDropIds={c === "primary" ? (ids) => dropOn("inbox", ids) : undefined}
            />
          ))}
          <div className="mx-7 my-2 h-px bg-line" />
          <div className="px-7 pb-1 pt-2 text-xs font-medium text-fg-3">All labels</div>
        </>
      ) : (
        folder("inbox")
      )}
      {mainFolders.map((f) => folder(f))}
      {!mobile && (
        <>
          {!collapsed ? (
            <button type="button" onClick={() => setMore(!more)} className="flex h-8 items-center gap-4 rounded-r-full pl-[26px] text-left font-sans text-sm text-fg hover:bg-hover">
              <Icon name={more ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={20} className="text-icon" />
              {more ? "Less" : "More"}
            </button>
          ) : (
            <IconButton icon={more ? "keyboard_arrow_up" : "keyboard_arrow_down"} label={more ? "Less" : "More"} size="sm" className="mx-auto" onClick={() => setMore(!more)} />
          )}
          {more && (
            <>
              {cats.length > 0 && !collapsed && <div className="px-[26px] pb-1 pt-3 text-xs font-medium text-fg-3">Categories</div>}
              {cats.map((c) => (
                <NavItem
                  key={c}
                  icon={CATEGORY_META[c].icon as IconKey}
                  label={CATEGORY_META[c].name}
                  href={`category/${c}`}
                  count={tabCounts[c]}
                  active={route.view.kind === "folder" && route.view.folder === "inbox" && route.tab === c}
                  collapsed={collapsed}
                />
              ))}
              <NavItem icon="settings" label="Manage labels" href="settings/labels" collapsed={collapsed} active={route.view.kind === "settings" && route.view.tab === "labels"} />
              {!collapsed && (
                <button type="button" onClick={() => ui().set({ labelDialog: {} })} className="flex h-8 items-center gap-4 rounded-r-full pl-[26px] text-left font-sans text-sm text-fg hover:bg-hover">
                  <Icon name="add" size={20} className="text-icon" />
                  Create new label
                </button>
              )}
            </>
          )}
        </>
      )}
      {!collapsed ? (
        <div className={cn("flex items-center justify-between pb-1 pr-2 pt-4", mobile ? "pl-7" : "pl-[26px]")}>
          <h2 className="font-sans text-base font-medium text-fg">Labels</h2>
          <IconButton icon="add" label="Create new label" size="sm" onClick={() => ui().set({ labelDialog: {}, navOpen: false })} />
        </div>
      ) : (
        <div className="mx-auto my-2 h-px w-8 bg-line" />
      )}
      {labels
        .filter((l) => !l.hidden)
        .map((l) => (
          <NavItem
            key={l.id}
            icon="label"
            fillIcon
            color={l.color}
            label={l.name}
            href={`label/${l.id}`}
            count={labelCounts[l.id]}
            active={isActive(route.view, { kind: "label", labelId: l.id })}
            collapsed={collapsed}
            mobile={mobile}
            onDropIds={(ids) => dropOn({ label: l.id }, ids)}
            menu={mobile ? undefined : <LabelMenu id={l.id} />}
          />
        ))}
      {mobile && (
        <>
          <div className="mx-7 my-2 h-px bg-line" />
          <NavItem icon="settings" label="Settings" href="settings/general" mobile />
          <button type="button" onClick={() => ui().set({ navOpen: false, shortcutsOpen: true })} className="mx-3 flex h-12 items-center gap-4 rounded-full pl-4 text-left font-sans text-sm text-fg hover:bg-hover">
            <Icon name="help" size={20} className="text-icon" />
            Help &amp; shortcuts
          </button>
        </>
      )}
    </nav>
  );
}

function ComposeButton({ collapsed }: { collapsed?: boolean }) {
  const btn = (
    <button
      type="button"
      onClick={() => actions.compose()}
      aria-label="Compose"
      className={cn(
        "flex h-14 items-center gap-3 rounded-2xl bg-compose font-sans text-sm font-medium text-on-compose transition-shadow hover:shadow-e2",
        collapsed ? "w-14 justify-center" : "min-w-[138px] pl-4 pr-6",
      )}
    >
      <Icon name="edit" size={24} />
      {!collapsed && "Compose"}
    </button>
  );
  return collapsed ? <Tip label="Compose" side="right" shortcut="c">{btn}</Tip> : btn;
}

export function Sidebar() {
  const pref = useMail((s) => s.settings.navCollapsed);
  const compactNav = useCompactNav();
  const hover = useUI((s) => s.navHover);
  const overlayOpen = useUI((s) => s.navOpen);
  const route = useRoute();
  const timer = useRef<number | undefined>(undefined);
  const collapsed = compactNav || pref;
  const floating = collapsed && (hover || (compactNav && overlayOpen));
  const expanded = !collapsed || floating;

  useEffect(() => {
    ui().set({ navOpen: false, navHover: false });
  }, [route.hash]);

  return (
    <div
      className={cn("no-print relative h-full shrink-0 transition-[width] duration-200", collapsed ? "w-[72px]" : "w-[256px]")}
      onMouseEnter={() => {
        if (!collapsed) return;
        timer.current = window.setTimeout(() => ui().set({ navHover: true }), 280);
      }}
      onMouseLeave={() => {
        clearTimeout(timer.current);
        ui().set({ navHover: false, navOpen: false });
      }}
    >
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-30 flex flex-col overflow-hidden bg-bg",
          expanded ? "w-[256px]" : "w-[72px]",
          floating && "rounded-r-2xl shadow-e2",
        )}
      >
        <div className={cn("shrink-0 pb-4 pt-2", expanded ? "pl-2" : "flex justify-center")}>
          <ComposeButton collapsed={!expanded} />
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4", expanded ? "pr-4" : "")}>
          <NavContent collapsed={!expanded} />
        </div>
      </aside>
    </div>
  );
}

export function MobileDrawer() {
  const open = useUI((s) => s.navOpen);
  const route = useRoute();
  const isMobile = useIsMobile();
  useEffect(() => {
    ui().set({ navOpen: false });
  }, [route.hash]);
  if (!open || !isMobile) return null;
  return (
    <div className="no-print fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-[var(--scrim)] animate-fade" onClick={() => ui().set({ navOpen: false })} />
      <aside className="safe-bottom absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col overflow-y-auto rounded-r-2xl bg-surface pb-4 shadow-e3 animate-slide-left">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Brand compact />
        </div>
        <NavContent mobile />
      </aside>
    </div>
  );
}
