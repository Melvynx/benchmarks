import { useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cloud,
  Download,
  Keyboard,
  Mail,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from "lucide-react";
import { contacts } from "../data";
import { type Label, type Mailbox, type Settings } from "../types";
import { Avatar, IconButton, Modal } from "./ui";

export function SettingsPanel({
  settings,
  onChange,
  onClose,
  onExport,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
  onExport: () => void;
}) {
  return (
    <Modal
      title="Make yourself at home"
      onClose={onClose}
      className="settings-modal"
    >
      <p className="modal-description">
        A few small touches, just the way you like them.
      </p>
      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="theme-options">
          {(["light", "dark"] as const).map((theme) => (
            <button
              key={theme}
              className={`theme-option ${theme} ${settings.theme === theme ? "selected" : ""}`}
              onClick={() => onChange({ ...settings, theme })}
            >
              <div className="theme-preview">
                <span />
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <span>
                {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "light" ? "Light & airy" : "After hours"}
                {settings.theme === theme && <Check size={15} />}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="settings-section">
        <h3>Inbox density</h3>
        <div className="segmented-control">
          {(["comfortable", "compact"] as const).map((density) => (
            <button
              key={density}
              className={settings.density === density ? "active" : ""}
              onClick={() => onChange({ ...settings, density })}
            >
              {density === "comfortable" ? "Comfortable" : "Compact"}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-section settings-switch">
        <div>
          <h3>Your signature</h3>
          <p>Add your name and role to new messages.</p>
        </div>
        <button
          className={`switch ${settings.signature ? "on" : ""}`}
          role="switch"
          aria-checked={settings.signature}
          aria-label="Email signature"
          onClick={() =>
            onChange({ ...settings, signature: !settings.signature })
          }
        >
          <span />
        </button>
      </div>
      <div className="local-info">
        <Cloud size={22} />
        <div>
          <b>Your inbox stays with you</b>
          <p>
            Messages, drafts, and preferences are saved in this browser.
            Everything works locally.
          </p>
        </div>
      </div>
      <button className="outline-button export-button" onClick={onExport}>
        <Download size={16} />
        Export mailbox backup
      </button>
    </Modal>
  );
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ["C", "Compose a message"],
    ["/", "Search your mail"],
    ["Esc", "Go back / close"],
    ["E", "Archive selection"],
    ["#", "Move to trash"],
    ["S", "Star a conversation"],
    ["U", "Mark as unread"],
    ["R", "Reply to a conversation"],
    ["J / K", "Next / previous conversation"],
    ["⌘ Enter", "Send a message"],
    ["?", "Open this guide"],
  ];
  return (
    <Modal
      title="A little help goes a long way"
      onClose={onClose}
      className="help-modal"
    >
      <p className="modal-description">
        Your familiar inbox, with a few thoughtful shortcuts.
      </p>
      <div className="help-heading">
        <Keyboard size={17} />
        <h3>Move at the speed of thought</h3>
      </div>
      <div className="shortcut-list">
        {shortcuts.map(([key, description]) => (
          <div key={key}>
            <span>{description}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
      </div>
      <div className="search-help">
        <Search size={17} />
        <div>
          <b>Find exactly what you’re looking for</b>
          <p>
            Try <code>from:sophie</code>, <code>is:unread</code>,{" "}
            <code>has:attachment</code>, or <code>label:work</code>. Combine
            them to narrow things down.
          </p>
        </div>
      </div>
      <div className="help-local">
        <CircleHelp size={15} />
        This is a local mailbox. Sent messages appear in Sent; no real emails
        are delivered.
      </div>
    </Modal>
  );
}

export function SearchModal({
  onClose,
  onSearch,
}: {
  onClose: () => void;
  onSearch: (query: string) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [words, setWords] = useState("");
  const [attachments, setAttachments] = useState(false);
  const [unread, setUnread] = useState(false);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(
      [
        from && `from:${from.includes(" ") ? `"${from}"` : from}`,
        to && `to:${to}`,
        subject && `subject:"${subject}"`,
        words,
        attachments && "has:attachment",
        unread && "is:unread",
      ]
        .filter(Boolean)
        .join(" "),
    );
    onClose();
  }
  return (
    <Modal title="Find a message" onClose={onClose}>
      <p className="modal-description">
        A few details can make all the difference.
      </p>
      <form onSubmit={submit} className="search-form">
        <label>
          From
          <input
            autoFocus
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Name or email address"
          />
        </label>
        <label>
          To
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Email address"
          />
        </label>
        <label>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's it about?"
          />
        </label>
        <label>
          Has the words
          <input
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder="Something you remember"
          />
        </label>
        <div className="search-checks">
          <label>
            <input
              type="checkbox"
              checked={attachments}
              onChange={(e) => setAttachments(e.target.checked)}
            />
            Has attachment
          </label>
          <label>
            <input
              type="checkbox"
              checked={unread}
              onChange={(e) => setUnread(e.target.checked)}
            />
            Unread only
          </label>
        </div>
        <button className="primary-button" type="submit">
          <Search size={16} />
          Search mail
        </button>
      </form>
    </Modal>
  );
}

export function LabelsModal({
  labels,
  applied,
  onApply,
  onClose,
  onCreate,
}: {
  labels: Label[];
  applied: string[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [selected, setSelected] = useState(applied);
  return (
    <Modal
      title="A place for everything"
      onClose={onClose}
      className="small-modal"
    >
      <p className="modal-description">
        Organize this conversation with labels.
      </p>
      <div className="label-options">
        {labels.map((label) => (
          <label key={label.id}>
            <span className="label-dot" style={{ background: label.color }} />
            <span>{label.name}</span>
            <input
              type="checkbox"
              checked={selected.includes(label.id)}
              onChange={() =>
                setSelected((prev) =>
                  prev.includes(label.id)
                    ? prev.filter((id) => id !== label.id)
                    : [...prev, label.id],
                )
              }
            />
          </label>
        ))}
      </div>
      <button className="text-button create-label-link" onClick={onCreate}>
        <Plus size={15} />
        Create new label
      </button>
      <div className="modal-actions">
        <button className="outline-button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary-button"
          onClick={() => {
            onApply(selected);
            onClose();
          }}
        >
          Apply labels
        </button>
      </div>
    </Modal>
  );
}

export function CreateLabelModal({
  onCreate,
  onClose,
  labels,
}: {
  onCreate: (label: Label) => void;
  onClose: () => void;
  labels: Label[];
}) {
  const colors = [
    "#6b8bf5",
    "#aa83df",
    "#66af91",
    "#dfad63",
    "#df879d",
    "#6da7bd",
  ];
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [error, setError] = useState("");
  return (
    <Modal title="Create a label" onClose={onClose} className="small-modal">
      <p className="modal-description">
        Give your conversations a little organization.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          if (
            labels.some(
              (l) => l.name.toLowerCase() === name.trim().toLowerCase(),
            )
          ) {
            setError("That label already exists. Try a different name.");
            return;
          }
          onCreate({ id: crypto.randomUUID(), name: name.trim(), color });
          onClose();
        }}
      >
        <label className="form-label">
          Label name
          <input
            autoFocus
            maxLength={32}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. A new adventure"
            required
          />
        </label>
        <label className="form-label">Choose a color</label>
        <div className="color-options">
          {colors.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`Color ${c}`}
              className={c === color ? "selected" : ""}
              style={{ background: c }}
              onClick={() => setColor(c)}
            >
              {c === color && <Check size={16} />}
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Create label
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SnoozeModal({
  onClose,
  onSnooze,
}: {
  onClose: () => void;
  onSnooze: (until: string) => void;
}) {
  const later = new Date(Date.now() + 3 * 3600000);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const nextWeek = new Date(tomorrow);
  nextWeek.setDate(nextWeek.getDate() + 6);
  const [custom, setCustom] = useState("");
  return (
    <Modal
      title="Come back to it later"
      onClose={onClose}
      className="small-modal"
    >
      <p className="modal-description">
        This conversation will return to your inbox when you’re ready.
      </p>
      <div className="snooze-options">
        {[
          ["Later today", later],
          ["Tomorrow", tomorrow],
          ["Next week", nextWeek],
        ].map(([label, value]) => (
          <button
            key={String(label)}
            onClick={() => {
              onSnooze((value as Date).toISOString());
              onClose();
            }}
          >
            <CalendarDays size={17} />
            <b>{String(label)}</b>
            <span>
              {(value as Date).toLocaleString("en-US", {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </button>
        ))}
      </div>
      <label className="form-label">
        Pick a date & time
        <input
          type="datetime-local"
          value={custom}
          min={new Date(Date.now() + 60000)
            .toLocaleString("sv")
            .slice(0, 16)
            .replace(" ", "T")}
          onChange={(e) => setCustom(e.target.value)}
        />
      </label>
      <button
        className="primary-button full-width"
        disabled={!custom || new Date(custom).getTime() <= Date.now()}
        onClick={() => {
          onSnooze(new Date(custom).toISOString());
          onClose();
        }}
      >
        Snooze until then
      </button>
    </Modal>
  );
}

export function UtilityPanel({
  type,
  mailbox,
  onUpdate,
  onClose,
  onCompose,
}: {
  type: string;
  mailbox: Mailbox;
  onUpdate: (change: Partial<Mailbox>) => void;
  onClose: () => void;
  onCompose: (email: string) => void;
}) {
  const [task, setTask] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const title = {
    calendar: "A little room in your day",
    tasks: "One thing at a time",
    notes: "A place for your thoughts",
    contacts: "Your people",
  }[type];
  const start = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <aside className="utility-panel">
      <div className="utility-heading">
        <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <IconButton icon={X} label="Close side panel" onClick={onClose} />
      </div>
      <h3>{title}</h3>
      {type === "calendar" && (
        <>
          <div className="calendar-heading">
            <b>
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </b>
            <IconButton
              icon={ChevronLeft}
              label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            />
            <IconButton
              icon={ChevronRight}
              label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            />
          </div>
          <div className="calendar-grid">
            {"SMTWTFS".split("").map((d, i) => (
              <span className="weekday" key={i}>
                {d}
              </span>
            ))}
            {Array.from({ length: start }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => (
              <button
                key={i}
                className={selectedDay === i + 1 ? "selected" : ""}
                onClick={() => setSelectedDay(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="day-agenda">
            <span className="eyebrow">
              {month.toLocaleDateString("en-US", { month: "long" })}{" "}
              {selectedDay}
            </span>
            {selectedDay === new Date().getDate() &&
            month.getMonth() === new Date().getMonth() &&
            month.getFullYear() === new Date().getFullYear() ? (
              <>
                <div className="calendar-event">
                  <i />
                  <div>
                    <b>A little focused work</b>
                    <span>9:00 – 10:00 AM · Personal</span>
                  </div>
                </div>
                <div className="calendar-event violet">
                  <i />
                  <div>
                    <b>Atlas design review</b>
                    <span>11:00 – 11:30 AM · Studio</span>
                  </div>
                </div>
                <div className="calendar-event green">
                  <i />
                  <div>
                    <b>A proper lunch break</b>
                    <span>12:30 – 1:30 PM · Personal</span>
                  </div>
                </div>
                <p className="panel-footnote">
                  Your sample day, with room to breathe.
                </p>
              </>
            ) : (
              <div className="free-day">
                <Sun size={28} />
                <b>A little open space</b>
                <p>Nothing on the calendar today.</p>
              </div>
            )}
          </div>
        </>
      )}
      {type === "tasks" && (
        <>
          <form
            className="add-task"
            onSubmit={(e) => {
              e.preventDefault();
              if (task.trim()) {
                onUpdate({
                  tasks: [
                    ...mailbox.tasks,
                    { id: crypto.randomUUID(), text: task.trim(), done: false },
                  ],
                });
                setTask("");
              }
            }}
          >
            <Plus size={17} />
            <input
              aria-label="New task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Add a little to-do"
            />
            <button type="submit" aria-label="Add task">
              <ChevronRight size={17} />
            </button>
          </form>
          <div className="task-list">
            {mailbox.tasks.map((t) => (
              <div key={t.id} className={t.done ? "done" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() =>
                      onUpdate({
                        tasks: mailbox.tasks.map((item) =>
                          item.id === t.id
                            ? { ...item, done: !item.done }
                            : item,
                        ),
                      })
                    }
                  />
                  <span>{t.text}</span>
                </label>
                <button
                  aria-label={`Delete task ${t.text}`}
                  onClick={() =>
                    onUpdate({
                      tasks: mailbox.tasks.filter((item) => item.id !== t.id),
                    })
                  }
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="task-progress">
            <CheckCheck size={17} />
            {mailbox.tasks.filter((t) => t.done).length} of{" "}
            {mailbox.tasks.length} complete. Small steps count.
          </div>
        </>
      )}
      {type === "notes" && (
        <>
          <p className="panel-description">
            The passing idea. The thing to remember.
          </p>
          <textarea
            className="notes-editor"
            aria-label="Personal notes"
            value={mailbox.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Start anywhere…"
          />
          <span className="notes-saved">
            <Check size={12} />
            Saved as you go
          </span>
        </>
      )}
      {type === "contacts" && (
        <>
          <label className="contact-search">
            <Search size={16} />
            <input
              aria-label="Find a contact"
              placeholder="Find someone"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
          </label>
          <div className="people-list">
            {contacts
              .filter((c) =>
                (c.name + c.email)
                  .toLowerCase()
                  .includes(contactSearch.toLowerCase()),
              )
              .map((c) => (
                <button key={c.email} onClick={() => onCompose(c.email)}>
                  <Avatar {...c} />
                  <span>
                    <b>{c.name}</b>
                    <small>{c.email}</small>
                  </span>
                  <Mail size={15} />
                </button>
              ))}
          </div>
        </>
      )}
    </aside>
  );
}
