import { useRef, useState } from "react";
import { openNewCompose } from "../lib/actions";
import { canDropOn, dropOn, hasThreadData, readThreadData, type DropTarget } from "../lib/dnd";
import { useCounts, useRoute } from "../lib/hooks";
import { navigate, viewHash } from "../lib/router";
import { FOLDER_META } from "../lib/selectors";
import { useMail } from "../lib/store";
import type { FolderId, Label, LabelColor, View } from "../lib/types";
import { useUI } from "../lib/ui";
import { cn, LABEL_COLORS } from "../lib/utils";
import { Logo } from "./TopBar";
import { Icon, IconButton, MenuDivider, MenuItem, Popover, useMenu } from "./ui";

const PRIMARY: FolderId[] = ["inbox", "starred", "snoozed", "sent", "drafts"];
const MORE: FolderId[] = ["important", "scheduled", "all", "spam", "trash"];

export function ComposeButton({ collapsed }: { collapsed?: boolean }) {
  const setNavOpen = useUI((s) => s.setNavOpen);
  return (
    <button
      type="button"
      onClick={() => {
        setNavOpen(false);
        openNewCompose();
      }}
      data-tip={collapsed ? "Compose" : undefined}
      aria-label="Compose"
      className={cn(
        "flex h-14 shrink-0 items-center rounded-2xl bg-compose text-on-compose transition-shadow hover:shadow-[0_1px_3px_rgba(0,0,0,.3),0_4px_8px_3px_rgba(0,0,0,.15)]",
        collapsed ? "w-14 justify-center" : "gap-3 pl-4 pr-6",
      )}
    >
      <Icon name="edit" size={24} />
      {!collapsed && <span className="text-sm font-medium">Compose</span>}
    </button>
  );
}

