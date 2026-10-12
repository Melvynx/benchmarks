import { useEffect, useState } from "react";
import type { MenuState } from "./types";
import { LABEL_COLORS } from "./types";
import { formatBytes, formatFull, mailboxLabel, presetMoments } from "./format";
import { Icon } from "./icons";
import { useMail } from "./store";
import { Avatar } from "./shell";

export function Overlays() {
  const mail = useMail();
  useEffect(() => {
    if (!mail.menu) return;
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-menu], [data-menu-root]")) return;
      mail.dispatch({ type: "menu", menu: null });
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [mail.menu, mail.dispatch]);

  return (
    <>
      <Menus />
      <Dialogs />
      {(mail.toast || mail.undo) && (
        <div className="toast" role="status">
          <span>{mail.toast ?? mail.undo?.label}</span>
          {mail.undo && <button onClick={() => mail.dispatch({ type: "undo" })}>Undo</button>}
        </div>
      )}
    </>
  );
}

function Menus() {
  const mail = useMail();
  const menu = mail.menu;
  if (!menu) return null;
  if (menu.type === "schedule") return null;
  if (menu.type === "row") {
    return (
      <div className="menu fixed" data-menu style={{ left: Math.min(menu.x, window.innerWidth - 240), top: Math.min(menu.y, window.innerHeight - 280) }}>
        <RowMenu threadId={menu.threadId} />
      </div>
    );
  }
  return (
    <div className="menu fixed" data-menu style={anchorStyle(menu)}>
      {menu.type === "account" && <AccountMenu />}
      {menu.type === "select" && <SelectMenu />}
      {menu.type === "search-tools" && <SearchTools />}
      {menu.type === "snooze" && <SnoozeMenu ids={menu.ids} />}
      {menu.type === "move" && <MoveMenu ids={menu.ids} />}
      {menu.type === "labels" && <LabelMenu ids={menu.ids} />}
      {menu.type === "more" && <MoreMenu ids={menu.ids} />}
    </div>
  );
}

function anchorStyle(menu: MenuState): { top: number; left: number } {
  if (menu.type === "account") return { top: 60, left: Math.max(12, window.innerWidth - 280) };
  if (menu.type === "search-tools") return { top: 60, left: Math.max(80, Math.min(window.innerWidth - 360, 280)) };
  return { top: 112, left: 96 };
}

function AccountMenu() {
  const mail = useMail();
  return (
    <>
      <div className="account-card">
        <Avatar name={mail.me.name} email={mail.me.email} size={40} />
        <strong>{mail.me.name}</strong>
        <span>{mail.me.email}</span>
      </div>
      <button onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "settings" } })}>Settings</button>
      <button onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "shortcuts" } })}>Keyboard shortcuts</button>
      <button onClick={() => mail.dispatch({ type: "check-mail" })}>Check for new mail</button>
      <hr />
      <button onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "confirm", title: "Reset mailbox?", body: "This restores the sample mailbox. Mail you sent, drafts, and labels you created in this browser will be cleared.", confirm: "Reset mailbox", danger: true, intent: { type: "reset" } } })}>Reset mailbox</button>
      <p className="quiet">A local mailbox. Nothing leaves this browser.</p>
    </>
  );
}

function SelectMenu() {
  const mail = useMail();
  const ids = mail.visible.map((thread) => thread.id);
  const choose = (next: string[]) => mail.dispatch({ type: "select-many", ids: next });
  return (
    <>
      <button onClick={() => choose(ids)}>All</button>
      <button onClick={() => choose([])}>None</button>
      <button onClick={() => choose(mail.visible.filter((thread) => thread.read).map((thread) => thread.id))}>Read</button>
      <button onClick={() => choose(mail.visible.filter((thread) => !thread.read).map((thread) => thread.id))}>Unread</button>
      <button onClick={() => choose(mail.visible.filter((thread) => thread.starred).map((thread) => thread.id))}>Starred</button>
    </>
  );
}

