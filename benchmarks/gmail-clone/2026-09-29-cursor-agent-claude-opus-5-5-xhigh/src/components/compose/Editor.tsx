import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  MdClose,
  MdFormatBold,
  MdFormatClear,
  MdFormatColorText,
  MdFormatItalic,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdFormatUnderlined,
  MdRedo,
  MdStrikethroughS,
  MdUndo,
} from 'react-icons/md';
import type { Contact, Person } from '../../types';
import { parseAddress } from '../../lib/compose';
import { cn, isValidEmail, sameEmail, sanitizeHtml } from '../../lib/utils';
import { MY_EMAIL, useMail } from '../../store/mail';
import { Avatar, Button, Popover } from '../ui';

function rankContacts(contacts: Contact[], q: string, exclude: Person[]): Contact[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return contacts
    .filter((c) => !exclude.some((e) => sameEmail(e, c)) && !sameEmail(c, MY_EMAIL))
    .map((c) => {
      const name = c.name.toLowerCase();
      const email = c.email.toLowerCase();
      let score = 0;
      if (name.startsWith(s) || email.startsWith(s)) score = 3;
      else if (name.split(/\s+/).some((w) => w.startsWith(s))) score = 2;
      else if (name.includes(s) || email.includes(s)) score = 1;
      if (c.kind === 'person') score += 0.5;
      return { c, score };
    })
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.c);
}

