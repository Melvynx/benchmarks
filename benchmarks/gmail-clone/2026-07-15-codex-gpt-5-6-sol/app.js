import { contacts, currentUser, labels, seedMail } from "./data.js";

const STORAGE_KEY = "gpt-5.6-sol-mail-v1";
const APP_NOW = new Date("2026-07-15T12:00:00+03:00");
const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const undoActions = new Map();
let draftSaveTimer;
let activeFloatingMenu = null;

const iconPaths = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  sliders: '<path d="M4 7h10m4 0h2M4 17h2m4 0h10M14 5v4M6 15v4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 0 1 4.4 1c0 1.7-2.2 2-2.2 3.5M12 17.5h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .35 2l.05.05-2.75 2.75-.05-.05a1.8 1.8 0 0 0-2-.35 1.8 1.8 0 0 0-1.1 1.65V21h-3.8v-.05A1.8 1.8 0 0 0 9 19.3a1.8 1.8 0 0 0-2 .35l-.05.05L4.2 16.95l.05-.05a1.8 1.8 0 0 0 .35-2A1.8 1.8 0 0 0 2.95 13H3V9.2h-.05A1.8 1.8 0 0 0 4.6 8a1.8 1.8 0 0 0-.35-2l-.05-.05L6.95 3.2 7 3.25a1.8 1.8 0 0 0 2 .35A1.8 1.8 0 0 0 10.1 2H14v.05A1.8 1.8 0 0 0 15.1 3.7a1.8 1.8 0 0 0 2-.35l.05-.05 2.75 2.75-.05.05a1.8 1.8 0 0 0-.35 2 1.8 1.8 0 0 0 1.55 1.1H21V13h-.05A1.8 1.8 0 0 0 19.4 15Z"/>',
  compose: '<path d="m4 20 4.2-1 10.9-10.9a1.9 1.9 0 0 0-2.7-2.7L5.5 16.3 4 20Z"/><path d="m14.8 7 2.7 2.7"/>',
  inbox: '<path d="M4 5h16l2 8v6H2v-6l2-8Z"/><path d="M2 13h5l2 3h6l2-3h5"/>',
  star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.7l6.2-.9L12 3Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sent: '<path d="m3 4 18 8-18 8 3-8-3-8Z"/><path d="M6 12h15"/>',
  draft: '<path d="M6 3h9l3 3v15H6V3Z"/><path d="M9 10h6M9 14h6M9 18h4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  archive: '<path d="M4 8v12h16V8M3 4h18v4H3V4Z"/><path d="M9 12h6"/>',
  tag: '<path d="M4 4h7l9 9-7 7-9-9V4Z"/><circle cx="8" cy="8" r="1"/>',
  chevronDown: '<path d="m8 10 4 4 4-4"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  read: '<path d="m3 6 9 6 9-6v12H3V6Z"/><path d="m3 6 9 6 9-6"/>',
  unread: '<path d="M3 8.5 12 3l9 5.5V20H3V8.5Z"/><path d="m3 8.5 9 6 9-6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  briefcase: '<path d="M4 7h16v12H4V7Z"/><path d="M9 7V4h6v3M4 12h16M10 12v2h4v-2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  paperclip: '<path d="m8 12.5 6.3-6.3a3 3 0 0 1 4.2 4.2l-8 8a5 5 0 0 1-7.1-7.1l8-8"/>',
  close: '<path d="m7 7 10 10M17 7 7 17"/>',
  minimize: '<path d="M7 12h10"/>',
  maximize: '<path d="M6 6h12v12H6V6Z"/>',
  bold: '<path d="M7 5h6a4 4 0 0 1 0 8H7V5Zm0 8h7a4 4 0 0 1 0 8H7v-8Z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-4-4L5 20"/>',
  reply: '<path d="m9 9-5 4 5 4v-3h4a7 7 0 0 1 7 6 8 8 0 0 0-7-10H9V9Z"/>',
  forward: '<path d="m15 9 5 4-5 4v-3h-4a7 7 0 0 0-7 6 8 8 0 0 1 7-10h4V9Z"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  restore: '<path d="M3 7v5h5M4.5 16a8 8 0 1 0-.5-7"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h4M7 16h10"/>'
};