function SearchTools() {
  const mail = useMail();
  const add = (token: string) => {
    if (mail.query.includes(token)) return;
    mail.dispatch({ type: "query", query: `${mail.query} ${token}`.trim() });
    mail.dispatch({ type: "menu", menu: null });
  };
  return (
    <>
      <button onClick={() => add("is:unread")}>Unread <span className="hint">is:unread</span></button>
      <button onClick={() => add("is:starred")}>Starred <span className="hint">is:starred</span></button>
      <button onClick={() => add("has:attachment")}>Has attachment</button>
      <button onClick={() => add("in:sent")}>In sent</button>
      <button onClick={() => add("in:trash")}>In trash</button>
      <hr />
      <p className="quiet">Also try from:, to:, subject:, label:, filename:.</p>
    </>
  );
}

function SnoozeMenu({ ids }: { ids: string[] }) {
  const mail = useMail();
  const presets = presetMoments(new Date(mail.now));
  return (
    <>
      {presets.map((preset) => (
        <button key={preset.id} onClick={() => mail.dispatch({ type: "snooze", ids, until: preset.date.toISOString() })}>
          {preset.label}
          <span className="hint">{preset.hint}</span>
        </button>
      ))}
      <button onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "datetime", purpose: "snooze", ids } })}>Pick date and time</button>
    </>
  );
}

function MoveMenu({ ids }: { ids: string[] }) {
  const mail = useMail();
  return (
    <>
      <button onClick={() => mail.dispatch({ type: "move-inbox", ids })}>Inbox</button>
      <button onClick={() => mail.dispatch({ type: "spam", ids, spam: true })}>Spam</button>
      <button onClick={() => mail.dispatch({ type: "trash", ids })}>Trash</button>
      <hr />
      {mail.labels.map((label) => (
        <button key={label.id} onClick={() => mail.dispatch({ type: "move-to-label", ids, labelId: label.id })}>
          <span className="dot" style={{ background: label.color, width: 10, height: 10, borderRadius: 10 }} />
          {label.name}
        </button>
      ))}
    </>
  );
}

function LabelMenu({ ids }: { ids: string[] }) {
  const mail = useMail();
  return (
    <>
      {mail.labels.map((label) => {
        const checked = ids.every((id) => mail.threads.find((thread) => thread.id === id)?.labels.includes(label.id));
        return (
          <button key={label.id} onClick={() => mail.dispatch({ type: "label", ids, labelId: label.id })}>
            <Icon name={checked ? "check" : "tag"} size={16} />
            <span className="dot" style={{ background: label.color, width: 10, height: 10, borderRadius: 10 }} />
            {label.name}
          </button>
        );
      })}
      <hr />
      <button onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "label", applyTo: ids } })}>Create new</button>
    </>
  );
}

function MoreMenu({ ids }: { ids: string[] }) {
  const mail = useMail();
  const threads = mail.threads.filter((thread) => ids.includes(thread.id));
  const unread = threads.some((thread) => thread.read);
  return (
    <>
      <button onClick={() => mail.dispatch({ type: "read", ids, read: unread })}>{unread ? "Mark as unread" : "Mark as read"}</button>
      <button onClick={() => mail.dispatch({ type: "important", ids })}>Toggle important</button>
      <button onClick={() => mail.dispatch({ type: "star", ids })}>Toggle star</button>
      <button onClick={() => window.print()}>Print</button>
      <button onClick={() => mail.dispatch({ type: "spam", ids, spam: true })}>Report spam</button>
    </>
  );
}