export function RecipientField({
  label,
  value,
  onChange,
  autoFocus,
  trailing,
  inputId,
}: {
  label: string;
  value: Person[];
  onChange: (v: Person[]) => void;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
  inputId?: string;
}) {
  const contacts = useMail((s) => s.contacts);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => rankContacts(contacts, input, value), [contacts, input, value]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const resolve = (raw: string): Person | null => {
    const p = parseAddress(raw);
    if (!p) return null;
    const known = contacts.find((c) => sameEmail(c, p.email));
    return { name: p.name || known?.name || '', email: p.email };
  };

  const commit = (raw: string) => {
    const people = raw
      .split(/[,;\n]+/)
      .map(resolve)
      .filter((p): p is Person => !!p && !value.some((v) => sameEmail(v, p)));
    if (people.length) onChange([...value, ...people]);
    setInput('');
  };

  const add = (c: Contact) => {
    onChange([...value, { name: c.name, email: c.email }]);
    setInput('');
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const open = focused && suggestions.length > 0;
    if (open && e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (open && e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if ((e.key === 'Enter' || e.key === 'Tab') && open) {
      e.preventDefault();
      add(suggestions[active]);
    } else if ((e.key === 'Enter' || e.key === ',' || e.key === ';' || (e.key === 'Tab' && input.trim())) && input.trim()) {
      e.preventDefault();
      commit(input);
    } else if (e.key === 'Backspace' && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex min-h-10 cursor-text flex-wrap items-center gap-1 border-b border-line py-1" onClick={() => inputRef.current?.focus()}>
        <label htmlFor={inputId} className="mr-1 text-sm text-fg3">
          {label}
        </label>
        {value.map((p) => {
          const invalid = !isValidEmail(p.email);
          return (
            <span
              key={p.email}
              data-tip={p.email}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((v) => v !== p));
                setInput(p.name ? `${p.name} <${p.email}>` : p.email);
                inputRef.current?.focus();
              }}
              className={cn(
                'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-0.5 text-sm',
                invalid ? 'border-danger bg-danger/10 text-danger' : 'border-line-strong text-fg',
              )}
            >
              <Avatar person={p} size={22} />
              <span className="truncate">{p.name || p.email}</span>
              <button
                type="button"
                aria-label={`Remove ${p.email}`}
                className="flex size-5 items-center justify-center rounded-full text-fg3 hover:bg-hover"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((v) => v !== p));
                }}
              >
                <MdClose size={14} />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          id={inputId}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (input.trim()) commit(input);
          }}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (/[,;\n]/.test(text) && text.includes('@')) {
              e.preventDefault();
              commit(text);
            }
          }}
          aria-label={`${label} recipients`}
          autoComplete="off"
          className="h-7 min-w-[120px] flex-1 bg-transparent text-sm text-fg outline-none"
        />
        {trailing}
      </div>
      {focused && suggestions.length > 0 && (
        <div role="listbox" className="absolute top-full left-0 z-30 mt-1 w-full max-w-sm animate-pop rounded-lg bg-raised py-2 shadow-e2 ring-1 ring-black/5">
          {suggestions.map((c, i) => (
            <button
              key={c.email}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(c)}
              onMouseEnter={() => setActive(i)}
              className={cn('flex w-full items-center gap-3 px-4 py-1.5 text-left', i === active && 'bg-hover')}
            >
              <Avatar person={c} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-sm text-fg">{c.name || c.email}</span>
                <span className="block truncate text-xs text-fg3">{c.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface EditorHandle {
  focus: (atEnd?: boolean) => void;
  exec: (cmd: string, value?: string) => void;
  insertHtml: (html: string) => void;
  saveSelection: () => void;
  restoreSelection: () => void;
  getHtml: () => string;
  el: () => HTMLDivElement | null;
}

function caretToStart(node: HTMLElement) {
  const first = node.firstElementChild;
  const r = document.createRange();
  if (first && !first.classList.contains('signature') && !first.classList.contains('forwarded')) r.setStart(first, 0);
  else r.setStart(node, 0);
  r.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

export const RichEditor = forwardRef<
  EditorHandle,
  { initialHtml: string; onChange: (html: string) => void; placeholder?: string; autoFocus?: boolean; className?: string; onKeyDown?: (e: React.KeyboardEvent) => void; onFiles?: (files: File[]) => void }
>(function RichEditor({ initialHtml, onChange, placeholder, autoFocus, className, onKeyDown, onFiles }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const emit = useCallback(() => {
    if (el.current) changeRef.current(el.current.innerHTML);
  }, []);

  useEffect(() => {
    if (!el.current) return;
    el.current.innerHTML = initialHtml;
    if (autoFocus) {
      el.current.focus();
      caretToStart(el.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    focus: (atEnd) => {
      const node = el.current;
      if (!node) return;
      node.focus();
      if (atEnd) {
        const sig = node.querySelector(':scope > .signature');
        const r = document.createRange();
        if (sig) {
          let lastFilled: Element | null = null;
          for (let s = sig.previousElementSibling; s; s = s.previousElementSibling) {
            if (s.textContent?.trim()) {
              lastFilled = s;
              break;
            }
          }
          if (lastFilled) {
            r.selectNodeContents(lastFilled);
            r.collapse(false);
          } else {
            r.setStart(node.firstElementChild ?? node, 0);
            r.collapse(true);
          }
        } else {
          r.selectNodeContents(node);
          r.collapse(false);
        }
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
    },
    exec: (cmd, value) => {
      el.current?.focus();
      document.execCommand(cmd, false, value);
      emit();
    },
    insertHtml: (html) => {
      el.current?.focus();
      if (saved.current) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(saved.current);
      }
      document.execCommand('insertHTML', false, html);
      emit();
    },
    saveSelection: () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && el.current?.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange();
    },
    restoreSelection: () => {
      el.current?.focus();
      if (saved.current) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(saved.current);
      }
    },
    getHtml: () => el.current?.innerHTML ?? '',
    el: () => el.current,
  }));

  return (
    <div
      ref={el}
      role="textbox"
      aria-multiline="true"
      aria-label="Message body"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={cn('editor text-sm text-fg', className)}
      onInput={emit}
      onKeyDown={onKeyDown}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files);
        if (files.length && onFiles) {
          e.preventDefault();
          onFiles(files);
          return;
        }
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');
        e.preventDefault();
        if (html) document.execCommand('insertHTML', false, sanitizeHtml(html));
        else document.execCommand('insertText', false, text);
        emit();
      }}
    />
  );
});

const COLORS = ['#1f1f1f', '#5f6368', '#d93025', '#e37400', '#f9ab00', '#188038', '#1a73e8', '#9334e6', '#e52592', '#00796b'];

export function FormatBar({ editor }: { editor: React.RefObject<EditorHandle | null> }) {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => {
      const node = editor.current?.el();
      const sel = window.getSelection();
      if (!node || !sel?.anchorNode || !node.contains(sel.anchorNode)) return;
      setState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, [editor]);
  const btn = (cmd: string, Icon: typeof MdUndo, label: string, value?: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={state[cmd] ?? undefined}
      data-tip={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => editor.current?.exec(cmd, value)}
      className={cn('flex size-8 items-center justify-center rounded text-fg2 hover:bg-hover', state[cmd] && 'bg-accent-soft text-fg')}
    >
      <Icon size={18} />
    </button>
  );
  return (
    <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto rounded-lg border border-line bg-panel px-1 py-0.5 shadow-e1" role="toolbar" aria-label="Formatting options">
      {btn('undo', MdUndo, 'Undo (⌘Z)')}
      {btn('redo', MdRedo, 'Redo (⌘Y)')}
      <span className="mx-1 h-5 w-px bg-line" />
      {btn('bold', MdFormatBold, 'Bold (⌘B)')}
      {btn('italic', MdFormatItalic, 'Italic (⌘I)')}
      {btn('underline', MdFormatUnderlined, 'Underline (⌘U)')}
      <button
        type="button"
        aria-label="Text color"
        data-tip="Text color"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.current?.saveSelection();
        }}
        onClick={(e) => setColorAnchor(e.currentTarget)}
        className="flex size-8 items-center justify-center rounded text-fg2 hover:bg-hover"
      >
        <MdFormatColorText size={18} />
      </button>
      <Popover open={!!colorAnchor} anchor={colorAnchor} onClose={() => setColorAnchor(null)} placement="top-start" className="p-2">
        <div className="grid grid-cols-5 gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.current?.restoreSelection();
                editor.current?.exec('foreColor', c);
                setColorAnchor(null);
              }}
              className="size-6 rounded-full ring-1 ring-black/10 hover:scale-110"
              style={{ background: c }}
            />
          ))}
        </div>
      </Popover>
      <span className="mx-1 h-5 w-px bg-line" />
      {btn('insertOrderedList', MdFormatListNumbered, 'Numbered list')}
      {btn('insertUnorderedList', MdFormatListBulleted, 'Bulleted list')}
      {btn('formatBlock', MdFormatQuote, 'Quote', 'blockquote')}
      {btn('strikeThrough', MdStrikethroughS, 'Strikethrough')}
      <span className="mx-1 h-5 w-px bg-line" />
      {btn('removeFormat', MdFormatClear, 'Remove formatting')}
    </div>
  );
}

