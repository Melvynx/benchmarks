import { memo, useRef, useState, type ReactNode } from "react";
import { act } from "../lib/actions";
import { ME } from "../lib/contacts";
import { startThreadDrag } from "../lib/dnd";
import { formatListDate, formatScheduleLabel } from "../lib/format";
import {
  hasDraft,
  isUnread,
  lastMessage,
  participants,
  snippet,
  threadAttachments,
  threadDate,
  threadMessages,
} from "../lib/selectors";
import { useMail } from "../lib/store";
import type { Density, FolderId, Label, Thread } from "../lib/types";
import { useUI } from "../lib/ui";
import { cn } from "../lib/utils";
import { AttachmentChip } from "./Attachments";
import { ImportantButton, StarButton } from "./menus";
import { Avatar, Checkbox, Icon, IconButton, LabelChip } from "./ui";

export interface RowProps {
  thread: Thread;
  folder?: FolderId;
  currentLabel?: string;
  selected: boolean;
  focused: boolean;
  active: boolean;
  density: Density;
  layout: "line" | "stacked";
  showInboxChip: boolean;
  terms: string[];
  labels: Label[];
  swipe?: boolean;
  onOpen: (t: Thread) => void;
  onSelect: (t: Thread, e: React.MouseEvent | { shiftKey: boolean }) => void;
}

export function highlight(text: string, terms: string[]): ReactNode {
  if (!terms.length) return text;
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const parts = text.split(new RegExp(`(${esc})`, "gi"));
  return parts.map((p, i) =>
    i % 2 ? (
      <mark key={i} className="rounded-sm bg-[#fde293] text-inherit dark:bg-[#7a5c00]">
        {p}
      </mark>
    ) : (
      p
    ),
  );
}

