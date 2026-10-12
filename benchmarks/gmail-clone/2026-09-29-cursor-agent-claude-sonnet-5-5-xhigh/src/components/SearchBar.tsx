import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Clock, Mail, Search, SlidersHorizontal, Tag, User, X } from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import { navigate, useRoute } from '../lib/router';
import {
  OPERATOR_HINTS,
  buildQuery,
  emptyAdvanced,
  hasToken,
  matchThread,
  parseAdvanced,
  parseQuery,
  toggleToken,
  type AdvancedFilter,
} from '../lib/search';
import { ME } from '../lib/people';
import { threadMessages } from '../lib/selectors';
import { formatListDate } from '../lib/date';
import { Avatar, Checkbox, IconButton } from './primitives';

interface Suggestion {
  key: string;
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  apply: () => void;
  removable?: () => void;
}

const WITHIN = [
  ['', 'Any time'],
  ['1d', '1 day'],
  ['3d', '3 days'],
  ['1w', '1 week'],
  ['2w', '2 weeks'],
  ['1m', '1 month'],
  ['2m', '2 months'],
  ['6m', '6 months'],
  ['1y', '1 year'],
];

const SCOPES = [
  ['', 'All Mail'],
  ['inbox', 'Inbox'],
  ['starred', 'Starred'],
  ['sent', 'Sent'],
  ['snoozed', 'Snoozed'],
  ['spam', 'Spam'],
  ['trash', 'Trash'],
  ['anywhere', 'Mail & Spam & Trash'],
];

