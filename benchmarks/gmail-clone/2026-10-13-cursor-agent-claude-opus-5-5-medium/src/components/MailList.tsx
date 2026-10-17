import { memo, useEffect, useRef, useState } from "react";
import type { Category, Draft, Route, Thread } from "../types";
import { snippetOf, threadDate, useMail } from "../store/mail";
import { CATEGORIES, categoryPreview, counts, viewTitle } from "../lib/views";
import { highlightTerms, parseQuery, toggleToken } from "../lib/search";
import { listDate, shortDateTime } from "../lib/format";
import { navigate } from "../lib/router";
import { contactFor, isMe } from "../data/contacts";
import { htmlToText } from "../lib/html";
import { Icon, IconButton, type IconName } from "../ui/Icon";
import { Avatar } from "../ui/Avatar";
import { Popover, usePopover, MenuItem, MenuDivider } from "../ui/Popover";
import { AttachmentPill, Checkbox, Highlight, LabelChip, participants } from "./common";
import { LabelMenu, MoveMenu, TimePickerMenu } from "./menus";
import { useUI } from "./uiContext";

export interface ListProps {
  route: Route;
  threads: Thread[];
  page: number;
  setPage: (p: number) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  cursor: number;
  setCursor: (i: number) => void;
  onOpen: (id: string) => void;
  openId?: string;
}

const CAT_ICON: Record<Category, IconName> = { primary: "inbox", promotions: "tag", social: "people", updates: "info" };

