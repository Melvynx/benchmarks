import { useEffect, useState } from "react";
import { Modal } from "../ui/Overlays";
import { useMail } from "../store/mail";

export const LABEL_COLORS = [
  "#5f6368", "#1a73e8", "#12b5cb", "#00897b", "#0b8043", "#7cb342", "#f9ab00", "#e8710a",
  "#c5221f", "#d01884", "#8e24aa", "#3949ab",
];

export function LabelDialog({ open, editId, applyTo, onClose }: { open: boolean; editId?: string; applyTo?: string[]; onClose: () => void }) {
  const { state, api } = useMail();
  const editing = state.labels.find((l) => l.id === editId);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[1]);
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setColor(editing?.color ?? LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)]);
    }
  }, [open, editId]);
  const dup = state.labels.some((l) => l.id !== editId && l.name.toLowerCase() === name.trim().toLowerCase());
  const submit = () => {
    if (!name.trim() || dup) return;
    if (editing) api.updateLabel(editing.id, { name: name.trim(), color });
    else {
      const id = api.createLabel(name, color);
      if (applyTo?.length) api.applyLabels(applyTo, [id], []);
    }
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit label" : "New label"}
      footer={
        <>
          <button className="btn text" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!name.trim() || dup} onClick={submit}>
            {editing ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="field">
          <span>{editing ? "Label name" : "Please enter a new label name:"}</span>
          <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        {dup && <div className="field-error">A label with this name already exists.</div>}
        <div className="field">
          <span>Color</span>
          <div className="swatches">
            {LABEL_COLORS.map((c) => (
              <button type="button" key={c} className={"swatch" + (color === c ? " on" : "")} style={{ background: c }} aria-label={`Color ${c}`} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        {!!applyTo?.length && !editing && (
          <p className="muted small">
            The new label will be applied to {applyTo.length} conversation{applyTo.length === 1 ? "" : "s"}.
          </p>
        )}
      </form>
    </Modal>
  );
}