export const MailRow = memo(function MailRow(props: RowProps) {
  const { thread: t, folder, selected, focused, active, density, layout, showInboxChip, terms, labels, currentLabel } = props;
  const messages = useMail((s) => s.messages);
  const openDialog = useUI((s) => s.openDialog);
  const now = useUI((s) => s.now);
  const selecting = useUI((s) => s.selected.length > 0);
  const press = useRef(0);
  const pressed = useRef(false);
  const unread = isUnread(t, messages);
  const p = participants(t, messages, folder);
  const draft = hasDraft(t, messages);
  const allDrafts = threadMessages(t, messages).every((m) => m.status === "draft");
  const date =
    folder === "snoozed" && t.snoozedUntil
      ? formatScheduleLabel(t.snoozedUntil, now)
      : folder === "scheduled"
        ? formatScheduleLabel(threadDate(t, messages, "scheduled"), now)
        : formatListDate(threadDate(t, messages, folder === "inbox" ? undefined : folder), now);
  const atts = density === "default" || layout === "stacked" ? threadAttachments(t, messages) : [];
  const chipLabels = t.labels.filter((l) => l !== currentLabel).map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[];
  const subj = t.subject || "(no subject)";
  const snip = snippet(t, messages);
  const last = lastMessage(t, messages);

  const openAtt = (i: number) => openDialog({ type: "attachment", attachments: atts, index: i, sender: last?.from.name });

  const drag = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      const sel = useUI.getState().selected;
      startThreadDrag(e, sel.includes(t.id) ? sel : [t.id]);
    },
  };

  const senderNode = (
    <>
      {draft && folder !== "drafts" && !allDrafts && (
        <>
          <span className="text-danger">Draft</span>
          <span>, </span>
        </>
      )}
      {folder === "drafts" ? (
        <>
          <span className="text-danger">Draft</span>
          {layout === "stacked" && p.text !== "(no recipients)" && <span className="font-normal text-fg-3"> · To: {p.text}</span>}
        </>
      ) : (
        <>
          {p.prefix && <span className="font-normal text-fg-3">{p.prefix}</span>}
          {p.parts
            ? p.parts.map((x, i) => (
                <span key={i} className={cn(unread && (x.unread || !p.parts!.some((y) => y.unread)) ? "font-bold" : "font-normal")}>
                  {i > 0 && ", "}
                  {highlight(x.name, terms)}
                </span>
              ))
            : highlight(p.text, terms)}
        </>
      )}
      {p.count > 0 && <span className="ml-1 text-xs font-normal text-fg-3">{p.count}</span>}
    </>
  );

  const bg = selected ? "bg-row-selected" : unread ? "bg-row-unread" : "bg-row-read";

  if (layout === "stacked") {
    const clearPress = () => window.clearTimeout(press.current);
    return (
      <SwipeRow enabled={!!props.swipe && !selecting} onSwipe={() => (t.inInbox && !t.trashed ? act.archive([t.id]) : act.trash([t.id]))} archive={t.inInbox && !t.trashed}>
        <div
          role="row"
          aria-selected={selected}
          data-thread={t.id}
          onClick={(e) => {
            if (pressed.current) {
              pressed.current = false;
              return;
            }
            if (e.metaKey || e.ctrlKey || (selecting && props.swipe)) props.onSelect(t, e);
            else props.onOpen(t);
          }}
          onTouchStart={() => {
            pressed.current = false;
            press.current = window.setTimeout(() => {
              pressed.current = true;
              navigator.vibrate?.(12);
              props.onSelect(t, { shiftKey: false });
            }, 480);
          }}
          onTouchMove={clearPress}
          onTouchEnd={clearPress}
          onTouchCancel={clearPress}
          onContextMenu={(e) => props.swipe && e.preventDefault()}
          {...drag}
          className={cn(
            "group relative flex cursor-pointer gap-3 border-b border-line-soft px-3 py-2.5 transition-colors sm:px-4",
            bg,
            active && !selected && "bg-accent-soft/60",
            focused && "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent",
          )}
        >
          <button
            type="button"
            aria-label={selected ? "Deselect conversation" : "Select conversation"}
            onClick={(e) => {
              e.stopPropagation();
              props.onSelect(t, e);
            }}
            className="relative mt-0.5 h-10 w-10 shrink-0"
          >
            {selected ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-primary">
                <Icon name="check" size={22} />
              </span>
            ) : (
              <Avatar name={folder === "sent" || folder === "drafts" ? ME.name : (last?.from.name ?? "")} email={last?.from.email ?? ""} />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn("min-w-0 flex-1 truncate text-[15px]", unread ? "font-bold text-fg" : "text-fg-2")}>{senderNode}</span>
              <span className={cn("shrink-0 text-xs", unread ? "font-bold text-fg" : "text-fg-3")}>{date}</span>
            </div>
            <div className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <div data-subject className={cn("truncate text-sm", unread ? "font-bold text-fg" : "text-fg-2")}>
                  {t.important && <Icon name="label_important" fill size={16} className="mr-1 inline-block align-[-3px] text-star" />}
                  {highlight(subj, terms)}
                </div>
                <div className="truncate text-sm text-fg-3">{highlight(snip, terms)}</div>
              </div>
              <StarButton starred={t.starred} onToggle={() => act.toggleStar([t.id])} className="-mr-1.5 -mt-2 h-9" />
            </div>
            {(chipLabels.length > 0 || atts.length > 0) && (
              <div className="mt-1.5 flex items-center gap-1.5 overflow-hidden">
                {chipLabels.slice(0, 2).map((l) => (
                  <LabelChip key={l.id} name={l.name} color={l.color} small />
                ))}
                {atts.slice(0, 1).map((a, i) => (
                  <AttachmentChip key={a.id} att={a} onOpen={() => openAtt(i)} />
                ))}
                {atts.length > 1 && <span className="text-xs font-medium text-fg-3">+{atts.length - 1}</span>}
              </div>
            )}
          </div>
        </div>
      </SwipeRow>
    );
  }

  const hoverActions =
    folder === "trash" ? (
      <>
        <IconButton icon="delete_forever" label="Delete forever" size="sm" onClick={(e) => (e.stopPropagation(), act.deleteForever([t.id]))} />
        <IconButton icon="restore_from_trash" label="Move to Inbox" size="sm" onClick={(e) => (e.stopPropagation(), act.moveToInbox([t.id]))} />
      </>
    ) : folder === "spam" ? (
      <>
        <IconButton icon="report_off" label="Not spam" size="sm" onClick={(e) => (e.stopPropagation(), act.notSpam([t.id]))} />
        <IconButton icon="delete_forever" label="Delete forever" size="sm" onClick={(e) => (e.stopPropagation(), act.deleteForever([t.id]))} />
      </>
    ) : (
      <>
        {t.inInbox ? (
          <IconButton icon="archive" label="Archive" size="sm" onClick={(e) => (e.stopPropagation(), act.archive([t.id]))} />
        ) : (
          <IconButton icon="move_to_inbox" label="Move to Inbox" size="sm" onClick={(e) => (e.stopPropagation(), act.moveToInbox([t.id]))} />
        )}
        <IconButton icon="delete" label="Delete" size="sm" onClick={(e) => (e.stopPropagation(), act.trash([t.id]))} />
        <IconButton
          icon={unread ? "drafts" : "mark_email_unread"}
          label={unread ? "Mark as read" : "Mark as unread"}
          size="sm"
          onClick={(e) => (e.stopPropagation(), act.setRead([t.id], unread))}
        />
        {t.snoozedUntil ? (
          <IconButton icon="alarm_off" label="Unsnooze" size="sm" onClick={(e) => (e.stopPropagation(), act.unsnooze([t.id]))} />
        ) : (
          <IconButton
            icon="schedule"
            label="Snooze until tomorrow 8:00 AM"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              const d = new Date();
              d.setDate(d.getDate() + 1);
              d.setHours(8, 0, 0, 0);
              act.snooze([t.id], d.getTime());
            }}
          />
        )}
      </>
    );

  const tall = density === "default" && atts.length > 0;
  return (
    <div
      role="row"
      aria-selected={selected}
      data-thread={t.id}
      onClick={(e) => (e.metaKey || e.ctrlKey ? props.onSelect(t, e) : props.onOpen(t))}
      {...drag}
      className={cn(
        "group relative flex cursor-pointer border-b border-line-soft pl-2 pr-4 transition-shadow hover:z-[2] hover:shadow-row",
        bg,
        active && !selected && "bg-accent-soft/70",
        focused && "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent",
      )}
    >
      <span className="pointer-events-none absolute left-0 top-0 flex h-10 w-2 items-center opacity-0 group-hover:opacity-60">
        <Icon name="drag_indicator" size={14} className="-ml-[3px] text-fg-3" />
      </span>
      <div className={cn("flex shrink-0 items-center", density === "compact" ? "h-8" : "h-10")}>
        <Checkbox checked={selected} label="Select" onChange={(e) => props.onSelect(t, e)} className={density === "compact" ? "h-8 w-8" : ""} />
        <StarButton starred={t.starred} onToggle={() => act.toggleStar([t.id])} className={density === "compact" ? "h-8" : ""} />
        <ImportantButton important={t.important} onToggle={() => act.setImportant([t.id], !t.important)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center", density === "compact" ? "h-8" : "h-10")}>
          <div className={cn("w-[200px] shrink-0 truncate pr-6 text-sm xl:w-[216px]", unread ? "text-fg" : "text-fg-2")}>{senderNode}</div>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            {showInboxChip && t.inInbox && !t.trashed && !t.spam && (
              <span className="inline-flex h-[18px] shrink-0 items-center rounded bg-[#ddd] px-1.5 text-[11.5px] font-medium text-[#444] dark:bg-[#444746] dark:text-[#e3e3e3]">
                Inbox
              </span>
            )}
            {chipLabels.map((l) => (
              <LabelChip key={l.id} name={l.name} color={l.color} small />
            ))}
            <span className="min-w-0 truncate">
              <span data-subject className={unread ? "font-bold text-fg" : "text-fg-2"}>{highlight(subj, terms)}</span>
              {snip && <span className="text-fg-3"> - {highlight(snip, terms)}</span>}
            </span>
          </div>
          <div
            className={cn(
              "ml-4 w-[76px] shrink-0 text-right text-xs group-hover:invisible",
              unread ? "font-bold text-fg" : "text-fg-3",
              (folder === "snoozed" || folder === "scheduled") && "w-[128px] text-[#b3261e] dark:text-[#f2b8b5]",
            )}
          >
            {date}
          </div>
        </div>
        {tall && (
          <div className="-mt-1 flex items-center gap-2 pb-2.5 pl-[200px] xl:pl-[216px]">
            {atts.slice(0, 3).map((a, i) => (
              <AttachmentChip key={a.id} att={a} onOpen={() => openAtt(i)} />
            ))}
            {atts.length > 3 && (
              <span className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[13px] font-medium text-fg-2">+{atts.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <div className={cn("absolute right-2 top-0 hidden items-center gap-0.5 group-hover:flex", density === "compact" ? "h-8" : "h-10")}>{hoverActions}</div>
    </div>
  );
});

function SwipeRow({ children, enabled, onSwipe, archive }: { children: ReactNode; enabled: boolean; onSwipe: () => void; archive: boolean }) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; id: number; locked?: "x" | "y" } | null>(null);
  const width = useRef(1);
  if (!enabled) return <>{children}</>;
  const past = Math.abs(dx) > width.current * 0.33;
  return (
    <div
      className="relative overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => {
        if (e.pointerType !== "touch") return;
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        width.current = e.currentTarget.offsetWidth;
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        const mx = e.clientX - s.x;
        const my = e.clientY - s.y;
        if (!s.locked && (Math.abs(mx) > 10 || Math.abs(my) > 10)) s.locked = Math.abs(mx) > Math.abs(my) ? "x" : "y";
        if (s.locked === "x") setDx(mx);
      }}
      onPointerUp={() => {
        const s = start.current;
        start.current = null;
        if (!s || s.locked !== "x") return setDx(0);
        if (past) {
          setLeaving(true);
          setDx(dx > 0 ? width.current : -width.current);
          window.setTimeout(onSwipe, 180);
        } else setDx(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDx(0);
      }}
      onClickCapture={(e) => {
        if (Math.abs(dx) > 4) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {dx !== 0 && (
        <div
          className={cn(
            "absolute inset-0 flex items-center px-6 text-white transition-colors",
            dx > 0 ? "justify-start" : "justify-end",
            past ? (archive ? "bg-[#188038]" : "bg-[#d93025]") : "bg-[#5f6368]",
          )}
        >
          <Icon name={archive ? "archive" : "delete"} size={24} />
        </div>
      )}
      <div
        style={{ transform: `translateX(${dx}px)`, transition: start.current && !leaving ? "none" : "transform .18s ease-out" }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