function icon(name, className = "") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.more}</svg>`;
}

function brandMark() {
  return `<svg viewBox="0 0 40 30" aria-hidden="true">
    <path d="M3 7.2 7.4 4 20 13.3 32.6 4 37 7.2v17.3a2 2 0 0 1-2 2h-4V11.8L20 20 9 11.8v14.7H5a2 2 0 0 1-2-2V7.2Z" fill="#fff"/>
    <path d="M3 7.2 9 11.8v14.7H5a2 2 0 0 1-2-2V7.2Z" fill="#4285f4"/>
    <path d="m7.4 4 12.6 9.3L17 19 3 8.6V7.2L7.4 4Z" fill="#c5221f"/>
    <path d="M37 7.2 31 11.8v14.7h4a2 2 0 0 0 2-2V7.2Z" fill="#34a853"/>
    <path d="m32.6 4-12.6 9.3 3 5.7L37 8.6V7.2L32.6 4Z" fill="#fbbc04"/>
    <path d="m7.4 4 12.6 9.3L32.6 4 37 7.2 20 20 3 7.2 7.4 4Z" fill="#ea4335"/>
  </svg>`;
}

function freshState() {
  return {
    version: 1,
    mail: structuredClone(seedMail),
    activeFolder: "inbox",
    category: "primary",
    selected: [],
    search: "",
    openId: null,
    sidebarCollapsed: false,
    mobileSidebar: false,
    density: "comfortable",
    compose: {
      open: false,
      minimized: false,
      draftId: null,
      to: [],
      cc: "",
      bcc: "",
      showCc: false,
      subject: "",
      body: "",
      attachments: []
    }
  };
}

function loadState() {
  const fallback = freshState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 1 || !Array.isArray(saved.mail)) return fallback;
    return {
      ...fallback,
      ...saved,
      selected: [],
      search: "",
      openId: null,
      mobileSidebar: false,
      compose: { ...fallback.compose, ...(saved.compose || {}), open: false, minimized: false }
    };
  } catch {
    return fallback;
  }
}

let state = loadState();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      mail: state.mail,
      activeFolder: state.activeFolder,
      category: state.category,
      sidebarCollapsed: state.sidebarCollapsed,
      density: state.density,
      compose: { ...state.compose, open: false, minimized: false }
    }));
  } catch {
    // Local persistence is a convenience; the in-memory client remains usable.
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avatar(person, className = "") {
  const safe = person || { name: "Unknown", initials: "?", color: "#5f6368" };
  return `<span class="avatar ${className}" style="background:${escapeHtml(safe.color)}" title="${escapeHtml(safe.name)}">${escapeHtml(safe.initials)}</span>`;
}

function formatListTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === APP_NOW.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const days = Math.floor((APP_NOW - date) / 86400000);
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function folderTitle(folder = state.activeFolder) {
  if (folder.startsWith("label:")) return folder.slice(6);
  return ({ inbox: "Inbox", starred: "Starred", sent: "Sent", drafts: "Drafts", trash: "Trash", all: "All mail" })[folder] || "Inbox";
}

function unreadInboxCount() {
  return state.mail.filter((mail) => mail.folder === "inbox" && !mail.archived && mail.unread).length;
}

function matchesQuery(mail, rawQuery) {
  let query = rawQuery.trim().toLowerCase();
  const operators = {};
  query = query.replace(/\b(from|to|label|is|has|in):([^\s]+)/g, (_, key, value) => {
    (operators[key] ||= []).push(value.replace(/^"|"$/g, ""));
    return " ";
  }).trim();

  if (operators.from?.some((value) => !`${mail.sender.name} ${mail.sender.email}`.toLowerCase().includes(value))) return false;
  if (operators.to?.some((value) => !mail.recipients.some((person) => `${person.name} ${person.email}`.toLowerCase().includes(value)))) return false;
  if (operators.label?.some((value) => !mail.labels.some((label) => label.toLowerCase().includes(value)))) return false;
  if (operators.is?.includes("starred") && !mail.starred) return false;
  if (operators.is?.includes("unread") && !mail.unread) return false;
  if (operators.is?.includes("read") && mail.unread) return false;
  if (operators.has?.includes("attachment") && !mail.attachments?.length) return false;
  if (operators.in?.some((value) => mail.folder !== value && !(value === "inbox" && mail.folder === "inbox" && !mail.archived))) return false;

  if (!query) return true;
  const bodyText = (mail.messages || []).flatMap((message) => message.paragraphs || []).join(" ");
  const haystack = [mail.sender.name, mail.sender.email, mail.subject, mail.snippet, bodyText, ...(mail.labels || [])].join(" ").toLowerCase();
  return query.split(/\s+/).every((term) => haystack.includes(term));
}

function visibleMail() {
  let mail = [...state.mail];
  if (state.search.trim()) {
    mail = mail.filter((item) => matchesQuery(item, state.search));
  } else if (state.activeFolder === "starred") {
    mail = mail.filter((item) => item.starred && item.folder !== "trash");
  } else if (state.activeFolder === "all") {
    mail = mail.filter((item) => item.folder !== "trash" && item.folder !== "drafts");
  } else if (state.activeFolder.startsWith("label:")) {
    const label = state.activeFolder.slice(6);
    mail = mail.filter((item) => item.labels.includes(label) && item.folder !== "trash");
  } else if (state.activeFolder === "inbox") {
    mail = mail.filter((item) => item.folder === "inbox" && !item.archived && item.category === state.category);
  } else {
    mail = mail.filter((item) => item.folder === state.activeFolder);
  }

  return mail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function navItem(folder, label, iconName, count = "") {
  const active = state.activeFolder === folder && !state.search;
  return `<button class="nav-item ${active ? "active" : ""}" data-action="navigate" data-folder="${escapeHtml(folder)}" aria-current="${active ? "page" : "false"}">
    <span class="nav-icon">${icon(iconName)}</span><span>${escapeHtml(label)}</span><span class="count">${count || ""}</span>
  </button>`;
}

function topbarTemplate() {
  const query = escapeHtml(state.search);
  return `<header class="topbar">
    <div class="brand-zone">
      <button class="icon-button" data-action="toggle-sidebar" title="Toggle navigation" aria-label="Toggle navigation">${icon("menu")}</button>
      <span class="brand-mark">${brandMark()}</span>
      <h1 class="brand-title">gpt-5.6-sol</h1>
    </div>
    <div class="search-wrap">
      <div class="search-box">
        <button class="icon-button search-menu-button" data-action="search-leading" title="Search" aria-label="Search or open navigation"><span class="desktop-search-icon">${icon("search")}</span><span class="mobile-menu-icon">${icon("menu")}</span></button>
        <input id="mail-search" type="search" autocomplete="off" value="${query}" placeholder="Search mail" aria-label="Search mail" />
        ${state.search ? `<button class="icon-button" data-action="clear-search" title="Clear search" aria-label="Clear search">${icon("close")}</button>` : ""}
        <button class="icon-button search-options" data-action="toggle-search-popover" title="Search options" aria-label="Search options">${icon("sliders")}</button>
      </div>
      <div id="search-popover" class="search-popover" role="dialog" aria-label="Search options">
        <div class="search-popover-title">Try a smart search</div>
        ${searchTip("from:maya", "from:maya", "Messages sent by Maya")}
        ${searchTip("has:attachment", "has:attachment", "Mail with files attached")}
        ${searchTip("is:unread label:work", "is:unread label:work", "Unread work messages")}
        ${searchTip("in:sent roadmap", "in:sent roadmap", "Sent mail about the roadmap")}
      </div>
    </div>
    <div class="topbar-actions">
      <span class="shortcut-hint"><kbd>/</kbd><span>Search</span></span>
      <button class="icon-button" data-action="help-menu" title="Keyboard shortcuts" aria-label="Keyboard shortcuts">${icon("help")}</button>
      <button class="icon-button" data-action="settings-menu" title="Settings" aria-label="Settings">${icon("settings")}</button>
      <button class="account-button" data-action="account-menu" title="Account" aria-label="Account menu">${avatar(currentUser)}</button>
    </div>
  </header>`;
}

function searchTip(query, title, detail) {
  return `<button class="search-tip" data-action="search-tip" data-query="${escapeHtml(query)}">
    ${icon("search")}<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>
  </button>`;
}

function sidebarTemplate() {
  const drafts = state.mail.filter((mail) => mail.folder === "drafts").length;
  return `<aside class="sidebar ${state.mobileSidebar ? "mobile-open" : ""}" aria-label="Mailbox navigation">
    <div class="mobile-title-row"><span class="brand-mark">${brandMark()}</span><h1 class="brand-title">gpt-5.6-sol</h1><button class="icon-button" data-action="mobile-menu" aria-label="Close navigation">${icon("close")}</button></div>
    <button class="compose-button" data-action="open-compose">${icon("compose")}<span>Compose</span></button>
    <nav class="nav-list">
      ${navItem("inbox", "Inbox", "inbox", unreadInboxCount())}
      ${navItem("starred", "Starred", "star")}
      ${navItem("sent", "Sent", "sent")}
      ${navItem("drafts", "Drafts", "draft", drafts)}
      ${navItem("all", "All mail", "read")}
      ${navItem("trash", "Trash", "trash")}
    </nav>
    <div class="nav-section-title"><span>Labels</span><button class="icon-button" data-action="label-info" aria-label="Label tips">${icon("help")}</button></div>
    <nav class="nav-list">
      ${labels.map((label) => `<button class="nav-item ${state.activeFolder === `label:${label.name}` && !state.search ? "active" : ""}" data-action="navigate" data-folder="label:${escapeHtml(label.name)}"><span class="nav-icon"><span class="label-dot" style="--label-color:${label.color}"></span></span><span>${escapeHtml(label.name)}</span><span class="count"></span></button>`).join("")}
    </nav>
    <div class="storage"><div class="storage-line"></div><p>2.1 GB of 15 GB used</p></div>
  </aside>`;
}

function toolbarTemplate() {
  const selected = state.selected.length;
  const list = visibleMail();
  const allSelected = list.length > 0 && list.every((mail) => state.selected.includes(mail.id));
  if (selected) {
    const anyUnread = state.mail.filter((mail) => state.selected.includes(mail.id)).some((mail) => mail.unread);
    return `<div class="mail-toolbar">
      <div class="toolbar-group">
        <button class="icon-button" data-action="clear-selection" title="Clear selection" aria-label="Clear selection">${icon("close")}</button>
        <span class="soft-button desktop-only">${selected} selected</span>
        <span class="toolbar-divider"></span>
        <button class="icon-button" data-action="archive-selected" title="Archive" aria-label="Archive selected">${icon("archive")}</button>
        <button class="icon-button" data-action="delete-selected" title="Delete" aria-label="Delete selected">${icon("trash")}</button>
        <button class="icon-button" data-action="mark-selected" title="Mark ${anyUnread ? "read" : "unread"}" aria-label="Mark selected ${anyUnread ? "read" : "unread"}">${icon(anyUnread ? "read" : "unread")}</button>
        <button class="icon-button" data-action="label-selected" title="Labels" aria-label="Label selected">${icon("tag")}</button>
      </div>
      <div class="pagination"><span>${selected} selected</span></div>
    </div>`;
  }
  return `<div class="mail-toolbar">
    <div class="toolbar-group">
      <label class="select-all-wrap" title="Select all"><input class="checkbox" type="checkbox" data-action="select-all" aria-label="Select all messages" ${allSelected ? "checked" : ""}></label>
      <button class="icon-button" data-action="refresh" title="Refresh" aria-label="Refresh inbox">${icon("refresh")}</button>
      <button class="icon-button desktop-only" data-action="more-menu" title="More" aria-label="More mailbox actions">${icon("more")}</button>
    </div>
    <div class="pagination"><span>${list.length ? `1–${list.length} of ${list.length}` : "0 messages"}</span><button class="icon-button" disabled aria-label="Previous page">${icon("chevronLeft")}</button><button class="icon-button" disabled aria-label="Next page">${icon("chevronRight")}</button></div>
  </div>`;
}

function contextTemplate() {
  if (!state.search && state.activeFolder === "inbox") {
    const categoryMeta = [
      ["primary", "inbox", "Primary"],
      ["updates", "info", "Updates"],
      ["social", "users", "Social"]
    ];
    return `<div class="mail-context"><div class="category-tabs" role="tablist">
      ${categoryMeta.map(([id, iconName, label]) => {
        const unread = state.mail.filter((mail) => mail.folder === "inbox" && !mail.archived && mail.category === id && mail.unread).length;
        return `<button class="category-tab ${state.category === id ? "active" : ""}" data-action="category" data-category="${id}" role="tab" aria-selected="${state.category === id}">${icon(iconName)}<span>${label}</span>${unread ? `<span class="category-count">${unread} new</span>` : ""}</button>`;
      }).join("")}
    </div></div>`;
  }
  const count = visibleMail().length;
  return `<div class="mail-context"><div class="mail-heading"><h2>${state.search ? `Search results for “${escapeHtml(state.search)}”` : escapeHtml(folderTitle())}</h2><p>${count} ${count === 1 ? "conversation" : "conversations"}</p></div></div>`;
}

function mailRowTemplate(mail) {
  const selected = state.selected.includes(mail.id);
  const sentDisplay = mail.folder === "sent" || mail.folder === "drafts";
  const senderText = sentDisplay ? (mail.recipients.length ? `To: ${mail.recipients.map((person) => person.name).join(", ")}` : "Draft") : mail.sender.name;
  const firstLabel = mail.labels?.[0];
  return `<article class="mail-row ${mail.unread ? "unread" : ""} ${selected ? "selected selection-mode" : ""}" data-mail-id="${mail.id}" tabindex="0" aria-label="${escapeHtml(`${senderText}, ${mail.subject}`)}">
    <label class="row-check" title="Select"><input class="checkbox" type="checkbox" data-action="select" data-id="${mail.id}" aria-label="Select ${escapeHtml(mail.subject)}" ${selected ? "checked" : ""}></label>
    <div class="row-star"><button class="icon-button ${mail.starred ? "starred" : ""}" data-action="star" data-id="${mail.id}" title="${mail.starred ? "Unstar" : "Star"}" aria-label="${mail.starred ? "Unstar" : "Star"} ${escapeHtml(mail.subject)}">${icon("star")}</button></div>
    <div class="row-avatar" data-action="select" data-id="${mail.id}" role="button" title="Select conversation">${avatar(sentDisplay ? (mail.recipients[0] || currentUser) : mail.sender)}</div>
    <div class="mail-sender">${escapeHtml(senderText)}${mail.messages?.length > 1 ? ` <span class="sender-email">${mail.messages.length}</span>` : ""}</div>
    <div class="mail-copy">${firstLabel ? `<span class="mail-label">${escapeHtml(firstLabel)}</span>` : ""}<span class="mail-subject">${mail.folder === "drafts" ? `<span style="color:#c5221f">Draft</span> · ` : ""}${escapeHtml(mail.subject || "(no subject)")}</span><span class="mail-snippet">— ${escapeHtml(mail.snippet)}</span>${mail.attachments?.length ? icon("paperclip", "paperclip") : ""}</div>
    <time class="mail-time" datetime="${mail.timestamp}">${escapeHtml(formatListTime(mail.timestamp))}</time>
    <div class="row-hover-actions">
      ${state.activeFolder === "trash" ? `<button class="icon-button" data-action="restore-one" data-id="${mail.id}" title="Restore" aria-label="Restore">${icon("restore")}</button>` : `<button class="icon-button" data-action="archive-one" data-id="${mail.id}" title="Archive" aria-label="Archive">${icon("archive")}</button>`}
      <button class="icon-button" data-action="delete-one" data-id="${mail.id}" title="Delete" aria-label="Delete">${icon("trash")}</button>
      <button class="icon-button" data-action="mark-one" data-id="${mail.id}" title="Mark ${mail.unread ? "read" : "unread"}" aria-label="Mark ${mail.unread ? "read" : "unread"}">${icon(mail.unread ? "read" : "unread")}</button>
    </div>
  </article>`;
}

function emptyStateTemplate() {
  const search = state.search.trim();
  const title = search ? "No matching conversations" : `Nothing in ${folderTitle().toLowerCase()}`;
  const copy = search ? "Try a sender name, subject keyword, or a search operator like has:attachment." : state.activeFolder === "inbox" ? "You’re all caught up in this category." : "Messages you organize here will appear in this view.";
  return `<div class="empty-state"><div class="empty-state-content"><div class="empty-state-icon">${icon(search ? "search" : "inbox")}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p>${search ? `<button class="primary-button" data-action="clear-search">Clear search</button>` : ""}</div></div>`;
}

function listViewTemplate() {
  const list = visibleMail();
  return `<div class="mail-layout">${toolbarTemplate()}${contextTemplate()}<div class="mail-list" id="mail-list">${list.length ? list.map(mailRowTemplate).join("") : emptyStateTemplate()}</div></div>`;
}

function attachmentsTemplate(attachments = []) {
  if (!attachments.length) return "";
  return `<div class="attachments">${attachments.map((file) => `<button class="attachment" data-action="attachment" data-name="${escapeHtml(file.name)}"><span class="attachment-icon" style="background:${file.type === "PDF" ? "#d93025" : file.type === "CSV" ? "#188038" : file.type === "FIG" ? "#9334e6" : "#1a73e8"}">${escapeHtml(file.type)}</span><span class="attachment-copy"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.size)}</span></span>${icon("download")}</button>`).join("")}</div>`;
}

function messageCardTemplate(message) {
  const own = message.from.email === currentUser.email;
  return `<section class="thread-card">
    ${avatar(message.from)}
    <div>
      <header class="thread-header">
        <div class="thread-sender"><strong>${escapeHtml(own ? "Alex Morgan" : message.from.name)}</strong><span class="sender-email">&lt;${escapeHtml(message.from.email)}&gt;</span><span class="thread-recipient">to ${escapeHtml(message.to.map((person) => person.email === currentUser.email ? "me" : person.name).join(", "))}</span></div>
        <div class="thread-meta"><time class="thread-time">${escapeHtml(formatFullTime(message.time))}</time><button class="icon-button" data-action="star-open" aria-label="Star conversation">${icon("star")}</button><button class="icon-button" data-action="message-more" aria-label="More message actions">${icon("more")}</button></div>
      </header>
      <div class="thread-body">${message.paragraphs.map((paragraph, index) => `<p class="${index === message.paragraphs.length - 1 && paragraph.length < 30 ? "thread-signature" : ""}">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("")}</div>
      ${attachmentsTemplate(message.attachments)}
    </div>
  </section>`;
}

function messageViewTemplate(mail) {
  return `<div class="message-view">
    <div class="message-toolbar">
      <div class="toolbar-group">
        <button class="icon-button" data-action="back" title="Back to ${escapeHtml(folderTitle())}" aria-label="Back">${icon("chevronLeft")}</button>
        <span class="toolbar-divider"></span>
        ${mail.folder === "trash" ? `<button class="icon-button" data-action="restore-one" data-id="${mail.id}" title="Restore" aria-label="Restore">${icon("restore")}</button>` : `<button class="icon-button" data-action="archive-one" data-id="${mail.id}" title="Archive" aria-label="Archive">${icon("archive")}</button>`}
        <button class="icon-button" data-action="delete-one" data-id="${mail.id}" title="Delete" aria-label="Delete">${icon("trash")}</button>
        <button class="icon-button" data-action="mark-one" data-id="${mail.id}" title="Mark ${mail.unread ? "read" : "unread"}" aria-label="Mark ${mail.unread ? "read" : "unread"}">${icon(mail.unread ? "read" : "unread")}</button>
        <button class="icon-button" data-action="label-open" data-id="${mail.id}" title="Labels" aria-label="Labels">${icon("tag")}</button>
      </div>
      <div class="pagination"><span>Conversation</span><button class="icon-button" data-action="back" aria-label="Close message">${icon("close")}</button></div>
    </div>
    <div class="message-scroll">
      <div class="subject-line"><div class="subject-main"><h2>${escapeHtml(mail.subject || "(no subject)")}</h2><div class="subject-labels">${mail.labels.map((label) => `<span class="label-chip">${escapeHtml(label)}</span>`).join("")}</div></div><button class="icon-button ${mail.starred ? "starred" : ""}" data-action="star" data-id="${mail.id}" title="${mail.starred ? "Unstar" : "Star"}">${icon("star")}</button></div>
      ${mail.messages.map(messageCardTemplate).join("")}
      <div class="reply-row"><button class="reply-button" data-action="reply" data-id="${mail.id}">${icon("reply")}Reply</button><button class="reply-button" data-action="forward" data-id="${mail.id}">${icon("forward")}Forward</button></div>
    </div>
  </div>`;
}

function mainTemplate() {
  const openMail = state.openId ? state.mail.find((mail) => mail.id === state.openId) : null;
  return openMail ? messageViewTemplate(openMail) : listViewTemplate();
}

function composeTemplate() {
  const compose = state.compose;
  const recipientChips = compose.to.map((person, index) => `<span class="recipient-chip">${avatar(person)}<span>${escapeHtml(person.name)}</span><button data-action="remove-recipient" data-index="${index}" aria-label="Remove ${escapeHtml(person.name)}">${icon("close")}</button></span>`).join("");
  const composeAttachments = compose.attachments.length ? `<div class="compose-attachments">${compose.attachments.map((file, index) => `<span class="compose-attachment-chip">${icon("paperclip")}<span>${escapeHtml(file.name)}</span><button data-action="remove-compose-attachment" data-index="${index}" aria-label="Remove attachment">${icon("close")}</button></span>`).join("")}</div>` : "";
  return `<section class="compose-window ${compose.open ? "open" : ""} ${compose.minimized ? "minimized" : ""}" aria-label="Compose message" aria-hidden="${!compose.open}">
    <header class="compose-header"><span>${escapeHtml(compose.subject || "New message")}</span><div class="compose-header-actions"><button class="icon-button" data-action="minimize-compose" aria-label="Minimize">${icon("minimize")}</button><button class="icon-button desktop-only" data-action="maximize-compose" aria-label="Toggle full screen">${icon("maximize")}</button><button class="icon-button" data-action="close-compose" aria-label="Save and close">${icon("close")}</button></div></header>
    <div class="compose-fields"><div class="compose-field"><span class="compose-field-label">To</span><div class="recipients">${recipientChips}<input id="recipient-input" data-compose="recipient" autocomplete="off" placeholder="Recipients" aria-label="Recipients"></div><button class="cc-link" data-action="toggle-cc">Cc Bcc</button></div>
    ${compose.showCc ? `<div class="compose-field"><span class="compose-field-label">Cc</span><input data-compose="cc" value="${escapeHtml(compose.cc)}" placeholder="Carbon copy"></div><div class="compose-field"><span class="compose-field-label">Bcc</span><input data-compose="bcc" value="${escapeHtml(compose.bcc)}" placeholder="Blind carbon copy"></div>` : ""}
    <div class="compose-field"><input data-compose="subject" value="${escapeHtml(compose.subject)}" placeholder="Subject" aria-label="Subject"></div></div>
    <div class="compose-body-wrap"><textarea class="compose-body" data-compose="body" placeholder="Write a message…" aria-label="Message body">${escapeHtml(compose.body)}</textarea>${composeAttachments}</div>
    <footer class="compose-footer"><div class="compose-actions"><button class="send-button" data-action="send"><span>Send</span><span class="send-caret">${icon("chevronDown")}</span></button><button class="icon-button" data-action="format-bold" title="Bold" aria-label="Bold">${icon("bold")}</button><button class="icon-button" data-action="attach" title="Attach files" aria-label="Attach files">${icon("paperclip")}</button><button class="icon-button" data-action="insert-link" title="Insert link" aria-label="Insert link">${icon("link")}</button><button class="icon-button" data-action="emoji" title="Insert emoji" aria-label="Insert emoji">${icon("smile")}</button><input id="compose-file-input" type="file" multiple hidden></div><button class="icon-button" data-action="discard-compose" title="Discard draft" aria-label="Discard draft">${icon("trash")}</button></footer>
  </section>`;
}

function mobileBottomTemplate() {
  return `<nav class="mobile-bottom-nav" aria-label="Mobile navigation">
    <button class="bottom-nav-button ${state.activeFolder === "inbox" ? "active" : ""}" data-action="navigate" data-folder="inbox">${icon("inbox")}<span>Inbox</span></button>
    <button class="bottom-nav-button ${state.activeFolder === "starred" ? "active" : ""}" data-action="navigate" data-folder="starred">${icon("star")}<span>Starred</span></button>
    <button class="bottom-nav-button ${state.activeFolder === "sent" ? "active" : ""}" data-action="navigate" data-folder="sent">${icon("sent")}<span>Sent</span></button>
    <button class="bottom-nav-button" data-action="open-compose">${icon("compose")}<span>Compose</span></button>
  </nav>`;
}

function render() {
  closeFloatingMenu();
  app.innerHTML = `<div class="app-shell ${state.sidebarCollapsed ? "sidebar-collapsed" : ""} density-${state.density}">
    ${topbarTemplate()}
    ${sidebarTemplate()}
    <div class="mobile-scrim ${state.mobileSidebar ? "open" : ""}" data-action="mobile-menu"></div>
    <main class="main-surface" id="main-surface">${mainTemplate()}</main>
    ${mobileBottomTemplate()}
    ${composeTemplate()}
  </div>`;
}

function renderMain() {
  const main = document.querySelector("#main-surface");
  if (main) main.innerHTML = mainTemplate();
}

function updateStateAndRender(mutator, { persistState = true, mainOnly = false } = {}) {
  mutator();
  if (persistState) persist();
  if (mainOnly) renderMain();
  else render();
}

function showToast(message, actionLabel = "", callback = null) {
  const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const element = document.createElement("div");
  element.id = id;
  element.className = "toast";
  element.innerHTML = `<span>${escapeHtml(message)}</span>${actionLabel ? `<button data-toast-action="${id}">${escapeHtml(actionLabel)}</button>` : ""}`;
  toastRegion.append(element);
  if (callback) undoActions.set(id, callback);
  requestAnimationFrame(() => element.classList.add("show"));
  window.setTimeout(() => removeToast(id), 5200);
}

function removeToast(id) {
  const element = document.getElementById(id);
  if (!element) return;
  element.classList.remove("show");
  window.setTimeout(() => element.remove(), 180);
  undoActions.delete(id);
}

function withUndo(message, mutator) {
  const before = structuredClone(state.mail);
  mutator();
  state.selected = [];
  persist();
  render();
  showToast(message, "Undo", () => {
    state.mail = before;
    persist();
    render();
  });
}

function navigate(folder) {
  saveLiveDraft();
  state.activeFolder = folder;
  state.search = "";
  state.openId = null;
  state.selected = [];
  state.mobileSidebar = false;
  persist();
  render();
}

function openMessage(id) {
  const mail = state.mail.find((item) => item.id === id);
  if (!mail) return;
  if (mail.folder === "drafts") {
    state.compose = {
      ...freshState().compose,
      open: true,
      draftId: mail.id,
      to: structuredClone(mail.recipients || []),
      subject: mail.subject || "",
      body: mail.draftBody || mail.snippet || "",
      attachments: structuredClone(mail.attachments || [])
    };
    render();
    requestAnimationFrame(() => document.querySelector(".compose-body")?.focus());
    return;
  }
  mail.unread = false;
  state.openId = id;
  state.selected = [];
  persist();
  renderMain();
}

function archiveIds(ids) {
  const actionable = ids.filter((id) => state.mail.some((mail) => mail.id === id && mail.folder !== "sent" && mail.folder !== "drafts"));
  if (!actionable.length) {
    showToast("Sent mail and drafts stay in their folders");
    return;
  }
  withUndo(actionable.length === 1 ? "Conversation archived" : `${actionable.length} conversations archived`, () => {
    state.mail.forEach((mail) => {
      if (actionable.includes(mail.id)) mail.archived = true;
    });
    if (actionable.includes(state.openId)) state.openId = null;
  });
}

function deleteIds(ids) {
  const inTrash = ids.every((id) => state.mail.find((mail) => mail.id === id)?.folder === "trash");
  withUndo(inTrash ? (ids.length === 1 ? "Conversation deleted forever" : `${ids.length} conversations deleted forever`) : (ids.length === 1 ? "Conversation moved to Trash" : `${ids.length} conversations moved to Trash`), () => {
    if (inTrash) state.mail = state.mail.filter((mail) => !ids.includes(mail.id));
    else state.mail.forEach((mail) => { if (ids.includes(mail.id)) { mail.folder = "trash"; mail.archived = false; } });
    if (ids.includes(state.openId)) state.openId = null;
  });
}

function restoreIds(ids) {
  withUndo(ids.length === 1 ? "Conversation restored" : `${ids.length} conversations restored`, () => {
    state.mail.forEach((mail) => { if (ids.includes(mail.id)) mail.folder = "inbox"; });
    if (ids.includes(state.openId)) state.openId = null;
  });
}

function toggleRead(ids) {
  const anyUnread = state.mail.filter((mail) => ids.includes(mail.id)).some((mail) => mail.unread);
  state.mail.forEach((mail) => { if (ids.includes(mail.id)) mail.unread = !anyUnread; });
  state.selected = [];
  persist();
  render();
  showToast(`Marked ${anyUnread ? "read" : "unread"}`);
}

function toggleStar(id) {
  const mail = state.mail.find((item) => item.id === id);
  if (!mail) return;
  mail.starred = !mail.starred;
  persist();
  renderMain();
  showToast(mail.starred ? "Starred" : "Star removed");
}

function openCompose(prefill = {}) {
  if (!state.compose.open) {
    const hasSaved = state.compose.subject || state.compose.body || state.compose.to.length;
    state.compose = {
      ...freshState().compose,
      ...(hasSaved ? state.compose : {}),
      ...prefill,
      open: true,
      minimized: false
    };
  } else {
    state.compose.open = true;
    state.compose.minimized = false;
    Object.assign(state.compose, prefill);
  }
  render();
  requestAnimationFrame(() => {
    const target = state.compose.to.length ? document.querySelector('[data-compose="subject"]') : document.querySelector("#recipient-input");
    target?.focus();
  });
}

function closeCompose() {
  saveLiveDraft();
  state.compose.open = false;
  state.compose.minimized = false;
  persist();
  render();
  if (state.compose.subject || state.compose.body || state.compose.to.length) showToast("Draft saved");
}

function saveLiveDraft() {
  const compose = state.compose;
  const hasContent = compose.subject.trim() || compose.body.trim() || compose.to.length || compose.attachments.length;
  if (!hasContent) return;
  const id = compose.draftId || `draft-${Date.now()}`;
  compose.draftId = id;
  const existing = state.mail.find((mail) => mail.id === id);
  const draft = {
    id,
    folder: "drafts",
    category: "primary",
    sender: currentUser,
    recipients: structuredClone(compose.to),
    subject: compose.subject.trim() || "(no subject)",
    snippet: compose.body.trim().replace(/\s+/g, " ").slice(0, 120) || "Draft message",
    timestamp: new Date().toISOString(),
    unread: false,
    starred: existing?.starred || false,
    archived: false,
    labels: existing?.labels || [],
    attachments: structuredClone(compose.attachments),
    draftBody: compose.body,
    messages: []
  };
  if (existing) Object.assign(existing, draft);
  else state.mail.push(draft);
  persist();
}

function scheduleDraftSave() {
  window.clearTimeout(draftSaveTimer);
  draftSaveTimer = window.setTimeout(saveLiveDraft, 450);
}

function discardCompose() {
  const draftId = state.compose.draftId;
  if (draftId) state.mail = state.mail.filter((mail) => mail.id !== draftId);
  state.compose = freshState().compose;
  persist();
  render();
  showToast("Draft discarded");
}

function sendCompose() {
  const compose = state.compose;
  if (!compose.to.length) {
    showToast("Add at least one recipient");
    document.querySelector("#recipient-input")?.focus();
    return;
  }
  if (!compose.body.trim() && !compose.subject.trim()) {
    showToast("Write a subject or message first");
    return;
  }
  if (compose.draftId) state.mail = state.mail.filter((mail) => mail.id !== compose.draftId);
  const now = new Date().toISOString();
  const sent = {
    id: `sent-${Date.now()}`,
    folder: "sent",
    category: "primary",
    sender: currentUser,
    recipients: structuredClone(compose.to),
    subject: compose.subject.trim() || "(no subject)",
    snippet: compose.body.trim().replace(/\s+/g, " ").slice(0, 140),
    timestamp: now,
    unread: false,
    starred: false,
    archived: false,
    labels: [],
    attachments: structuredClone(compose.attachments),
    messages: [{ from: currentUser, to: structuredClone(compose.to), time: now, paragraphs: compose.body.split(/\n{2,}/).filter(Boolean), attachments: structuredClone(compose.attachments) }]
  };
  state.mail.push(sent);
  state.compose = freshState().compose;
  persist();
  render();
  showToast("Message sent", "View", () => {
    state.activeFolder = "sent";
    state.openId = sent.id;
    render();
  });
}

function addRecipient(person) {
  if (!state.compose.to.some((recipient) => recipient.email === person.email)) state.compose.to.push(structuredClone(person));
  render();
  requestAnimationFrame(() => document.querySelector("#recipient-input")?.focus());
  scheduleDraftSave();
}

function showContactSuggestions(input) {
  document.querySelector(".contact-suggestions")?.remove();
  const term = input.value.trim().toLowerCase();
  if (!term) return;
  const matches = contacts.filter((person) => !state.compose.to.some((recipient) => recipient.email === person.email) && `${person.name} ${person.email}`.toLowerCase().includes(term)).slice(0, 5);
  if (!matches.length) return;
  const rect = input.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "contact-suggestions";
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 332)}px`;
  menu.style.top = `${Math.min(rect.bottom + 5, window.innerHeight - matches.length * 54 - 16)}px`;
  menu.innerHTML = matches.map((person, index) => `<button class="contact-suggestion ${index === 0 ? "active" : ""}" data-action="choose-contact" data-email="${escapeHtml(person.email)}">${avatar(person)}<span class="contact-suggestion-copy"><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.email)}</span></span></button>`).join("");
  document.body.append(menu);
}

function insertInComposer(before, after = "") {
  const textarea = document.querySelector(".compose-body");
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  textarea.setRangeText(`${before}${selected}${after}`, start, end, "end");
  state.compose.body = textarea.value;
  textarea.focus();
  scheduleDraftSave();
}

function openFloating(type, anchor, payload = {}) {
  closeFloatingMenu();
  const menu = document.createElement("div");
  menu.id = "floating-menu";
  menu.className = "menu-popover";
  let content = "";
  if (type === "labels") {
    const ids = payload.ids || [];
    content = `<div class="menu-title">Label as</div>${labels.map((label) => {
      const checked = ids.length && ids.every((id) => state.mail.find((mail) => mail.id === id)?.labels.includes(label.name));
      return `<button class="label-menu-item" data-action="apply-label" data-label="${escapeHtml(label.name)}" data-ids="${ids.join(",")}"><span class="label-dot" style="--label-color:${label.color}"></span><span>${escapeHtml(label.name)}</span><span class="menu-check">${checked ? icon("check") : ""}</span></button>`;
    }).join("")}`;
  } else if (type === "settings") {
    content = `<div class="menu-title">Inbox density</div><button class="label-menu-item" data-action="set-density" data-density="comfortable">${icon("inbox")}<span>Comfortable</span><span class="menu-check">${state.density === "comfortable" ? icon("check") : ""}</span></button><button class="label-menu-item" data-action="set-density" data-density="compact">${icon("read")}<span>Compact</span><span class="menu-check">${state.density === "compact" ? icon("check") : ""}</span></button>`;
  } else if (type === "help") {
    content = `<div class="menu-title">Keyboard shortcuts</div><div class="label-menu-item">${icon("search")}<span>Focus search</span><kbd>/</kbd></div><div class="label-menu-item">${icon("compose")}<span>Compose</span><kbd>C</kbd></div><div class="label-menu-item">${icon("close")}<span>Close view</span><kbd>Esc</kbd></div>`;
  } else if (type === "account") {
    content = `<div class="menu-title">Signed in locally</div><div class="account-card">${avatar(currentUser)}<div><strong>${escapeHtml(currentUser.name)}</strong><span>${escapeHtml(currentUser.email)}</span></div></div><button class="label-menu-item" data-action="reset-mailbox">${icon("restore")}<span>Reset demo mailbox</span><span></span></button>`;
  } else {
    content = `<div class="menu-title">Mailbox</div><button class="label-menu-item" data-action="select-all-visible">${icon("check")}<span>Select visible</span><span></span></button><button class="label-menu-item" data-action="mark-all-read">${icon("read")}<span>Mark visible as read</span><span></span></button>`;
  }
  menu.innerHTML = content;
  document.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  const width = Math.max(210, menu.offsetWidth);
  menu.style.left = `${Math.min(rect.left, window.innerWidth - width - 10)}px`;
  menu.style.top = `${Math.min(rect.bottom + 5, window.innerHeight - menu.offsetHeight - 10)}px`;
  requestAnimationFrame(() => menu.classList.add("open"));
  activeFloatingMenu = menu;
}

function closeFloatingMenu() {
  if (!activeFloatingMenu) return;
  activeFloatingMenu.remove();
  activeFloatingMenu = null;
}

function applyLabel(ids, labelName) {
  const allHave = ids.every((id) => state.mail.find((mail) => mail.id === id)?.labels.includes(labelName));
  state.mail.forEach((mail) => {
    if (!ids.includes(mail.id)) return;
    if (allHave) mail.labels = mail.labels.filter((label) => label !== labelName);
    else if (!mail.labels.includes(labelName)) mail.labels.push(labelName);
  });
  state.selected = [];
  persist();
  closeFloatingMenu();
  render();
  showToast(allHave ? `Removed label ${labelName}` : `Applied label ${labelName}`);
}

function resetMailbox() {
  const before = structuredClone(state);
  state = freshState();
  persist();
  render();
  showToast("Demo mailbox reset", "Undo", () => {
    state = before;
    persist();
    render();
  });
}

function handleAction(action, target) {
  const id = target.dataset.id;
  switch (action) {
    case "toggle-sidebar": state.sidebarCollapsed = !state.sidebarCollapsed; persist(); render(); break;
    case "mobile-menu": state.mobileSidebar = !state.mobileSidebar; render(); break;
    case "search-leading":
      if (matchMedia("(max-width: 760px)").matches) { state.mobileSidebar = true; render(); }
      else document.querySelector("#mail-search")?.focus();
      break;
    case "toggle-search-popover": document.querySelector("#search-popover")?.classList.toggle("open"); break;
    case "search-tip": state.search = target.dataset.query || ""; state.openId = null; state.selected = []; render(); requestAnimationFrame(() => document.querySelector("#mail-search")?.focus()); break;
    case "clear-search": state.search = ""; state.selected = []; render(); requestAnimationFrame(() => document.querySelector("#mail-search")?.focus()); break;
    case "navigate": navigate(target.dataset.folder); break;
    case "category": state.category = target.dataset.category; state.selected = []; renderMain(); persist(); break;
    case "open-compose": openCompose(); break;
    case "close-compose": closeCompose(); break;
    case "minimize-compose": state.compose.minimized = !state.compose.minimized; saveLiveDraft(); render(); break;
    case "maximize-compose": document.querySelector(".compose-window")?.classList.toggle("compose-maximized"); break;
    case "discard-compose": discardCompose(); break;
    case "send": sendCompose(); break;
    case "toggle-cc": state.compose.showCc = !state.compose.showCc; render(); break;
    case "remove-recipient": state.compose.to.splice(Number(target.dataset.index), 1); render(); scheduleDraftSave(); break;
    case "choose-contact": {
      const person = contacts.find((contact) => contact.email === target.dataset.email);
      if (person) addRecipient(person);
      break;
    }
    case "select": {
      if (state.selected.includes(id)) state.selected = state.selected.filter((item) => item !== id);
      else state.selected.push(id);
      renderMain();
      break;
    }
    case "select-all": {
      const ids = visibleMail().map((mail) => mail.id);
      state.selected = ids.every((item) => state.selected.includes(item)) ? [] : ids;
      renderMain();
      break;
    }
    case "select-all-visible": state.selected = visibleMail().map((mail) => mail.id); closeFloatingMenu(); renderMain(); break;
    case "clear-selection": state.selected = []; renderMain(); break;
    case "star": toggleStar(id); break;
    case "star-open": if (state.openId) toggleStar(state.openId); break;
    case "archive-one": archiveIds([id]); break;
    case "archive-selected": archiveIds([...state.selected]); break;
    case "delete-one": deleteIds([id]); break;
    case "delete-selected": deleteIds([...state.selected]); break;
    case "restore-one": restoreIds([id]); break;
    case "mark-one": toggleRead([id]); break;
    case "mark-selected": toggleRead([...state.selected]); break;
    case "mark-all-read": {
      const ids = visibleMail().map((mail) => mail.id);
      state.mail.forEach((mail) => { if (ids.includes(mail.id)) mail.unread = false; });
      persist(); closeFloatingMenu(); render(); showToast("Visible messages marked read");
      break;
    }
    case "label-selected": openFloating("labels", target, { ids: [...state.selected] }); break;
    case "label-open": openFloating("labels", target, { ids: [id] }); break;
    case "apply-label": applyLabel((target.dataset.ids || "").split(",").filter(Boolean), target.dataset.label); break;
    case "back": state.openId = null; persist(); renderMain(); break;
    case "reply": {
      const mail = state.mail.find((item) => item.id === id);
      openCompose({ to: [structuredClone(mail.sender.email === currentUser.email ? mail.recipients[0] : mail.sender)].filter(Boolean), subject: mail.subject.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`, body: "\n\n" });
      break;
    }
    case "forward": {
      const mail = state.mail.find((item) => item.id === id);
      openCompose({ subject: mail.subject.startsWith("Fwd:") ? mail.subject : `Fwd: ${mail.subject}`, body: `\n\n---------- Forwarded message ----------\nFrom: ${mail.sender.name}\nSubject: ${mail.subject}\n\n${mail.snippet}` });
      break;
    }
    case "refresh": showToast("Mailbox is up to date"); break;
    case "attachment": showToast(`${target.dataset.name} is ready locally`); break;
    case "attach": document.querySelector("#compose-file-input")?.click(); break;
    case "remove-compose-attachment": state.compose.attachments.splice(Number(target.dataset.index), 1); render(); scheduleDraftSave(); break;
    case "format-bold": insertInComposer("**", "**"); break;
    case "insert-link": insertInComposer("[", "](https://)"); break;
    case "emoji": insertInComposer("🙂"); break;
    case "settings-menu": openFloating("settings", target); break;
    case "help-menu": openFloating("help", target); break;
    case "account-menu": openFloating("account", target); break;
    case "more-menu": openFloating("more", target); break;
    case "set-density": state.density = target.dataset.density; persist(); closeFloatingMenu(); render(); break;
    case "reset-mailbox": resetMailbox(); break;
    case "label-info": showToast("Select messages, then use the label action to organize them"); break;
    case "message-more": showToast("Conversation details are available in this local thread"); break;
    default: break;
  }
}

