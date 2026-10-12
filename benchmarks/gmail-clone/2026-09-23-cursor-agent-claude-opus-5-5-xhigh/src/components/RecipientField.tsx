import { useMemo, useRef, useState } from "react";
import { ME } from "../lib/contacts";
import { allContacts, useMail } from "../lib/store";
import type { Contact } from "../lib/types";
import { cn, isValidEmail, parseAddressList } from "../lib/utils";
import { Avatar, Icon, Popover } from "./ui";

export function RecipientField({
  label,
  value,
  onChange,
  autoFocus,
  trailing,
  inputId,
}: {
  label: string;
  value: Contact[];
  onChange: (v: Contact[]) => void;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
  inputId?: string;
}) {
  const extra = useMail((s) => s.extraContacts);
  const messages = useMail((s) => s.messages);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const contacts = useMemo(() => {
    const freq = new Map<string, number>();
    for (const m of Object.values(messages)) {
      for (const c of [m.from, ...m.to, ...m.cc]) freq.set(c.email, (freq.get(c.email) ?? 0) + 1);
    }
    return allContacts(extra)
      .filter((c) => c.email !== ME.email)
      .map((c) => ({ ...c, score: freq.get(c.email) ?? 0 }));
  }, [extra, messages]);

  const q = input.trim().toLowerCase();
  const suggestions = q
    ? contacts
        .filter(
          (c) =>
            !value.some((v) => v.email === c.email) &&
            (c.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || c.name.toLowerCase().startsWith(q) || c.email.toLowerCase().startsWith(q) || c.email.toLowerCase().includes(q)),
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
    : [];

  const resolve = (c: Contact): Contact => {
    const known = contacts.find((k) => k.email.toLowerCase() === c.email.toLowerCase());
    if (known) return { name: known.name, email: known.email };
    return c.name === c.email ? { name: c.email, email: c.email } : c;
  };

  const add = (list: Contact[]) => {
    const next = [...value];
    for (const c of list.map(resolve)) if (!next.some((x) => x.email === c.email)) next.push(c);
    onChange(next);
    setInput("");
    setActive(0);
  };

  const commit = () => {
    if (input.trim()) add(parseAddressList(input));
  };

  const open = focused && suggestions.length > 0;

  return (
    <div
      ref={boxRef}
      className="flex min-h-10 cursor-text items-center gap-1 border-b border-line-soft px-4 py-1"
      onClick={() => inputRef.current?.focus()}
    >
      <label htmlFor={inputId} className="shrink-0 pr-2 text-sm text-fg-3">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {value.map((c, i) => {
          const valid = isValidEmail(c.email);
          return (
            <span
              key={c.email + i}
              data-tip={valid ? c.email : `"${c.email}" is not a valid email address`}
              className={cn(
                "group/rc inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border pl-0.5 pr-1.5 text-sm",
                valid ? "border-line bg-surface" : "border-danger bg-danger/10 text-danger",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((_, j) => j !== i));
                setInput(c.email);
                inputRef.current?.focus();
              }}
            >
              <Avatar name={c.name} email={c.email} size={24} />
              <span className="truncate">{c.name === c.email ? c.email : c.name}</span>
              <button
                type="button"
                aria-label={`Remove ${c.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((_, j) => j !== i));
                }}
                className="flex h-4 w-4 items-center justify-center rounded-full text-fg-3 hover:bg-hover-strong hover:text-fg"
              >
                <Icon name="close" size={14} />
              </button>
            </span>
          );
        })}
        <input
          id={inputId}
          ref={inputRef}
          autoFocus={autoFocus}
          value={input}
          aria-label={label}
          autoComplete="off"
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]\s*$/.test(v)) {
              add(parseAddressList(v));
              return;
            }
            setInput(v);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() =>
            window.setTimeout(() => {
              setFocused(false);
              commit();
            }, 120)
          }
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,;\n]/.test(text)) {
              e.preventDefault();
              add(parseAddressList(text));
            }
          }}
          onKeyDown={(e) => {
            if (open && e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (open && e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" || (e.key === "Tab" && input.trim())) {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) return;
              if (open) {
                e.preventDefault();
                add([suggestions[active]]);
              } else if (input.trim()) {
                e.preventDefault();
                commit();
              }
            } else if (e.key === "Backspace" && !input && value.length) {
              onChange(value.slice(0, -1));
            } else if (e.key === "Escape" && open) {
              e.stopPropagation();
              setInput("");
            }
          }}
          className="h-7 min-w-[80px] flex-1 bg-transparent text-sm text-fg focus:outline-none"
        />
      </div>
      {trailing}
      <Popover anchor={boxRef.current} open={open} onClose={() => setFocused(false)} align="start" className="w-[min(420px,calc(100vw-16px))]">
        <div role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {suggestions.map((c, i) => (
            <button
              key={c.email}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                add([c]);
                inputRef.current?.focus();
              }}
              className={cn("flex w-full items-center gap-3 px-4 py-2 text-left", i === active && "bg-hover")}
            >
              <Avatar name={c.name} email={c.email} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate text-xs text-fg-3">{c.email}</span>
              </span>
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}
