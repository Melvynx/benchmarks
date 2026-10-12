import { HelpCircle, Menu, Search, Settings, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { colorFor, initials } from "../lib/format";
import { filterThreads } from "../lib/mail";
import { useMail } from "../state/mail-context";

export function TopBar() {
  const mail = useMail();
  const { data, ui, patchUi, mobile, openThread, dispatch, threads } = mail;
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);

  const suggestions = useMemo(() => {
    if (!ui.query.trim()) return [];
    return filterThreads(data.messages, {
      mailbox: "all",
      category: "primary",
      query: ui.query,
      labels: data.labels,
    }).slice(0, 6);
  }, [data.labels, data.messages, ui.query]);

  useEffect(() => {
    if (focus) inputRef.current?.focus();
  }, [focus]);

  const showSearch = !mobile || focus || ui.query.length > 0;
  const name = data.settings.displayName || "Jordan Hale";

  return (
    <header className="topbar">
      <div className="brand">
        <button
          type="button"
          className="icon-btn"
          aria-label={mobile ? "Open navigation" : "Collapse navigation"}
          onClick={() => (mobile ? patchUi({ navOpen: !ui.navOpen }) : patchUi({ navCollapsed: !ui.navCollapsed }))}
        >
          <Menu size={20} />
        </button>
        <h1>Grok 4.7</h1>
      </div>
      {showSearch ? (
        <div className={`search ${focus ? "focus" : ""}`}>
          <Search size={20} />
          <input
            id="q"
            ref={inputRef}
            value={ui.query}
            placeholder="Search mail"
            aria-label="Search mail"
            autoComplete="off"
            onChange={(event) => patchUi({ query: event.target.value, cursor: 0, selected: [] })}
            onFocus={() => setFocus(true)}
            onBlur={() => window.setTimeout(() => setFocus(false), 160)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                dispatch({ type: "remember-search", query: ui.query });
                inputRef.current?.blur();
              }
              if (event.key === "Escape") {
                if (ui.query) patchUi({ query: "" });
                inputRef.current?.blur();
              }
            }}
          />
          {ui.query && (
            <button type="button" className="icon-btn tiny" aria-label="Clear search" onClick={() => patchUi({ query: "" })}>
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn tiny search-tune"
            aria-label="Search options"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setFocus(true);
              inputRef.current?.focus();
            }}
          >
            <SlidersHorizontal size={18} />
          </button>
          {focus && (
            <div className="search-pop" role="listbox" aria-label="Search suggestions">
              {ui.query.trim() ? (
                suggestions.length ? (
                  suggestions.map((thread) => (
                    <button
                      key={thread.threadId}
                      type="button"
                      className="search-hit"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        dispatch({ type: "remember-search", query: ui.query });
                        openThread(thread.threadId);
                        setFocus(false);
                      }}
                    >
                      <strong>{thread.people}</strong>
                      <span>{thread.subject}</span>
                      <em>{thread.snippet}</em>
                    </button>
                  ))
                ) : (
                  <p className="search-empty">No matches in mail</p>
                )
              ) : (
                <>
                  <p className="search-label">Recent</p>
                  {data.recentSearches.map((query) => (
                    <button key={query} type="button" className="search-hit" onMouseDown={(event) => event.preventDefault()} onClick={() => patchUi({ query })}>
                      <span>{query}</span>
                    </button>
                  ))}
                  <p className="search-label">Search by</p>
                  {["is:unread", "is:starred", "has:attachment", "from:lena", "label:work"].map((query) => (
                    <button key={query} type="button" className="search-hit" onMouseDown={(event) => event.preventDefault()} onClick={() => patchUi({ query })}>
                      <span>{query}</span>
                    </button>
                  ))}
                </>
              )}
              {threads.length > 0 && ui.query && <p className="search-label">{threads.length} in the current results</p>}
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="icon-btn search-launch" aria-label="Search mail" onClick={() => setFocus(true)}>
          <Search size={20} />
        </button>
      )}
      <div className="top-actions">
        <button type="button" className="icon-btn" aria-label="Keyboard shortcuts" onClick={() => patchUi({ helpOpen: true })}>
          <HelpCircle size={20} />
        </button>
        <button type="button" className="icon-btn" aria-label="Settings" onClick={() => patchUi({ settingsOpen: true })}>
          <Settings size={20} />
        </button>
        <button
          ref={accountRef}
          type="button"
          className="avatar"
          style={{ background: colorFor(data.settings.displayName) }}
          aria-label="Account"
          aria-expanded={ui.accountOpen}
          onClick={() => patchUi({ accountOpen: !ui.accountOpen })}
        >
          {initials(name)}
        </button>
        {ui.accountOpen && (
          <div className="account-pop" role="menu">
            <div className="account-card">
              <span className="avatar lg" style={{ background: colorFor(name) }}>
                {initials(name)}
              </span>
              <strong>{name}</strong>
              <em>jordan.hale@northwind.dev</em>
            </div>
            <button type="button" onClick={() => patchUi({ settingsOpen: true, accountOpen: false })}>
              Settings
            </button>
            <button
              type="button"
              onClick={() => {
                const order = ["light", "dark", "system"] as const;
                const index = order.indexOf(data.settings.theme);
                dispatch({ type: "settings", patch: { theme: order[(index + 1) % order.length] } });
              }}
            >
              Theme: {data.settings.theme}
            </button>
            <button
              type="button"
              onClick={() => {
                patchUi({ accountOpen: false, composeId: null, activeThreadId: null });
                dispatch({ type: "sign-out" });
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
