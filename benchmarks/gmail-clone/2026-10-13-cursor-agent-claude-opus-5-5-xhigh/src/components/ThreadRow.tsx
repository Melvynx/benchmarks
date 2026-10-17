import { memo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent } from "react";
import type { Attachment, Density, Message, SystemFolder, Thread, UserLabel } from "../lib/types";
import { listDate } from "../lib/date";
import { cn, colorFor, initials } from "../lib/utils";
import { actions } from "../lib/actions";
import { ui } from "../lib/ui";
import type { Participant } from "../lib/selectors";
import { Icon, IconButton, LabelChip, Tip } from "./ui";
import { SnoozePicker } from "./ThreadActions";
import { KIND_ICON } from "./attachmentMeta";
import { THREAD_DRAG_TYPE } from "./Sidebar";

export interface RowData {
  thread: Thread;
  parts: Participant[];
  count: number;
  snippet: string;
  date: number;
  attachments: (Attachment & { messageId: string })[];
  labels: UserLabel[];
  inboxChip: boolean;
  firstFrom: Message["from"] | null;
}

function Senders({ parts, count, unread }: { parts: Participant[]; count: number; unread: boolean }) {
  return (
    <span className="flex min-w-0 items-baseline truncate">
      <span className="truncate">
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span className={unread ? "font-bold" : ""}>, </span>}
            <span className={cn(p.draft && "text-danger", p.unread && "font-bold")}>{p.label}</span>
          </span>
        ))}
      </span>
      {count > 0 && <span className="ml-1 shrink-0 text-xs font-normal text-fg-3">{count}</span>}
    </span>
  );
}

function AttachmentChips({ atts, max, onOpen }: { atts: RowData["attachments"]; max: number; onOpen: (a: RowData["attachments"][number]) => void }) {
  if (!atts.length) return null;
  const shown = atts.slice(0, max);
  return (
    <div className="flex min-w-0 items-center gap-2">
      {shown.map((a) => {
        const k = KIND_ICON[a.kind];
        return (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(a);
            }}
            className="flex h-7 min-w-0 max-w-[180px] items-center gap-2 rounded-full border border-outline-soft bg-surface px-2.5 font-body text-[13px] text-fg-2 hover:bg-surface-2"
          >
            <Icon name={k.icon} size={16} style={{ color: k.color }} />
            <span className="truncate">{a.name}</span>
          </button>
        );
      })}
      {atts.length > max && <span className="flex h-7 items-center rounded-full border border-outline-soft px-2.5 font-body text-[13px] text-fg-2">+{atts.length - max}</span>}
    </div>
  );
}

const openAttachment = (a: RowData["attachments"][number]) => ui().set({ preview: { messageId: a.messageId, attachmentId: a.id } });

function startDrag(e: DragEvent, ids: string[]) {
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData(THREAD_DRAG_TYPE, JSON.stringify(ids));
  e.dataTransfer.setData("text/plain", `${ids.length} conversation${ids.length === 1 ? "" : "s"}`);
  const ghost = document.createElement("div");
  ghost.textContent = `Move ${ids.length} conversation${ids.length === 1 ? "" : "s"}`;
  ghost.style.cssText = "position:fixed;top:-100px;left:-100px;padding:8px 14px;border-radius:8px;background:#0b57d0;color:#fff;font:500 13px 'Google Sans',sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3)";
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, -12, -8);
  setTimeout(() => ghost.remove(), 0);
}

interface RowProps {
  row: RowData;
  selected: boolean;
  focused: boolean;
  density: Density;
  folder?: SystemFolder;
  narrow: boolean;
  showSnippet: boolean;
  showChips: boolean;
  hoverActions: boolean;
  markers: boolean;
  dragIds: () => string[];
  onOpen: () => void;
  onToggle: (shift: boolean) => void;
}

