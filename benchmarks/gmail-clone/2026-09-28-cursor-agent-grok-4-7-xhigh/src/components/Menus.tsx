import { useEffect, useState } from "react";
import { LABEL_COLORS, SYS } from "../constants";
import { schedulePresets, snoozePresets } from "../logic";
import { useMail } from "../store";
import { Icon } from "../icons";

export function Snackbar() {
  const { state, dispatch } = useMail();
  if (!state.snack) return null;
  return (
    <div className="snack" role="status" data-testid="snackbar">
      <span>{state.snack.text}</span>
      {state.snack.history ? (
        <button type="button" onClick={() => dispatch({ type: "undo" })}>
          Undo
        </button>
      ) : null}
    </div>
  );
}

export function Shortcuts() {
  const { state, dispatch } = useMail();
  if (!state.shortcutsOpen) return null;
  const rows: [string, string][] = [
    ["c", "Compose"],
    ["/", "Search"],
    ["j / k", "Next / previous"],
    ["o or Enter", "Open"],
    ["u", "Back to list"],
    ["x", "Select"],
    ["s", "Star"],
    ["e", "Archive"],
    ["#", "Delete"],
    ["!", "Report spam"],
    ["r", "Reply"],
    ["a", "Reply all"],
    ["f", "Forward"],
    ["Shift+I", "Mark read"],
    ["Shift+U", "Mark unread"],
    ["+", "Important"],
    ["z", "Undo"],
    ["l", "Label"],
    ["v", "Move"],
    ["b", "Snooze"],
    ["g then i", "Inbox"],
    ["g then s", "Starred"],
    ["g then t", "Sent"],
    ["g then d", "Drafts"],
    ["g then z", "Snoozed"],
    ["g then x", "Trash"],
    ["g then a", "All Mail"],
    ["* then a", "Select all"],
    ["* then n", "Select none"],
    ["* then u", "Select unread"],
    ["?", "This shortcut list"],
  ];
  return (
    <div className="modal-back" onMouseDown={() => dispatch({ type: "ui", patch: { shortcutsOpen: false } })}>
      <div
        className="modal shortcuts"
        role="dialog"
        aria-label="Keyboard shortcuts"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <strong>Keyboard shortcuts</strong>
          <button className="icon-btn" type="button" aria-label="Close" onClick={() => dispatch({ type: "ui", patch: { shortcutsOpen: false } })}>
            <Icon name="close" />
          </button>
        </header>
        <div className="shortcut-grid">
          {rows.map(([key, label]) => (
            <div key={key} className="shortcut">
              <kbd>{key}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog() {
  const { state, dispatch } = useMail();
  if (!state.confirm) return null;
  const confirm = state.confirm;
  const copy =
    confirm.kind === "emptyTrash"
      ? { title: "Empty trash?", body: "Conversations in Trash will be deleted forever. You can still undo for a few seconds.", ok: "Empty trash" }
      : confirm.kind === "forever"
        ? { title: "Delete forever?", body: "This removes the selected conversations from the mailbox.", ok: "Delete forever" }
        : { title: "Delete label?", body: "The label comes off every conversation. The mail stays where it is.", ok: "Delete label" };
  return (
    <div className="modal-back" onMouseDown={() => dispatch({ type: "confirm", confirm: null })}>
      <div className="modal narrow" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <strong>{copy.title}</strong>
        </header>
        <p>{copy.body}</p>
        <div className="modal-actions">
          <button type="button" className="text-btn" onClick={() => dispatch({ type: "confirm", confirm: null })}>
            Cancel
          </button>
          <button
            type="button"
            className="danger-btn"
            onClick={() => {
              if (confirm.kind === "emptyTrash") dispatch({ type: "emptyTrash" });
              else if (confirm.kind === "forever") dispatch({ type: "forever", ids: confirm.ids });
              else dispatch({ type: "deleteLabel", id: confirm.id });
            }}
          >
            {copy.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaletteMenu() {
  const { state, dispatch, menuPos, paletteIds } = useMail();
  const [when, setWhen] = useState("");
  useEffect(() => {
    if (!state.palette) return;
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest?.("[data-palette-root]")) return;
      dispatch({ type: "ui", patch: { palette: null } });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "ui", patch: { palette: null } });
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [state.palette, dispatch]);
  if (!state.palette || !menuPos) return null;
  const ids = paletteIds();
  const presets = state.palette === "snooze" ? snoozePresets().filter((item) => ["later", "tomorrow", "weekend", "week"].includes(item.id)) : schedulePresets();
  return (
    <div className="palette" data-palette-root style={{ top: menuPos.top, left: menuPos.left }} role="menu">
      {ids.length === 0 ? <p className="menu-empty">Select a conversation first.</p> : null}
      {state.palette === "label" || state.palette === "move" ? (
        <>
          {state.palette === "move" ? (
            <button type="button" className="menu-item" disabled={!ids.length} onClick={() => dispatch({ type: "restore", ids })}>
              Move to Inbox
            </button>
          ) : null}
          {state.labels.map((label) => {
            const on = ids.length > 0 && ids.every((id) => state.threads.find((thread) => thread.id === id)?.labels.includes(label.id));
            return (
              <button
                key={label.id}
                type="button"
                className="menu-item"
                disabled={!ids.length}
                onClick={() =>
                  dispatch(
                    state.palette === "move"
                      ? { type: "moveToLabel", ids, labelId: label.id }
                      : { type: "toggleLabel", ids, labelId: label.id },
                  )
                }
              >
                <i className="label-dot" style={{ background: label.color }} />
                <span>{label.name}</span>
                {state.palette === "label" && on ? <Icon name="check" size={16} /> : null}
              </button>
            );
          })}
        </>
      ) : (
        <>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="menu-item stack"
              disabled={!ids.length}
              onClick={() => dispatch({ type: "snooze", ids, until: preset.until })}
            >
              <span>{preset.label}</span>
              <small>{preset.hint}</small>
            </button>
          ))}
          <label className="menu-date">
            <span>Pick a time</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(event) => {
                setWhen(event.target.value);
                const until = new Date(event.target.value).getTime();
                if (!Number.isNaN(until) && until > Date.now() && ids.length) dispatch({ type: "snooze", ids, until });
              }}
            />
          </label>
        </>
      )}
      {state.palette === "snooze" && ids.some((id) => state.threads.find((thread) => thread.id === id)?.labels.includes(SYS.SNOOZED)) ? (
        <button type="button" className="menu-item" onClick={() => dispatch({ type: "unsnooze", ids })}>
          Unsnooze
        </button>
      ) : null}
    </div>
  );
}

export function LabelDialog({
  editor,
  onClose,
  onSave,
  onDelete,
}: {
  editor: { id?: string; name: string; color: number } | null;
  onClose: () => void;
  onSave: (name: string, color: number) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(editor?.name ?? "");
  const [color, setColor] = useState(editor?.color ?? 1);
  useEffect(() => {
    setName(editor?.name ?? "");
    setColor(editor?.color ?? 1);
  }, [editor]);
  if (!editor) return null;
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <form
        className="modal narrow"
        role="dialog"
        aria-label={editor.id ? "Edit label" : "New label"}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onSave(name.trim(), color);
        }}
      >
        <header>
          <strong>{editor.id ? "Edit label" : "New label"}</strong>
          <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <label className="field">
          <span>Label name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={40} />
        </label>
        <div className="swatches">
          {LABEL_COLORS.map((swatch, index) => (
            <button
              key={swatch.bg}
              type="button"
              className={index === color ? "on" : ""}
              style={{ background: swatch.bg, color: swatch.color }}
              onClick={() => setColor(index)}
              aria-label={`Color ${index + 1}`}
            >
              {index === color ? <Icon name="check" size={16} /> : null}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          {editor.id && onDelete ? (
            <button type="button" className="text-btn danger" onClick={onDelete}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="send-btn" disabled={!name.trim()}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

