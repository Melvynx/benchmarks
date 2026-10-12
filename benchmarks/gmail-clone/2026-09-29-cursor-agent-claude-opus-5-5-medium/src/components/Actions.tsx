import {
  Archive, AlertOctagon, Trash2, MailOpen, Mail, Clock, FolderInput, Tag, MoreVertical, Inbox, Star, StarOff,
  Bookmark, BookmarkX, BellOff, Bell, Trash, AlarmClockOff, ShieldCheck,
} from "lucide-react";
import { useMail } from "../lib/store";
import { isSnoozed } from "../lib/query";
import type { Route } from "../lib/types";
import { IconButton, MenuDivider, MenuItem, Popover, useAnchor } from "./ui";
import { LabelMenu, MoveMenu, SnoozeMenu } from "./menus";

const Sep = () => <div className="mx-1 h-5 w-px bg-divider" />;

export function ConversationActions({
  ids, onAfter, mobile, size = 20,
}: { ids: string[]; route?: Route; onAfter?: () => void; mobile?: boolean; size?: number }) {
  const threads = useMail((s) => s.threads);
  const now = useMail((s) => s.now);
  const a = useMail.getState;
  const snoozeM = useAnchor();
  const moveM = useAnchor();
  const labelM = useAnchor();
  const moreM = useAnchor();

  const ts = ids.map((id) => threads[id]).filter(Boolean);
  if (!ts.length) return null;
  const allTrash = ts.every((t) => t.trashed);
  const allSpam = ts.every((t) => t.spam && !t.trashed);
  const anyUnread = ts.some((t) => t.unread);
  const allInbox = ts.every((t) => t.inInbox && !t.trashed && !t.spam);
  const anySnoozed = ts.some((t) => isSnoozed(t, now));
  const allStarred = ts.every((t) => t.starred);
  const allImportant = ts.every((t) => t.important);
  const allMuted = ts.every((t) => t.muted);
  const after = (fn: () => void) => () => {
    fn();
    onAfter?.();
  };

  const primary = allTrash ? (
    <>
      <IconButton tip="Delete forever" onClick={after(() => a().deleteForever(ids))}>
        <Trash size={size} />
      </IconButton>
      <IconButton tip="Move to Inbox" onClick={after(() => a().moveToInbox(ids))}>
        <Inbox size={size} />
      </IconButton>
    </>
  ) : allSpam ? (
    <>
      <IconButton tip="Delete forever" onClick={after(() => a().deleteForever(ids))}>
        <Trash size={size} />
      </IconButton>
      <IconButton tip="Not spam" onClick={after(() => a().notSpam(ids))}>
        <ShieldCheck size={size} />
      </IconButton>
    </>
  ) : (
    <>
      {allInbox && !anySnoozed ? (
        <IconButton tip="Archive (e)" onClick={after(() => a().archive(ids))}>
          <Archive size={size} />
        </IconButton>
      ) : (
        <IconButton tip="Move to Inbox" onClick={after(() => a().moveToInbox(ids))}>
          <Inbox size={size} />
        </IconButton>
      )}
      {!mobile && (
        <IconButton tip="Report spam (!)" onClick={after(() => a().markSpam(ids))}>
          <AlertOctagon size={size} />
        </IconButton>
      )}
      <IconButton tip="Delete (#)" onClick={after(() => a().trash(ids))}>
        <Trash2 size={size} />
      </IconButton>
    </>
  );

  return (
    <div className="flex items-center">
      {primary}
      {!mobile && <Sep />}
      <IconButton
        tip={anyUnread ? "Mark as read (Shift+I)" : "Mark as unread (Shift+U)"}
        onClick={() => {
          a().setUnread(ids, !anyUnread);
          if (!anyUnread) onAfter?.();
        }}
      >
        {anyUnread ? <MailOpen size={size} /> : <Mail size={size} />}
      </IconButton>
      {!mobile && !allTrash && !allSpam &&
        (anySnoozed ? (
          <IconButton tip="Unsnooze" onClick={after(() => a().unsnooze(ids))}>
            <AlarmClockOff size={size} />
          </IconButton>
        ) : (
          <IconButton tip="Snooze (b)" onClick={snoozeM.open} active={!!snoozeM.anchor}>
            <Clock size={size} />
          </IconButton>
        ))}
      {!mobile && (
        <>
          <Sep />
          <IconButton tip="Move to (v)" onClick={moveM.open} active={!!moveM.anchor}>
            <FolderInput size={size} />
          </IconButton>
          <IconButton tip="Labels (l)" onClick={labelM.open} active={!!labelM.anchor}>
            <Tag size={size} />
          </IconButton>
        </>
      )}
      <IconButton tip="More" onClick={moreM.open} active={!!moreM.anchor}>
        <MoreVertical size={size} />
      </IconButton>

      <Popover anchor={snoozeM.anchor} onClose={snoozeM.close}>
        <SnoozeMenu ids={ids} onDone={() => { snoozeM.close(); onAfter?.(); }} />
      </Popover>
      <Popover anchor={moveM.anchor} onClose={moveM.close}>
        <MoveMenu ids={ids} onDone={() => { moveM.close(); onAfter?.(); }} />
      </Popover>
      <Popover anchor={labelM.anchor} onClose={labelM.close}>
        <LabelMenu ids={ids} onDone={labelM.close} />
      </Popover>
      <Popover anchor={moreM.anchor} onClose={moreM.close} align="end" className="w-64">
        {mobile && !allTrash && !allSpam && (
          <>
            {anySnoozed ? (
              <MenuItem icon={<AlarmClockOff size={18} />} label="Unsnooze" onClick={() => { moreM.close(); a().unsnooze(ids); onAfter?.(); }} />
            ) : (
              <MenuItem icon={<Clock size={18} />} label="Snooze" onClick={() => { const el = moreM.anchor; moreM.close(); snoozeM.setAnchor(el); }} />
            )}
            <MenuItem icon={<FolderInput size={18} />} label="Move to" onClick={() => { const el = moreM.anchor; moreM.close(); moveM.setAnchor(el); }} />
            <MenuItem icon={<Tag size={18} />} label="Label as" onClick={() => { const el = moreM.anchor; moreM.close(); labelM.setAnchor(el); }} />
            <MenuItem icon={<AlertOctagon size={18} />} label="Report spam" onClick={() => { moreM.close(); a().markSpam(ids); onAfter?.(); }} />
            <MenuDivider />
          </>
        )}
        <MenuItem
          icon={allStarred ? <StarOff size={18} /> : <Star size={18} />}
          label={allStarred ? "Remove star" : "Add star"}
          onClick={() => {
            moreM.close();
            a().setStarred(ids, !allStarred);
          }}
        />
        <MenuItem
          icon={allImportant ? <BookmarkX size={18} /> : <Bookmark size={18} />}
          label={allImportant ? "Mark as not important" : "Mark as important"}
          onClick={() => {
            moreM.close();
            a().setImportant(ids, !allImportant);
          }}
        />
        {!allTrash && !allSpam && (
          <MenuItem
            icon={allMuted ? <Bell size={18} /> : <BellOff size={18} />}
            label={allMuted ? "Unmute" : "Mute"}
            hint="m"
            onClick={() => {
              moreM.close();
              a().toggleMute(ids);
              if (!allMuted) onAfter?.();
            }}
          />
        )}
      </Popover>
    </div>
  );
}

export const ToolbarSep = Sep;
