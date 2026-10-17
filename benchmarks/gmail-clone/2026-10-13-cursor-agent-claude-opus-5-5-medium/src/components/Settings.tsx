import { useState } from "react";
import { useMail } from "../store/mail";
import { Icon, IconButton } from "../ui/Icon";
import { Modal } from "../ui/Overlays";
import type { Density, Settings, Theme } from "../types";
import { useUI } from "./uiContext";

function Radio<T extends string>({ name, value, current, onChange, children }: { name: string; value: T; current: T; onChange: (v: T) => void; children: React.ReactNode }) {
  return (
    <label className="radio">
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} />
      <span className="radio-dot" />
      <span>{children}</span>
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

const DENSITY: { id: Density; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "comfortable", label: "Comfortable" },
  { id: "compact", label: "Compact" },
];

export function QuickSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, api } = useMail();
  const s = state.settings;
  const set = (p: Partial<Settings>) => api.updateSettings(p);
  return (
    <>
      {open && <div className="drawer-scrim" onClick={onClose} />}
      <aside className={"quick-settings" + (open ? " open" : "")} aria-hidden={!open} aria-label="Quick settings">
        <div className="qs-head">
          <h2>Quick settings</h2>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
        <button
          className="btn outline full"
          onClick={() => {
            onClose();
            window.location.hash = "#/settings";
          }}
        >
          See all settings
        </button>
        <section>
          <h3>Theme</h3>
          <div className="theme-cards">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button key={t} className={"theme-card t-" + t + (s.theme === t ? " on" : "")} onClick={() => set({ theme: t })} aria-pressed={s.theme === t}>
                <span className="theme-swatch" />
                <span>{t[0].toUpperCase() + t.slice(1)}</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <h3>Density</h3>
          {DENSITY.map((d) => (
            <Radio key={d.id} name="density" value={d.id} current={s.density} onChange={(v) => set({ density: v })}>
              {d.label}
            </Radio>
          ))}
        </section>
        <section>
          <h3>Inbox type</h3>
          <Radio name="tabs" value="tabs" current={s.inboxTabs ? "tabs" : "plain"} onChange={() => set({ inboxTabs: true })}>
            Default (with category tabs)
          </Radio>
          <Radio name="tabs" value="plain" current={s.inboxTabs ? "tabs" : "plain"} onChange={() => set({ inboxTabs: false })}>
            Everything in one list
          </Radio>
        </section>
        <section className="hide-mobile">
          <h3>Reading pane</h3>
          <Radio name="pane" value="none" current={s.readingPane} onChange={(v) => set({ readingPane: v })}>
            No split
          </Radio>
          <Radio name="pane" value="right" current={s.readingPane} onChange={(v) => set({ readingPane: v })}>
            Right of inbox
          </Radio>
        </section>
      </aside>
    </>
  );
}

