import { Plus } from "lucide-react";
import { useEffect } from "react";
import { ComposeDock } from "./components/Compose";
import { MailList } from "./components/MailList";
import { Modal } from "./components/overlay";
import { Sidebar } from "./components/Sidebar";
import { ThreadView } from "./components/ThreadView";
import { Toolbar } from "./components/Toolbar";
import { TopBar } from "./components/TopBar";
import { useMail } from "./state/mail-context";
import type { Density, ThemeChoice } from "./types";

export function Shell() {
  const mail = useMail();
  const { data, ui, mobile, split, snack, undo, patchUi, dispatch } = mail;
  const showList = !ui.activeThreadId || split;
  const showReader = Boolean(ui.activeThreadId) || split;

  useEffect(() => {
    if (!ui.accountOpen) return;
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".account-pop") || target.closest(".avatar")) return;
      patchUi({ accountOpen: false });
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [patchUi, ui.accountOpen]);

  if (!data.signedIn) {
    return (
      <main className="signed-out">
        <section>
          <h1>Grok 4.7</h1>
          <p>Local mailbox for Jordan Hale. Nothing leaves this browser.</p>
          <button type="button" className="btn primary" onClick={() => dispatch({ type: "sign-in" })}>
            Continue
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="app" data-collapsed={ui.navCollapsed && !mobile ? "true" : "false"} data-density={data.settings.density}>
      <TopBar />
      <Sidebar />
      {ui.navOpen && mobile && <button type="button" className="backdrop" aria-label="Close navigation" onClick={() => patchUi({ navOpen: false })} />}
      <div className={`main-card ${split ? "split" : ""} ${!showList ? "reader-only" : ""}`}>
        {showList && (
          <div className="list-column">
            <Toolbar variant="list" />
            <MailList />
          </div>
        )}
        {showReader && <ThreadView />}
      </div>
      <ComposeDock />
      {mobile && !ui.composeId && !ui.activeThreadId && (
        <button type="button" className="fab" aria-label="Compose" onClick={mail.composeNew}>
          <Plus size={24} />
        </button>
      )}
      {snack && (
        <div className="snack" role="status">
          <span>{snack.text}</span>
          <button type="button" onClick={undo}>
            Undo
          </button>
        </div>
      )}
      {ui.helpOpen && <Help onClose={() => patchUi({ helpOpen: false })} />}
      {ui.settingsOpen && <Settings onClose={() => patchUi({ settingsOpen: false })} />}
    </div>
  );
}

function Help({ onClose }: { onClose: () => void }) {
  const rows = [
    ["c", "Compose"],
    ["/", "Search"],
    ["j / k", "Next / previous"],
    ["Enter", "Open"],
    ["u", "Back to list"],
    ["x", "Select"],
    ["s", "Star"],
    ["e", "Archive"],
    ["#", "Trash"],
    ["r", "Reply"],
    ["a", "Reply all"],
    ["f", "Forward"],
    ["Shift + I", "Mark read"],
    ["Shift + U", "Mark unread"],
    ["g then i", "Go to Inbox"],
    ["g then t", "Go to Sent"],
    ["z", "Undo"],
    ["?", "Shortcuts"],
    ["⌘/Ctrl + Enter", "Send"],
  ];
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} wide>
      <div className="shortcuts">
        {rows.map(([key, label]) => (
          <div key={key}>
            <kbd>{key}</kbd>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const { data, dispatch } = useMail();
  const { settings } = data;
  return (
    <Modal title="Settings" onClose={onClose} wide>
      <div className="settings">
        <fieldset>
          <legend>Theme</legend>
          <div className="segmented">
            {(["light", "dark", "system"] as ThemeChoice[]).map((theme) => (
              <button key={theme} type="button" className={settings.theme === theme ? "on" : ""} onClick={() => dispatch({ type: "settings", patch: { theme } })}>
                {theme}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Density</legend>
          <div className="segmented">
            {(["compact", "default", "comfortable"] as Density[]).map((density) => (
              <button key={density} type="button" className={settings.density === density ? "on" : ""} onClick={() => dispatch({ type: "settings", patch: { density } })}>
                {density}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.previewPane}
            onChange={(event) => dispatch({ type: "settings", patch: { previewPane: event.target.checked } })}
          />
          Preview pane on wide screens
        </label>
        <label className="stack">
          <span>Display name</span>
          <input value={settings.displayName} onChange={(event) => dispatch({ type: "settings", patch: { displayName: event.target.value } })} />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.signatureOn}
            onChange={(event) => dispatch({ type: "settings", patch: { signatureOn: event.target.checked } })}
          />
          Append signature when sending
        </label>
        <label className="stack">
          <span>Signature</span>
          <textarea value={settings.signature} rows={4} onChange={(event) => dispatch({ type: "settings", patch: { signature: event.target.value } })} />
        </label>
        <div className="label-editor">
          <span>Labels</span>
          {data.labels.map((label) => (
            <div key={label.id} className="label-row">
              <i style={{ background: label.color }} />
              <input
                value={label.name}
                aria-label={`Rename ${label.name}`}
                onChange={(event) => dispatch({ type: "rename-label", id: label.id, name: event.target.value })}
              />
              <button type="button" className="text-btn danger" onClick={() => dispatch({ type: "delete-label", id: label.id })}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: "reset" })}>
            Restore sample mailbox
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
