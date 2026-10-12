import { useEffect, useRef, useState } from "react";
import { PAGE_SIZE, SYS } from "../constants";
import { draftToCompose } from "../composeDraft";
import {
  activityOf,
  cx,
  emptyCopy,
  formatFuture,
  formatListTime,
  hasAttachment,
  hasDraftBadge,
  listSender,
  listSnippet,
  listSubject,
  userLabelIds,
  viewTitle,
} from "../logic";
import { useMail } from "../store";
import type { Category, Thread } from "../types";
import { Icon } from "../icons";
import { Highlight } from "./bits";

const TABS: { id: Category; label: string; icon: "inbox" | "promo" | "people" | "updates"; count: "primary" | "promotions" | "social" | "updates" }[] = [
  { id: "primary", label: "Primary", icon: "inbox", count: "primary" },
  { id: "promotions", label: "Promotions", icon: "promo", count: "promotions" },
  { id: "social", label: "Social", icon: "people", count: "social" },
  { id: "updates", label: "Updates", icon: "updates", count: "updates" },
];

export function MailList({ split }: { split: boolean }) {
  const mail = useMail();
  const { state, dispatch, sections, paged, total, counts, openPalette } = mail;
  const [selectOpen, setSelectOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bar, setBar] = useState(false);
  const searching = Boolean(state.search.trim());
  const title = viewTitle(state.view, state.labels, searching);
  const allIds = mail.visible.map((thread) => thread.id);
  const selectedOnPage = paged.slice.filter((thread) => state.selected.includes(thread.id)).length;
  const allSelected = paged.slice.length > 0 && selectedOnPage === paged.slice.length;

  useEffect(() => {
    setBar(true);
    const id = window.setTimeout(() => setBar(false), 700);
    return () => window.clearTimeout(id);
  }, [state.pulse]);

  useEffect(() => {
    if (!state.cursorId) return;
    document.querySelector(`[data-thread-id="${CSS.escape(state.cursorId)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [state.cursorId, paged.page]);

  function openRow(thread: Thread) {
    if (thread.messages.length === 0 && thread.draft) {
      const existing = state.composes.find((compose) => compose.threadId === thread.id);
      if (existing) dispatch({ type: "composePatch", id: existing.id, patch: { minimized: false, placement: "float" } });
      else dispatch({ type: "composeOpen", compose: draftToCompose(thread, "float") });
      return;
    }
    dispatch({ type: "open", id: thread.id });
    if (thread.draft && !state.composes.some((compose) => compose.threadId === thread.id)) {
      dispatch({ type: "composeOpen", compose: draftToCompose(thread, "inline") });
    }
  }

  const from = total === 0 ? 0 : paged.page * PAGE_SIZE + 1;
  const to = Math.min(total, paged.page * PAGE_SIZE + paged.slice.length);

  return (
    <section className={cx("list-pane", split && "split")} data-testid="mail-list" aria-label={title}>
      {bar ? <div className="progress" /> : null}
      <div className="toolbar">
        <div className="pop">
          <div className="check-wrap">
            <SelectBox
              checked={allSelected}
              partial={selectedOnPage > 0 && !allSelected}
              label="Select"
              onChange={() => dispatch({ type: "selectMode", mode: allSelected ? "none" : "all" })}
            />
            <button className="icon-btn tiny" type="button" aria-label="Select conversations" onClick={() => setSelectOpen((v) => !v)}>
              <Icon name="chevronDown" size={16} />
            </button>
          </div>
          {selectOpen ? (
            <div className="menu" onMouseDown={(event) => event.stopPropagation()}>
              {(
                [
                  ["all", "All"],
                  ["none", "None"],
                  ["read", "Read"],
                  ["unread", "Unread"],
                  ["starred", "Starred"],
                  ["unstarred", "Unstarred"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    dispatch({ type: "selectMode", mode });
                    setSelectOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button className="icon-btn" type="button" aria-label="Refresh" onClick={() => dispatch({ type: "refresh", now: Date.now() })}>
          <Icon name="refresh" />
        </button>
        {state.selected.length > 0 ? (
          <>
            {state.view !== "trash" && state.view !== "spam" ? (
              <button className="icon-btn" type="button" aria-label="Archive" onClick={() => dispatch({ type: "archive", ids: state.selected })}>
                <Icon name="archive" />
              </button>
            ) : null}
            {state.view === "spam" ? (
              <button className="icon-btn" type="button" aria-label="Not spam" onClick={() => dispatch({ type: "notSpam", ids: state.selected })}>
                <Icon name="inbox" />
              </button>
            ) : (
              <button className="icon-btn" type="button" aria-label="Report spam" onClick={() => dispatch({ type: "spam", ids: state.selected })}>
                <Icon name="spam" />
              </button>
            )}
            {state.view === "trash" || state.view === "spam" ? (
              <button className="icon-btn" type="button" aria-label="Delete forever" onClick={() => dispatch({ type: "confirm", confirm: { kind: "forever", ids: state.selected } })}>
                <Icon name="trash" />
              </button>
            ) : (
              <button className="icon-btn" type="button" aria-label="Delete" onClick={() => dispatch({ type: "trash", ids: state.selected })}>
                <Icon name="trash" />
              </button>
            )}
            <button
              className="icon-btn"
              type="button"
              aria-label="Mark read or unread"
              onClick={() => {
                const unread = state.selected.some((id) => state.threads.find((thread) => thread.id === id)?.unread);
                dispatch({ type: "read", ids: state.selected, unread: !unread });
              }}
            >
              <Icon name="mail" />
            </button>
            <button className="icon-btn" type="button" aria-label="Snooze" onClick={(event) => openPalette("snooze", event.currentTarget)}>
              <Icon name="snooze" />
            </button>
            <button className="icon-btn" type="button" aria-label="Move to" onClick={(event) => openPalette("move", event.currentTarget)}>
              <Icon name="drafts" />
            </button>
            <button className="icon-btn" type="button" aria-label="Labels" onClick={(event) => openPalette("label", event.currentTarget)}>
              <Icon name="label" />
            </button>
          </>
        ) : null}
        {state.view === "trash" && state.selected.length === 0 ? (
          <button className="text-btn" type="button" onClick={() => dispatch({ type: "confirm", confirm: { kind: "emptyTrash" } })}>
            Empty trash
          </button>
        ) : null}
        <div className="spacer" />
        <span className="pager">
          {from}–{to} of {total}
        </span>
        <button className="icon-btn" type="button" aria-label="Newer" disabled={paged.page === 0} onClick={() => dispatch({ type: "page", page: paged.page - 1 })}>
          <Icon name="chevronLeft" />
        </button>
        <button
          className="icon-btn"
          type="button"
          aria-label="Older"
          disabled={paged.page >= paged.pages - 1}
          onClick={() => dispatch({ type: "page", page: paged.page + 1 })}
        >
          <Icon name="chevronRight" />
        </button>
        <div className="pop">
          <button className="icon-btn" type="button" aria-label="More" onClick={() => setMoreOpen((v) => !v)}>
            <Icon name="more" />
          </button>
          {moreOpen ? (
            <div className="menu align-right">
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  dispatch({ type: "markAllRead" });
                  setMoreOpen(false);
                }}
              >
                Mark all as read
              </button>
              {state.view === "trash" ? (
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    dispatch({ type: "confirm", confirm: { kind: "emptyTrash" } });
                    setMoreOpen(false);
                  }}
                >
                  Empty trash now
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {state.settings.vacationOn && state.view === "inbox" && !searching ? (
        <button className="banner" type="button" onClick={() => dispatch({ type: "ui", patch: { settingsPage: true } })}>
          <Icon name="snooze" size={18} />
          <span>Vacation responder is on. {state.settings.vacationMessage}</span>
        </button>
      ) : null}
      {searching ? (
        <div className="search-chip">
          <span>Search results</span>
          <button type="button" onClick={() => dispatch({ type: "search", query: "" })}>
            {state.search}
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}
      {state.view === "inbox" && !searching ? (
        <div className="tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={state.category === tab.id}
              className={cx("tab", `tab-${tab.id}`, state.category === tab.id && "on")}
              onClick={() => dispatch({ type: "category", category: tab.id })}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
              {counts[tab.count] > 0 ? <em>{counts[tab.count]}</em> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="folder-line">{title}</div>
      )}
      <div className="rows">
        {total === 0 ? (
          <Empty view={state.view} searching={searching} category={state.category} />
        ) : (
          sections.map((section) => (
            <div key={section.id}>
              {section.title ? (
                <div className="section-label">
                  <span>{section.title}</span>
                  <em>{section.threads.length}</em>
                </div>
              ) : null}
              {section.threads.map((thread) => (
                <Row key={thread.id} thread={thread} onOpen={() => openRow(thread)} />
              ))}
            </div>
          ))
        )}
      </div>
      <span className="sr-only">{allIds.length} loaded</span>
    </section>
  );
}

function Row({ thread, onOpen }: { thread: Thread; onOpen: () => void }) {
  const { state, dispatch, me, openPalette } = useMail();
  const selected = state.selected.includes(thread.id);
  const labels = userLabelIds(thread, state.labels).slice(0, 3);
  const time = thread.labels.includes(SYS.SNOOZED) && thread.snoozedUntil
    ? formatFuture(thread.snoozedUntil)
    : thread.labels.includes(SYS.SCHEDULED) && thread.scheduledFor
      ? formatFuture(thread.scheduledFor)
      : formatListTime(activityOf(thread));
  const snippet = listSnippet(thread, state.search);
  return (
    <div
      className={cx(
        "row",
        thread.unread ? "is-unread" : "is-read",
        selected && "is-selected",
        state.cursorId === thread.id && "is-cursor",
        state.openThreadId === thread.id && "is-open",
      )}
      data-thread-id={thread.id}
      data-testid="mail-row"
      onClick={onOpen}
    >
      <span className="check-hit" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${listSubject(thread)}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            dispatch({ type: "toggleSelect", id: thread.id, shift: (event.nativeEvent as MouseEvent).shiftKey });
          }}
        />
      </span>
      <button
        className={cx("icon-btn tiny star", thread.labels.includes(SYS.STARRED) && "on")}
        type="button"
        aria-label={thread.labels.includes(SYS.STARRED) ? "Unstar" : "Star"}
        onClick={(event) => {
          event.stopPropagation();
          dispatch({ type: "star", ids: [thread.id] });
        }}
      >
        <Icon name="star" size={18} />
      </button>
      <button
        className={cx("icon-btn tiny imp", thread.labels.includes(SYS.IMPORTANT) && "on")}
        type="button"
        aria-label="Toggle important"
        onClick={(event) => {
          event.stopPropagation();
          dispatch({ type: "important", ids: [thread.id] });
        }}
      >
        <Icon name="important" size={16} />
      </button>
      <span className={cx("sender", thread.unread && "strong")}>{listSender(thread, me)}</span>
      <span className="content">
        {labels.map((label) => (
          <i key={label.id} className="chip" style={{ background: label.bg, color: label.color }}>
            {label.name}
          </i>
        ))}
        {hasDraftBadge(thread) ? <i className="draft-tag">Draft</i> : null}
        <span className={cx("subject", thread.unread && "strong")}>
          <Highlight text={listSubject(thread)} query={state.search} />
        </span>
        {hasAttachment(thread) ? <Icon name="attach" size={16} /> : null}
        <span className="snippet">
          <span className="snippet-dash"> — </span>
          <Highlight text={snippet} query={state.search} />
        </span>
      </span>
      <span className="when">{time}</span>
      <span className="row-actions">
        <button className="icon-btn tiny" type="button" aria-label="Archive" onClick={(event) => { event.stopPropagation(); dispatch({ type: "archive", ids: [thread.id] }); }}>
          <Icon name="archive" size={18} />
        </button>
        <button className="icon-btn tiny" type="button" aria-label="Delete" onClick={(event) => { event.stopPropagation(); dispatch({ type: "trash", ids: [thread.id] }); }}>
          <Icon name="trash" size={18} />
        </button>
        <button
          className="icon-btn tiny"
          type="button"
          aria-label={thread.unread ? "Mark as read" : "Mark as unread"}
          onClick={(event) => {
            event.stopPropagation();
            dispatch({ type: "read", ids: [thread.id], unread: !thread.unread });
          }}
        >
          <Icon name={thread.unread ? "mail" : "unread"} size={18} />
        </button>
        <button
          className="icon-btn tiny"
          type="button"
          aria-label="Snooze"
          onClick={(event) => {
            event.stopPropagation();
            openPalette("snooze", event.currentTarget, [thread.id]);
          }}
        >
          <Icon name="snooze" size={18} />
        </button>
      </span>
    </div>
  );
}

function Empty({ view, searching, category }: { view: Parameters<typeof emptyCopy>[0]; searching: boolean; category: Category }) {
  const copy = emptyCopy(view, searching, category);
  return (
    <div className="empty">
      <svg viewBox="0 0 120 80" width="120" height="80" aria-hidden="true">
        <rect x="8" y="16" width="104" height="56" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M10 20 60 48 110 20" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <strong>{copy.title}</strong>
      <p>{copy.body}</p>
    </div>
  );
}

function SelectBox({
  checked,
  partial,
  onChange,
  label,
}: {
  checked: boolean;
  partial: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = partial;
  }, [partial, checked]);
  return <input ref={ref} type="checkbox" checked={checked} aria-label={label} onChange={onChange} />;
}
