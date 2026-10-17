import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMail } from "../store/mail";
import { contactFor, isMe } from "../data/contacts";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import type { Contact } from "../types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RecipientInput({
  label,
  value,
  onChange,
  autoFocus,
  right,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  autoFocus?: boolean;
  right?: React.ReactNode;
}) {
  const { state } = useMail();
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const freq = useMemo(() => {
    const f = new Map<string, number>();
    for (const t of state.threads)
      for (const m of t.messages) {
        const all = [m.from, ...m.to, ...(m.cc ?? [])];
        if (all.some(isMe)) for (const e of all) f.set(e, (f.get(e) ?? 0) + (isMe(m.from) ? 3 : 1));
      }
    return f;
  }, [state.threads]);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [] as Contact[];
    return state.contacts
      .filter((c) => c.kind === "person" && !isMe(c.email) && !value.includes(c.email))
      .filter((c) => c.email.toLowerCase().startsWith(q) || c.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || c.name.toLowerCase().startsWith(q))
      .sort((a, b) => (freq.get(b.email) ?? 0) - (freq.get(a.email) ?? 0))
      .slice(0, 6);
  }, [text, state.contacts, value, freq]);

  useLayoutEffect(() => {
    if (focused && suggestions.length && box.current) setRect(box.current.getBoundingClientRect());
  }, [focused, suggestions.length, text, value.length]);

  const commit = (raw: string) => {
    const parts = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().replace(/^<|>$/g, ""))
      .filter(Boolean);
    if (!parts.length) return;
    onChange(Array.from(new Set([...value, ...parts])));
    setText("");
  };
  const pick = (c: Contact) => {
    onChange([...value, c.email]);
    setText("");
    setActive(0);
    input.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
    } else if ((e.key === "Enter" || e.key === "Tab") && suggestions.length && text.trim()) {
      e.preventDefault();
      pick(suggestions[Math.min(active, suggestions.length - 1)]);
    } else if ((e.key === "Enter" || e.key === "," || e.key === ";" || (e.key === " " && EMAIL.test(text.trim()))) && text.trim()) {
      e.preventDefault();
      commit(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const showDrop = focused && suggestions.length > 0 && rect;

  return (
    <div className="field-row recipients" ref={box} onClick={() => input.current?.focus()}>
      <span className="field-label">{label}</span>
      <div className="chips">
        {value.map((e) => {
          const c = contactFor(e, state.contacts);
          const bad = !EMAIL.test(e);
          return (
            <span
              key={e}
              className={"rchip" + (bad ? " bad" : "")}
              data-tip={bad ? "This address is not valid" : `${c.name} <${e}>`}
              onDoubleClick={() => {
                onChange(value.filter((x) => x !== e));
                setText(e);
                setTimeout(() => input.current?.focus(), 0);
              }}
            >
              <Avatar contact={c} size={20} />
              <span className="rchip-name">{bad ? e : c.name === e ? e : c.name}</span>
              <button
                type="button"
                className="rchip-x"
                aria-label={`Remove ${e}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onChange(value.filter((x) => x !== e));
                }}
              >
                <Icon name="close" size={14} />
              </button>
            </span>
          );
        })}
        <input
          ref={input}
          value={text}
          autoFocus={autoFocus}
          aria-label={label === "To" ? "To recipients" : `${label} recipients`}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]$/.test(v)) commit(v.slice(0, -1));
            else {
              setText(v);
              setActive(0);
            }
          }}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 120);
            if (text.trim()) commit(text);
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (/[,;\n]/.test(t)) {
              e.preventDefault();
              commit(t);
            }
          }}
        />
      </div>
      {right}
      {showDrop &&
        createPortal(
          <div className="suggest" style={{ top: rect!.bottom + 2, left: rect!.left + 40, width: Math.min(380, rect!.width - 48) }}>
            {suggestions.map((c, i) => (
              <button
                key={c.email}
                type="button"
                className={"suggest-item" + (i === active ? " active" : "")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                onMouseEnter={() => setActive(i)}
              >
                <Avatar contact={c} size={32} />
                <span className="suggest-text">
                  <span className="strong">{c.name}</span>
                  <span className="muted small">{c.email}</span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