app.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    event.preventDefault();
    event.stopPropagation();
    handleAction(actionTarget.dataset.action, actionTarget);
    return;
  }
  const row = event.target.closest(".mail-row");
  if (row) openMessage(row.dataset.mailId);
});

app.addEventListener("keydown", (event) => {
  const row = event.target.closest(".mail-row");
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openMessage(row.dataset.mailId);
  }
  if (event.target.id === "recipient-input" && event.key === "Enter") {
    const first = document.querySelector(".contact-suggestion");
    if (first) {
      event.preventDefault();
      const person = contacts.find((contact) => contact.email === first.dataset.email);
      if (person) addRecipient(person);
    } else if (event.target.value.includes("@")) {
      event.preventDefault();
      const email = event.target.value.trim();
      addRecipient({ name: email.split("@")[0], email, initials: email.slice(0, 2).toUpperCase(), color: "#5f6368" });
    }
  }
});

app.addEventListener("input", (event) => {
  if (event.target.id === "mail-search") {
    state.search = event.target.value;
    state.openId = null;
    state.selected = [];
    renderMain();
    document.querySelector("#search-popover")?.classList.remove("open");
    return;
  }
  const field = event.target.dataset.compose;
  if (!field) return;
  if (field === "recipient") showContactSuggestions(event.target);
  else {
    state.compose[field] = event.target.value;
    if (field === "subject") {
      const header = document.querySelector(".compose-header > span");
      if (header) header.textContent = state.compose.subject || "New message";
    }
    scheduleDraftSave();
  }
});

