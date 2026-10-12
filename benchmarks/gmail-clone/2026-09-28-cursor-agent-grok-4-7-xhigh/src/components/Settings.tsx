import { useState } from "react";
import { LABEL_COLORS } from "../constants";
import { newId } from "../logic";
import { useMail } from "../store";
import { Icon } from "../icons";
import { LabelDialog } from "./Menus";

export function Settings() {
  const { state, dispatch } = useMail();
  const [editor, setEditor] = useState<{ id?: string; name: string; color: number } | null>(null);
  const s = state.settings;
  return (
    <section className="settings" data-testid="settings">
      <header className="settings-head">
        <button className="icon-btn" type="button" aria-label="Back" onClick={() => dispatch({ type: "ui", patch: { settingsPage: false } })}>
          <Icon name="back" />
        </button>
        <strong>Settings</strong>
      </header>
      <div className="settings-body">
        <h2>General</h2>
        <div className="setting-grid">
          <span>Density</span>
          <div className="choices">
            {(["default", "comfortable", "compact"] as const).map((density) => (
              <button key={density} type="button" className={s.density === density ? "on" : ""} onClick={() => dispatch({ type: "settings", patch: { density } })}>
                {density}
              </button>
            ))}
          </div>
          <span>Theme</span>
          <div className="choices">
            {(["light", "dark"] as const).map((theme) => (
              <button key={theme} type="button" className={s.theme === theme ? "on" : ""} onClick={() => dispatch({ type: "settings", patch: { theme } })}>
                {theme}
              </button>
            ))}
          </div>
          <span>Inbox type</span>
          <div className="choices">
            {(
              [
                ["default", "Default"],
                ["important", "Important first"],
                ["unread", "Unread first"],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" className={s.inboxType === value ? "on" : ""} onClick={() => dispatch({ type: "settings", patch: { inboxType: value } })}>
                {label}
              </button>
            ))}
          </div>
          <span>Reading pane</span>
          <label className="check-row">
            <input type="checkbox" checked={s.readingPane} onChange={(event) => dispatch({ type: "settings", patch: { readingPane: event.target.checked } })} />
            Show the conversation beside the list on wide screens
          </label>
          <span>Signature</span>
          <textarea value={s.signature} rows={4} onChange={(event) => dispatch({ type: "settings", patch: { signature: event.target.value } })} />
        </div>
        <h2>Vacation responder</h2>
        <label className="check-row">
          <input type="checkbox" checked={s.vacationOn} onChange={(event) => dispatch({ type: "settings", patch: { vacationOn: event.target.checked } })} />
          Vacation responder on
        </label>
        <label className="field">
          <span>Subject</span>
          <input value={s.vacationSubject} onChange={(event) => dispatch({ type: "settings", patch: { vacationSubject: event.target.value } })} />
        </label>
        <label className="field">
          <span>Message</span>
          <textarea rows={4} value={s.vacationMessage} onChange={(event) => dispatch({ type: "settings", patch: { vacationMessage: event.target.value } })} />
        </label>
        <p className="menu-note">The responder is local. It shows a banner in the inbox and does not send mail on your behalf.</p>
        <h2>Labels</h2>
        <ul className="label-admin">
          {state.labels.map((label) => (
            <li key={label.id}>
              <i style={{ background: label.color }} />
              <span>{label.name}</span>
              <button
                type="button"
                onClick={() => setEditor({ id: label.id, name: label.name, color: Math.max(0, LABEL_COLORS.findIndex((item) => item.bg === label.bg)) })}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="text-btn" onClick={() => setEditor({ name: "", color: 1 })}>
          Create label
        </button>
        <h2>Mailbox</h2>
        <p className="menu-note">Everything lives in this browser. Resetting restores the original seeded mail and removes local changes.</p>
        <button type="button" className="danger-btn" onClick={() => dispatch({ type: "reset", now: Date.now() })}>
          Reset mailbox
        </button>
      </div>
      <LabelDialog
        editor={editor}
        onClose={() => setEditor(null)}
        onDelete={() => {
          if (editor?.id) dispatch({ type: "confirm", confirm: { kind: "deleteLabel", id: editor.id } });
          setEditor(null);
        }}
        onSave={(name, color) => {
          const swatch = LABEL_COLORS[color] ?? LABEL_COLORS[0];
          if (editor?.id) dispatch({ type: "updateLabel", id: editor.id, name, bg: swatch.bg, color: swatch.color });
          else {
            const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "label";
            const id = state.labels.some((label) => label.id === base) ? newId("label") : base;
            dispatch({ type: "createLabel", label: { id, name, bg: swatch.bg, color: swatch.color } });
          }
          setEditor(null);
        }}
      />
    </section>
  );
}