export function MailList(props: ListProps) {
  const { route, threads, page, setPage, selected, setSelected, cursor, setCursor, onOpen, openId } = props;
  const { state, api, confirm, showToast } = useMail();
  const ui = useUI();
  const [refreshing, setRefreshing] = useState(false);
  const selMenu = usePopover();
  const moreMenu = usePopover();
  const labelMenu = usePopover();
  const moveMenu = usePopover();
  const snoozeMenu = usePopover();
  const ctxMenu = usePopover();
  const [menuIds, setMenuIds] = useState<string[]>([]);
  const [ctxId, setCtxId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pageSize = state.settings.pageSize;
  const total = threads.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pg = Math.min(page, pages - 1);
  const visible = threads.slice(pg * pageSize, pg * pageSize + pageSize);
  const selIds = [...selected].filter((id) => threads.some((t) => t.id === id));
  const hasSel = selIds.length > 0;
  const allOnPage = visible.length > 0 && visible.every((t) => selected.has(t.id));
  const selThreads = threads.filter((t) => selected.has(t.id));
  const anyUnread = selThreads.some((t) => t.unread);
  const v = route.view;
  const inTrashOrSpam = v === "trash" || v === "spam";
  const showTabs = state.settings.inboxTabs && (v === "inbox" || v === "category");
  const query = v === "search" ? route.param ?? "" : "";
  const terms = query ? highlightTerms(parseQuery(query)) : undefined;
  const draftThreads = new Set(state.drafts.filter((d) => d.threadId && !d.scheduledAt).map((d) => d.threadId!));
  const c = counts(state);

  useEffect(() => {
    if (cursor >= visible.length && visible.length) setCursor(visible.length - 1);
  }, [visible.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const clear = () => setSelected(new Set());
  const act = (fn: (ids: string[]) => void, ids = selIds) => {
    fn(ids);
    clear();
  };

  const selectBy = (pred: (t: Thread) => boolean) => setSelected(new Set(visible.filter(pred).map((t) => t.id)));

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      const n = api.deliverIncoming();
      setRefreshing(false);
      if (!n) showToast("No new mail");
    }, 650);
  };

  const openCtx = (e: React.MouseEvent, t: Thread) => {
    e.preventDefault();
    const ids = selected.has(t.id) ? selIds : [t.id];
    setMenuIds(ids);
    setCtxId(t.id);
    ctxMenu.openAt(e.clientX, e.clientY);
  };

  const ctxThread = threads.find((t) => t.id === ctxId);
  const ctxUnread = threads.filter((t) => menuIds.includes(t.id)).some((t) => t.unread);

  const title = viewTitle(state, route);
  const empty = emptyCopy(route, title);

  return (
    <section className="list-pane" aria-label={title}>
      <div className={"toolbar" + (hasSel ? " has-sel" : "")}>
        <div className="toolbar-left">
          {ui.isMobile && hasSel && <IconButton icon="back" label="Clear selection" onClick={clear} />}
          {ui.isMobile && hasSel && <span className="sel-count">{selIds.length}</span>}
          <div className="select-all">
            <Checkbox
              checked={allOnPage}
              mixed={hasSel && !allOnPage}
              label="Select"
              onChange={() => (hasSel ? clear() : setSelected(new Set(visible.map((t) => t.id))))}
            />
            <button className="icon-btn caret" aria-label="Select options" onClick={selMenu.toggle}>
              <Icon name="dropDown" size={18} />
            </button>
          </div>
          {!hasSel ? (
            <>
              <IconButton icon="refresh" label="Refresh" onClick={refresh} className={refreshing ? "spin" : ""} />
              <IconButton icon="moreVert" label="More" onClick={moreMenu.toggle} />
            </>
          ) : (
            <div className="toolbar-actions">
              {v === "spam" ? (
                <button className="btn text sm" onClick={() => act(api.notSpam)}>
                  Not spam
                </button>
              ) : v === "trash" ? (
                <IconButton icon="unarchive" label="Move to Inbox" onClick={() => act(api.moveToInbox)} />
              ) : selThreads.every((t) => t.location === "inbox") ? (
                <IconButton icon="archive" label="Archive" shortcut="e" onClick={() => act(api.archive)} />
              ) : (
                <IconButton icon="unarchive" label="Move to Inbox" onClick={() => act(api.moveToInbox)} />
              )}
              {v !== "spam" && <IconButton icon="spam" label="Report spam" shortcut="!" onClick={() => act(api.spam)} />}
              {inTrashOrSpam ? (
                <button
                  className="btn text sm"
                  onClick={async () => {
                    if (await confirm({ title: "Delete forever?", body: `This will permanently delete ${selIds.length} conversation${selIds.length === 1 ? "" : "s"}.`, confirmLabel: "Delete forever", danger: true }))
                      act(api.deleteForever);
                  }}
                >
                  Delete forever
                </button>
              ) : (
                <IconButton icon="trash" label="Delete" shortcut="#" onClick={() => act(api.trash)} />
              )}
              <span className="tb-divider" />
              <IconButton
                icon={anyUnread ? "mailOpen" : "mail"}
                label={anyUnread ? "Mark as read" : "Mark as unread"}
                shortcut={anyUnread ? "Shift+I" : "Shift+U"}
                onClick={() => act((ids) => api.setRead(ids, anyUnread))}
              />
              {v === "snoozed" ? (
                <IconButton icon="restore" label="Unsnooze" onClick={() => act(api.unsnooze)} />
              ) : (
                <IconButton
                  icon="clock"
                  label="Snooze"
                  shortcut="b"
                  onClick={(e) => {
                    setMenuIds(selIds);
                    snoozeMenu.open(e);
                  }}
                />
              )}
              <span className="tb-divider hide-mobile" />
              <IconButton
                icon="moveTo"
                label="Move to"
                shortcut="v"
                className="hide-mobile"
                onClick={(e) => {
                  setMenuIds(selIds);
                  moveMenu.open(e);
                }}
              />
              <IconButton
                icon="label"
                label="Labels"
                shortcut="l"
                onClick={(e) => {
                  setMenuIds(selIds);
                  labelMenu.open(e);
                }}
              />
              <IconButton icon="moreVert" label="More" onClick={moreMenu.toggle} />
            </div>
          )}
        </div>
        <div className="toolbar-right">
          {total > 0 && (
            <>
              <span className="page-info">
                {pg * pageSize + 1}–{Math.min(total, (pg + 1) * pageSize)} of {total.toLocaleString()}
              </span>
              <IconButton icon="chevronLeft" label="Newer" disabled={pg === 0} onClick={() => setPage(pg - 1)} />
              <IconButton icon="chevronRight" label="Older" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} />
            </>
          )}
        </div>
      </div>

      {showTabs && (
        <div className="tabs" role="tablist">
          {CATEGORIES.map((cat) => {
            const active = cat.id === "primary" ? v === "inbox" : route.param === cat.id;
            const n = c.categories[cat.id];
            const senders = cat.id === "primary" ? [] : categoryPreview(state, cat.id).map((e) => contactFor(e, state.contacts).name);
            return (
              <a
                key={cat.id}
                role="tab"
                aria-selected={active}
                href={cat.id === "primary" ? "#/inbox" : `#/category/${cat.id}`}
                className={"tab tab-" + cat.id + (active ? " active" : "")}
              >
                <Icon name={CAT_ICON[cat.id]} size={20} />
                <span className="tab-text">
                  <span className="tab-name">
                    {cat.name}
                    {cat.id !== "primary" && n > 0 && !active && <span className={"tab-badge badge-" + cat.id}>{n} new</span>}
                  </span>
                  {cat.id !== "primary" && senders.length > 0 && !active && <span className="tab-senders ellipsis">{senders.join(", ")}</span>}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {ui.isMobile && !hasSel && (
        <div className="m-title">
          <span>{title}</span>
          <IconButton icon="refresh" label="Refresh" size={18} onClick={refresh} className={refreshing ? "spin" : ""} />
        </div>
      )}
      {v === "search" && <SearchChips query={query} count={total} />}
      {(v === "trash" || v === "spam") && total > 0 && (
        <div className="folder-banner">
          {v === "trash" ? "Messages that have been in Trash more than 30 days will be deleted automatically." : "Messages that have been in Spam more than 30 days will be deleted automatically."}
          <button
            className="link-btn"
            onClick={async () => {
              if (await confirm({ title: v === "trash" ? "Empty Trash?" : "Delete all spam?", body: `All ${total} conversations will be permanently deleted.`, confirmLabel: "Empty now", danger: true }))
                api.emptyFolder(v);
            }}
          >
            {v === "trash" ? "Empty Trash now" : "Delete all spam messages now"}
          </button>
        </div>
      )}
      {hasSel && allOnPage && total > visible.length && selIds.length < total && (
        <div className="folder-banner center">
          All <b>{visible.length}</b> conversations on this page are selected.
          <button className="link-btn" onClick={() => setSelected(new Set(threads.map((t) => t.id)))}>
            Select all {total} conversations in {title}
          </button>
        </div>
      )}
      {hasSel && selIds.length === total && total > visible.length && (
        <div className="folder-banner center">
          All <b>{total}</b> conversations in {title} are selected.
          <button className="link-btn" onClick={clear}>
            Clear selection
          </button>
        </div>
      )}

      <div className="rows" ref={listRef} role="list">
        {visible.map((t, i) => (
          <ThreadRow
            key={t.id}
            t={t}
            index={i}
            selected={selected.has(t.id)}
            selectMode={hasSel}
            focused={i === cursor}
            open={t.id === openId}
            terms={terms}
            route={route}
            hasDraft={draftThreads.has(t.id)}
            onToggle={() => {
              const s = new Set(selected);
              s.has(t.id) ? s.delete(t.id) : s.add(t.id);
              setSelected(s);
            }}
            onOpen={() => {
              setCursor(i);
              onOpen(t.id);
            }}
            onContext={openCtx}
            onSnooze={(e) => {
              setMenuIds([t.id]);
              snoozeMenu.open(e);
            }}
          />
        ))}
        {total === 0 && (
          <div className="empty">
            <div className="empty-art">
              <Icon name={empty.icon} size={56} />
            </div>
            <div className="empty-title">{empty.title}</div>
            {empty.body && <div className="muted">{empty.body}</div>}
          </div>
        )}
      </div>

      <Popover anchor={selMenu.anchor} onClose={selMenu.close} width={160}>
        {(
          [
            ["All", () => setSelected(new Set(visible.map((t) => t.id)))],
            ["None", clear],
            ["Read", () => selectBy((t) => !t.unread)],
            ["Unread", () => selectBy((t) => t.unread)],
            ["Starred", () => selectBy((t) => t.starred)],
            ["Unstarred", () => selectBy((t) => !t.starred)],
          ] as [string, () => void][]
        ).map(([l, fn]) => (
          <MenuItem
            key={l}
            label={l}
            onClick={() => {
              fn();
              selMenu.close();
            }}
          />
        ))}
      </Popover>

      <Popover anchor={moreMenu.anchor} onClose={moreMenu.close} width={240}>
        {hasSel ? (
          <>
            <MenuItem icon="starFilled" label="Add star" onClick={() => (act((ids) => api.setStar(ids, true)), moreMenu.close())} />
            <MenuItem icon="star" label="Remove star" onClick={() => (act((ids) => api.setStar(ids, false)), moreMenu.close())} />
            <MenuItem icon="important" label="Mark as important" onClick={() => (act((ids) => api.setImportant(ids, true)), moreMenu.close())} />
            <MenuItem icon="importantOutline" label="Mark as not important" onClick={() => (act((ids) => api.setImportant(ids, false)), moreMenu.close())} />
            {ui.isMobile && (
              <MenuItem
                icon="moveTo"
                label="Move to"
                onClick={() => {
                  setMenuIds(selIds);
                  moreMenu.close();
                  moveMenu.open(document.querySelector<HTMLElement>(".toolbar .toolbar-actions") as HTMLElement);
                }}
              />
            )}
          </>
        ) : (
          <>
            <MenuItem
              icon="mailOpen"
              label="Mark all as read"
              disabled={!threads.some((t) => t.unread)}
              onClick={() => {
                api.setRead(
                  threads.filter((t) => t.unread).map((t) => t.id),
                  true,
                );
                moreMenu.close();
              }}
            />
            <MenuDivider />
            <div className="menu-note">Select conversations to see more actions</div>
          </>
        )}
      </Popover>

      <Popover anchor={ctxMenu.anchor} onClose={ctxMenu.close} width={250}>
        {ctxThread && (
          <>
            <MenuItem icon="reply" label="Reply" onClick={() => (ctxMenu.close(), onOpen(ctxThread.id), setTimeout(() => api.reply(ctxThread.id, "reply"), 0))} />
            <MenuItem icon="forward" label="Forward" onClick={() => (ctxMenu.close(), onOpen(ctxThread.id), setTimeout(() => api.reply(ctxThread.id, "forward"), 0))} />
            <MenuDivider />
            {ctxThread.location === "inbox" ? (
              <MenuItem icon="archive" label="Archive" onClick={() => (ctxMenu.close(), act(api.archive, menuIds))} />
            ) : (
              <MenuItem icon="unarchive" label="Move to Inbox" onClick={() => (ctxMenu.close(), act(api.moveToInbox, menuIds))} />
            )}
            <MenuItem icon="trash" label="Delete" onClick={() => (ctxMenu.close(), act(api.trash, menuIds))} />
            <MenuItem
              icon={ctxUnread ? "mailOpen" : "mail"}
              label={ctxUnread ? "Mark as read" : "Mark as unread"}
              onClick={() => (ctxMenu.close(), act((ids) => api.setRead(ids, ctxUnread), menuIds))}
            />
            <MenuItem
              icon="clock"
              label="Snooze"
              onClick={() => {
                const a = ctxMenu.anchor;
                ctxMenu.close();
                if (a && !(a instanceof HTMLElement)) snoozeMenu.openAt(a.x, a.y);
              }}
            />
            <MenuDivider />
            <MenuItem
              icon="moveTo"
              label="Move to"
              onClick={() => {
                const a = ctxMenu.anchor;
                ctxMenu.close();
                if (a && !(a instanceof HTMLElement)) moveMenu.openAt(a.x, a.y);
              }}
            />
            <MenuItem
              icon="label"
              label="Label as"
              onClick={() => {
                const a = ctxMenu.anchor;
                ctxMenu.close();
                if (a && !(a instanceof HTMLElement)) labelMenu.openAt(a.x, a.y);
              }}
            />
            <MenuDivider />
            {(() => {
              const from = [...ctxThread.messages].reverse().find((m) => !isMe(m.from))?.from;
              if (!from) return null;
              const c = contactFor(from, state.contacts);
              return (
                <MenuItem
                  icon="search"
                  label={`Find emails from ${c.name.split(" ")[0]}`}
                  onClick={() => {
                    ctxMenu.close();
                    navigate({ view: "search", param: `from:${from}` });
                  }}
                />
              );
            })()}
            <MenuItem
              icon="openNew"
              label="Open in new window"
              onClick={() => {
                ctxMenu.close();
                window.open(`${location.pathname}#/${route.view === "search" || route.view === "label" || route.view === "category" ? route.view + "/" + encodeURIComponent(route.param ?? "") : route.view}/${ctxThread.id}`, "_blank");
              }}
            />
          </>
        )}
      </Popover>

      <LabelMenu anchor={labelMenu.anchor} onClose={labelMenu.close} threadIds={menuIds} />
      <MoveMenu
        anchor={moveMenu.anchor}
        onClose={() => {
          moveMenu.close();
          if (menuIds === selIds) clear();
        }}
        threadIds={menuIds}
      />
      <TimePickerMenu
        kind="snooze"
        anchor={snoozeMenu.anchor}
        onClose={snoozeMenu.close}
        onPick={(ts) => {
          api.snooze(menuIds, ts);
          clear();
        }}
      />
    </section>
  );
}

function emptyCopy(r: Route, title: string): { icon: IconName; title: string; body?: string } {
  switch (r.view) {
    case "inbox":
      return { icon: "sparkle", title: "You're all caught up", body: "No new conversations in Primary. Enjoy the calm." };
    case "category":
      return { icon: "inbox", title: `No new ${title.toLowerCase()}`, body: "Messages in this tab will show up here." };
    case "starred":
      return { icon: "star", title: "No starred messages", body: "Stars let you give messages a special status to make them easier to find. To star a message, click on the star outline beside any message or conversation." };
    case "snoozed":
      return { icon: "clock", title: "Nothing snoozed", body: "Snooze conversations to make them disappear until you need them." };
    case "sent":
      return { icon: "send", title: "No sent messages!", body: "Send one now." };
    case "spam":
      return { icon: "spam", title: "Hooray, no spam here!" };
    case "trash":
      return { icon: "trash", title: "No conversations in Trash" };
    case "search":
      return { icon: "search", title: "No messages matched your search", body: "Try using search options such as sender, date, size and more." };
    case "label":
      return { icon: "label", title: "There are no conversations with this label." };
    default:
      return { icon: "inbox", title: `No conversations in ${title}` };
  }
}

function SearchChips({ query, count }: { query: string; count: number }) {
  const chips: [string, string][] = [
    ["has:attachment", "Has attachment"],
    ["is:unread", "Is unread"],
    ["is:starred", "Is starred"],
    ["newer_than:7d", "Last 7 days"],
    ["from:me", "From me"],
    ["in:anywhere", "Include Spam & Trash"],
  ];
  const lower = query.toLowerCase().split(/\s+/);
  return (
    <div className="search-bar-chips">
      {chips.map(([tok, label]) => {
        const on = lower.includes(tok);
        return (
          <button key={tok} className={"chip" + (on ? " on" : "")} onClick={() => navigate({ view: "search", param: toggleToken(query, tok) || "in:anywhere" })}>
            {on && <Icon name="check" size={16} />}
            {label}
          </button>
        );
      })}
      <span className="muted small grow-right">
        {count} result{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

interface RowProps {
  t: Thread;
  index: number;
  selected: boolean;
  selectMode: boolean;
  focused: boolean;
  open: boolean;
  terms?: string[];
  route: Route;
  hasDraft: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onContext: (e: React.MouseEvent, t: Thread) => void;
  onSnooze: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ThreadRow = memo(function ThreadRow({ t, index, selected, selectMode, focused, open, terms, route, hasDraft, onToggle, onOpen, onContext, onSnooze }: RowProps) {
  const { state, api } = useMail();
  const ui = useUI();
  const [dx, setDx] = useState(0);
  const touch = useRef<{ x: number; y: number; lock?: "h" | "v" } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const last = t.messages[t.messages.length - 1];
  const lastOther = [...t.messages].reverse().find((m) => !isMe(m.from)) ?? last;
  const sender = contactFor(lastOther.from, state.contacts);
  const { parts, count } = participants(t, state.contacts, route.view === "sent");
  const snippet = snippetOf(t);
  const atts = t.messages.flatMap((m) => m.attachments);
  const labels = t.labels
    .filter((id) => !(route.view === "label" && route.param === id))
    .map((id) => state.labels.find((l) => l.id === id))
    .filter(Boolean) as { id: string; name: string; color: string }[];
  const showInbox = t.location === "inbox" && !["inbox", "category", "snoozed"].includes(route.view);
  const date = route.view === "snoozed" && t.snoozedUntil ? shortDateTime(t.snoozedUntil) : listDate(threadDate(t));
  const archived = t.location === "inbox";

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = touch.current;
    if (!s) return;
    const ddx = e.touches[0].clientX - s.x;
    const ddy = e.touches[0].clientY - s.y;
    if (!s.lock && (Math.abs(ddx) > 10 || Math.abs(ddy) > 10)) s.lock = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
    if (s.lock === "h") setDx(ddx);
  };
  const onTouchEnd = () => {
    const w = rowRef.current?.offsetWidth ?? 300;
    if (Math.abs(dx) > w * 0.35) {
      setDx(dx > 0 ? w : -w);
      window.setTimeout(() => {
        if (archived) api.archive([t.id]);
        else api.trash([t.id]);
        setDx(0);
      }, 160);
    } else setDx(0);
    touch.current = null;
  };

  const star = (
    <button
      className={"star-btn" + (t.starred ? " on" : "")}
      aria-label={t.starred ? "Starred" : "Not starred"}
      aria-pressed={t.starred}
      onClick={(e) => {
        e.stopPropagation();
        api.toggleStar(t.id);
      }}
      data-tip={t.starred ? "Starred" : "Not starred"}
    >
      <Icon name={t.starred ? "starFilled" : "star"} size={20} />
    </button>
  );

  const hover = (
    <div className="row-hover" onClick={(e) => (e.target as HTMLElement).closest("button") && e.stopPropagation()}>
      {t.location === "inbox" ? (
        <IconButton icon="archive" label="Archive" size={18} onClick={() => api.archive([t.id])} />
      ) : (
        <IconButton icon="unarchive" label="Move to Inbox" size={18} onClick={() => api.moveToInbox([t.id])} />
      )}
      {t.location === "trash" ? (
        <IconButton icon="deleteForever" label="Delete forever" size={18} onClick={() => api.deleteForever([t.id])} />
      ) : (
        <IconButton icon="trash" label="Delete" size={18} onClick={() => api.trash([t.id])} />
      )}
      <IconButton icon={t.unread ? "mailOpen" : "mail"} label={t.unread ? "Mark as read" : "Mark as unread"} size={18} onClick={() => api.setRead([t.id], t.unread)} />
      <IconButton icon="clock" label="Snooze" size={18} onClick={onSnooze} />
    </div>
  );

  const senderNode = (
    <span className="row-from ellipsis">
      {parts.map((p, i) => (
        <span key={i} className={p.unread ? "strong" : ""}>
          {i > 0 && ", "}
          {p.name}
        </span>
      ))}
      {count > 1 && <span className="row-count">{count}</span>}
      {hasDraft && <span className="row-draft">, Draft</span>}
    </span>
  );

  const subjectNode = (
    <span className="row-subject">
      <Highlight text={t.subject} terms={terms} />
    </span>
  );

  if (ui.isMobile) {
    return (
      <div className="row-swipe" ref={rowRef}>
        <div className={"swipe-bg" + (dx > 0 ? " left" : " right") + (archived ? "" : " del")}>
          <Icon name={archived ? "archive" : "trash"} size={24} />
        </div>
        <div
          role="listitem"
          data-index={index}
          className={"row m-row" + (t.unread ? " unread" : "") + (selected ? " selected" : "")}
          style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: touch.current ? "none" : undefined }}
          onClick={() => (selectMode ? onToggle() : onOpen())}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onContextMenu={(e) => {
            e.preventDefault();
            onToggle();
          }}
        >
          <span
            className="m-avatar"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {selected ? (
              <span className="avatar sel">
                <Icon name="check" size={22} />
              </span>
            ) : (
              <Avatar contact={sender} size={40} />
            )}
          </span>
          <div className="m-body">
            <div className="m-line">
              {senderNode}
              <span className="row-date">{date}</span>
            </div>
            <div className="m-line">
              <span className="m-subject ellipsis">
                {labels.slice(0, 1).map((l) => (
                  <LabelChip key={l.id} label={l} />
                ))}
                <Highlight text={t.subject} terms={terms} />
              </span>
            </div>
            <div className="m-line">
              <span className="m-snippet ellipsis">
                <Highlight text={snippet} terms={terms} />
              </span>
              {star}
            </div>
            {atts.length > 0 && (
              <div className="row-atts">
                {atts.slice(0, 2).map((a) => (
                  <AttachmentPill key={a.id} a={a} onClick={(e) => (e.stopPropagation(), ui.openPreview(a.id, t.id))} />
                ))}
                {atts.length > 2 && <span className="att-more">+{atts.length - 2}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="listitem"
      data-index={index}
      className={"row" + (t.unread ? " unread" : "") + (selected ? " selected" : "") + (focused ? " focused" : "") + (open ? " open" : "")}
      onClick={onOpen}
      onContextMenu={(e) => onContext(e, t)}
      draggable={false}
    >
      <div className="row-lead">
        <span className="drag-handle" aria-hidden />
        <Checkbox checked={selected} onChange={onToggle} label="Select conversation" />
        {star}
        <button
          className={"imp-btn" + (t.important ? " on" : "")}
          aria-label={t.important ? "Important" : "Not important"}
          data-tip={t.important ? "Important — click to unmark" : "Click to mark as important"}
          onClick={(e) => {
            e.stopPropagation();
            api.setImportant([t.id], !t.important);
          }}
        >
          <Icon name={t.important ? "important" : "importantOutline"} size={20} />
        </button>
      </div>
      {senderNode}
      <div className="row-main">
        <div className="row-text ellipsis">
          {showInbox && <LabelChip label={{ id: "inbox", name: "Inbox", color: "#5f6368" }} />}
          {t.location === "spam" && route.view !== "spam" && <LabelChip label={{ id: "spam", name: "Spam", color: "#c5221f" }} />}
          {t.location === "trash" && route.view !== "trash" && <LabelChip label={{ id: "trash", name: "Trash", color: "#5f6368" }} />}
          {labels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
          {subjectNode}
          <span className="row-snippet">
            {" "}
            – <Highlight text={snippet} terms={terms} />
          </span>
        </div>
        {atts.length > 0 && state.settings.density === "default" && (
          <div className="row-atts">
            {atts.slice(0, 3).map((a) => (
              <AttachmentPill key={a.id} a={a} onClick={(e) => (e.stopPropagation(), ui.openPreview(a.id, t.id))} />
            ))}
            {atts.length > 3 && <span className="att-more">+{atts.length - 3}</span>}
          </div>
        )}
      </div>
      <div className="row-end">
        {atts.length > 0 && state.settings.density !== "default" && <Icon name="attach" size={16} className="muted row-clip" />}
        <span className={"row-date" + (route.view === "snoozed" ? " snoozed" : "")}>{date}</span>
        {hover}
      </div>
    </div>
  );
});

export function DraftList({ route, onOpenDraft }: { route: Route; onOpenDraft: (d: Draft) => void }) {
  const { state, api, confirm } = useMail();
  const ui = useUI();
  const scheduled = route.view === "scheduled";
  const drafts = state.drafts.filter((d) => (scheduled ? !!d.scheduledAt : !d.scheduledAt)).sort((a, b) => (scheduled ? (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0) : b.updatedAt - a.updatedAt));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const ids = [...sel].filter((id) => drafts.some((d) => d.id === id));
  const all = drafts.length > 0 && ids.length === drafts.length;
  return (
    <section className="list-pane">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="select-all">
            <Checkbox checked={all} mixed={ids.length > 0 && !all} label="Select" onChange={() => setSel(ids.length ? new Set() : new Set(drafts.map((d) => d.id)))} />
          </div>
          {ids.length > 0 && (
            <button
              className="btn text sm"
              onClick={async () => {
                if (scheduled && !(await confirm({ title: "Cancel scheduled sends?", body: `${ids.length} scheduled message${ids.length === 1 ? "" : "s"} will be moved to Drafts.`, confirmLabel: "Cancel send" }))) return;
                if (scheduled) ids.forEach((id) => api.cancelSchedule(id));
                else api.discardDrafts(ids);
                setSel(new Set());
              }}
            >
              {scheduled ? "Cancel send" : "Discard drafts"}
            </button>
          )}
        </div>
        <div className="toolbar-right">
          {drafts.length > 0 && (
            <span className="page-info">
              1–{drafts.length} of {drafts.length}
            </span>
          )}
        </div>
      </div>
      {scheduled && drafts.length > 0 && <div className="folder-banner">Messages are sent automatically at the scheduled time, as long as this tab is open — or the next time you open it.</div>}
      <div className="rows" role="list">
        {drafts.map((d) => {
          const to = d.to.length ? d.to.map((e) => contactFor(e, state.contacts).name.split(" ")[0]).join(", ") : "(no recipients)";
          const snippet = htmlToText(d.html.replace(/<div class="sig">[\s\S]*?<\/div>/, ""));
          return (
            <div
              key={d.id}
              role="listitem"
              className={"row" + (sel.has(d.id) ? " selected" : "") + (ui.isMobile ? " m-row draft-row" : "")}
              onClick={() => onOpenDraft(d)}
            >
              {!ui.isMobile && (
                <div className="row-lead">
                  <span className="drag-handle" aria-hidden />
                  <Checkbox
                    checked={sel.has(d.id)}
                    label="Select draft"
                    onChange={() => {
                      const s = new Set(sel);
                      s.has(d.id) ? s.delete(d.id) : s.add(d.id);
                      setSel(s);
                    }}
                  />
                </div>
              )}
              <span className="row-from ellipsis">
                {scheduled ? <span>To: {to}</span> : <span className="row-draft-label">Draft</span>}
                {!scheduled && <span className="muted"> · {to}</span>}
              </span>
              <div className="row-main">
                <div className="row-text ellipsis">
                  {scheduled && <LabelChip label={{ id: "s", name: shortDateTime(d.scheduledAt!), color: "#e8710a" }} />}
                  <span className="row-subject">{d.subject || "(no subject)"}</span>
                  <span className="row-snippet"> – {snippet || "(no message)"}</span>
                </div>
              </div>
              <div className="row-end">
                <span className="row-date">{scheduled ? shortDateTime(d.scheduledAt!) : listDate(d.updatedAt)}</span>
                <div className="row-hover" onClick={(e) => (e.target as HTMLElement).closest("button") && e.stopPropagation()}>
                  <IconButton icon="trash" label={scheduled ? "Cancel send" : "Discard draft"} size={18} onClick={() => (scheduled ? api.cancelSchedule(d.id) : api.discardDraft(d.id))} />
                </div>
              </div>
            </div>
          );
        })}
        {!drafts.length && (
          <div className="empty">
            <div className="empty-art">
              <Icon name={scheduled ? "scheduleSend" : "draft"} size={56} />
            </div>
            <div className="empty-title">{scheduled ? "No scheduled messages" : "You don't have any saved drafts."}</div>
            <div className="muted">{scheduled ? "Use the arrow next to Send to schedule a message." : "Saving a draft allows you to keep a message you aren't ready to send yet."}</div>
          </div>
        )}
      </div>
    </section>
  );
}
