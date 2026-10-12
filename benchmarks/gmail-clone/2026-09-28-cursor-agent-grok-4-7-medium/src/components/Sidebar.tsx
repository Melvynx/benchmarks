import { AlertOctagon, Clock3, FileText, Inbox, Mail, Plus, Send, Star, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Mailbox } from "../types";
import { useMail } from "../state/mail-context";
import { LABEL_COLORS, Modal } from "./overlay";

const MAIN: { id: Mailbox; label: string; icon: typeof Inbox; countKey?: "inbox" | "snoozed" | "drafts" | "scheduled" | "spam" }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox, countKey: "inbox" },
  { id: "starred", label: "Starred", icon: Star },
  { id: "snoozed", label: "Snoozed", icon: Clock3, countKey: "snoozed" },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText, countKey: "drafts" },
  { id: "scheduled", label: "Scheduled", icon: Clock3, countKey: "scheduled" },
];

const EXTRA: { id: Mailbox; label: string; icon: typeof Inbox; countKey?: "spam" }[] = [
  { id: "all", label: "All Mail", icon: Mail },
  { id: "spam", label: "Spam", icon: AlertOctagon, countKey: "spam" },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export function Sidebar() {
  const { data, ui, counts, go, composeNew, patchUi, dispatch, mobile } = useMail();
  const collapsed = ui.navCollapsed && !mobile;
  const [confirmTrash, setConfirmTrash] = useState(false);

  return (
    <aside className={`nav ${ui.navOpen ? "open" : ""}`} aria-label="Mailboxes">
      <div className="nav-scroll">
        <button type="button" className="compose-btn" onClick={composeNew}>
          <Plus size={22} strokeWidth={1.75} />
          <span>Compose</span>
        </button>
        {MAIN.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            count={item.countKey ? counts[item.countKey] : 0}
            active={!ui.query && ui.mailbox === item.id}
            collapsed={collapsed}
            onClick={() => go(item.id)}
          />
        ))}
        <div className="nav-section">
          <span>Labels</span>
          <button type="button" className="icon-btn tiny" aria-label="Create label" onClick={() => patchUi({ createLabelOpen: true })}>
            <Plus size={16} />
          </button>
        </div>
        {data.labels.map((label) => (
          <button
            key={label.id}
            type="button"
            className={`nav-item ${!ui.query && ui.mailbox === `label:${label.id}` ? "active" : ""}`}
            onClick={() => go(`label:${label.id}`)}
            title={label.name}
          >
            <Tag size={18} color={label.color} />
            <span>{label.name}</span>
          </button>
        ))}
        <div className="nav-gap" />
        {EXTRA.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            count={item.countKey ? counts[item.countKey] : 0}
            active={!ui.query && ui.mailbox === item.id}
            collapsed={collapsed}
            onClick={() => go(item.id)}
          />
        ))}
        {ui.mailbox === "trash" && !collapsed && (
          <button type="button" className="text-btn danger" onClick={() => setConfirmTrash(true)}>
            Empty trash
          </button>
        )}
      </div>
      {ui.createLabelOpen && (
        <CreateLabel
          onClose={() => patchUi({ createLabelOpen: false })}
          onCreate={(name, color) => {
            dispatch({ type: "create-label", name, color });
            patchUi({ createLabelOpen: false });
          }}
        />
      )}
      {confirmTrash && (
        <Modal title="Empty trash" onClose={() => setConfirmTrash(false)}>
          <p className="modal-copy">Messages in Trash will be deleted forever.</p>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setConfirmTrash(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                dispatch({ type: "empty-trash" });
                patchUi({ activeThreadId: null, selected: [] });
                setConfirmTrash(false);
              }}
            >
              Empty trash
            </button>
          </div>
        </Modal>
      )}
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  count,
  active,
  collapsed,
  onClick,
}: {
  icon: typeof Inbox;
  label: string;
  count: number;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`nav-item ${active ? "active" : ""}`} onClick={onClick} title={label} aria-current={active ? "page" : undefined}>
      <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
      <span>{label}</span>
      {count > 0 && <em className="count">{count}</em>}
      {collapsed && <span className="sr-only">{label}</span>}
    </button>
  );
}

function CreateLabel({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, color: string) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[5]);
  return (
    <Modal title="New label" onClose={onClose}>
      <label className="stack">
        <span>Label name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} autoFocus placeholder="Clients" />
      </label>
      <div className="swatches" role="listbox" aria-label="Label color">
        {LABEL_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={`swatch ${swatch === color ? "on" : ""}`}
            style={{ background: swatch }}
            aria-label={swatch}
            onClick={() => setColor(swatch)}
          />
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn primary" disabled={!name.trim()} onClick={() => onCreate(name.trim(), color)}>
          Create
        </button>
      </div>
    </Modal>
  );
}

export function mailboxTitle(mailbox: Mailbox, labels: { id: string; name: string }[], query: string): string {
  if (query.trim()) return "Search results";
  if (mailbox.startsWith("label:")) {
    const id = mailbox.slice(6);
    return labels.find((label) => label.id === id)?.name ?? "Label";
  }
  const names: Record<string, string> = {
    inbox: "Inbox",
    starred: "Starred",
    snoozed: "Snoozed",
    sent: "Sent",
    drafts: "Drafts",
    scheduled: "Scheduled",
    all: "All Mail",
    spam: "Spam",
    trash: "Trash",
  };
  return names[mailbox] ?? "Mail";
}