function RowMenu({ threadId }: { threadId: string }) {
  const mail = useMail();
  const thread = mail.threads.find((item) => item.id === threadId);
  if (!thread) return null;
  const ids = [threadId];
  return (
    <>
      <button onClick={() => mail.dispatch({ type: "open", id: threadId })}>Open</button>
      <button onClick={() => mail.dispatch({ type: "compose", mode: "reply", threadId })}>Reply</button>
      <button onClick={() => mail.dispatch({ type: "star", ids })}>{thread.starred ? "Unstar" : "Star"}</button>
      <button onClick={() => mail.dispatch({ type: "read", ids, read: !thread.read })}>{thread.read ? "Mark as unread" : "Mark as read"}</button>
      <button onClick={() => mail.dispatch({ type: "archive", ids })}>Archive</button>
      <button onClick={() => mail.dispatch({ type: "trash", ids })}>Delete</button>
      <button onClick={() => mail.dispatch({ type: "menu", menu: { type: "snooze", ids } })}>Snooze</button>
    </>
  );
}

function Dialogs() {
  const mail = useMail();
  const dialog = mail.dialog;
  if (!dialog) return null;
  const close = () => mail.dispatch({ type: "dialog", dialog: null });
  return (
    <div className="dialog-scrim" onMouseDown={close}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={"title" in dialog ? dialog.title : dialog.type} onMouseDown={(event) => event.stopPropagation()}>
        {dialog.type === "settings" && <Settings />}
        {dialog.type === "shortcuts" && <Shortcuts />}
        {dialog.type === "label" && <LabelDialog applyTo={dialog.applyTo} />}
        {dialog.type === "confirm" && (
          <>
            <h2>{dialog.title}</h2>
            <p>{dialog.body}</p>
            <div className="dialog-actions">
              <button className="btn ghost" onClick={close}>Cancel</button>
              <button className={dialog.danger ? "btn danger" : "btn primary"} onClick={() => mail.dispatch({ type: "confirm", intent: dialog.intent })}>{dialog.confirm}</button>
            </div>
          </>
        )}
        {dialog.type === "attachment" && (
          <>
            <h2>{dialog.attachment.name}</h2>
            <p>{dialog.attachment.mime || "File"} · {formatBytes(dialog.attachment.size)}</p>
            {dialog.attachment.dataUrl ? <img className="preview-img" alt={dialog.attachment.name} src={dialog.attachment.dataUrl} /> : <p>This file is stored with the conversation by name and size.</p>}
            <div className="dialog-actions"><button className="btn primary" onClick={close}>Close</button></div>
          </>
        )}
        {dialog.type === "datetime" && <DateTime purpose={dialog.purpose} ids={dialog.ids} draftId={dialog.draftId} />}
      </div>
    </div>
  );
}

function Settings() {
  const mail = useMail();
  return (
    <>
      <h2>Settings</h2>
      <div className="settings-grid">
        <h3>Density</h3>
        <div className="choice">
          {(["default", "comfortable", "compact"] as const).map((density) => (
            <button key={density} className={mail.settings.density === density ? "on" : ""} onClick={() => mail.dispatch({ type: "settings", patch: { density } })}>{density}</button>
          ))}
        </div>
        <h3>Theme</h3>
        <div className="choice">
          {(["light", "dark", "system"] as const).map((theme) => (
            <button key={theme} className={mail.settings.theme === theme ? "on" : ""} onClick={() => mail.dispatch({ type: "settings", patch: { theme } })}>{theme}</button>
          ))}
        </div>
        <label className="toggle"><input type="checkbox" checked={mail.settings.readingPane} onChange={(event) => mail.dispatch({ type: "settings", patch: { readingPane: event.target.checked } })} /> Reading pane on the right</label>
        <label className="toggle"><input type="checkbox" checked={mail.settings.sortUnreadFirst} onChange={(event) => mail.dispatch({ type: "settings", patch: { sortUnreadFirst: event.target.checked } })} /> Unread first in Inbox</label>
        <label className="toggle"><input type="checkbox" checked={mail.settings.signatureOn} onChange={(event) => mail.dispatch({ type: "settings", patch: { signatureOn: event.target.checked } })} /> Include signature</label>
        <label className="stack">Signature
          <textarea rows={3} value={mail.settings.signature} onChange={(event) => mail.dispatch({ type: "settings", patch: { signature: event.target.value } })} />
        </label>
        <h3>Labels</h3>
        {mail.labels.map((label) => (
          <LabelRow key={label.id} id={label.id} name={label.name} color={label.color} />
        ))}
        <p className="quiet">Mailbox: {mailboxLabel(mail.mailbox, mail.labels)}. {mail.threads.length} conversations on this device.</p>
      </div>
    </>
  );
}

