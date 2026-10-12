import { useState } from "react";
import { LABEL_COLORS, SYS } from "../constants";
import { cx, newId } from "../logic";
import { useMail } from "../store";
import type { MailView } from "../types";
import { Icon, type IconName } from "../icons";
import { LabelDialog } from "./Menus";

const MAIN: { view: MailView; label: string; icon: IconName; count?: "inbox" | "drafts" | "snoozed" | "scheduled" }[] = [
  { view: "inbox", label: "Inbox", icon: "inbox", count: "inbox" },
  { view: "starred", label: "Starred", icon: "star" },
  { view: "snoozed", label: "Snoozed", icon: "snooze", count: "snoozed" },
  { view: "sent", label: "Sent", icon: "send" },
  { view: "drafts", label: "Drafts", icon: "drafts", count: "drafts" },
  { view: "scheduled", label: "Scheduled", icon: "clock", count: "scheduled" },
  { view: "trash", label: "Trash", icon: "trash" },
];

const MORE: { view: MailView; label: string; icon: IconName }[] = [
  { view: "important", label: "Important", icon: "important" },
  { view: "all", label: "All Mail", icon: "all" },
  { view: "spam", label: "Spam", icon: "spam" },
];

export function Sidebar({ onCompose }: { onCompose: () => void }) {
  const { state, dispatch, counts } = useMail();
  const [more, setMore] = useState(false);
  const [editor, setEditor] = useState<{ id?: string; name: string; color: number } | null>(null);
  const moreActive = MORE.some((item) => item.view === state.view);
  const showMore = more || moreActive;

  return (
    <aside className={cx("sidebar", state.sidebarOpen && "is-open")} data-testid="sidebar">
      <button className="compose-btn" type="button" onClick={onCompose} data-testid="compose-open">
        <Icon name="pencil" size={22} />
        <span>Compose</span>
      </button>
      <nav className="nav" aria-label="Mailbox">
        {MAIN.map((item) => (
          <NavButton
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={!state.search && state.view === item.view && !state.settingsPage}
            count={item.count ? counts[item.count] : 0}
            testid={`nav-${item.view}`}
            onClick={() => dispatch({ type: "view", view: item.view })}
          />
        ))}
        <button className="nav-item more-toggle" type="button" onClick={() => setMore((value) => !value)}>
          <Icon name={showMore ? "expand" : "chevronDown"} />
          <span className="nav-text">{showMore ? "Less" : "More"}</span>
        </button>
        {showMore
          ? MORE.map((item) => (
              <NavButton
                key={item.view}
                icon={item.icon}
                label={item.label}
                active={!state.search && state.view === item.view && !state.settingsPage}
                count={0}
                testid={`nav-${item.view}`}
                onClick={() => dispatch({ type: "view", view: item.view })}
              />
            ))
          : null}
      </nav>
      <div className="labels-block">
        <div className="side-label">
          <span>Labels</span>
          <button
            className="icon-btn tiny"
            type="button"
            aria-label="Create label"
            onClick={() => setEditor({ name: "", color: 1 })}
          >
            <Icon name="add" size={18} />
          </button>
        </div>
        {state.labels.map((label) => {
          const count = state.threads.filter(
            (thread) => thread.labels.includes(label.id) && thread.unread && thread.labels.includes(SYS.INBOX) && !thread.labels.includes(SYS.TRASH),
          ).length;
          return (
            <button
              key={label.id}
              type="button"
              className={cx("nav-item label-row", !state.search && state.view === `label:${label.id}` && "active")}
              onClick={() => dispatch({ type: "view", view: `label:${label.id}` })}
            >
              <i className="label-dot" style={{ background: label.color }} />
              <span className="nav-text label-text">{label.name}</span>
              {count > 0 ? <em className="nav-count">{count}</em> : null}
              <span
                className="label-edit"
                role="button"
                tabIndex={0}
                aria-label={`Edit ${label.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  const color = Math.max(0, LABEL_COLORS.findIndex((item) => item.bg === label.bg));
                  setEditor({ id: label.id, name: label.name, color });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.stopPropagation();
                    setEditor({ id: label.id, name: label.name, color: 0 });
                  }
                }}
              >
                <Icon name="pencil" size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <LabelDialog
        editor={editor}
        onClose={() => setEditor(null)}
        onSave={(name, color) => {
          const swatch = LABEL_COLORS[color] ?? LABEL_COLORS[0];
          if (editor?.id) {
            dispatch({ type: "updateLabel", id: editor.id, name, bg: swatch.bg, color: swatch.color });
          } else {
            const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "label";
            const id = state.labels.some((label) => label.id === base) ? newId("label") : base;
            dispatch({ type: "createLabel", label: { id, name, bg: swatch.bg, color: swatch.color } });
          }
          setEditor(null);
        }}
      />
    </aside>
  );
}

function NavButton({
  icon,
  label,
  active,
  count,
  onClick,
  testid,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button className={cx("nav-item", active && "active")} type="button" onClick={onClick} data-testid={testid} title={label}>
      <Icon name={icon} />
      <span className="nav-text">{label}</span>
      {count > 0 ? <em className="nav-count">{count}</em> : null}
    </button>
  );
}