const EMOJI = ['😀', '😂', '😊', '😍', '🤔', '😅', '😎', '🙌', '👍', '👏', '🙏', '💪', '🎉', '🔥', '✨', '❤️', '💯', '✅', '👀', '🚀', '☕', '🍕', '🌮', '🥐', '📎', '📅', '💡', '📌', '🤝', '😴', '🙈', '🎂', '🌞', '🌧️', '✈️', '🏖️'];

export function EmojiGrid({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="grid w-72 grid-cols-9 gap-0.5 p-2">
      {EMOJI.map((e) => (
        <button key={e} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => onPick(e)} className="flex size-7 items-center justify-center rounded text-lg hover:bg-hover" aria-label={`Insert ${e}`}>
          {e}
        </button>
      ))}
    </div>
  );
}

export function LinkForm({ initialText, onSubmit, onCancel }: { initialText: string; onSubmit: (text: string, url: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState('');
  const normalized = /^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : url.includes('@') && !url.includes('/') ? `mailto:${url.trim()}` : `https://${url.trim()}`;
  return (
    <form
      className="w-80 space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onSubmit(text.trim() || url.trim(), normalized);
      }}
    >
      <div className="text-sm font-medium text-fg">Insert link</div>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Text to display" className="h-9 w-full rounded border border-line-strong bg-transparent px-2 text-sm outline-none focus:border-accent" />
      <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Web address or email" className="h-9 w-full rounded border border-line-strong bg-transparent px-2 text-sm outline-none focus:border-accent" />
      <div className="flex justify-end gap-2">
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!url.trim()}>
          OK
        </Button>
      </div>
    </form>
  );
}