export function SearchBar({ mobile, onDone }: { mobile?: boolean; onDone?: () => void }) {
  const route = useRoute();
  const nonce = useUI((s) => s.searchFocusNonce);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(route.view === 'search' ? (route.param ?? '') : '');
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [active, setActive] = useState(0);
  const [adv, setAdv] = useState<AdvancedFilter>(emptyAdvanced);
  const deferred = useDeferredValue(value);
  const recent = useMail((s) => s.recentSearches);
  const contacts = useMail((s) => s.contacts);
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);

  useEffect(() => {
    setValue(route.view === 'search' ? (route.param ?? '') : '');
  }, [route.view, route.param]);

  useEffect(() => {
    if (nonce > 0) {
      inputRef.current?.focus();
      inputRef.current?.select();
      setOpen(true);
    }
  }, [nonce]);

  useEffect(() => {
    if (mobile) {
      inputRef.current?.focus();
      setOpen(true);
    }
  }, [mobile]);

  useEffect(() => {
    if (!open && !advanced) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setAdvanced(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, advanced]);

  const run = (q: string) => {
    const query = q.trim();
    setOpen(false);
    setAdvanced(false);
    inputRef.current?.blur();
    if (!query) return;
    useMail.getState().addRecentSearch(query);
    setValue(query);
    navigate({ view: 'search', param: query });
    onDone?.();
  };

  const lastToken = useMemo(() => {
    const m = /(\S*)$/.exec(value);
    return m ? m[1] : '';
  }, [value]);

  const replaceLastToken = (replacement: string) => {
    const next = value.slice(0, value.length - lastToken.length) + replacement;
    setValue(next);
    setActive(0);
    inputRef.current?.focus();
  };

  const suggestions: Suggestion[] = useMemo(() => {
    const out: Suggestion[] = [];
    const q = deferred.trim();
    if (!q) {
      for (const r of recent.slice(0, 6)) {
        out.push({
          key: `r:${r}`,
          icon: <Clock size={18} />,
          primary: r,
          apply: () => run(r),
          removable: () => useMail.getState().removeRecentSearch(r),
        });
      }
      return out;
    }
    out.push({ key: 'run', icon: <Search size={18} />, primary: q, secondary: 'Search mail', apply: () => run(q) });
    const last = /(\S*)$/.exec(deferred)?.[1] ?? '';
    const lastLower = last.toLowerCase();
    if (last && !last.includes(':')) {
      for (const op of OPERATOR_HINTS) {
        if (op.token.startsWith(lastLower) && op.token !== lastLower) {
          out.push({ key: `op:${op.token}`, icon: <SlidersHorizontal size={18} />, primary: op.token, secondary: op.hint, apply: () => replaceLastToken(op.token) });
          if (out.length > 4) break;
        }
      }
    }
    const lab = /^label:(.*)$/i.exec(last);
    if (lab) {
      for (const l of labels.filter((x) => x.name.toLowerCase().includes(lab[1].toLowerCase().replace(/"/g, ''))).slice(0, 5)) {
        const token = /\s/.test(l.name) ? `label:"${l.name}"` : `label:${l.name}`;
        out.push({ key: `lab:${l.id}`, icon: <Tag size={18} style={{ color: l.color }} />, primary: token, secondary: 'Label', apply: () => replaceLastToken(token) });
      }
    }
    const fromM = /^(from|to):(.*)$/i.exec(last);
    const needle = (fromM ? fromM[2] : q).toLowerCase().replace(/"/g, '');
    if (needle.length >= 1) {
      const matches = contacts
        .filter((c) => c.email !== ME.email && (c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle)))
        .sort((a, b) => b.freq - a.freq)
        .slice(0, 3);
      for (const c of matches) {
        out.push({
          key: `c:${c.email}`,
          icon: <Avatar person={c} size={24} />,
          primary: c.name,
          secondary: c.email,
          apply: () => (fromM ? replaceLastToken(`${fromM[1].toLowerCase()}:${c.email}`) : run(`from:${c.email}`)),
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred, recent, contacts, labels]);

  const previewHits = useMemo(() => {
    const q = deferred.trim();
    if (q.length < 2) return [];
    const parsed = parseQuery(q);
    if (!parsed.nodes.length) return [];
    const now = Date.now();
    const ctx = { me: ME.email, labels, now };
    const data = { threads, messages, drafts: {}, labels, contacts, pending: [], recentSearches: [] };
    const hits: { id: string; subject: string; from: string; date: number }[] = [];
    for (const t of Object.values(threads)) {
      const msgs = threadMessages(data, t, true);
      const hit = matchThread(parsed, t, msgs, ctx);
      if (hit) hits.push({ id: t.id, subject: t.subject, from: hit.from.name, date: t.lastDate });
    }
    return hits.sort((a, b) => b.date - a.date).slice(0, 4);
  }, [deferred, threads, messages, labels, contacts]);

  const total = suggestions.length + previewHits.length;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (total ? (a + 1) % total : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (total ? (a - 1 + total) % total : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const shown = open && total > 0 && (active > 0 || !value.trim());
      if (shown) {
        if (active < suggestions.length) suggestions[active].apply();
        else {
          const hit = previewHits[active - suggestions.length];
          setOpen(false);
          inputRef.current?.blur();
          navigate({ view: 'all', threadId: hit.id });
          onDone?.();
        }
      } else run(value);
    } else if (e.key === 'Escape') {
      if (open || advanced) {
        setOpen(false);
        setAdvanced(false);
      } else {
        inputRef.current?.blur();
        if (mobile) onDone?.();
      }
    }
  };

  const openAdvanced = () => {
    setAdv(parseAdvanced(value));
    setAdvanced((a) => !a);
    setOpen(false);
  };

  const quick = [
    ['has:attachment', 'Has attachment'],
    ['is:unread', 'Unread'],
    ['is:starred', 'Starred'],
    ['newer_than:7d', 'Last 7 days'],
    ['from:me', 'From me'],
  ] as const;

  return (
    <div ref={wrapRef} className={`searchbar ${open || advanced ? 'is-open' : ''} ${mobile ? 'searchbar--mobile' : ''}`} role="search">
      <div className="searchbar__field">
        {mobile ? (
          <IconButton label="Back" onClick={() => onDone?.()}>
            <ArrowLeft size={20} />
          </IconButton>
        ) : (
          <IconButton label="Search mail" onClick={() => run(value)}>
            <Search size={20} />
          </IconButton>
        )}
        <input
          ref={inputRef}
          className="searchbar__input"
          type="text"
          value={value}
          placeholder="Search mail"
          aria-label="Search mail"
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            setOpen(true);
            setAdvanced(false);
          }}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {value ? (
          <IconButton
            label="Clear search"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
              if (route.view === 'search') navigate({ view: 'inbox' });
            }}
          >
            <X size={20} />
          </IconButton>
        ) : null}
        <IconButton label="Show search options" active={advanced} onClick={openAdvanced} aria-expanded={advanced}>
          <SlidersHorizontal size={20} />
        </IconButton>
      </div>

      {open && !advanced ? (
        <div className="searchbar__panel" role="listbox">
          {!deferred.trim() ? (
            <div className="searchbar__chips" aria-label="Quick filters">
              {quick.map(([token, label]) => (
                <button
                  key={token}
                  type="button"
                  className={`chip-btn ${hasToken(value, token) ? 'is-on' : ''}`}
                  onClick={() => {
                    setValue((v) => toggleToken(v, token));
                    inputRef.current?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {suggestions.length > 0 && !deferred.trim() ? <div className="searchbar__heading">Recent searches</div> : null}
          {suggestions.map((s, i) => (
            <div
              key={s.key}
              role="option"
              aria-selected={active === i}
              className={`searchbar__item ${active === i ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={s.apply}
            >
              <span className="searchbar__icon">{s.icon}</span>
              <span className="searchbar__primary">{s.primary}</span>
              {s.secondary ? <span className="searchbar__secondary">{s.secondary}</span> : null}
              {s.removable ? (
                <button
                  type="button"
                  className="searchbar__remove"
                  aria-label={`Remove “${s.primary}” from recent searches`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    s.removable?.();
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {previewHits.length > 0 ? <div className="searchbar__heading">Top results</div> : null}
          {previewHits.map((h, i) => {
            const idx = suggestions.length + i;
            return (
              <div
                key={h.id}
                role="option"
                aria-selected={active === idx}
                className={`searchbar__item ${active === idx ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  navigate({ view: 'all', threadId: h.id });
                  onDone?.();
                }}
              >
                <span className="searchbar__icon">
                  <Mail size={18} />
                </span>
                <span className="searchbar__primary">{h.subject}</span>
                <span className="searchbar__secondary">{h.from}</span>
                <span className="searchbar__date">{formatListDate(h.date)}</span>
              </div>
            );
          })}
          {!deferred.trim() && suggestions.length === 0 ? <div className="searchbar__empty">Try “from:priya has:attachment” or “is:unread”.</div> : null}
          {deferred.trim() ? (
            <div className="searchbar__foot">
              <User size={14} /> Tip: use <code>from:</code>, <code>label:</code>, <code>has:attachment</code>, <code>before:2026/09/01</code>
            </div>
          ) : null}
        </div>
      ) : null}

      {advanced ? (
        <form
          className="searchbar__advanced"
          onSubmit={(e) => {
            e.preventDefault();
            run(buildQuery(adv));
          }}
        >
          {(
            [
              ['from', 'From'],
              ['to', 'To'],
              ['subject', 'Subject'],
              ['has', 'Includes the words'],
              ['doesnt', "Doesn't have"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="adv-row">
              <span>{label}</span>
              <input value={adv[key]} onChange={(e) => setAdv({ ...adv, [key]: e.target.value })} autoFocus={key === 'from'} />
            </label>
          ))}
          <label className="adv-row">
            <span>Size greater than</span>
            <input value={adv.larger} placeholder="e.g. 1M" onChange={(e) => setAdv({ ...adv, larger: e.target.value })} />
          </label>
          <label className="adv-row">
            <span>Date within</span>
            <select value={adv.within} onChange={(e) => setAdv({ ...adv, within: e.target.value })}>
              {WITHIN.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="adv-row">
            <span>Search</span>
            <select value={adv.scope} onChange={(e) => setAdv({ ...adv, scope: e.target.value })}>
              {SCOPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="adv-row adv-row--check">
            <span />
            <label className="adv-check">
              <Checkbox checked={adv.attachment} label="Has attachment" onChange={(v) => setAdv({ ...adv, attachment: v })} />
              Has attachment
            </label>
          </div>
          <div className="adv-actions">
            <button type="button" className="text-btn" onClick={() => setAdv(emptyAdvanced)}>
              Clear
            </button>
            <button type="submit" className="btn btn--primary">
              Search
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