app.addEventListener("change", (event) => {
  if (event.target.id !== "compose-file-input") return;
  const files = [...event.target.files].map((file) => ({
    name: file.name,
    size: file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    type: (file.name.split(".").pop() || "FILE").toUpperCase().slice(0, 4)
  }));
  state.compose.attachments.push(...files);
  render();
  scheduleDraftSave();
});

toastRegion.addEventListener("click", (event) => {
  const button = event.target.closest("[data-toast-action]");
  if (!button) return;
  const id = button.dataset.toastAction;
  const callback = undoActions.get(id);
  if (callback) callback();
  removeToast(id);
});

document.addEventListener("click", (event) => {
  const externalAction = event.target.closest?.("#floating-menu [data-action], .contact-suggestions [data-action]");
  if (externalAction) {
    event.preventDefault();
    event.stopPropagation();
    handleAction(externalAction.dataset.action, externalAction);
    return;
  }
  if (activeFloatingMenu && !event.target.closest("#floating-menu")) closeFloatingMenu();
  if (!event.target.closest(".contact-suggestions") && !event.target.closest("#recipient-input")) document.querySelector(".contact-suggestions")?.remove();
  if (!event.target.closest(".search-wrap")) document.querySelector("#search-popover")?.classList.remove("open");
});

document.addEventListener("keydown", (event) => {
  const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (event.key === "/" && !typing) {
    event.preventDefault();
    document.querySelector("#mail-search")?.focus();
  }
  if (event.key.toLowerCase() === "c" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    openCompose();
  }
  if (event.key === "Escape") {
    document.querySelector(".contact-suggestions")?.remove();
    document.querySelector("#search-popover")?.classList.remove("open");
    closeFloatingMenu();
    if (state.mobileSidebar) { state.mobileSidebar = false; render(); }
    else if (state.openId) { state.openId = null; renderMain(); }
  }
});

render();
