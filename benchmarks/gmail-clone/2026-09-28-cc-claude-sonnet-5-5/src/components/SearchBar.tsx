import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, IconButton } from './kit';
import { Popover } from './Popover';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import { navigate, searchHref } from '../lib/router';
import { pushRecentSearch, removeRecentSearch, getContactSuggestions } from '../lib/actions';
import { buildQueryFromAdvanced, emptyAdvanced, type AdvancedFields } from '../lib/search';
import { useViewModel } from '../lib/viewModel';
import { Avatar } from './kit';

const OPERATORS: { op: string; hint: string }[] = [
  { op: 'from:', hint: 'Sender' },
  { op: 'to:', hint: 'Recipient' },
  { op: 'subject:', hint: 'Words in the subject' },
  { op: 'label:', hint: 'Messages with a label' },
  { op: 'has:', hint: 'attachment, image, pdf…' },
  { op: 'is:', hint: 'unread, starred, snoozed…' },
  { op: 'in:', hint: 'inbox, sent, trash…' },
  { op: 'filename:', hint: 'Attachment name' },
  { op: 'category:', hint: 'primary, promotions…' },
  { op: 'after:', hint: 'Date, e.g. 2026/01/15' },
  { op: 'before:', hint: 'Date, e.g. 2026/06/01' },
  { op: 'older_than:', hint: 'e.g. 1y, 2m, 3d' },
  { op: 'newer_than:', hint: 'e.g. 2d, 1w' },
  { op: 'larger:', hint: 'Attachment size, e.g. 5M' },
  { op: 'smaller:', hint: 'Attachment size, e.g. 500K' },
];

const VALUES: Record<string, string[]> = {
  is: ['unread', 'read', 'starred', 'important', 'snoozed'],
  has: ['attachment', 'image', 'pdf', 'document', 'spreadsheet', 'presentation', 'userlabels', 'nouserlabels'],
  in: ['inbox', 'sent', 'drafts', 'scheduled', 'starred', 'snoozed', 'trash', 'spam', 'anywhere'],
  category: ['primary', 'promotions', 'social', 'updates'],
};

const QUICK_CHIPS = ['is:unread', 'has:attachment', 'is:starred', 'in:sent', 'newer_than:7d', 'has:pdf'];

interface Suggestion {
  key: string;
  icon: string;
  primary: string;
  secondary?: string;
  /** Replaces the whole query and runs it. */
  run?: string;
  /** Replaces the last token, keeps typing. */
  complete?: string;
  avatar?: { name: string; email: string };
  removable?: string;
}

function lastToken(v: string): { head: string; token: string } {
  const m = /(?:^|\s)(-?[^\s]*)$/.exec(v);
  const token = m ? m[1] : '';
  return { head: v.slice(0, v.length - token.length), token };
}

