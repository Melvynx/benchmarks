import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Inbox,
  Mail,
  MailOpen,
  MoreVertical,
  RefreshCw,
  Tag,
  Trash2,
  AlertOctagon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { snoozePresets } from "../lib/format";
import { useMail } from "../state/mail-context";
import { PopMenu } from "./overlay";

export function Toolbar({ variant }: { variant: "list" | "thread" }) {
  const mail = useMail();
  const checkbox = useRef<HTMLInputElement>(null);
  const [spin, setSpin] = useState(false);
  const [menu, setMenu] = useState<{ id: "more" | "snooze" | "label" | "move"; anchor: HTMLElement } | null>(null);
  const ids = variant === "thread" ? (mail.ui.activeThreadId ? [mail.ui.activeThreadId] : []) : mail.ui.selected;
  const total = mail.threads.length;
  const allSelected = total > 0 && mail.ui.selected.length === total;
  const someSelected = mail.ui.selected.length > 0 && !allSelected;

  useEffect(() => {
    if (checkbox.current) checkbox.current.indeterminate = someSelected;
  }, [someSelected]);

  const showBulk = ids.length > 0;
  const inTrash = mail.ui.mailbox === "trash";
  const inSpam = mail.ui.mailbox === "spam";

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {variant === "thread" && !mail.split && (
          <button type="button" className="icon-btn" aria-label="Back to list" onClick={mail.closeThread}>
            <ChevronLeft size={20} />
          </button>
        )}
        {variant === "list" && (
          <label className="check">
            <input
              ref={checkbox}
              type="checkbox"
              aria-label="Select"
              checked={allSelected}
              onChange={() => (allSelected ? mail.clearSelection() : mail.selectMany(mail.threads.map((thread) => thread.threadId)))}
            />
          </label>
        )}
        {variant === "list" && !showBulk && (
          <button
            type="button"
            className={`icon-btn ${spin ? "spin" : ""}`}
            aria-label="Refresh"
            onClick={() => {
              setSpin(true);
              mail.dispatch({ type: "tick" }, { silent: true });
              window.setTimeout(() => setSpin(false), 600);
            }}
          >
            <RefreshCw size={18} />
          </button>
        )}
        {showBulk && (
          <>
            {!inTrash && !inSpam && (
              <button type="button" className="icon-btn" aria-label="Archive" onClick={() => mail.archive(ids)}>
                <Archive size={18} />
              </button>
            )}
            {(inTrash || inSpam || mail.ui.mailbox === "all") && (
              <button type="button" className="icon-btn" aria-label="Move to inbox" onClick={() => mail.moveToInbox(ids)}>
                <ArchiveRestore size={18} />
              </button>
            )}
            <button type="button" className="icon-btn" aria-label="Report spam" onClick={() => mail.spam(ids)}>
              <AlertOctagon size={18} />
            </button>
            <button type="button" className="icon-btn" aria-label="Delete" onClick={() => (inTrash ? mail.deleteForever(ids) : mail.trash(ids))}>
              <Trash2 size={18} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={variant === "thread" ? "Mark as unread" : "Mark as read"}
              onClick={() => mail.mark(ids, variant !== "thread")}
            >
              {variant === "thread" ? <Mail size={18} /> : <MailOpen size={18} />}
            </button>
            <button type="button" className="icon-btn" aria-label="Snooze" onClick={(event) => setMenu({ id: "snooze", anchor: event.currentTarget })}>
              <Clock3 size={18} />
            </button>
            <button type="button" className="icon-btn" aria-label="Move to" onClick={(event) => setMenu({ id: "move", anchor: event.currentTarget })}>
              <Inbox size={18} />
            </button>
            <button type="button" className="icon-btn" aria-label="Label" onClick={(event) => setMenu({ id: "label", anchor: event.currentTarget })}>
              <Tag size={18} />
            </button>
          </>
        )}
        <button type="button" className="icon-btn" aria-label="More" onClick={(event) => setMenu({ id: "more", anchor: event.currentTarget })}>
          <MoreVertical size={18} />
        </button>
        {variant === "list" && mail.ui.mailbox === "trash" && (
          <button type="button" className="text-btn" onClick={mail.emptyTrash}>
            Empty trash now
          </button>
        )}
      </div>
      {variant === "list" && total > 0 && (
        <div className="pager">
          <span>
            1–{total} of {total}
          </span>
          <button type="button" className="icon-btn" aria-label="Newer" disabled>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Older" disabled>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      {menu && (
        <PopMenu anchor={menu.anchor} onClose={() => setMenu(null)}>
          {menu.id === "snooze" && <SnoozeMenu ids={ids} onDone={() => setMenu(null)} />}
          {menu.id === "label" && <LabelMenu ids={ids} onDone={() => setMenu(null)} />}
          {menu.id === "move" && (
            <>
              <button type="button" className="menu-item" onClick={() => { mail.moveToInbox(ids); setMenu(null); }}>Inbox</button>
              <button type="button" className="menu-item" onClick={() => { mail.spam(ids); setMenu(null); }}>Spam</button>
              <button type="button" className="menu-item" onClick={() => { mail.trash(ids); setMenu(null); }}>Trash</button>
            </>
          )}
          {menu.id === "more" && (
            <>
              <button type="button" className="menu-item" onClick={() => { mail.mark(ids.length ? ids : mail.threads.map((thread) => thread.threadId), true); setMenu(null); }}>
                Mark as read
              </button>
              <button type="button" className="menu-item" onClick={() => { mail.mark(ids.length ? ids : undefined, false); setMenu(null); }}>
                Mark as unread
              </button>
              <button type="button" className="menu-item" onClick={() => { mail.star(ids); setMenu(null); }}>
                Star
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  if (ids.length) mail.dispatch({ type: "important", threadIds: ids });
                  setMenu(null);
                }}
              >
                Toggle important
              </button>
              {variant === "list" && (
                <>
                  <button type="button" className="menu-item" onClick={() => { mail.selectMany(mail.threads.filter((thread) => thread.unread).map((thread) => thread.threadId)); setMenu(null); }}>
                    Select unread
                  </button>
                  <button type="button" className="menu-item" onClick={() => { mail.selectMany(mail.threads.filter((thread) => thread.starred).map((thread) => thread.threadId)); setMenu(null); }}>
                    Select starred
                  </button>
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      mail.dispatch({ type: "settings", patch: { previewPane: !mail.data.settings.previewPane } });
                      setMenu(null);
                    }}
                  >
                    {mail.data.settings.previewPane ? "Hide preview pane" : "Show preview pane"}
                  </button>
                </>
              )}
              {variant === "thread" && (
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    window.print();
                    setMenu(null);
                  }}
                >
                  Print
                </button>
              )}
            </>
          )}
        </PopMenu>
      )}
    </div>
  );
}