export function SidebarContent({ collapsed = false, showLogo = false }: { collapsed?: boolean; showLogo?: boolean }) {
  const route = useRoute();
  const counts = useCounts();
  const labels = useMail((s) => s.labels);
  const [moreOpen, setMoreOpen] = useState(() => MORE.some((f) => route.view.kind === "folder" && route.view.id === f));
  const openDialog = useUI((s) => s.openDialog);
  const current = route.view;
  const currentLabel = current.kind === "label" ? current.id : undefined;

  const isActive = (v: View) => {
    if (v.kind === "folder" && v.id === "inbox") return current.kind === "category" || (current.kind === "folder" && current.id === "inbox");
    if (v.kind !== current.kind) return false;
    return (v as { id: string }).id === (current as { id: string }).id;
  };

  const countFor = (f: FolderId) =>
    f === "inbox" ? counts.inbox : f === "drafts" ? counts.drafts : f === "spam" ? counts.spam : f === "scheduled" ? counts.scheduled : 0;

  const renderFolder = (f: FolderId) => (
    <NavItem
      key={f}
      icon={FOLDER_META[f].icon}
      label={FOLDER_META[f].name}
      count={countFor(f)}
      strongCount={f === "inbox" || f === "spam"}
      view={{ kind: "folder", id: f }}
      active={isActive({ kind: "folder", id: f })}
      collapsed={collapsed}
      drop={{ kind: "folder", id: f }}
      currentLabel={currentLabel}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showLogo && (
        <div className="flex h-16 shrink-0 items-center px-5">
          <Logo />
        </div>
      )}
      <div className={cn("shrink-0 pb-4 pt-2", collapsed ? "pl-2" : "pl-2")}>
        <ComposeButton collapsed={collapsed} />
      </div>
      <nav aria-label="Mailboxes" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-6 pr-2">
        <ul>{PRIMARY.map(renderFolder)}</ul>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="flex h-8 w-full items-center gap-[18px] rounded-r-full pl-[26px] text-sm text-fg hover:bg-hover"
          >
            <Icon name={moreOpen ? "expand_less" : "expand_more"} />
            {moreOpen ? "Less" : "More"}
          </button>
        )}
        {(moreOpen || collapsed) && <ul>{MORE.map(renderFolder)}</ul>}

        {!collapsed && (
          <div className="mt-4 flex h-10 items-center justify-between pl-[26px] pr-2">
            <h2 className="font-display text-base font-medium text-fg">Labels</h2>
            <IconButton icon="add" label="Create new label" size="sm" onClick={() => openDialog({ type: "createLabel" })} />
          </div>
        )}
        {collapsed && <div className="mx-4 my-2 h-px bg-line" />}
        <ul>
          {labels.map((l) => (
            <LabelItem
              key={l.id}
              label={l}
              count={counts.labels[l.id] ?? 0}
              active={isActive({ kind: "label", id: l.id })}
              collapsed={collapsed}
              currentLabel={currentLabel}
            />
          ))}
        </ul>
        {showLogo && (
          <div className="mt-3 border-t border-line-soft pt-3">
            <button
              type="button"
              onClick={() => {
                useUI.getState().setNavOpen(false);
                useUI.getState().setSettingsOpen(true);
              }}
              className="flex h-10 w-full items-center gap-[18px] rounded-r-full pl-[26px] text-sm text-fg hover:bg-hover"
            >
              <Icon name="settings" /> Settings
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}

function NavItem({
  icon,
  label,
  count,
  strongCount,
  view,
  active,
  collapsed,
  drop,
  currentLabel,
  iconColor,
  trailing,
}: {
  icon: string;
  label: string;
  count: number;
  strongCount?: boolean;
  view: View;
  active: boolean;
  collapsed: boolean;
  drop?: DropTarget;
  currentLabel?: string;
  iconColor?: string;
  trailing?: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  const setNavOpen = useUI((s) => s.setNavOpen);
  const droppable = drop && canDropOn(drop);
  const href = viewHash(view);
  return (
    <li className="group/nav relative">
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          useUI.getState().clearSelection();
          setNavOpen(false);
          navigate(href);
        }}
        onDragOver={(e) => {
          if (!droppable || !hasThreadData(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          if (!droppable) return;
          e.preventDefault();
          dropOn(drop!, readThreadData(e), currentLabel);
        }}
        aria-current={active ? "page" : undefined}
        data-tip={collapsed ? (count ? `${label} (${count})` : label) : undefined}
        className={cn(
          "relative flex h-8 items-center text-sm transition-colors",
          collapsed ? "ml-2 w-14 justify-center rounded-full" : "gap-[18px] rounded-r-full pl-[26px] pr-3",
          active ? "bg-accent-soft font-bold text-on-accent-soft" : "text-fg hover:bg-hover",
          over && "bg-accent-soft ring-2 ring-accent ring-inset",
          !active && count > 0 && strongCount && "font-bold",
        )}
      >
        <Icon name={icon} size={20} fill={active && icon !== "label"} style={iconColor ? { color: iconColor } : undefined} />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
        {!collapsed && count > 0 && (
          <span className={cn("text-xs", strongCount || active ? "font-bold" : "font-medium", !!trailing && "group-hover/nav:invisible")}>
            {count.toLocaleString()}
          </span>
        )}
        {collapsed && count > 0 && strongCount && (
          <span className="absolute right-0.5 top-0 rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white dark:text-[#1f1f1f]">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </a>
      {trailing && !collapsed && <div className="absolute right-1 top-0 hidden h-8 items-center group-hover/nav:flex has-[[aria-expanded=true]]:flex">{trailing}</div>}
    </li>
  );
}

function LabelItem({
  label,
  count,
  active,
  collapsed,
  currentLabel,
}: {
  label: Label;
  count: number;
  active: boolean;
  collapsed: boolean;
  currentLabel?: string;
}) {
  const menu = useMenu();
  const updateLabel = useMail((s) => s.updateLabel);
  const deleteLabel = useMail((s) => s.deleteLabel);
  const openDialog = useUI((s) => s.openDialog);
  const showToast = useUI((s) => s.showToast);
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  return (
    <NavItem
      icon="label"
      iconColor={LABEL_COLORS[label.color].dot}
      label={label.name}
      count={count}
      view={{ kind: "label", id: label.id }}
      active={active}
      collapsed={collapsed}
      drop={{ kind: "label", id: label.id }}
      currentLabel={currentLabel}
      trailing={
        <>
          <IconButton
            ref={menu.ref}
            icon="more_vert"
            label={`Options for ${label.name}`}
            size="sm"
            aria-expanded={menu.open}
            onClick={(e) => {
              e.stopPropagation();
              menu.toggle();
            }}
          />
          <Popover anchor={menu.ref.current} open={menu.open} onClose={() => (setColorOpen(false), menu.close())} align="start" className="w-56">
            <div ref={colorRef}>
              <MenuItem icon="palette" label="Label color" trailing={<Icon name="chevron_right" className="text-fg-3" />} onClick={() => setColorOpen((o) => !o)} />
            </div>
            {colorOpen && (
              <div className="grid grid-cols-5 gap-2 px-4 py-2">
                {(Object.keys(LABEL_COLORS) as LabelColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={LABEL_COLORS[c].name}
                    data-tip={LABEL_COLORS[c].name}
                    onClick={() => {
                      updateLabel(label.id, { color: c });
                      menu.close();
                      setColorOpen(false);
                    }}
                    className={cn("flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-raised hover:scale-110", label.color === c && "ring-2 ring-fg-3")}
                    style={{ background: LABEL_COLORS[c].dot }}
                  >
                    {label.color === c && <Icon name="check" size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
            <MenuDivider />
            <MenuItem
              icon="edit"
              label="Edit"
              onClick={() => {
                menu.close();
                openDialog({ type: "editLabel", id: label.id });
              }}
            />
            <MenuItem
              icon="search"
              label="Search this label"
              onClick={() => {
                menu.close();
                navigate(`#search/${encodeURIComponent(`label:${label.name.toLowerCase().replace(/\s+/g, "-")}`)}`);
              }}
            />
            <MenuItem
              icon="delete"
              label="Remove label"
              onClick={() => {
                menu.close();
                openDialog({
                  type: "confirm",
                  title: "Remove label",
                  body: `Delete the label "${label.name}"? Conversations with this label will not be deleted.`,
                  confirmLabel: "Delete",
                  danger: true,
                  onConfirm: () => {
                    deleteLabel(label.id);
                    if (active) navigate("#inbox");
                    showToast({ message: `Label "${label.name}" deleted.` });
                  },
                });
              }}
            />
          </Popover>
        </>
      }
    />
  );
}

export function Sidebar({ forceCollapsed }: { forceCollapsed?: boolean }) {
  const collapsed = useMail((s) => s.settings.sidebarCollapsed) || !!forceCollapsed;
  const [hover, setHover] = useState(false);
  const timer = useRef(0);
  const expanded = !collapsed || hover;
  return (
    <aside
      className={cn("relative shrink-0 transition-[width] duration-200", collapsed ? "w-[72px]" : "w-[256px]")}
      onMouseEnter={() => {
        if (!collapsed) return;
        timer.current = window.setTimeout(() => setHover(true), 250);
      }}
      onMouseLeave={() => {
        window.clearTimeout(timer.current);
        setHover(false);
      }}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-30 flex flex-col bg-app transition-[width,box-shadow] duration-200",
          expanded ? "w-[256px]" : "w-[72px]",
          collapsed && hover && "rounded-r-2xl shadow-pop",
        )}
      >
        <SidebarContent collapsed={!expanded} />
      </div>
    </aside>
  );
}

export function MobileDrawer() {
  const open = useUI((s) => s.navOpen);
  const setNavOpen = useUI((s) => s.setNavOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[700]" role="dialog" aria-modal aria-label="Navigation">
      <div className="animate-fade absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
      <div className="animate-drawer absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col rounded-r-2xl bg-app pb-[env(safe-area-inset-bottom)] shadow-compose">
        <SidebarContent showLogo />
      </div>
    </div>
  );
}