export function SettingsPage() {
  const { state, api } = useMail();
  const ui = useUI();
  const s = state.settings;
  const set = (p: Partial<Settings>) => api.updateSettings(p);
  const [tab, setTab] = useState<"general" | "labels" | "inbox">("general");
  const [sig, setSig] = useState(s.signature);
  const [savedSig, setSavedSig] = useState(false);
  return (
    <section className="settings-page">
      <div className="settings-head">
        <h1>Settings</h1>
        <div className="settings-tabs" role="tablist">
          {(["general", "labels", "inbox"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={"settings-tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
              {t === "general" ? "General" : t === "labels" ? "Labels" : "Inbox"}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-body">
        {tab === "general" && (
          <div className="settings-grid">
            <div className="set-label">Theme:</div>
            <div className="set-control row-gap">
              {(["light", "dark", "system"] as Theme[]).map((t) => (
                <Radio key={t} name="s-theme" value={t} current={s.theme} onChange={(v) => set({ theme: v })}>
                  {t[0].toUpperCase() + t.slice(1)}
                </Radio>
              ))}
            </div>
            <div className="set-label">Maximum page size:</div>
            <div className="set-control">
              Show{" "}
              <select value={s.pageSize} onChange={(e) => set({ pageSize: +e.target.value })}>
                {[10, 15, 20, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>{" "}
              conversations per page
            </div>
            <div className="set-label">Undo Send:</div>
            <div className="set-control">
              Send cancellation period:{" "}
              <select value={s.undoSeconds} onChange={(e) => set({ undoSeconds: +e.target.value })}>
                {[5, 10, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>{" "}
              seconds
            </div>
            <div className="set-label">Density:</div>
            <div className="set-control row-gap">
              {DENSITY.map((d) => (
                <Radio key={d.id} name="s-density" value={d.id} current={s.density} onChange={(v) => set({ density: v })}>
                  {d.label}
                </Radio>
              ))}
            </div>
            <div className="set-label">Keyboard shortcuts:</div>
            <div className="set-control">
              <Radio name="s-kb" value="on" current={s.shortcuts ? "on" : "off"} onChange={() => set({ shortcuts: true })}>
                Keyboard shortcuts on
              </Radio>
              <Radio name="s-kb" value="off" current={s.shortcuts ? "on" : "off"} onChange={() => set({ shortcuts: false })}>
                Keyboard shortcuts off
              </Radio>
              <button className="link-btn" onClick={ui.openShortcuts}>
                Learn more
              </button>
            </div>
            <div className="set-label">Simulated replies:</div>
            <div className="set-control">
              <Toggle checked={s.autoReplies} onChange={(v) => set({ autoReplies: v })} label="Contacts reply to messages you send (demo)" />
            </div>
            <div className="set-label">Signature:</div>
            <div className="set-control">
              <textarea
                value={sig}
                rows={4}
                onChange={(e) => {
                  setSig(e.target.value);
                  setSavedSig(false);
                }}
              />
              <div className="row-gap">
                <button
                  className="btn primary"
                  disabled={sig === s.signature}
                  onClick={() => {
                    set({ signature: sig });
                    setSavedSig(true);
                  }}
                >
                  Save signature
                </button>
                {savedSig && (
                  <span className="muted small">
                    <Icon name="check" size={16} /> Saved — used for new messages and replies
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {tab === "labels" && (
          <div>
            <table className="labels-table">
              <thead>
                <tr>
                  <th>Labels</th>
                  <th>Conversations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.labels.map((l) => {
                  const n = state.threads.filter((t) => t.labels.includes(l.id)).length;
                  return (
                    <tr key={l.id}>
                      <td>
                        <span className="label-dot big" style={{ background: l.color }} /> {l.name}
                      </td>
                      <td className="muted">{n}</td>
                      <td>
                        <button className="link-btn" onClick={() => ui.openEditLabel(l.id)}>
                          edit
                        </button>
                        <button className="link-btn" onClick={() => api.deleteLabel(l.id)}>
                          remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="btn outline" onClick={() => ui.openCreateLabel()}>
              <Icon name="plus" size={18} /> Create new label
            </button>
          </div>
        )}
        {tab === "inbox" && (
          <div className="settings-grid">
            <div className="set-label">Inbox type:</div>
            <div className="set-control">
              <Radio name="s-tabs" value="tabs" current={s.inboxTabs ? "tabs" : "plain"} onChange={() => set({ inboxTabs: true })}>
                Default — Primary, Promotions, Social and Updates tabs
              </Radio>
              <Radio name="s-tabs" value="plain" current={s.inboxTabs ? "tabs" : "plain"} onChange={() => set({ inboxTabs: false })}>
                Everything in one list
              </Radio>
            </div>
            <div className="set-label">Reading pane:</div>
            <div className="set-control">
              <Radio name="s-pane" value="none" current={s.readingPane} onChange={(v) => set({ readingPane: v })}>
                No split
              </Radio>
              <Radio name="s-pane" value="right" current={s.readingPane} onChange={(v) => set({ readingPane: v })}>
                Right of inbox
              </Radio>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const SHORTCUTS: [string, string][][] = [
  [
    ["c", "Compose"],
    ["/", "Search mail"],
    ["?", "Open keyboard shortcuts"],
    ["j / k", "Older / newer conversation"],
    ["o or Enter", "Open conversation"],
    ["u", "Back to list"],
    ["x", "Select conversation"],
    ["Esc", "Close / deselect"],
  ],
  [
    ["e", "Archive"],
    ["#", "Delete"],
    ["!", "Report spam"],
    ["s", "Star / unstar"],
    ["+ / -", "Mark important / not"],
    ["Shift + i", "Mark as read"],
    ["Shift + u", "Mark as unread"],
    ["b", "Snooze"],
    ["l", "Label as"],
    ["v", "Move to"],
  ],
  [
    ["r", "Reply"],
    ["a", "Reply all"],
    ["f", "Forward"],
    ["⌘ + Enter", "Send (in compose)"],
    ["g then i", "Go to Inbox"],
    ["g then s", "Go to Starred"],
    ["g then t", "Go to Sent"],
    ["g then d", "Go to Drafts"],
    ["g then a", "Go to All Mail"],
    ["* then a / n / u", "Select all / none / unread"],
  ],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useMail();
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" width={860} className="shortcuts-modal">
      {!state.settings.shortcuts && <p className="field-error">Keyboard shortcuts are currently turned off in Settings.</p>}
      <div className="shortcut-cols">
        {SHORTCUTS.map((col, i) => (
          <dl key={i}>
            {col.map(([k, v]) => (
              <div key={k} className="shortcut">
                <dt>
                  {k.split(" ").map((p, j) => (p.length <= 5 && !["then", "or", "/", "+"].includes(p) ? <kbd key={j}>{p}</kbd> : <span key={j}> {p} </span>))}
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </Modal>
  );
}