export const ThreadRow = memo(function ThreadRow({ row, selected, focused, density, folder, narrow, showSnippet, showChips, hoverActions, markers, dragIds, onOpen, onToggle }: RowProps) {
  const t = row.thread;
  const unread = t.unread;
  const important = t.labels.includes("IMPORTANT");
  const trashed = t.labels.includes("TRASH");
  const h = density === "compact" ? "h-8" : density === "comfortable" ? "h-12" : "h-10";
  const chips = showChips && density === "default" && row.attachments.length > 0;
  const date = listDate(row.date);

  const actionsEl = hoverActions && (
    <div className="absolute right-2 top-0 hidden items-center bg-inherit group-hover:flex" style={{ height: density === "compact" ? 32 : density === "comfortable" ? 48 : 40 }} onClick={(e) => e.stopPropagation()}>
      {trashed ? (
        <>
          <IconButton size="sm" icon="move_to_inbox" label="Move to Inbox" onClick={() => actions.moveToInbox([t.id])} />
          <IconButton size="sm" icon="delete_forever" label="Delete forever" onClick={() => actions.deleteForever([t.id])} />
        </>
      ) : (
        <>
          {t.labels.includes("INBOX") || folder === "inbox" ? (
            <IconButton size="sm" icon="archive" label="Archive" onClick={() => actions.archive([t.id])} />
          ) : (
            <IconButton size="sm" icon="move_to_inbox" label="Move to Inbox" onClick={() => actions.moveToInbox([t.id])} />
          )}
          <IconButton size="sm" icon="delete" label="Delete" onClick={() => actions.trash([t.id])} />
          <IconButton size="sm" icon={unread ? "mark_email_read" : "mark_email_unread"} label={unread ? "Mark as read" : "Mark as unread"} onClick={() => actions.markRead([t.id], unread)} />
          <SnoozePicker ids={[t.id]} size="sm" />
        </>
      )}
    </div>
  );

  return (
    <div
      role="row"
      aria-selected={selected}
      data-thread-id={t.id}
      draggable
      onDragStart={(e) => startDrag(e, dragIds())}
      onClick={onOpen}
      className={cn(
        "row-hover group relative flex cursor-pointer border-b border-line font-body text-sm",
        selected ? "bg-row-selected" : unread ? "bg-row-unread" : "bg-row-read",
        focused && "before:absolute before:inset-y-0 before:left-0 before:z-[3] before:w-[3px] before:bg-primary",
      )}
    >
      <div className={cn("flex shrink-0 items-center pl-1", h)} onClick={(e) => e.stopPropagation()}>
        <Icon name="drag_indicator" size={18} className="cursor-grab text-fg-3 opacity-0 group-hover:opacity-60" />
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={selected ? "Deselect conversation" : "Select conversation"}
          onClick={(e) => onToggle(e.shiftKey)}
          className={cn("inline-flex size-8 items-center justify-center rounded-full hover:bg-hover", selected ? "text-fg" : "text-fg-3")}
        >
          <Icon name={selected ? "check_box" : "check_box_outline_blank"} fill={selected} size={20} />
        </button>
        <Tip label={t.starred ? "Starred" : "Not starred"}>
          <button
            type="button"
            aria-label={t.starred ? "Remove star" : "Add star"}
            aria-pressed={t.starred}
            onClick={() => actions.star([t.id], !t.starred)}
            className={cn("inline-flex size-8 items-center justify-center rounded-full hover:bg-hover", t.starred ? "text-star" : "text-fg-3")}
          >
            <Icon name="star" fill={t.starred} size={20} />
          </button>
        </Tip>
        {markers && !narrow && (
          <Tip label={important ? "Important because you marked it as important." : "Click to teach the inbox this conversation is important."}>
            <button
              type="button"
              aria-label={important ? "Mark as not important" : "Mark as important"}
              aria-pressed={important}
              onClick={() => actions.important([t.id], !important)}
              className={cn("inline-flex size-8 items-center justify-center rounded-full hover:bg-hover", important ? "text-[var(--important)]" : "text-fg-3")}
            >
              <Icon name="label_important" fill={important} size={20} />
            </button>
          </Tip>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col pr-4">
        {narrow ? (
          <div className="flex min-w-0 flex-col justify-center gap-0.5 py-2 pl-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <div className={cn("min-w-0 flex-1", unread ? "text-fg" : "text-fg-2")}>
                <Senders parts={row.parts} count={row.count} unread={unread} />
              </div>
              <span className={cn("shrink-0 text-xs", unread ? "font-bold text-fg" : "text-fg-3", hoverActions && "group-hover:invisible")}>{date}</span>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              {row.labels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} small />)}
              <span data-subject className={cn("truncate", unread ? "font-bold text-fg" : "text-fg-2")}>{t.subject || "(no subject)"}</span>
            </div>
            {showSnippet && <div className="truncate text-fg-3">{row.snippet}</div>}
            {chips && <div className="pt-1"><AttachmentChips atts={row.attachments} max={1} onOpen={openAttachment} /></div>}
          </div>
        ) : (
          <>
            <div className={cn("flex min-w-0 items-center", h)}>
              <div className={cn("w-[200px] shrink-0 pr-6 max-[1199px]:w-[160px]", unread ? "text-fg" : "text-fg-2")}>
                <Senders parts={row.parts} count={row.count} unread={unread} />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1 pr-3">
                {row.inboxChip && <LabelChip name="Inbox" color="#8e918f" small />}
                {row.labels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} small />)}
                {t.muted && <LabelChip name="Muted" color="#8e918f" small />}
                <span className="min-w-0 truncate">
                  <span data-subject className={unread ? "font-bold text-fg" : "text-fg"}>{t.subject || "(no subject)"}</span>
                  {showSnippet && row.snippet && <span className="text-fg-3"> - {row.snippet}</span>}
                </span>
              </div>
              <span className={cn("w-[72px] shrink-0 text-right text-xs", unread ? "font-bold text-fg" : "text-fg-3", hoverActions && "group-hover:invisible")}>
                {folder === "scheduled" || folder === "snoozed" ? (
                  <span className="inline-flex items-center gap-1">
                    <Icon name={folder === "scheduled" ? "schedule_send" : "schedule"} size={14} />
                    {date}
                  </span>
                ) : (
                  date
                )}
              </span>
            </div>
            {chips && (
              <div className="-mt-1 pb-2 pl-[200px] max-[1199px]:pl-[160px]">
                <AttachmentChips atts={row.attachments} max={3} onOpen={openAttachment} />
              </div>
            )}
          </>
        )}
      </div>
      {actionsEl}
    </div>
  );
});

