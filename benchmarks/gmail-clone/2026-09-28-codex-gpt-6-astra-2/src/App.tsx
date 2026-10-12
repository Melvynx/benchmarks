import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MailList from "./components/MailList";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowDown,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FilePenLine,
  Inbox,
  ListFilter,
  Mail,
  MailOpen,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Star,
  StickyNote,
  Tag,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import {
  ACCOUNT,
  type Category,
  type Dialog,
  type Filter,
  type Draft,
  type Mailbox,
  type Thread,
  type View,
} from "./types";
import { loadMailbox, matchesSearch, matchesView, STORAGE_KEY } from "./mail";
import {
  changeLabels,
  changeThreads,
  deliverDraft,
  wakeSnoozed,
} from "./operations";
import { Checkbox, IconButton, Modal } from "./components/ui";
import Compose from "./components/Compose";
import ReadingView from "./components/ReadingView";
import {
  CreateLabelModal,
  HelpModal,
  LabelsModal,
  SearchModal,
  SettingsPanel,
  SnoozeModal,
  UtilityPanel,
} from "./components/Panels";

const viewNames: Record<string, string> = {
  inbox: "Inbox",
  starred: "Starred",
  snoozed: "Snoozed",
  sent: "Sent",
  drafts: "Drafts",
  trash: "Trash",
  all: "All mail",
};

