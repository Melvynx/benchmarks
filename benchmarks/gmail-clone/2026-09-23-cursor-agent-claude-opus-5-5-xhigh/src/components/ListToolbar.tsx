import { useState } from "react";
import { act } from "../lib/actions";
import { isUnread } from "../lib/selectors";
import { useMail } from "../lib/store";
import type { Category, FolderId, Thread } from "../lib/types";
import { useUI } from "../lib/ui";
import { cn } from "../lib/utils";
import { LabelMenuButton, MoveMenuButton, SnoozeMenuButton } from "./menus";
import { Icon, IconButton, MenuDivider, MenuItem, Popover, useMenu } from "./ui";
import { CATEGORY_META } from "../lib/selectors";

export function ListToolbar({
  pageThreads,
  allThreads,
  folder,
  currentLabel,
  range,
  onPrev,
  onNext,
  compact,
}: {
  pageThreads: Thread[];
  allThreads: Thread[];
  folder?: FolderId;
  currentLabel?: string;
  range: { start: number; end: number; total: number };
  onPrev?: () => void;
  onNext?: () => void;
  compact?: boolean;
}) {
  const selected = useUI((s) => s.selected);
  const setSelected = useUI((s) => s.setSelected);
  const messages = useMail((s) => s.messages);
  const threads = useMail((s) => s.threads);
  const deliverNext = useMail((s) => s.deliverNext);
  const showToast = useUI((s) => s.showToast);
  const selectMenu = useMenu();
  const moreMenu = useMenu();
  const [refreshing, setRefreshing] = useState(false);

  const ids = selected.filter((id) => threads[id]);
  const pageIds = pageThreads.map((t) => t.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => ids.includes(id));
  const some = ids.length > 0 && !allOnPage;
  const anyUnread = ids.some((id) => threads[id] && isUnread(threads[id], messages));
  const anyStarred = ids.some((id) => threads[id]?.starred);
  const anyImportant = ids.some((id) => threads[id]?.important);
  const allSnoozed = ids.length > 0 && ids.every((id) => threads[id]?.snoozedUntil);

  const selectBy = (fn: (t: Thread) => boolean) => {
    setSelected(pageThreads.filter(fn).map((t) => t.id));
    selectMenu.close();
  };

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      const got = deliverNext();
      setRefreshing(false);
      if (got.length) showToast({ message: `New message from ${got[0].from.name}.`, duration: 4000 });
    }, 650);
  };

  const hasSel = ids.length > 0;
  const btn = compact ? "sm" : "md";

  return (
    <div className="flex h-12 shrink-0 items-center gap-0.5 pl-2 pr-2 sm:pl-3">
      <div className="flex items-center rounded hover:bg-hover">
        <button
          type="button"
          role="checkbox"
          aria-checked={some ? "mixed" : allOnPage}
          aria-label="Select"
          data-tip="Select"
          onClick={() => setSelected(allOnPage || some ? [] : pageIds)}
          className="flex h-9 w-8 items-center justify-center"
        >
          <Icon
            name={some ? "indeterminate_check_box" : allOnPage ? "check_box" : "check_box_outline_blank"}
            fill={some || allOnPage}
            className={some || allOnPage ? "text-fg" : "text-fg-3"}
          />
        </button>
        <button ref={selectMenu.ref} type="button" aria-label="Select options" onClick={selectMenu.toggle} className="flex h-9 w-4 items-center justify-center">
          <Icon name="arrow_drop_down" size={18} className="-ml-1 text-fg-3" />
        </button>
      </div>
      <Popover anchor={selectMenu.ref.current} open={selectMenu.open} onClose={selectMenu.close} className="w-44">
        <MenuItem label="All" onClick={() => selectBy(() => true)} />
        <MenuItem label="None" onClick={() => selectBy(() => false)} />
        <MenuItem label="Read" onClick={() => selectBy((t) => !isUnread(t, messages))} />
        <MenuItem label="Unread" onClick={() => selectBy((t) => isUnread(t, messages))} />
        <MenuItem label="Starred" onClick={() => selectBy((t) => t.starred)} />
        <MenuItem label="Unstarred" onClick={() => selectBy((t) => !t.starred)} />
      </Popover>

      {!hasSel ? (
        <>
          <IconButton
            icon="refresh"
            label="Refresh"
            size={btn}
            onClick={refresh}
            iconClassName={refreshing ? "animate-spin-slow" : ""}
          />
          <IconButton ref={moreMenu.ref} icon="more_vert" label="More" size={btn} onClick={moreMenu.toggle} active={moreMenu.open} />
          <Popover anchor={moreMenu.ref.current} open={moreMenu.open} onClose={moreMenu.close} className="w-56">
            <MenuItem
              icon="done_all"
              label="Mark all as read"
              disabled={!allThreads.some((t) => isUnread(t, messages))}
              onClick={() => {
                moreMenu.close();
                act.setRead(
                  allThreads.filter((t) => isUnread(t, messages)).map((t) => t.id),
                  true,
                );
              }}
            />
            <MenuItem
              icon="select_all"
              label={`Select all ${allThreads.length}`}
              disabled={!allThreads.length}
              onClick={() => {
                moreMenu.close();
                setSelected(allThreads.map((t) => t.id));
              }}
            />
            {(folder === "trash" || folder === "spam") && (
              <>
                <MenuDivider />
                <MenuItem
                  icon="delete_forever"
                  label={folder === "trash" ? "Empty Trash" : "Delete all spam"}
                  danger
                  onClick={() => {
                    moreMenu.close();
                    act.empty(folder);
                  }}
                />
              </>
            )}
          </Popover>
        </>
      ) : (
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
          {folder === "trash" ? (
            <>
              <IconButton icon="delete_forever" label="Delete forever" size={btn} onClick={() => act.deleteForever(ids)} />
              <IconButton icon="restore_from_trash" label="Move to Inbox" size={btn} onClick={() => act.moveToInbox(ids)} />
            </>
          ) : folder === "spam" ? (
            <>
              <IconButton icon="delete_forever" label="Delete forever" size={btn} onClick={() => act.deleteForever(ids)} />
              <IconButton icon="report_off" label="Not spam" size={btn} onClick={() => act.notSpam(ids)} />
            </>
          ) : (
            <>
              {ids.some((id) => threads[id]?.inInbox) ? (
                <IconButton icon="archive" label="Archive" size={btn} onClick={() => act.archive(ids)} />
              ) : (
                <IconButton icon="move_to_inbox" label="Move to Inbox" size={btn} onClick={() => act.moveToInbox(ids)} />
              )}
              <IconButton icon="report" label="Report spam" size={btn} onClick={() => act.spam(ids)} />
              <IconButton icon="delete" label="Delete" size={btn} onClick={() => act.trash(ids)} />
            </>
          )}
          <span className="mx-1.5 h-5 w-px shrink-0 bg-line" />
          <IconButton
            icon={anyUnread ? "drafts" : "mark_email_unread"}
            label={anyUnread ? "Mark as read" : "Mark as unread"}
            size={btn}
            onClick={() => act.setRead(ids, anyUnread)}
          />
          {folder !== "trash" && folder !== "spam" && (
            allSnoozed ? (
              <IconButton icon="alarm_off" label="Unsnooze" size={btn} onClick={() => act.unsnooze(ids)} />
            ) : (
              <SnoozeMenuButton ids={ids} size={btn} />
            )
          )}
          <span className="mx-1.5 h-5 w-px shrink-0 bg-line" />
          <MoveMenuButton ids={ids} size={btn} folder={folder} currentLabel={currentLabel} />
          <LabelMenuButton ids={ids} size={btn} />
          <IconButton ref={moreMenu.ref} icon="more_vert" label="More" size={btn} onClick={moreMenu.toggle} active={moreMenu.open} />
          <Popover anchor={moreMenu.ref.current} open={moreMenu.open} onClose={moreMenu.close} className="w-60">
            <MenuItem
              icon={anyUnread ? "drafts" : "mark_email_unread"}
              label={anyUnread ? "Mark as read" : "Mark as unread"}
              onClick={() => (moreMenu.close(), act.setRead(ids, anyUnread))}
            />
            <MenuItem
              icon="label_important"
              label={anyImportant ? "Mark as not important" : "Mark as important"}
              onClick={() => (moreMenu.close(), act.setImportant(ids, !anyImportant))}
            />
            <MenuItem icon="star" label={anyStarred ? "Remove star" : "Add star"} onClick={() => (moreMenu.close(), act.toggleStar(ids, !anyStarred))} />
            <MenuItem icon="notifications_off" label="Mute" onClick={() => (moreMenu.close(), act.mute(ids, true))} />
            <MenuDivider />
            {(["primary", "promotions", "social", "updates"] as Category[]).map((c) => (
              <MenuItem key={c} icon={CATEGORY_META[c].icon} label={`Move to ${CATEGORY_META[c].name}`} onClick={() => (moreMenu.close(), act.setCategory(ids, c))} />
            ))}
          </Popover>
          {!compact && <span className="ml-2 shrink-0 text-sm text-fg-2">{ids.length} selected</span>}
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
        {range.total > 0 && (
          <span className={cn("whitespace-nowrap px-2 text-xs text-fg-3", compact && "hidden sm:inline")}>
            <b className="font-medium text-fg-2">
              {range.start}–{range.end}
            </b>{" "}
            of <b className="font-medium text-fg-2">{range.total.toLocaleString()}</b>
          </span>
        )}
        <IconButton icon="chevron_left" label="Newer" size={btn} disabled={!onPrev} onClick={onPrev} />
        <IconButton icon="chevron_right" label="Older" size={btn} disabled={!onNext} onClick={onNext} />
      </div>
    </div>
  );
}
