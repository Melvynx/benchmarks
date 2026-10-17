import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMail } from "../lib/store";
import type { Address } from "../lib/types";
import { cn, colorFor, initials, isValidEmail, parseAddress } from "../lib/utils";
import { Avatar, Icon, Tip } from "./ui";

function useContactRank() {
  const messages = useMail((s) => s.messages);
  return useMemo(() => {
    const freq = new Map<string, number>();
    for (const m of Object.values(messages)) {
      for (const a of [m.from, ...m.to, ...m.cc]) freq.set(a.email.toLowerCase(), (freq.get(a.email.toLowerCase()) || 0) + (m.status === "sent" ? 3 : 1));
    }
    return freq;
  }, [messages]);
}

export function RecipientField({
  label,
  value,
  onChange,
  autoFocus,
  trailing,
  onFocusChange,
}: {
  label: string;
  value: Address[];
  onChange: (v: Address[]) => void;
  autoFocus?: boolean;
  trailing?: ReactNode;
  onFocusChange?: (focused: boolean) => void;
}) {
  const contacts = useMail((s) => s.contacts);
  const me = useMail((s) => s.account);
  const rank = useContactRank();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(value.map((v) => v.email.toLowerCase()));
    const pool = [...Object.values(contacts), { name: me.name, email: me.email }];
    return pool
      .filter((c) => !taken.has(c.email.toLowerCase()))
      .map((c) => {
        const n = c.name.toLowerCase();
        const e = c.email.toLowerCase();
        const score = n.startsWith(q) || e.startsWith(q) ? 3 : n.split(/\s+/).some((w) => w.startsWith(q)) ? 2 : n.includes(q) || e.includes(q) ? 1 : 0;
        return { c, score: score ? score * 1000 + (rank.get(e) || 0) : 0 };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.c);
  }, [text, contacts, value, rank, me]);

  const commit = (raw: string) => {
    const parts = raw.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const add: Address[] = [];
    for (const p of parts) {
      const a = parseAddress(p);
      if (!a) continue;
      const known = contacts[a.email.toLowerCase()];
      if (known && !a.name) a.name = known.name;
      if (!value.some((v) => v.email.toLowerCase() === a.email.toLowerCase()) && !add.some((v) => v.email === a.email)) add.push(a);
    }
    onChange([...value, ...add]);
    setText("");
  };

  const pick = (c: Address) => {
    onChange([...value, { name: c.name, email: c.email }]);
    setText("");
    setActive(0);
    inputRef.current?.focus();
  };

  const showList = focused && suggestions.length > 0;

  return (
    <div className="relative">
      <div
        className="flex min-h-10 cursor-text flex-wrap items-center gap-1 border-b border-line py-1"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="mr-1 font-body text-sm text-fg-3">{label}</span>
        {value.map((a, i) => {
          const valid = isValidEmail(a.email);
          return (
            <Tip key={`${a.email}-${i}`} label={valid ? a.email : "This email address is not valid"}>
              <span
                className={cn(
                  "inline-flex h-7 max-w-[240px] items-center gap-1.5 rounded-full border pl-0.5 pr-1 font-body text-sm",
                  valid ? "border-outline-soft bg-surface-2 text-fg" : "border-danger bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-danger",
                )}
                onDoubleClick={() => {
                  onChange(value.filter((_, j) => j !== i));
                  setText(a.name ? `${a.name} <${a.email}>` : a.email);
                  inputRef.current?.focus();
                }}
              >
                <span className="inline-flex size-6 items-center justify-center rounded-full text-xs font-medium text-white" style={{ background: valid ? colorFor(a.email) : "var(--danger)" }}>
                  {initials(a.name, a.email)}
                </span>
                <span className="truncate">{a.name || a.email}</span>
                <button
                  type="button"
                  aria-label={`Remove ${a.name || a.email}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((_, j) => j !== i));
                  }}
                  className="inline-flex size-5 items-center justify-center rounded-full text-fg-3 hover:bg-hover-strong hover:text-fg"
                >
                  <Icon name="close" size={14} />
                </button>
              </span>
            </Tip>
          );
        })}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={text}
          aria-label={label}
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]$/.test(v)) commit(v.slice(0, -1));
            else {
              setText(v);
              setActive(0);
            }
          }}
          onFocus={() => {
            setFocused(true);
            onFocusChange?.(true);
          }}
          onBlur={() => {
            setFocused(false);
            onFocusChange?.(false);
            if (text.trim()) commit(text);
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (/[,;\n]/.test(t)) {
              e.preventDefault();
              commit(text + t);
            }
          }}
          onKeyDown={(e) => {
            if (showList && e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(suggestions.length - 1, a + 1));
            } else if (showList && e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if ((e.key === "Enter" || e.key === "Tab") && showList) {
              e.preventDefault();
              pick(suggestions[active]);
            } else if ((e.key === "Enter" || (e.key === " " && isValidEmail(text))) && text.trim()) {
              e.preventDefault();
              commit(text);
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          className="h-7 min-w-[120px] flex-1 bg-transparent font-body text-sm text-fg outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        {trailing}
      </div>
      {showList && (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-20 max-h-72 overflow-auto rounded-b-lg bg-menu py-2 shadow-e2 animate-fade">
          {suggestions.map((c, i) => (
            <li
              key={c.email}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(c)}
              className={cn("flex h-12 cursor-pointer items-center gap-3 px-4", i === active && "bg-hover")}
            >
              <Avatar name={c.name} email={c.email} size={32} />
              <div className="min-w-0">
                <div className="truncate font-body text-sm text-fg">{c.name || c.email}</div>
                <div className="truncate font-body text-xs text-fg-3">{c.email}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