function LabelRow({ id, name, color }: { id: string; name: string; color: string }) {
  const mail = useMail();
  const [value, setValue] = useState(name);
  return (
    <div className="field" style={{ borderColor: "transparent" }}>
      <span className="dot" style={{ background: color, width: 10, height: 10, borderRadius: 10 }} />
      <input aria-label={`Rename ${name}`} value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => value.trim() && value !== name && mail.dispatch({ type: "rename-label", id, name: value.trim() })} />
      <button className="ib sm" aria-label={`Delete ${name}`} onClick={() => mail.dispatch({ type: "delete-label", id })}><Icon name="trash" size={16} /></button>
    </div>
  );
}

function LabelDialog({ applyTo }: { applyTo?: string[] }) {
  const mail = useMail();
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]);
  return (
    <>
      <h2>New label</h2>
      <label className="stack">Label name
        <input type="text" value={name} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && name.trim()) mail.dispatch({ type: "create-label", name, color, applyTo }); }} />
      </label>
      <div className="swatches" style={{ marginTop: 12 }}>
        {LABEL_COLORS.map((swatch) => (
          <button key={swatch} className={swatch === color ? "swatch on" : "swatch"} style={{ background: swatch }} aria-label={swatch} onClick={() => setColor(swatch)} />
        ))}
      </div>
      <div className="dialog-actions">
        <button className="btn ghost" onClick={() => mail.dispatch({ type: "dialog", dialog: null })}>Cancel</button>
        <button className="btn primary" disabled={!name.trim()} onClick={() => mail.dispatch({ type: "create-label", name, color, applyTo })}>Create</button>
      </div>
    </>
  );
}

function DateTime({ purpose, ids, draftId }: { purpose: "snooze" | "schedule"; ids?: string[]; draftId?: string }) {
  const mail = useMail();
  const [value, setValue] = useState("");
  return (
    <>
      <h2>{purpose === "snooze" ? "Snooze until" : "Schedule send"}</h2>
      <label className="stack">Date and time
        <input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <div className="dialog-actions">
        <button className="btn ghost" onClick={() => mail.dispatch({ type: "dialog", dialog: null })}>Cancel</button>
        <button
          className="btn primary"
          disabled={!value}
          onClick={() => {
            const when = new Date(value).toISOString();
            if (purpose === "snooze" && ids) mail.dispatch({ type: "snooze", ids, until: when });
            else if (draftId) mail.dispatch({ type: "send", id: draftId, when });
          }}
        >
          {purpose === "snooze" ? "Snooze" : "Schedule"}
        </button>
      </div>
      <p className="quiet">{value ? formatFull(new Date(value).toISOString()) : "Choose a time in the future."}</p>
    </>
  );
}

function Shortcuts() {
  const rows = [
    ["c", "Compose"],
    ["r / a / f", "Reply, reply all, forward"],
    ["⌘/Ctrl + Enter", "Send"],
    ["/", "Search"],
    ["j / k", "Next / previous"],
    ["o or Enter", "Open"],
    ["u", "Back to list"],
    ["x", "Select"],
    ["s", "Star"],
    ["e", "Archive"],
    ["#", "Delete"],
    ["Shift + I / U", "Mark read / unread"],
    ["g then i", "Go to Inbox"],
    ["g then s / t / d", "Starred, Sent, Drafts"],
    ["?", "This list"],
    ["Esc", "Close what is open"],
  ];
  return (
    <>
      <h2>Keyboard shortcuts</h2>
      <table className="keys">
        <tbody>
          {rows.map(([key, action]) => (
            <tr key={key}><td><kbd>{key}</kbd></td><td>{action}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