export default function App() {
  const [mailbox, setMailbox] = useState<Mailbox>(loadMailbox);
  const [view, setView] = useState<View>("inbox");
  const [category, setCategory] = useState<Category>("primary");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [readingIds, setReadingIds] = useState<string[]>([]);
  const [composeId, setComposeId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [actionIds, setActionIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [oldest, setOldest] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [moreFolders, setMoreFolders] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    undo?: () => void;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [page, setPage] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const latestMailbox = useRef(mailbox);
  latestMailbox.current = mailbox;
  const closeDialog = useCallback(() => setDialog(null), []);
  const notify = useCallback(
    (message: string, undo?: () => void) =>
      setToast({ id: Date.now(), message, undo }),
    [],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mailbox));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    document.documentElement.dataset.theme = mailbox.settings.theme;
  }, [mailbox]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const wake = () =>
      setMailbox((prev) => {
        if (
          !prev.threads.some(
            (t) =>
              t.snoozedUntil &&
              new Date(t.snoozedUntil).getTime() <= Date.now(),
          )
        )
          return prev;
        return { ...prev, threads: wakeSnoozed(prev.threads, Date.now()) };
      });
    wake();
    const interval = setInterval(wake, 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    function closeMenus(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest(".menu-anchor")) setMenu(null);
    }
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);
  useEffect(() => {
    setSelected(new Set());
    setPage(0);
  }, [view, category, query, filter]);

  const filtered = useMemo(
    () =>
      mailbox.threads
        .filter((thread) => {
          if (view === "drafts" && !query.trim()) return false;
          if (query.trim()) {
            if (
              thread.folder === "trash" &&
              !/in:(trash|anywhere)/i.test(query)
            )
              return false;
            if (!matchesSearch(thread, query, mailbox.labels)) return false;
          } else {
            if (!matchesView(thread, view)) return false;
            if (view === "inbox" && thread.category !== category) return false;
          }
          if (filter === "unread" && !thread.unread) return false;
          if (filter === "starred" && !thread.starred) return false;
          if (
            filter === "attachments" &&
            !thread.messages.some((m) => m.attachments?.length)
          )
            return false;
          return true;
        })
        .sort(
          (a, b) =>
            (new Date(b.date).getTime() - new Date(a.date).getTime()) *
            (oldest ? -1 : 1),
        ),
    [mailbox.threads, mailbox.labels, query, view, category, filter, oldest],
  );
  const visible = filtered.slice(page * 50, (page + 1) * 50);
  useEffect(() => {
    const matchingIds = new Set(filtered.map((thread) => thread.id));
    setSelected((previous) => {
      const kept = [...previous].filter((id) => matchingIds.has(id));
      return kept.length === previous.size ? previous : new Set(kept);
    });
    setPage((previous) =>
      Math.min(previous, Math.max(0, Math.ceil(filtered.length / 50) - 1)),
    );
  }, [filtered]);
  const openThread = mailbox.threads.find((t) => t.id === openId);
  const draft = mailbox.drafts.find((d) => d.id === composeId);
  const activeCount = mailbox.threads.filter(
    (t) => t.folder === "inbox" && t.unread && !t.snoozedUntil,
  ).length;
  const pageTitle = query
    ? "Search results"
    : view.startsWith("label:")
      ? mailbox.labels.find((l) => l.id === view.slice(6))?.name || "Label"
      : viewNames[view];
  const unreadCount = filtered.filter((t) => t.unread).length;
  const allSelected =
    visible.length > 0 && visible.every((t) => selected.has(t.id));
  const isDrafts = view === "drafts" && !query;

  function navigate(next: View) {
    setView(next);
    setQuery("");
    setFilter("all");
    setOpenId(null);
    setSelected(new Set());
    setSidebar(false);
    setMenu(null);
    setPage(0);
  }
  function select(id: string) {
    setSelected((prev) => {
      const result = new Set(prev);
      if (result.has(id)) result.delete(id);
      else result.add(id);
      return result;
    });
  }
  function selectAll() {
    setSelected(allSelected ? new Set() : new Set(visible.map((t) => t.id)));
  }
  function openThreadById(id: string) {
    if (!openId) setReadingIds(filtered.map((thread) => thread.id));
    setOpenId(id);
    setSelected(new Set());
    setMailbox((prev) => ({
      ...prev,
      threads: prev.threads.map((t) =>
        t.id === id ? { ...t, unread: false } : t,
      ),
    }));
  }

  function perform(
    action: string,
    ids = openId ? [openId] : [...selected],
    until?: string,
  ) {
    if (!ids.length) return;
    const previous = latestMailbox.current.threads.filter((t) =>
      ids.includes(t.id),
    );
    setMailbox((prev) => ({
      ...prev,
      threads: changeThreads(prev.threads, ids, action, until),
    }));
    if (
      ["archive", "delete", "restore", "snooze", "unsnooze"].includes(action) ||
      (action === "unread" && openId)
    ) {
      setOpenId(null);
      setSelected(new Set());
    }
    const count =
      ids.length === 1 ? "Conversation" : `${ids.length} conversations`;
    const messages: Record<string, string> = {
      archive: `${count} archived`,
      delete: `${count} moved to Trash`,
      restore: `${count} moved to Inbox`,
      read: `${count} marked as read`,
      unread: `${count} marked as unread`,
      snooze: `${count} snoozed. A little more headspace.`,
      unsnooze: `${count} returned to Inbox`,
      important: "Importance updated",
    };
    if (action !== "star")
      notify(messages[action] || "Conversation updated", () =>
        setMailbox((prev) => ({
          ...prev,
          threads: prev.threads.map(
            (t) => previous.find((p) => p.id === t.id) || t,
          ),
        })),
      );
    setMenu(null);
  }

  function newCompose(email?: string, reply?: Thread, forward = false) {
    if (composeId) {
      notify("Finish or save your open draft before starting another.");
      return;
    }
    const last = reply?.messages[reply.messages.length - 1];
    const subject = reply
      ? `${forward ? "Fwd: " : /^re:/i.test(reply.subject) ? "" : "Re: "}${reply.subject}`
      : "";
    const body =
      forward && last
        ? `\n\n---------- Forwarded message ----------\nFrom: ${last.name} <${last.email}>\nDate: ${new Date(last.date).toLocaleString()}\nSubject: ${reply?.subject}\nTo: ${last.to}\n\n${last.body}`
        : "";
    const next: Draft = {
      id: crypto.randomUUID(),
      to: email
        ? [email]
        : reply && !forward
          ? (last?.email === ACCOUNT.email
              ? last.to
              : last?.email || reply.email
            )
              .split(",")
              .map((email) => email.trim())
              .filter(Boolean)
          : [],
      cc: "",
      bcc: "",
      subject,
      body,
      html: "",
      attachments: forward ? last?.attachments || [] : [],
      updatedAt: new Date().toISOString(),
      replyTo: reply && !forward ? reply.id : undefined,
    };
    setMailbox((prev) => ({ ...prev, drafts: [next, ...prev.drafts] }));
    setComposeId(next.id);
    setSidebar(false);
    setMenu(null);
  }
  function closeCompose() {
    if (
      draft &&
      !draft.subject &&
      !draft.body &&
      !draft.to.length &&
      !draft.attachments.length
    )
      setMailbox((prev) => ({
        ...prev,
        drafts: prev.drafts.filter((d) => d.id !== composeId),
      }));
    else notify("Draft saved. Pick it up whenever you’re ready.");
    setComposeId(null);
  }
  function sendDraft(sent: Draft) {
    const before = latestMailbox.current.threads.find(
      (t) => t.id === sent.replyTo,
    );
    const now = new Date().toISOString();
    const messageId = crypto.randomUUID();
    const threadId = sent.replyTo || crypto.randomUUID();
    setMailbox((prev) => deliverDraft(prev, sent, messageId, threadId, now));
    setComposeId(null);
    notify("Message sent. Nicely said.", () => {
      setMailbox((prev) => ({
        ...prev,
        drafts: [...prev.drafts.filter((d) => d.id !== sent.id), sent],
        threads: before
          ? prev.threads.map((t) => (t.id === threadId ? before : t))
          : prev.threads.filter((t) => t.id !== threadId),
      }));
      setComposeId(sent.id);
    });
  }
  function showActionDialog(
    type: Dialog,
    ids = openId ? [openId] : [...selected],
  ) {
    setActionIds(ids);
    setDialog(type);
  }
  function applyLabels(labels: string[]) {
    const before = latestMailbox.current.threads.filter((t) =>
      actionIds.includes(t.id),
    );
    setMailbox((prev) => ({
      ...prev,
      threads: changeLabels(prev.threads, actionIds, labels),
    }));
    notify("Labels updated", () =>
      setMailbox((prev) => ({
        ...prev,
        threads: prev.threads.map(
          (t) => before.find((b) => b.id === t.id) || t,
        ),
      })),
    );
  }
  function refresh() {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      notify("You’re up to date. Enjoy a little breathing room.");
    }, 650);
  }
  function exportMailbox() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(mailbox, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `mailbox-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Mailbox backup downloaded");
  }
  function changeMenu(name: string) {
    setMenu(menu === name ? null : name);
  }

  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.closest('input, textarea, [contenteditable="true"]') ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        composeId ||
        dialog
      )
        return;
      const action = e.key.toLowerCase();
      if (action === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (action === "c") {
        e.preventDefault();
        newCompose();
      }
      if (action === "?") setDialog("help");
      if (action === "escape") {
        setOpenId(null);
        setSelected(new Set());
        setMenu(null);
        setSidebar(false);
        setPanel(null);
      }
      if (action === "e") perform("archive");
      if (action === "#") perform("delete");
      if (action === "s") perform("star");
      if (action === "u") perform("unread");
      if (action === "r" && openThread) newCompose(undefined, openThread);
      if ((action === "j" || action === "k") && openId) {
        const next =
          readingIds[readingIds.indexOf(openId) + (action === "j" ? 1 : -1)];
        if (next) openThreadById(next);
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  });

  function navCount(id: View) {
    if (id === "inbox") return activeCount;
    if (id === "drafts") return mailbox.drafts.length;
    if (id === "snoozed")
      return mailbox.threads.filter(
        (t) => t.snoozedUntil && t.folder !== "trash",
      ).length;
    return 0;
  }
  const targetThreads = mailbox.threads.filter((t) => actionIds.includes(t.id));
  const commonLabels = targetThreads.length
    ? targetThreads[0].labels.filter((id) =>
        targetThreads.every((t) => t.labels.includes(id)),
      )
    : [];

  return (
    <div
      className={`app ${collapsed ? "sidebar-collapsed" : ""} density-${mailbox.settings.density}`}
    >
      <Header
        query={query}
        setQuery={setQuery}
        searchRef={searchRef}
        setOpenId={setOpenId}
        sidebar={sidebar}
        setSidebar={setSidebar}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        navigate={navigate}
        setDialog={setDialog}
        menu={menu}
        changeMenu={changeMenu}
        setMenu={setMenu}
        setPanel={setPanel}
        exportMailbox={exportMailbox}
      />

      {sidebar && (
        <div className="sidebar-scrim" onClick={() => setSidebar(false)} />
      )}
      <Sidebar
        sidebar={sidebar}
        newCompose={newCompose}
        view={view}
        query={query}
        navigate={navigate}
        navCount={navCount}
        moreFolders={moreFolders}
        setMoreFolders={setMoreFolders}
        mailbox={mailbox}
        setDialog={setDialog}
      />

      <main className={`main-area ${panel ? "has-panel" : ""}`}>
        <section className="mail-surface" aria-label={pageTitle}>
          {openThread ? (
            <ReadingView
              key={openThread.id}
              thread={openThread}
              labels={mailbox.labels}
              position={Math.max(0, readingIds.indexOf(openId!))}
              total={readingIds.length}
              onBack={() => setOpenId(null)}
              onAction={(action) => perform(action)}
              onReply={(forward) => newCompose(undefined, openThread, forward)}
              onMove={(direction) => {
                const next =
                  readingIds[readingIds.indexOf(openId!) + direction];
                if (next) openThreadById(next);
              }}
              onLabels={() => showActionDialog("labels")}
              onSnooze={() => showActionDialog("snooze")}
            />
          ) : (
            <>
              <div className="inbox-heading">
                <div>
                  <div className="inbox-title">
                    <h2>{pageTitle}</h2>
                    {!isDrafts && (
                      <span className="title-count">{filtered.length}</span>
                    )}
                  </div>
                  <p>
                    {query
                      ? `Finding a little clarity in “${query}”`
                      : view === "inbox"
                        ? "A little clarity for your day."
                        : view === "starred"
                          ? "The conversations worth keeping close."
                          : view === "drafts"
                            ? "Good words take a little time."
                            : view === "sent"
                              ? "Out into the world. All in one place."
                              : view === "trash"
                                ? "A second chance for the things you let go."
                                : view === "snoozed"
                                  ? "Out of sight, until the time is right."
                                  : view === "all"
                                    ? "Every conversation, a little easier to find."
                                    : "Your conversations, thoughtfully organized."}
                  </p>
                </div>
                <div className="heading-actions">
                  {view === "trash" && filtered.length > 0 && (
                    <button
                      className="text-button danger"
                      onClick={() => setDialog("empty-trash")}
                    >
                      Empty trash
                    </button>
                  )}
                  {isDrafts ? (
                    <button
                      className="outline-button"
                      onClick={() => newCompose()}
                    >
                      <Plus size={15} />
                      New draft
                    </button>
                  ) : (
                    <div className="menu-anchor">
                      <button
                        className={`outline-button filter-button ${filter !== "all" ? "filter-active" : ""}`}
                        onClick={() => changeMenu("filter")}
                      >
                        <ListFilter size={15} />
                        <span>
                          {
                            {
                              all: "All messages",
                              unread: "Unread",
                              starred: "Starred",
                              attachments: "Attachments",
                            }[filter]
                          }
                        </span>
                        <ChevronDown size={13} />
                      </button>
                      {menu === "filter" && (
                        <div className="dropdown-menu align-right">
                          <span className="menu-caption">SHOW MESSAGES</span>
                          {(
                            ["all", "unread", "starred", "attachments"] as const
                          ).map((f) => (
                            <button
                              key={f}
                              onClick={() => {
                                setFilter(f);
                                setMenu(null);
                              }}
                            >
                              <span>
                                {
                                  {
                                    all: "All messages",
                                    unread: "Unread only",
                                    starred: "Starred only",
                                    attachments: "With attachments",
                                  }[f]
                                }
                              </span>
                              {filter === f && <Check size={15} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {view === "inbox" && !query && (
                <div
                  className="category-tabs"
                  role="tablist"
                  aria-label="Inbox categories"
                >
                  {(
                    [
                      { id: "primary", name: "Primary", icon: Inbox },
                      { id: "updates", name: "Updates", icon: RefreshCw },
                      { id: "promotions", name: "Promotions", icon: Tag },
                    ] as const
                  ).map((tab) => {
                    const count = mailbox.threads.filter(
                      (t) =>
                        t.category === tab.id &&
                        t.folder === "inbox" &&
                        t.unread &&
                        !t.snoozedUntil,
                    ).length;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={category === tab.id}
                        className={category === tab.id ? "active" : ""}
                        onClick={() => setCategory(tab.id)}
                      >
                        <tab.icon size={17} strokeWidth={1.75} />
                        <span>{tab.name}</span>
                        {count > 0 && tab.id !== "primary" && (
                          <span className={`tab-badge ${tab.id}`}>
                            {count} new
                          </span>
                        )}
                        <span className="tab-active-indicator" />
                      </button>
                    );
                  })}
                </div>
              )}
              {isDrafts ? (
                <div className="mail-toolbar draft-toolbar">
                  <FilePenLine size={15} />
                  <span>Saved automatically. Ready when you are.</span>
                  <span className="draft-toolbar-count">
                    {mailbox.drafts.length} drafts
                  </span>
                </div>
              ) : (
                <div
                  className={`mail-toolbar ${selected.size ? "selection-toolbar" : ""}`}
                >
                  <div className="selection-control">
                    <Checkbox
                      checked={allSelected}
                      partial={!allSelected && selected.size > 0}
                      label="Select all messages"
                      disabled={!visible.length}
                      onChange={selectAll}
                    />
                    <div className="menu-anchor">
                      <button
                        className="small-chevron"
                        aria-label="Selection options"
                        onClick={() => changeMenu("select")}
                      >
                        <ChevronDown size={12} />
                      </button>
                      {menu === "select" && (
                        <div className="dropdown-menu">
                          <button
                            onClick={() => {
                              setSelected(new Set(visible.map((t) => t.id)));
                              setMenu(null);
                            }}
                          >
                            Select all
                          </button>
                          <button
                            onClick={() => {
                              setSelected(
                                new Set(
                                  visible
                                    .filter((t) => t.unread)
                                    .map((t) => t.id),
                                ),
                              );
                              setMenu(null);
                            }}
                          >
                            Select unread
                          </button>
                          <button
                            onClick={() => {
                              setSelected(
                                new Set(
                                  visible
                                    .filter((t) => t.starred)
                                    .map((t) => t.id),
                                ),
                              );
                              setMenu(null);
                            }}
                          >
                            Select starred
                          </button>
                          <button
                            onClick={() => {
                              setSelected(new Set());
                              setMenu(null);
                            }}
                          >
                            Select none
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {selected.size > 0 ? (
                    <>
                      <span className="selected-caption">
                        {selected.size} selected
                      </span>
                      <span className="toolbar-divider" />
                      {view === "trash" ? (
                        <IconButton
                          icon={Inbox}
                          label="Restore selected"
                          onClick={() => perform("restore")}
                        />
                      ) : (
                        <>
                          <IconButton
                            icon={Archive}
                            label="Archive selected"
                            onClick={() => perform("archive")}
                          />
                          <IconButton
                            icon={Trash2}
                            label="Delete selected"
                            onClick={() => perform("delete")}
                          />
                        </>
                      )}
                      <IconButton
                        icon={MailOpen}
                        label="Mark selected as read"
                        onClick={() => perform("read")}
                      />
                      <IconButton
                        icon={Mail}
                        label="Mark selected as unread"
                        onClick={() => perform("unread")}
                      />
                      <IconButton
                        icon={Clock3}
                        label="Snooze selected"
                        onClick={() => showActionDialog("snooze")}
                      />
                      <IconButton
                        icon={Tag}
                        label="Label selected"
                        onClick={() => showActionDialog("labels")}
                      />
                      <IconButton
                        icon={Star}
                        label="Star selected"
                        onClick={() => perform("star")}
                      />
                    </>
                  ) : (
                    <>
                      <IconButton
                        icon={RefreshCw}
                        label="Refresh inbox"
                        className={refreshing ? "spinning" : ""}
                        onClick={refresh}
                      />
                      <div className="menu-anchor">
                        <IconButton
                          icon={MoreHorizontal}
                          label="More mailbox actions"
                          onClick={() => changeMenu("more")}
                        />
                        {menu === "more" && (
                          <div className="dropdown-menu">
                            <button
                              disabled={!filtered.length}
                              onClick={() =>
                                perform(
                                  "read",
                                  filtered.map((t) => t.id),
                                )
                              }
                            >
                              <CheckCheck size={15} />
                              Mark all as read
                            </button>
                            <button
                              onClick={() => {
                                setMailbox((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    density:
                                      prev.settings.density === "comfortable"
                                        ? "compact"
                                        : "comfortable",
                                  },
                                }));
                                setMenu(null);
                              }}
                            >
                              <ListFilter size={15} />
                              {mailbox.settings.density === "compact"
                                ? "Comfortable"
                                : "Compact"}{" "}
                              view
                            </button>
                            <button
                              onClick={() => {
                                setDialog("help");
                                setMenu(null);
                              }}
                            >
                              <CircleHelp size={15} />
                              Keyboard shortcuts
                            </button>
                          </div>
                        )}
                      </div>
                      {view === "snoozed" && (
                        <span className="toolbar-hint">
                          We’ll bring these back when it’s time.
                        </span>
                      )}
                    </>
                  )}
                  <div className="toolbar-end">
                    <button
                      className="sort-button"
                      onClick={() => {
                        setOldest(!oldest);
                        setPage(0);
                      }}
                      title={
                        oldest
                          ? "Switch to newest first"
                          : "Switch to oldest first"
                      }
                    >
                      {oldest ? "Oldest first" : "Newest first"}
                      <ArrowDown size={12} className={oldest ? "rotate" : ""} />
                    </button>
                    <span className="toolbar-divider" />
                    <span className="pagination-text">
                      {isDrafts
                        ? `${mailbox.drafts.length} drafts`
                        : filtered.length
                          ? `${page * 50 + 1}–${Math.min((page + 1) * 50, filtered.length)} of ${filtered.length}`
                          : "0 messages"}
                    </span>
                    <IconButton
                      icon={ChevronLeft}
                      label="Previous page"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    />
                    <IconButton
                      icon={ChevronRight}
                      label="Next page"
                      disabled={(page + 1) * 50 >= filtered.length || isDrafts}
                      onClick={() => setPage(page + 1)}
                    />
                  </div>
                </div>
              )}

              <MailList
                isDrafts={isDrafts}
                mailbox={mailbox}
                setComposeId={setComposeId}
                setMenu={setMenu}
                setMailbox={setMailbox}
                composeId={composeId}
                notify={notify}
                newCompose={newCompose}
                visible={visible}
                unreadCount={unreadCount}
                selected={selected}
                select={select}
                perform={perform}
                openThreadById={openThreadById}
                query={query}
                view={view}
                filter={filter}
                setQuery={setQuery}
                setFilter={setFilter}
              />
              <footer className="mail-footer">
                <span>
                  <span className="status-dot" />
                  {storageError
                    ? "Storage full — export a backup in Settings"
                    : "All changes saved"}
                </span>
                <span className="footer-thought">
                  A little less noise. A little more focus.
                </span>
                <button onClick={() => setDialog("help")}>
                  Shortcuts <kbd>?</kbd>
                </button>
              </footer>
            </>
          )}
        </section>
        {panel && (
          <UtilityPanel
            type={panel}
            mailbox={mailbox}
            onUpdate={(change) =>
              setMailbox((prev) => ({ ...prev, ...change }))
            }
            onClose={() => setPanel(null)}
            onCompose={(email) => newCompose(email)}
          />
        )}
      </main>

      <aside className="utility-rail" aria-label="Productivity tools">
        {[
          {
            id: "calendar",
            icon: CalendarDays,
            name: "Calendar",
            color: "blue",
          },
          { id: "notes", icon: StickyNote, name: "Notes", color: "yellow" },
          { id: "tasks", icon: CheckCheck, name: "Tasks", color: "green" },
          {
            id: "contacts",
            icon: UsersRound,
            name: "Contacts",
            color: "violet",
          },
        ].map((item) => (
          <IconButton
            key={item.id}
            icon={item.icon}
            label={item.name}
            className={`rail-button ${item.color} ${panel === item.id ? "active" : ""}`}
            onClick={() => setPanel(panel === item.id ? null : item.id)}
          />
        ))}
        <span className="rail-divider" />
        <IconButton
          icon={Plus}
          label="Add a quick task"
          onClick={() => setPanel("tasks")}
        />
        <div className="rail-bottom">
          <IconButton
            icon={ChevronLeft}
            label={panel ? "Close side panel" : "Open side panel"}
            onClick={() => setPanel(panel ? null : "calendar")}
          />
        </div>
      </aside>

      {draft && (
        <Compose
          key={draft.id}
          draft={draft}
          signature={mailbox.settings.signature}
          saveError={storageError}
          onChange={(changed) =>
            setMailbox((prev) => ({
              ...prev,
              drafts: prev.drafts.map((d) =>
                d.id === changed.id ? changed : d,
              ),
            }))
          }
          onClose={closeCompose}
          onDiscard={() => {
            const discarded = draft;
            setMailbox((prev) => ({
              ...prev,
              drafts: prev.drafts.filter((d) => d.id !== composeId),
            }));
            setComposeId(null);
            notify("Draft discarded", () => {
              setMailbox((prev) => ({
                ...prev,
                drafts: [...prev.drafts, discarded],
              }));
              setComposeId(discarded.id);
            });
          }}
          onSend={sendDraft}
        />
      )}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span className="toast-check">
            <Check size={15} />
          </span>
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
          <IconButton
            icon={X}
            label="Dismiss notification"
            onClick={() => setToast(null)}
          />
        </div>
      )}
      {dialog === "help" && <HelpModal onClose={closeDialog} />}
      {dialog === "settings" && (
        <SettingsPanel
          settings={mailbox.settings}
          onChange={(settings) => setMailbox((prev) => ({ ...prev, settings }))}
          onClose={closeDialog}
          onExport={exportMailbox}
        />
      )}
      {dialog === "search" && (
        <SearchModal
          onClose={closeDialog}
          onSearch={(value) => {
            setQuery(value);
            setOpenId(null);
          }}
        />
      )}
      {dialog === "labels" && (
        <LabelsModal
          labels={mailbox.labels}
          applied={commonLabels}
          onApply={applyLabels}
          onClose={closeDialog}
          onCreate={() => setDialog("create-label")}
        />
      )}
      {dialog === "create-label" && (
        <CreateLabelModal
          labels={mailbox.labels}
          onCreate={(label) => {
            setMailbox((prev) => ({
              ...prev,
              labels: [...prev.labels, label],
            }));
            notify(`“${label.name}” is ready for your conversations`);
          }}
          onClose={closeDialog}
        />
      )}
      {dialog === "snooze" && (
        <SnoozeModal
          onClose={closeDialog}
          onSnooze={(until) => perform("snooze", actionIds, until)}
        />
      )}
      {dialog === "empty-trash" && (
        <Modal
          title="Let these conversations go?"
          onClose={closeDialog}
          className="small-modal"
        >
          <p className="modal-description">
            This will permanently delete{" "}
            {mailbox.threads.filter((t) => t.folder === "trash").length}{" "}
            conversations from your local mailbox. You won’t be able to undo
            this.
          </p>
          <div className="modal-actions">
            <button className="outline-button" onClick={closeDialog}>
              Keep them
            </button>
            <button
              className="danger-button"
              onClick={() => {
                setMailbox((prev) => ({
                  ...prev,
                  threads: prev.threads.filter((t) => t.folder !== "trash"),
                }));
                setDialog(null);
                setSelected(new Set());
                notify("Trash emptied. A fresh start.");
              }}
            >
              Empty trash
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