function SnoozeMenu({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { snooze } = useMail();
  const presets = snoozePresets();
  return (
    <>
      <p className="menu-label">Snooze until</p>
      {presets.map((preset) => (
        <button key={preset.id} type="button" className="menu-item" onClick={() => { snooze(ids, preset.until); onDone(); }}>
          <span>{preset.label}</span>
          <em>{preset.hint}</em>
        </button>
      ))}
      <label className="menu-item picker">
        <span>Pick date & time</span>
        <input
          type="datetime-local"
          onChange={(event) => {
            const until = new Date(event.target.value).getTime();
            if (!Number.isNaN(until)) {
              snooze(ids, until);
              onDone();
            }
          }}
        />
      </label>
    </>
  );
}

function LabelMenu({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { data, setLabel, patchUi } = useMail();
  return (
    <>
      <p className="menu-label">Label as</p>
      {data.labels.map((label) => {
        const relevant = data.messages.filter((message) => ids.includes(message.threadId));
        const on = relevant.length > 0 && relevant.every((message) => message.labels.includes(label.id));
        return (
          <label key={label.id} className="menu-item check-item">
            <input
              type="checkbox"
              checked={on}
              onChange={() => setLabel(ids, label.id, !on)}
            />
            <i style={{ background: label.color }} />
            <span>{label.name}</span>
          </label>
        );
      })}
      <button type="button" className="menu-item" onClick={() => { patchUi({ createLabelOpen: true }); onDone(); }}>
        Create new
      </button>
    </>
  );
}
