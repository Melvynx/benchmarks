import type { Attachment, Contact, Label, Thread } from "../types";
import { contactFor, isMe } from "../data/contacts";
import { Icon, type IconName } from "../ui/Icon";
import { fileSize } from "../lib/format";

export function Highlight({ text, terms }: { text: string; terms?: string[] }) {
  if (!terms?.length) return <>{text}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="hl">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function participants(t: Thread, contacts: Contact[], sentView = false) {
  if (sentView) {
    const to = new Set<string>();
    for (const m of t.messages) if (isMe(m.from)) m.to.forEach((e) => to.add(e));
    const names = [...to].map((e) => (isMe(e) ? "me" : contactFor(e, contacts).name.split(" ")[0]));
    return { parts: [{ name: "To: " + (names.join(", ") || "(no recipients)"), unread: false }], count: t.messages.length };
  }
  const seen = new Map<string, boolean>();
  for (const m of t.messages) {
    const prev = seen.get(m.from) ?? false;
    seen.set(m.from, prev || !!m.unread);
  }
  const multiple = seen.size > 1;
  const list = [...seen.entries()].map(([email, unread]) => {
    const c = contactFor(email, contacts);
    return { name: isMe(email) ? "me" : multiple ? c.name.split(" ")[0] : c.name, unread: unread || (t.unread && !multiple) };
  });
  const parts = list.length > 3 ? [list[0], { name: "…", unread: false }, ...list.slice(-2)] : list;
  return { parts, count: t.messages.length };
}

export function LabelChip({ label, onRemove }: { label: Label | { id: string; name: string; color: string }; onRemove?: () => void }) {
  return (
    <span className="label-chip" style={{ ["--lc" as string]: label.color }}>
      <span className="label-chip-text">{label.name}</span>
      {onRemove && (
        <button
          className="label-chip-x"
          aria-label={`Remove label ${label.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  );
}

const TYPE_ICON: Record<Attachment["type"], { icon: IconName; color: string }> = {
  pdf: { icon: "doc", color: "#d93025" },
  image: { icon: "image", color: "#d93025" },
  doc: { icon: "doc", color: "#1a73e8" },
  sheet: { icon: "doc", color: "#188038" },
  slides: { icon: "doc", color: "#f9ab00" },
  zip: { icon: "doc", color: "#5f6368" },
  other: { icon: "attach", color: "#5f6368" },
};

export function attIcon(a: Attachment) {
  return TYPE_ICON[a.type] ?? TYPE_ICON.other;
}

export function AttachmentPill({ a, onClick }: { a: Attachment; onClick?: (e: React.MouseEvent) => void }) {
  const t = attIcon(a);
  return (
    <button className="att-pill" onClick={onClick} data-tip={`${a.name} · ${fileSize(a.size)}`}>
      <Icon name={t.icon} size={16} style={{ color: t.color }} />
      <span className="ellipsis">{a.name}</span>
    </button>
  );
}

export function Checkbox({ checked, mixed, onChange, label }: { checked: boolean; mixed?: boolean; onChange: (e: React.MouseEvent) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={label}
      className="cb-btn"
      onClick={(e) => {
        e.stopPropagation();
        onChange(e);
      }}
    >
      <span className={"cb" + (checked ? " on" : mixed ? " mixed" : "")} />
    </button>
  );
}
