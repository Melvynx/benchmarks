import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Contact } from '../../domain/selectors';
import { displayName, isValidEmail } from '../../domain/threads';
import type { Address } from '../../domain/types';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/primitives';

interface RecipientFieldProps {
  id: string;
  label: string;
  value: Address[];
  onChange: (next: Address[]) => void;
  contacts: Contact[];
  trailing?: ReactNode;
  autoFocus?: boolean;
}

export function RecipientField({ id, label, value, onChange, contacts, trailing, autoFocus }: RecipientFieldProps) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(value.map((a) => a.email.toLowerCase()));
    return contacts
      .filter((c) => !taken.has(c.email.toLowerCase()) && (c.email.includes(q) || c.name.toLowerCase().includes(q)))
      .slice(0, 5);
  }, [text, contacts, value]);

  const add = (address: Address) => {
    if (!address.email) return;
    if (value.some((a) => a.email.toLowerCase() === address.email.toLowerCase())) return;
    onChange([...value, address]);
    setText('');
    setActive(0);
  };

  const commitText = () => {
    const raw = text.trim().replace(/[,;]$/, '');
    if (raw) add({ name: '', email: raw });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (!text.trim()) return;
      if (e.key === 'Enter' && suggestions[active]) {
        e.preventDefault();
        const c = suggestions[active];
        add({ name: c.name, email: c.email });
        return;
      }
      if (e.key !== 'Tab') e.preventDefault();
      commitText();
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex items-start gap-2 border-b border-line/60 px-4 text-sm">
      <label htmlFor={id} className="w-10 shrink-0 py-2.5 text-ink-3">
        {label}
      </label>
      <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1.5">
        {value.map((address) => {
          const valid = isValidEmail(address.email);
          return (
            <span
              key={address.email}
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5',
                valid ? 'border-line bg-surface-2 text-ink' : 'border-danger bg-danger/10 text-danger',
              )}
              title={valid ? address.email : `${address.email} is not a valid address`}
            >
              <span className="truncate">{displayName(address)}</span>
              <button
                type="button"
                aria-label={`Remove ${displayName(address)}`}
                onClick={() => onChange(value.filter((a) => a.email !== address.email))}
                className="rounded-full p-0.5 hover:bg-hover"
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
        <input
          id={id}
          autoFocus={autoFocus}
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={commitText}
          className="min-w-[120px] flex-1 bg-transparent py-1 outline-none"
          aria-autocomplete="list"
          aria-controls={`${id}-suggestions`}
        />
        {suggestions.length > 0 && (
          <ul
            id={`${id}-suggestions`}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl"
          >
            {suggestions.map((c, i) => (
              <li
                key={c.email}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add({ name: c.name, email: c.email });
                }}
                className={cn('flex cursor-pointer items-center gap-3 px-3 py-2', i === active && 'bg-hover')}
              >
                <Avatar name={c.name} email={c.email} size={24} />
                <span className="truncate text-ink">{c.name || c.email}</span>
                {c.name && <span className="truncate text-xs text-ink-3">{c.email}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {trailing && <div className="flex shrink-0 gap-2 py-2.5 text-xs">{trailing}</div>}
    </div>
  );
}
