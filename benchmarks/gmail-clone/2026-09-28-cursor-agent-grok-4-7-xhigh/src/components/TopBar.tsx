import { useEffect, useMemo, useState } from "react";
import { cx, tokenize } from "../logic";
import { useMail } from "../store";
import { Icon } from "../icons";
import { Avatar } from "./bits";

export function TopBar({ isMobile, onMenu }: { isMobile: boolean; onMenu: () => void }) {
  const { state, dispatch, people, searchRef, visible, me } = useMail();
  const [focused, setFocused] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const showSearch = !isMobile || mobileSearch;
  const suggestions = useMemo(() => buildSuggestions(state.search, state.recentSearches, people, state.threads), [state.search, state.recentSearches, people, state.threads]);

  useEffect(() => {
    if (!isMobile) setMobileSearch(false);
  }, [isMobile]);

  return (
    <header className="topbar">
      <div className="brand">
        <button className="icon-btn" type="button" aria-label={isMobile ? "Open menu" : "Collapse menu"} onClick={onMenu}>
          <Icon name="menu" size={22} />
        </button>
        {!(isMobile && mobileSearch) ? (
          <h1 className="logo" data-testid="logo">
            Grok 4.7
          </h1>
        ) : null}
      </div>
      {showSearch ? (
        <div className={cx("search", focused && "focus")}>
          <Icon name="search" />
          <input
            ref={searchRef}
            data-testid="search-input"
            placeholder="Search mail"
            aria-label="Search mail"
            value={state.search}
            onChange={(event) => dispatch({ type: "search", query: event.target.value })}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                dispatch({ type: "search", query: state.search, recent: true });
                setFocused(false);
              }
            }}
          />
          {state.search ? (
            <button
              className="icon-btn tiny"
              type="button"
              aria-label="Clear search"
              onClick={() => dispatch({ type: "search", query: "" })}
            >
              <Icon name="close" size={18} />
            </button>
          ) : null}
          <button
            className="icon-btn tiny"
            type="button"
            aria-label="Advanced search"
            onClick={() => dispatch({ type: "ui", patch: { advancedSearch: !state.advancedSearch, accountOpen: false, quickSettings: false } })}
          >
            <Icon name="tune" size={18} />
          </button>
          {focused && suggestions.length > 0 ? (
            <div className="suggest" role="listbox">
              {suggestions.map((item) => (
                <button
                  key={item.value + item.label}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    dispatch({ type: "search", query: item.value, recent: true });
                    setFocused(false);
                  }}
                >
                  <Icon name="search" size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="suggest-ops">
                {["from:", "to:", "subject:", "is:unread", "has:attachment", "label:"].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      const next = `${state.search.trim()} ${op}`.trim();
                      dispatch({ type: "search", query: next });
                      searchRef.current?.focus();
                    }}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {state.advancedSearch ? <AdvancedSearch onClose={() => dispatch({ type: "ui", patch: { advancedSearch: false } })} /> : null}
        </div>
      ) : (
        <div className="search-spacer" />
      )}
      <div className="top-actions">
        {isMobile && !mobileSearch ? (
          <button className="icon-btn" type="button" aria-label="Search" onClick={() => setMobileSearch(true)}>
            <Icon name="search" />
          </button>
        ) : null}
        {isMobile && mobileSearch ? (
          <button className="icon-btn" type="button" aria-label="Close search" onClick={() => setMobileSearch(false)}>
            <Icon name="close" />
          </button>
        ) : null}
        <button
          className="icon-btn hide-xs"
          type="button"
          aria-label="Keyboard shortcuts"
          onClick={() => dispatch({ type: "ui", patch: { shortcutsOpen: true, accountOpen: false, quickSettings: false } })}
        >
          <Icon name="help" />
        </button>
        <div className="pop">
          <button
            className="icon-btn"
            type="button"
            aria-label="Settings"
            data-testid="settings-button"
            onClick={() => dispatch({ type: "ui", patch: { quickSettings: !state.quickSettings, accountOpen: false, advancedSearch: false } })}
          >
            <Icon name="settings" />
          </button>
          {state.quickSettings ? <QuickSettings /> : null}
        </div>
        <div className="pop">
          <button
            className="avatar-btn"
            type="button"
            aria-label="Account"
            data-testid="account-button"
            onClick={() => dispatch({ type: "ui", patch: { accountOpen: !state.accountOpen, quickSettings: false, advancedSearch: false } })}
          >
            <Avatar person={me} size={32} />
          </button>
          {state.accountOpen ? (
            <div className="menu align-right account-menu">
              <div className="account-card">
                <Avatar person={{ name: "Alex Chen", email: "alex.chen@grokmail.app" }} size={48} />
                <strong>Alex Chen</strong>
                <span>alex.chen@grokmail.app</span>
              </div>
              <button type="button" className="menu-item" onClick={() => dispatch({ type: "ui", patch: { settingsPage: true, accountOpen: false } })}>
                <Icon name="settings" size={18} /> Manage mailbox
              </button>
              <button type="button" className="menu-item" onClick={() => dispatch({ type: "ui", patch: { shortcutsOpen: true, accountOpen: false } })}>
                <Icon name="keyboard" size={18} /> Keyboard shortcuts
              </button>
              <button type="button" className="menu-item" onClick={() => dispatch({ type: "sign", signedIn: false })}>
                <Icon name="logout" size={18} /> Sign out
              </button>
              <p className="menu-note">{visible.length} conversations in the current view. Mail stays in this browser.</p>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function QuickSettings() {
  const { state, dispatch } = useMail();
  return (
    <div className="menu align-right quick">
      <strong>Quick settings</strong>
      <fieldset>
        <legend>Density</legend>
        {(["default", "comfortable", "compact"] as const).map((density) => (
          <label key={density}>
            <input
              type="radio"
              name="density"
              checked={state.settings.density === density}
              onChange={() => dispatch({ type: "settings", patch: { density } })}
            />
            {density}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Theme</legend>
        {(["light", "dark"] as const).map((theme) => (
          <label key={theme}>
            <input
              type="radio"
              name="theme"
              checked={state.settings.theme === theme}
              onChange={() => dispatch({ type: "settings", patch: { theme } })}
            />
            {theme}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Inbox</legend>
        {(
          [
            ["default", "Default"],
            ["important", "Important first"],
            ["unread", "Unread first"],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="inboxType"
              checked={state.settings.inboxType === value}
              onChange={() => dispatch({ type: "settings", patch: { inboxType: value } })}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="check-row">
        <input
          type="checkbox"
          checked={state.settings.readingPane}
          onChange={(event) => dispatch({ type: "settings", patch: { readingPane: event.target.checked } })}
        />
        Reading pane on wide screens
      </label>
      <button
        type="button"
        className="text-btn"
        onClick={() => dispatch({ type: "ui", patch: { settingsPage: true, quickSettings: false } })}
      >
        See all settings
      </button>
    </div>
  );
}

function AdvancedSearch({ onClose }: { onClose: () => void }) {
  const { dispatch } = useMail();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [unread, setUnread] = useState(false);
  const [attachment, setAttachment] = useState(false);
  return (
    <form
      className="advanced"
      onMouseDown={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        const parts = [
          from && `from:${quote(from)}`,
          to && `to:${quote(to)}`,
          subject && `subject:${quote(subject)}`,
          unread && "is:unread",
          attachment && "has:attachment",
        ].filter(Boolean);
        dispatch({ type: "search", query: parts.join(" "), recent: true });
        dispatch({ type: "ui", patch: { advancedSearch: false } });
      }}
    >
      <label>
        From
        <input value={from} onChange={(event) => setFrom(event.target.value)} />
      </label>
      <label>
        To
        <input value={to} onChange={(event) => setTo(event.target.value)} />
      </label>
      <label>
        Subject
        <input value={subject} onChange={(event) => setSubject(event.target.value)} />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={unread} onChange={(event) => setUnread(event.target.checked)} /> Unread only
      </label>
      <label className="check-row">
        <input type="checkbox" checked={attachment} onChange={(event) => setAttachment(event.target.checked)} /> Has attachment
      </label>
      <div className="modal-actions">
        <button type="button" className="text-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="send-btn">
          Search
        </button>
      </div>
    </form>
  );
}

function quote(value: string): string {
  return value.includes(" ") ? `"${value}"` : value;
}

function buildSuggestions(
  query: string,
  recent: string[],
  people: { name: string; email: string }[],
  threads: { subject: string }[],
) {
  const q = query.trim().toLowerCase();
  if (!q) return recent.map((item) => ({ label: item, value: item }));
  if (tokenize(q).some((token) => token.op !== "text")) return [];
  const out: { label: string; value: string }[] = [];
  for (const person of people) {
    if (person.name.toLowerCase().includes(q) || person.email.toLowerCase().includes(q)) {
      out.push({ label: `${person.name}  ·  from:${person.email}`, value: `from:${person.email}` });
    }
    if (out.length >= 5) break;
  }
  for (const thread of threads) {
    if (thread.subject.toLowerCase().includes(q) && !out.some((item) => item.label === thread.subject)) {
      out.push({ label: thread.subject, value: `subject:"${thread.subject.replace(/"/g, "")}"` });
    }
    if (out.length >= 8) break;
  }
  return out;
}