interface MobileRowProps {
  row: RowData;
  selected: boolean;
  selecting: boolean;
  showSnippet: boolean;
  swipe: "archive" | "trash" | "read" | "none";
  onOpen: () => void;
  onToggle: () => void;
}

const SWIPE_META = {
  archive: { icon: "archive", color: "#188038", run: (id: string) => actions.archive([id]) },
  trash: { icon: "delete", color: "#d93025", run: (id: string) => actions.trash([id]) },
  read: { icon: "mark_email_read", color: "#0b57d0", run: (id: string) => actions.markRead([id], true) },
} as const;

export const MobileRow = memo(function MobileRow({ row, selected, selecting, showSnippet, swipe, onOpen, onToggle }: MobileRowProps) {
  const t = row.thread;
  const unread = t.unread;
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; active: boolean; locked: boolean } | null>(null);
  const press = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  const from = row.firstFrom;
  const avatarName = from?.name || from?.email || "?";
  const color = colorFor(from?.email || avatarName);

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, active: false, locked: false };
    longPressed.current = false;
    press.current = window.setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(10);
      onToggle();
    }, 480);
  };
  const onPointerMove = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (Math.abs(mx) > 8 || Math.abs(my) > 8) clearTimeout(press.current);
    if (!s.locked && (Math.abs(mx) > 10 || Math.abs(my) > 10)) {
      s.locked = true;
      s.active = swipe !== "none" && !selecting && Math.abs(mx) > Math.abs(my) * 1.4;
    }
    if (s.active) setDx(mx);
  };
  const onPointerUp = (e: PointerEvent) => {
    clearTimeout(press.current);
    const s = start.current;
    start.current = null;
    if (s?.active) {
      const w = (e.currentTarget as HTMLElement).clientWidth;
      if (Math.abs(dx) > w * 0.33 && swipe !== "none") {
        setDx(dx > 0 ? w : -w);
        setTimeout(() => SWIPE_META[swipe].run(t.id), 160);
      } else setDx(0);
    }
  };
  const meta = swipe !== "none" ? SWIPE_META[swipe] : null;

  return (
    <div className="relative overflow-hidden" data-thread-id={t.id}>
      {meta && dx !== 0 && (
        <div className={cn("absolute inset-0 flex items-center px-6 text-white", dx > 0 ? "justify-start" : "justify-end")} style={{ background: meta.color }}>
          <Icon name={meta.icon} size={24} />
        </div>
      )}
      <div
        role="row"
        aria-selected={selected}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          clearTimeout(press.current);
          start.current = null;
          setDx(0);
        }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e: MouseEvent) => {
          if (longPressed.current || dx !== 0) return;
          e.preventDefault();
          if (selecting) onToggle();
          else onOpen();
        }}
        className={cn("relative flex touch-pan-y select-none gap-3 px-4 py-3 font-body", selected ? "bg-row-selected" : "bg-surface")}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: start.current ? "none" : "transform .18s ease-out" } as CSSProperties}
      >
        <button
          type="button"
          aria-label={selected ? "Deselect" : "Select"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full font-sans text-lg font-medium text-white"
          style={{ background: selected ? "var(--primary)" : color }}
        >
          {selected ? <Icon name="check" size={22} className="text-on-primary" /> : initials(avatarName)}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className={cn("min-w-0 flex-1 text-base", unread ? "text-fg" : "text-fg-2")}>
              <Senders parts={row.parts} count={row.count} unread={unread} />
            </div>
            <span className={cn("shrink-0 text-xs", unread ? "font-bold text-fg" : "text-fg-3")}>{listDate(row.date)}</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1">
                {t.labels.includes("IMPORTANT") && <Icon name="label_important" fill size={16} className="text-[var(--important)]" />}
                <span data-subject className={cn("truncate text-sm", unread ? "font-bold text-fg" : "text-fg-2")}>{t.subject || "(no subject)"}</span>
              </div>
              {showSnippet && <div className="line-clamp-1 text-sm text-fg-3">{row.snippet}</div>}
              {row.labels.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {row.labels.slice(0, 3).map((l) => <LabelChip key={l.id} name={l.name} color={l.color} small />)}
                </div>
              )}
              {row.attachments.length > 0 && <div className="mt-1.5"><AttachmentChips atts={row.attachments} max={1} onOpen={openAttachment} /></div>}
            </div>
            <button
              type="button"
              aria-label={t.starred ? "Remove star" : "Add star"}
              aria-pressed={t.starred}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                actions.star([t.id], !t.starred);
              }}
              className={cn("-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full", t.starred ? "text-star" : "text-fg-3")}
            >
              <Icon name="star" fill={t.starred} size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