export function SearchBar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const mail = useMail();
  const { searchFocusTick } = useUI();
  const vm = useViewModel();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [advanced, setAdvanced] = useState<HTMLElement | null>(null);

  // Keep the field in sync with the route.
  useEffect(() => {
    if (vm.view.kind === 'search') setValue(vm.view.query);
    else setValue('');
  }, [vm.view.kind === 'search' ? vm.view.query : vm.viewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchFocusTick > 0) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [searchFocusTick]);

  useEffect(() => {
    if (mobileOpen) inputRef.current?.focus();
  }, [mobileOpen]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = [];
    const v = value;
    if (!v.trim()) {
      for (const r of mail.recentSearches.slice(0, 6)) out.push({ key: `r:${r}`, icon: 'history', primary: r, run: r, removable: r });
      return out;
    }
    const { head, token } = lastToken(v);
    const bare = token.replace(/^-/, '');
    const colon = bare.indexOf(':');
    if (colon > 0) {
      const op = bare.slice(0, colon).toLowerCase();
      const partial = bare.slice(colon + 1).toLowerCase();
      const prefix = token.startsWith('-') ? '-' : '';
      if (VALUES[op]) {
        for (const val of VALUES[op].filter((x) => x.startsWith(partial) && x !== partial)) {
          out.push({ key: `v:${op}:${val}`, icon: 'filter_alt', primary: `${op}:${val}`, complete: `${head}${prefix}${op}:${val} ` });
        }
      } else if (op === 'label') {
        for (const l of mail.labels.filter((x) => x.name.toLowerCase().includes(partial))) {
          out.push({ key: `l:${l.id}`, icon: 'label', primary: `label:${l.name.toLowerCase().replace(/\s+/g, '-')}`, secondary: l.name, complete: `${head}${prefix}label:${l.name.toLowerCase().replace(/\s+/g, '-')} ` });
        }
      } else if (op === 'from' || op === 'to' || op === 'cc') {
        for (const c of getContactSuggestions(mail, partial, [], 5)) {
          out.push({ key: `c:${op}:${c.email}`, icon: 'person', primary: c.name, secondary: c.email, avatar: c, complete: `${head}${prefix}${op}:${c.email} ` });
        }
      }
    } else if (bare.length >= 1) {
      const ops = OPERATORS.filter((o) => o.op.startsWith(bare.toLowerCase()) && bare.length < o.op.length - 1).slice(0, 3);
      for (const o of ops) out.push({ key: `o:${o.op}`, icon: 'tune', primary: o.op, secondary: o.hint, complete: `${head}${token.startsWith('-') ? '-' : ''}${o.op}` });
      for (const c of getContactSuggestions(mail, bare, [], 4)) {
        out.push({ key: `p:${c.email}`, icon: 'person', primary: c.name, secondary: c.email, avatar: c, run: `from:${c.email}` });
      }
    }
    const lower = v.toLowerCase();
    for (const r of mail.recentSearches.filter((x) => x.toLowerCase().startsWith(lower) && x.toLowerCase() !== lower).slice(0, 2)) {
      out.push({ key: `r:${r}`, icon: 'history', primary: r, run: r, removable: r });
    }
    return out;
  }, [value, mail]);

  useEffect(() => setActive(-1), [value, focused]);

  const runSearch = (q: string) => {
    const query = q.trim();
    if (!query) return;
    setValue(query);
    pushRecentSearch(query);
    setFocused(false);
    setAdvanced(null);
    inputRef.current?.blur();
    onMobileClose?.();
    navigate(searchHref(query));
  };

  const apply = (s: Suggestion) => {
    if (s.run) runSearch(s.run);
    else if (s.complete !== undefined) {
      setValue(s.complete);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(true);
      setActive((i) => (suggestions.length ? (i + 1) % suggestions.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (suggestions.length ? (i <= 0 ? suggestions.length - 1 : i - 1) : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) apply(suggestions[active]);
      else runSearch(value);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (focused) setFocused(false);
      else {
        setValue(vm.view.kind === 'search' ? vm.view.query : '');
        inputRef.current?.blur();
        onMobileClose?.();
      }
    }
  };

  const open = focused && !advanced;
  const showQuick = open && !value.trim();

  return (
    <form
      ref={formRef}
      className={`searchbar${focused ? ' focused' : ''}${mobileOpen ? ' mobile-open' : ''}`}
      role="search"
      onSubmit={(e) => e.preventDefault()}
    >
      {mobileOpen ? (
        <IconButton icon="arrow_back" label="Close search" onClick={() => onMobileClose?.()} />
      ) : (
        <IconButton icon="search" label="Search mail" tip={false} onClick={() => (value.trim() ? runSearch(value) : inputRef.current?.focus())} />
      )}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
        aria-label="Search mail"
        placeholder="Search mail"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={onKeyDown}
      />
      {value && (
        <IconButton
          icon="close"
          label="Clear search"
          onClick={() => {
            setValue('');
            inputRef.current?.focus();
            if (vm.view.kind === 'search') navigate('#/inbox');
          }}
        />
      )}
      <IconButton
        icon="tune"
        label="Show search options"
        active={!!advanced}
        onClick={() => {
          setAdvanced((cur) => (cur ? null : formRef.current));
          setFocused(false);
        }}
      />

      {(open && (suggestions.length > 0 || showQuick)) && (
        <Popover anchor={formRef.current} onClose={() => setFocused(false)} role="listbox" className="search-suggest" keepOpenOn=".searchbar" autoFocus={false} style={{ width: formRef.current?.offsetWidth }}>
          {suggestions.map((s, i) => (
            <div
              key={s.key}
              role="option"
              aria-selected={i === active}
              className={`suggest-row${i === active ? ' active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => apply(s)}
            >
              {s.avatar ? <Avatar name={s.avatar.name} email={s.avatar.email} size={28} /> : <Icon name={s.icon} />}
              <span className="suggest-primary">{s.primary}</span>
              {s.secondary && <span className="suggest-secondary">{s.secondary}</span>}
              {s.removable && (
                <button
                  type="button"
                  className="suggest-remove"
                  aria-label={`Remove ${s.removable} from history`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentSearch(s.removable!);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {showQuick && (
            <div className="suggest-chips">
              <div className="menu-title">Search options</div>
              <div className="suggest-chip-row">
                {QUICK_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="suggest-chip"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runSearch(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Popover>
      )}

      {advanced && (
        <Popover anchor={advanced} onClose={() => setAdvanced(null)} role="dialog" className="adv-search" keepOpenOn=".searchbar" style={{ width: Math.min(720, advanced.offsetWidth) }}>
          <AdvancedSearch
            initial={value}
            onSearch={(q) => {
              runSearch(q);
            }}
            onClose={() => setAdvanced(null)}
          />
        </Popover>
      )}
    </form>
  );
}

const WITHIN = [
  ['', '—'],
  ['1d', '1 day'],
  ['3d', '3 days'],
  ['1w', '1 week'],
  ['2w', '2 weeks'],
  ['1m', '1 month'],
  ['2m', '2 months'],
  ['6m', '6 months'],
  ['1y', '1 year'],
] as const;

function AdvancedSearch({ initial, onSearch, onClose }: { initial: string; onSearch: (q: string) => void; onClose: () => void }) {
  const mail = useMail();
  const [f, setF] = useState<AdvancedFields>(() => ({ ...emptyAdvanced(), has: initial }));
  const set = <K extends keyof AdvancedFields>(k: K, v: AdvancedFields[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const query = buildQueryFromAdvanced(f);

  return (
    <form
      className="adv-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (query) onSearch(query);
      }}
    >
      <label htmlFor="adv-from">From</label>
      <input id="adv-from" className="adv-input" value={f.from} onChange={(e) => set('from', e.target.value)} list="adv-contacts" autoFocus />
      <label htmlFor="adv-to">To</label>
      <input id="adv-to" className="adv-input" value={f.to} onChange={(e) => set('to', e.target.value)} list="adv-contacts" />
      <datalist id="adv-contacts">
        {mail.contacts.slice(0, 60).map((c) => (
          <option key={c.id} value={c.email}>
            {c.name}
          </option>
        ))}
      </datalist>
      <label htmlFor="adv-subject">Subject</label>
      <input id="adv-subject" className="adv-input" value={f.subject} onChange={(e) => set('subject', e.target.value)} />
      <label htmlFor="adv-has">Has the words</label>
      <input id="adv-has" className="adv-input" value={f.has} onChange={(e) => set('has', e.target.value)} />
      <label htmlFor="adv-not">Doesn’t have</label>
      <input id="adv-not" className="adv-input" value={f.exclude} onChange={(e) => set('exclude', e.target.value)} />
      <label htmlFor="adv-size">Size</label>
      <div className="adv-row">
        <select id="adv-size" className="adv-input" value={f.size} onChange={(e) => set('size', e.target.value as AdvancedFields['size'])}>
          <option value="">—</option>
          <option value="larger">greater than</option>
          <option value="smaller">less than</option>
        </select>
        <input className="adv-input" aria-label="Size value" inputMode="numeric" value={f.sizeValue} onChange={(e) => set('sizeValue', e.target.value.replace(/[^\d.]/g, ''))} style={{ width: 80 }} />
        <select className="adv-input" aria-label="Size unit" value={f.sizeUnit} onChange={(e) => set('sizeUnit', e.target.value as AdvancedFields['sizeUnit'])} style={{ width: 80 }}>
          <option value="K">KB</option>
          <option value="M">MB</option>
          <option value="G">GB</option>
        </select>
      </div>
      <label htmlFor="adv-within">Date within</label>
      <div className="adv-row">
        <select id="adv-within" className="adv-input" value={f.within} onChange={(e) => set('within', e.target.value)}>
          {WITHIN.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input className="adv-input" type="date" aria-label="Date" value={f.date} onChange={(e) => set('date', e.target.value)} />
      </div>
      <label htmlFor="adv-scope">Search</label>
      <select id="adv-scope" className="adv-input" value={f.scope} onChange={(e) => set('scope', e.target.value)}>
        <option value="">All Mail</option>
        <option value="inbox">Inbox</option>
        <option value="starred">Starred</option>
        <option value="sent">Sent</option>
        <option value="drafts">Drafts</option>
        <option value="scheduled">Scheduled</option>
        <option value="spam">Spam</option>
        <option value="trash">Trash</option>
        <option value="anywhere">Mail &amp; Spam &amp; Trash</option>
      </select>
      <span />
      <label className="adv-check">
        <input type="checkbox" checked={f.attachment} onChange={(e) => set('attachment', e.target.checked)} /> Has attachment
      </label>
      <div className="adv-actions">
        <button type="button" className="btn text" onClick={() => setF(emptyAdvanced())}>
          Clear
        </button>
        <button type="button" className="btn text" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={!query}>
          Search
        </button>
      </div>
    </form>
  );
}
