import { createSeedMail, INITIAL_LABELS, USER, CONTACTS } from './data.ts';
import { updateMail, createOutgoingMail, wakeMail } from './domain.ts';
import { matchesSearch, formatDate, fullDate, downloadText } from './utils.ts';
import { icon } from './icons.js';
import { escape, button, avatar, safeHtml } from './view.js';
import { Composer } from './composer.js';

const STORAGE = 'gpt6-mail-v1';
function load(key, fallback) { try { const value = localStorage.getItem(`${STORAGE}-${key}`); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
let mails = load('messages', createSeedMail());
let labels = load('labels', INITIAL_LABELS);
let settings = load('settings', { theme: 'light', density: 'comfortable', signature: false });
let tasks = load('tasks', [{ id: 't1', text: 'Review Olivia’s website designs', done: false }, { id: 't2', text: 'Book dinner in Copenhagen', done: false }, { id: 't3', text: 'Send Q4 project proposals', done: true }]);
let notes = load('notes', 'A little space for your thoughts.\n\nCopenhagen: Coffee Collective, Louisiana Museum, dinner at Høst.\n\nWebsite review: simplify navigation, give projects room to breathe.');
let view = 'inbox';
let category = 'primary';
let query = '';
let openId = null;
let selected = new Set();
let expanded = new Set();
let unreadOnly = false;
let page = 0;
let sidebarCollapsed = false;
let mobileNav = false;
let moreFolders = false;
let sidePanel = null;
let calendarDate = new Date();
let activeCalendarDay = new Date().getDate();
let toastTimer;
let toastUndo;
let modalTrigger;
let focusIndex = -1;

const root = document.getElementById('root');
root.innerHTML = '<div id="app-shell"></div><div id="menu-root"></div><div id="dialog-root"></div><div id="composer-root"></div><div id="toast-root" aria-live="polite"></div>';
const shell = document.getElementById('app-shell');
const menuRoot = document.getElementById('menu-root');
const dialogRoot = document.getElementById('dialog-root');

function persist(key, value) {
  try { localStorage.setItem(`${STORAGE}-${key}`, JSON.stringify(value)); }
  catch { toast('Storage is full. Download a mailbox backup in Storage settings.'); }
}
function commit() { persist('messages', mails); render(); }

const composer = new Composer({
  signature: () => settings.signature,
  empty: id => { if (mails.some(mail => mail.id === id)) { mails = mails.filter(mail => mail.id !== id); commit(); } },
  save: outgoing => {
    const saved = createOutgoingMail(outgoing);
    const old = mails.find(mail => mail.id === saved.id);
    if (old) { saved.labels = old.labels; saved.starred = old.starred; }
    mails = mails.filter(mail => mail.id !== saved.id).concat(saved); commit();
  },
  discard: id => { mails = mails.filter(mail => mail.id !== id); commit(); toast('Draft discarded'); },
  send: (outgoing, folder, wakeAt) => {
    const sent = createOutgoingMail(outgoing, folder); sent.wakeAt = wakeAt;
    const old = mails.find(mail => mail.id === outgoing.id);
    const previousReply = outgoing.replyTo ? mails.find(mail => mail.id === outgoing.replyTo) : null;
    if (old) { sent.labels = old.labels; sent.starred = old.starred; }
    mails = mails.filter(mail => mail.id !== outgoing.id).concat(sent);
    if (outgoing.replyTo && folder === 'sent') {
      mails = mails.map(mail => mail.id === outgoing.replyTo ? { ...mail, messages: [...mail.messages, sent.messages[0]], preview: outgoing.body, date: sent.date, read: true } : mail);
      expanded.add(sent.messages[0].id);
    }
    commit();
    toast(folder === 'scheduled' ? `Scheduled for ${fullDate(wakeAt)}` : 'Message sent', () => {
      mails = mails.filter(mail => mail.id !== sent.id).concat(createOutgoingMail(outgoing));
      if (previousReply) mails = mails.map(mail => mail.id === previousReply.id ? previousReply : mail);
      commit(); composer.open(outgoing); toast('Send undone. Your draft is ready.');
    });
  },
  toast,
  menu: openMenu,
  linkDialog: () => showDialog('Insert a link', `<form id="link-form"><label class="field-label">Link text<input name="text" placeholder="A useful resource" required></label><label class="field-label">Web address<input name="url" type="url" placeholder="https://" required></label><div class="dialog-actions"><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button><button class="primary-button" type="submit">Insert link</button></div></form>`),
});

function activeMail() { return mails.find(mail => mail.id === openId); }
function visibleMail() {
  return mails.filter(mail => {
    if (query.trim()) {
      if (!/in:(trash|spam|all)/i.test(query) && ['trash', 'spam'].includes(mail.folder)) return false;
      return matchesSearch(mail, query);
    }
    if (view === 'starred') return mail.starred && !['trash', 'spam'].includes(mail.folder);
    if (view === 'important') return mail.important && !['trash', 'spam'].includes(mail.folder);
    if (view === 'all') return !['trash', 'spam', 'drafts'].includes(mail.folder);
    if (view.startsWith('label:')) return mail.labels.includes(view.slice(6)) && !['trash', 'spam'].includes(mail.folder);
    return mail.folder === view && (view !== 'inbox' || mail.category === category);
  }).filter(mail => !unreadOnly || !mail.read).sort((a, b) => new Date(b.date) - new Date(a.date));
}
function viewName() {
  if (query.trim()) return 'Search results';
  if (view.startsWith('label:')) return view.slice(6);
  return { inbox: 'Inbox', starred: 'Starred', snoozed: 'Snoozed', sent: 'Sent', drafts: 'Drafts', trash: 'Trash', all: 'All mail', spam: 'Spam', important: 'Important', scheduled: 'Scheduled' }[view] ?? 'Inbox';
}
function labelPill(name) {
  const color = labels.find(label => label.name === name)?.color ?? '#888';
  return `<span class="label-pill" style="--label-color:${escape(color)}">${escape(name)}</span>`;
}
function navItem(name, label, destination, count = '', extra = '') {
  return `<button class="nav-item ${view === destination && !query ? 'active' : ''} ${extra}" data-action="navigate" data-view="${escape(destination)}" title="${escape(label)}" ${view === destination && !query ? 'aria-current="page"' : ''}>${icon(name)}<span>${escape(label)}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
}
function render() {
  const list = visibleMail();
  const scroll = shell.querySelector('.mail-scroll')?.scrollTop ?? 0;
  const searchFocused = document.activeElement?.id === 'mail-search';
  const focusedCheckbox = document.activeElement?.id?.startsWith('select-') ? document.activeElement.id : null;
  const selectionStart = searchFocused ? document.activeElement.selectionStart : null;
  const unread = mails.filter(mail => mail.folder === 'inbox' && !mail.read).length;
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.density = settings.density;
  shell.innerHTML = `<div class="mail-app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileNav ? 'mobile-nav-open' : ''}">
    <header class="topbar">
      <div class="brand-area">${button('menu', 'toggle-sidebar', 'Toggle navigation')}<a class="brand" href="#inbox" data-action="home"><span class="brand-mark">${icon('mail')}</span><h1>GPT-6</h1></a></div>
      <div class="search-area"><form class="search-bar" id="search-form">${icon('search')}<input type="search" id="mail-search" placeholder="Search your mail" aria-label="Search your mail" value="${escape(query)}" autocomplete="off">${query ? button('close', 'clear-search', 'Clear search') : '<kbd class="search-shortcut">/</kbd>'}${button('sliders', 'search-filters', 'Advanced search')}</form></div>
      <div class="topbar-actions"><span class="connection-status"><i></i> All changes saved</span>${button('help', 'help', 'Help & keyboard shortcuts')}${button('settings', 'settings', 'Settings')}${button('grid', 'workspace', 'Workspace apps')}<button class="account-avatar" data-action="account" title="Alex Morgan’s account" aria-label="Account controls">AM<span></span></button></div>
    </header>
    <div class="workspace">
      ${mobileNav ? '<button class="nav-backdrop" data-action="toggle-sidebar" aria-label="Close navigation"></button>' : ''}
      <aside class="sidebar" aria-label="Mail navigation"><button class="compose-button" data-action="compose">${icon('pencil')}<span>Compose</span></button>
        <div class="sidebar-section-title">MAILBOX</div><nav>
          ${navItem('inbox', 'Inbox', 'inbox', unread)}
          ${navItem('star', 'Starred', 'starred')}
          ${navItem('clock', 'Snoozed', 'snoozed')}
          ${navItem('send', 'Sent', 'sent')}
          ${navItem('draft', 'Drafts', 'drafts', mails.filter(mail => mail.folder === 'drafts').length, 'draft-nav')}
          ${navItem('trash', 'Trash', 'trash')}
          <button class="nav-item" data-action="more-folders" aria-expanded="${moreFolders}">${icon(moreFolders ? 'up' : 'down')}<span>${moreFolders ? 'Less' : 'More'}</span></button>
          ${moreFolders ? `${navItem('important', 'Important', 'important')}${navItem('mail', 'All mail', 'all')}${navItem('clock', 'Scheduled', 'scheduled', mails.filter(mail => mail.folder === 'scheduled').length)}${navItem('spam', 'Spam', 'spam')}` : ''}
        </nav>
        <div class="labels-heading"><span class="sidebar-section-title">LABELS</span>${button('plus', 'new-label', 'Create new label')}</div>
        <nav class="label-navigation">${labels.map(label => `<button class="nav-item ${view === `label:${label.name}` ? 'active' : ''}" data-action="navigate" data-view="label:${escape(label.name)}" title="${escape(label.name)}"><span class="label-dot" style="background:${escape(label.color)}"></span><span>${escape(label.name)}</span>${view === `label:${label.name}` ? '<span class="nav-count">'+mails.filter(m=>m.labels.includes(label.name)&&!['trash','spam'].includes(m.folder)).length+'</span>' : ''}</button>`).join('')}</nav>
        <div class="sidebar-bottom"><div class="storage-heading">${icon('cloud')}<span>Your space</span></div><div class="storage-track"><span style="width:${Math.min(100, Math.max(3, new Blob([JSON.stringify(mails)]).size / 5242880 * 100))}%"></span></div><div class="storage-copy">${Math.round(new Blob([JSON.stringify(mails)]).size / 1024)} KB saved on this device</div><button class="storage-link" data-action="storage">Manage storage ${icon('chevron')}</button><div class="local-note">${icon('lock')} Private. Local. Yours.</div></div>
      </aside>
      <main class="mail-main ${sidePanel ? 'has-side-panel' : ''}">
        <div class="mail-card">
          ${openId && activeMail() ? renderConversation(activeMail(), list) : renderMailbox(list)}
        </div>
        <footer class="workspace-footer"><span>Less noise. More room for what matters.</span><span>${icon('lock')} Your mailbox stays on this device</span></footer>
      </main>
      ${sidePanel ? `<aside class="utility-panel" aria-label="${escape(sidePanel)} panel">${renderSidePanel()}</aside>` : ''}
      <aside class="utility-rail" aria-label="Workspace utilities">${['calendar', 'notes', 'tasks', 'contacts'].map((name, index) => `<button class="utility-button utility-${name} ${sidePanel === name ? 'active' : ''}" data-action="panel" data-panel="${name}" aria-label="${['Calendar', 'Notes', 'Tasks', 'Contacts'][index]}" title="${['Calendar', 'Notes', 'Tasks', 'Contacts'][index]}">${icon(name)}</button>`).join('')}<span class="utility-divider"></span>${button('plus', 'workspace', 'Explore workspace')}</aside>
    </div>
  </div>`;
  shell.querySelector('.mail-scroll')?.scrollTo(0, scroll);
  if (searchFocused) { const input = document.getElementById('mail-search'); input.focus(); if (selectionStart !== null) try { input.setSelectionRange(selectionStart, selectionStart); } catch { /* Search inputs may not expose selection. */ } }
  if (focusedCheckbox) document.getElementById(focusedCheckbox)?.focus();
  if (focusIndex >= 0) shell.querySelectorAll('.mail-row')[focusIndex]?.classList.add('keyboard-focused');
}

function renderMailbox(list) {
  const shown = list.slice(page * 25, page * 25 + 25);
  const total = list.length;
  const selectedCount = selected.size;
  const folderMessages = mails.filter(mail => mail.folder === view);
  const unread = (view === 'inbox' ? mails.filter(mail => mail.folder === 'inbox') : list).filter(mail => !mail.read).length;
  return `<div class="inbox-heading"><div><div class="heading-line"><h2>${escape(viewName())}</h2><span class="heading-count">${query ? total : view === 'inbox' ? folderMessages.length : total}</span></div><p>${query ? `Results for “${escape(query)}”` : view === 'inbox' ? `${unread} unread messages. A fresh perspective awaits.` : view === 'drafts' ? 'Good things take a little thought. Your drafts are saved.' : view === 'trash' ? 'Messages stay here until you choose to remove them.' : view === 'snoozed' ? 'A little later, when the time is right.' : view === 'sent' ? 'Conversations you’ve set in motion.' : view === 'starred' ? 'Keep the important things close.' : `${total} conversations, all in one place.`}</p></div><button class="inbox-customize" data-action="settings">${icon('sliders')}<span>Customize</span></button></div>
    <div class="mail-toolbar ${selectedCount ? 'selection-toolbar' : ''}">
      <div class="toolbar-left"><label class="checkbox-label" title="Select all messages"><input id="select-all" type="checkbox" aria-label="Select all messages" data-select-all ${shown.length && shown.every(mail => selected.has(mail.id)) ? 'checked' : ''}></label><button class="small-icon-button" data-action="selection-menu" aria-label="Selection options">${icon('down')}</button><span class="toolbar-divider"></span>
      ${selectedCount ? `${button('archive', 'archive', 'Archive selected')}${button('spam', 'spam', 'Report spam')}${button('trash', 'trash', view === 'trash' ? 'Delete forever' : 'Delete selected')}<span class="toolbar-divider"></span>${button('mail', 'unread', 'Mark as unread')}${button('clock', 'snooze-menu', 'Snooze selected')}${button('folder', 'move-menu', 'Move selected')}${button('tag', 'label-menu', 'Label selected')}<span class="selected-count">${selectedCount} selected</span>` : `${button('refresh', 'refresh', 'Refresh mailbox')}${button('more', 'mailbox-more', 'More mailbox actions')}${unreadOnly ? '<button class="filter-chip" data-action="toggle-unread">Unread only '+icon('close')+'</button>' : ''}`}</div>
      <div class="toolbar-right"><span class="mail-range">${total ? `${page * 25 + 1}–${Math.min(page * 25 + 25, total)} of ${total}` : '0 conversations'}</span>${button('chevron', 'previous-page', 'Previous page', 'rotate-180', page === 0)}${button('chevron', 'next-page', 'Next page', '', (page + 1) * 25 >= total)}</div>
    </div>
    ${view === 'inbox' && !query ? `<div class="category-tabs" role="tablist" aria-label="Inbox categories">${[['primary', 'inbox', 'Primary'], ['promotions', 'tag', 'Promotions'], ['social', 'contacts', 'Social'], ['updates', 'spam', 'Updates']].map(([key, symbol, title]) => {
      const count = mails.filter(mail => mail.folder === 'inbox' && mail.category === key && !mail.read).length;
      return `<button class="category-tab ${category === key ? 'active' : ''}" role="tab" aria-selected="${category === key}" data-action="category" data-category="${key}">${icon(symbol)}<div><span>${title}${count ? `<small class="category-badge category-${key}">${count} new</small>` : ''}</span><small class="category-description">${{ primary: 'People & conversations', promotions: 'Offers & inspiration', social: 'Your communities', updates: 'Receipts & notifications' }[key]}</small></div></button>`;
    }).join('')}</div>` : ''}
    ${view === 'trash' && list.length ? '<div class="folder-notice">'+icon('trash')+'<span>Changed your mind? You can restore any message.</span><button data-action="empty-trash">Empty trash</button></div>' : ''}
    <div class="mail-scroll" role="region" aria-label="Message list"><div class="mail-list">${shown.length ? shown.map(renderRow).join('') : renderEmpty()}</div><div class="mail-list-end">${shown.length ? '<span class="end-line"></span><span>You’re all caught up</span>'+icon('check') : ''}</div></div>`;
}

function renderRow(mail) {
  return `<article class="mail-row ${mail.read ? 'is-read' : 'is-unread'} ${selected.has(mail.id) ? 'is-selected' : ''}" data-id="${mail.id}">
    <div class="row-select"><input id="select-${mail.id}" type="checkbox" aria-label="Select ${escape(mail.subject)}" data-select="${mail.id}" ${selected.has(mail.id) ? 'checked' : ''}></div>
    <button class="row-star ${mail.starred ? 'is-starred' : ''}" data-action="star-one" data-id="${mail.id}" aria-label="${mail.starred ? 'Unstar' : 'Star'} ${escape(mail.subject)}" title="${mail.starred ? 'Unstar' : 'Star'}">${icon('star')}</button>
    <button class="row-open" data-action="open" data-id="${mail.id}" aria-label="Open ${escape(mail.subject)}">
      <div class="sender-cell">${avatar(mail.initials, mail.color, 'sender-avatar')}<span class="sender-name">${escape(mail.folder === 'drafts' ? 'Draft' : mail.folder === 'sent' || mail.folder === 'scheduled' ? `To: ${(mail.to ?? '').split('@')[0]}` : mail.sender)}</span>${mail.messages.length > 1 ? `<small class="thread-count">${mail.messages.length}</small>` : ''}</div>
      <div class="mail-content"><div class="mail-summary">${mail.labels.slice(0, 2).map(labelPill).join('')}<span class="mail-subject">${escape(mail.subject)}</span><span class="preview-separator">—</span><span class="mail-preview">${escape(mail.preview)}</span></div>
      ${mail.attachments.length ? `<div class="attachment-chips">${mail.attachments.slice(0, 2).map(a => `<span class="attachment-chip">${icon(a.kind === 'image' ? 'image' : 'attachment')} ${escape(a.name)}</span>`).join('')}${mail.attachments.length > 2 ? `<span class="attachment-chip">+${mail.attachments.length - 2}</span>` : ''}</div>` : ''}</div>
      <div class="row-date">${mail.folder === 'snoozed' || mail.folder === 'scheduled' ? icon('clock') : !mail.read ? '<span class="unread-dot"></span>' : ''}<time datetime="${mail.date}" title="${fullDate(mail.date)}">${formatDate(mail.date)}</time></div>
    </button>
    <div class="row-hover-actions">${button('archive', `quick-archive:${mail.id}`, 'Archive message')}${button('trash', `quick-trash:${mail.id}`, 'Delete message')}${button(mail.read ? 'mail' : 'check', `quick-read:${mail.id}`, mail.read ? 'Mark as unread' : 'Mark as read')}${button('clock', `quick-snooze:${mail.id}`, 'Snooze message')}</div>
  </article>`;
}

function renderEmpty() {
  const isSearch = query.trim();
  return `<div class="empty-state"><div class="empty-illustration"><span class="empty-orbit"></span>${icon(isSearch ? 'search' : view === 'starred' ? 'star' : 'mail')}<span class="empty-spark">${icon('sparkles')}</span></div><h3>${isSearch ? 'No matching conversations' : view === 'inbox' ? 'A little breathing room' : view === 'trash' ? 'Nothing in the trash' : view === 'drafts' ? 'A fresh page awaits' : 'All clear here'}</h3><p>${isSearch ? 'Try another word, a sender, or a different filter.' : view === 'drafts' ? 'Start a message. We’ll keep it safe while you find the words.' : view === 'starred' ? 'Star a message to keep it close at hand.' : 'You’re all caught up. That’s a nice place to be.'}</p><button class="secondary-button" data-action="${isSearch ? 'clear-search' : view === 'drafts' ? 'compose' : 'home'}">${isSearch ? 'Clear search' : view === 'drafts' ? 'Compose a message' : 'Back to inbox'}</button></div>`;
}

function renderConversation(mail, list) {
  const index = list.findIndex(item => item.id === mail.id);
  return `<div class="conversation-toolbar"><div class="toolbar-left">${button('back', 'back', 'Back to mailbox')}<span class="toolbar-divider"></span>${button('archive', 'archive', 'Archive conversation')}${button('spam', 'spam', 'Report spam')}${button('trash', 'trash', mail.folder === 'trash' ? 'Delete forever' : 'Delete conversation')}<span class="toolbar-divider"></span>${button('mail', 'unread', 'Mark as unread')}${button('clock', 'snooze-menu', 'Snooze conversation')}${button('folder', 'move-menu', 'Move conversation')}${button('tag', 'label-menu', 'Label conversation')}${button('more', 'conversation-more', 'More conversation actions')}</div><div class="toolbar-right"><span class="mail-range">${index + 1} of ${list.length}</span>${button('chevron', 'previous-message', 'Previous conversation', 'rotate-180', index <= 0)}${button('chevron', 'next-message', 'Next conversation', '', index < 0 || index === list.length - 1)}</div></div>
    <div class="mail-scroll conversation-scroll">
      ${mail.folder === 'trash' || mail.folder === 'spam' ? `<div class="folder-notice">${icon(mail.folder === 'trash' ? 'trash' : 'spam')}<span>This conversation is in ${mail.folder}.</span><button data-action="restore">Restore conversation</button></div>` : ''}
      <div class="conversation-heading"><div><h2>${escape(mail.subject)}</h2><div class="conversation-labels"><span class="folder-pill">${escape(mail.folder === 'archive' ? 'Archived' : mail.folder[0].toUpperCase() + mail.folder.slice(1))}</span>${mail.labels.map(labelPill).join('')}</div></div><div>${button('print', 'print', 'Print conversation')}${button('star', 'star', mail.starred ? 'Unstar conversation' : 'Star conversation', mail.starred ? 'is-starred' : '')}</div></div>
      <div class="conversation-messages">${mail.messages.map((message, index) => {
        const isOpen = expanded.has(message.id) || index === mail.messages.length - 1;
        return `<section class="message ${isOpen ? 'expanded' : 'collapsed'}"><div class="message-header"><button class="message-person" data-action="expand-message" data-message="${message.id}" aria-expanded="${isOpen}">${avatar(message.own ? 'AM' : mail.initials, message.own ? '#deebe4' : mail.color)}<span><strong>${escape(message.own ? 'Alex Morgan' : message.sender)}</strong>${isOpen ? `<small>&lt;${escape(message.email)}&gt;</small><span class="message-to">to ${escape(message.own ? mail.to ?? 'me' : 'me')} ${icon('down')}</span>` : `<span class="collapsed-preview">${escape(message.body.replace(/\n/g, ' ').slice(0, 140))}</span>`}</span></button><div class="message-meta"><time>${fullDate(message.date)}</time>${button('reply', `reply:${mail.id}`, 'Reply to message')}${button('more', `message-more:${message.id}`, 'More message actions')}</div></div>
        ${isOpen ? `<div class="message-body">${message.bodyHtml ? safeHtml(message.bodyHtml) : escape(message.body).replace(/\n/g, '<br>')}</div>${index === mail.messages.length - 1 && mail.attachments.length ? `<div class="message-attachments"><div class="attachments-heading">${icon('attachment')}<strong>${mail.attachments.length} attachments</strong><span>·</span><button data-action="download-all">Download all</button></div><div class="attachment-cards">${mail.attachments.map((a, ai) => `<button class="attachment-card attachment-${a.kind}" data-action="preview-attachment" data-id="${mail.id}" data-index="${ai}"><div class="attachment-visual">${a.kind === 'image' ? `<div class="website-mini"><span>STUDIO</span><h4>A little different.<br>A lot more you.</h4><i></i></div>` : `<div class="document-mini"><span>${escape(mail.subject.split('—')[0])}</span><i></i><i></i><i></i><i></i><div>${a.kind === 'pdf' ? 'PDF' : 'ZIP'}</div></div>`}</div><div class="attachment-info">${icon(a.kind === 'image' ? 'image' : 'draft')}<span><strong>${escape(a.name)}</strong><small>${escape(a.size)}</small></span>${icon('download')}</div></button>`).join('')}</div></div>` : ''}` : ''}</section>`;
      }).join('')}</div>
      <div class="reply-actions"><button class="secondary-button" data-action="reply:${mail.id}">${icon('reply')}Reply</button>${mail.messages.some(m => !m.own) ? `<button class="secondary-button" data-action="reply-all:${mail.id}">${icon('contacts')}Reply all</button>` : ''}<button class="secondary-button" data-action="forward:${mail.id}">${icon('forward')}Forward</button></div>
      <div class="conversation-end">The best conversations start with a little hello.</div>
    </div>`;
}

function renderSidePanel() {
  const title = { calendar: 'Calendar', notes: 'Notes', tasks: 'My tasks', contacts: 'Contacts', settings: 'Settings' }[sidePanel];
  let content = '';
  if (sidePanel === 'calendar') {
    const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
    const first = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate();
    content = `<div class="calendar-month"><button class="icon-button rotate-180" data-action="calendar-prev" aria-label="Previous month">${icon('chevron')}</button><strong>${calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>${button('chevron', 'calendar-next', 'Next month')}</div><div class="calendar-grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<span class="calendar-weekday">${d}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from({ length: days }, (_, i) => `<button data-action="calendar-day" data-day="${i + 1}" class="${activeCalendarDay === i + 1 ? 'selected' : ''} ${new Date().getDate() === i + 1 && new Date().getMonth() === month ? 'today' : ''}">${i + 1}</button>`).join('')}</div><div class="panel-section-heading">${new Date(year, month, activeCalendarDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>${activeCalendarDay === new Date().getDate() && month === new Date().getMonth() ? '<div class="calendar-event"><span>2:00 PM</span><strong>Website design review</strong><small>45 min · Studio meeting room</small><div>'+avatar('OC', '#eee0d2')+avatar('DK', '#dce9ef')+'</div></div><div class="calendar-event green-event"><span>4:30 PM</span><strong>A little focus time</strong><small>1 hour · Just you</small></div>' : '<div class="panel-empty">No plans. A little room to breathe.</div>'}<button class="secondary-button panel-add" data-action="add-event">${icon('plus')}Add an event</button>`;
    const events = load('events', []).filter(event => event.day === `${year}-${month}-${activeCalendarDay}`);
    content += events.map(event => `<div class="calendar-event"><span>${escape(event.time)}</span><strong>${escape(event.title)}</strong><small>Personal event</small></div>`).join('');
  }
  if (sidePanel === 'notes') content = '<p class="panel-description">Good ideas deserve a place to land.</p><div class="notes-paper"><textarea id="notes-editor" aria-label="Your notes" placeholder="What’s on your mind?">'+escape(notes)+'</textarea></div><span class="panel-saved">'+icon('check')+' Saved on this device</span>';
  if (sidePanel === 'tasks') content = `<p class="panel-description">One small thing at a time.</p><form id="task-form" class="task-input"><input name="task" aria-label="New task" placeholder="Add a task…" required><button class="icon-button" aria-label="Add task">${icon('plus')}</button></form><div class="task-list">${tasks.map(task => `<div class="task ${task.done ? 'done' : ''}"><label><input type="checkbox" data-task="${task.id}" ${task.done ? 'checked' : ''}><span>${escape(task.text)}</span></label><button class="task-remove" data-action="remove-task" data-id="${task.id}" aria-label="Remove task">${icon('close')}</button></div>`).join('')}</div><div class="panel-saved">${tasks.filter(task => !task.done).length} things left. You’ve got this.</div>`;
  if (sidePanel === 'contacts') content = `<p class="panel-description">A familiar face, a new conversation.</p><div class="contact-list">${CONTACTS.map(contact => `<button data-action="contact-compose" data-email="${contact.email}">${avatar(contact.name.split(' ').map(x => x[0]).join(''), contact.color)}<span><strong>${contact.name}</strong><small>${contact.email}</small></span>${icon('pencil')}</button>`).join('')}</div>`;
  if (sidePanel === 'settings') content = `<p class="panel-description">Make a little space your own.</p><div class="settings-section"><h4>Appearance</h4><div class="theme-options"><button data-action="set-theme" data-theme="light" class="${settings.theme === 'light' ? 'selected' : ''}"><div class="theme-preview light-preview"><i></i><span></span><span></span><span></span></div>${icon('sun')}Light${settings.theme === 'light' ? icon('check') : ''}</button><button data-action="set-theme" data-theme="dark" class="${settings.theme === 'dark' ? 'selected' : ''}"><div class="theme-preview dark-preview"><i></i><span></span><span></span><span></span></div>${icon('moon')}Dark${settings.theme === 'dark' ? icon('check') : ''}</button></div></div><div class="settings-section"><h4>Inbox density</h4>${['comfortable', 'compact'].map(density => `<label class="setting-radio"><input type="radio" name="density" value="${density}" ${settings.density === density ? 'checked' : ''}><span><strong>${density[0].toUpperCase()+density.slice(1)}</strong><small>${density === 'comfortable' ? 'A little room to breathe' : 'More messages, less scrolling'}</small></span></label>`).join('')}</div><div class="settings-section"><h4>Composition</h4><label class="setting-toggle"><span><strong>Email signature</strong><small>Sign off with “Best, Alex”</small></span><input type="checkbox" id="signature-setting" ${settings.signature ? 'checked' : ''}></label></div><div class="settings-section"><h4>Your mailbox</h4><button class="settings-link" data-action="storage">${icon('download')}Data & storage${icon('chevron')}</button><button class="settings-link" data-action="help">${icon('keyboard')}Keyboard shortcuts${icon('chevron')}</button></div><div class="settings-account">${avatar('AM', '#deebe4')}<div><strong>Alex Morgan</strong><small>${USER.email}</small><span>Personal local mailbox</span></div></div>`;
  return `<header class="panel-header"><h3>${title}</h3>${button('close', 'close-panel', 'Close panel')}</header><div class="panel-content">${content}</div>`;
}

function toast(message, undo) {
  clearTimeout(toastTimer); toastUndo = undo;
  document.getElementById('toast-root').innerHTML = `<div class="toast">${icon('check')}<span>${escape(message)}</span>${undo ? '<button data-action="undo">Undo</button>' : ''}<button class="toast-close" data-action="close-toast" aria-label="Dismiss notification">${icon('close')}</button></div>`;
  toastTimer = setTimeout(() => { document.getElementById('toast-root').innerHTML = ''; toastUndo = null; }, undo ? 9000 : 4500);
}
function closeMenu() { menuRoot.innerHTML = ''; }
function openMenu(anchor, html, extra = '') {
  closeMenu();
  const rect = anchor.getBoundingClientRect();
  menuRoot.innerHTML = `<div class="dropdown-menu ${extra}" role="menu">${html}</div>`;
  const menu = menuRoot.firstElementChild;
  const x = Math.min(rect.left, window.innerWidth - menu.offsetWidth - 16);
  let y = rect.bottom + 8;
  if (y + menu.offsetHeight > window.innerHeight - 12) y = Math.max(12, rect.top - menu.offsetHeight - 8);
  menu.style.left = `${Math.max(12, x)}px`; menu.style.top = `${y}px`;
}
function showDialog(title, body, extra = '') {
  closeMenu(); modalTrigger = document.activeElement;
  dialogRoot.innerHTML = `<div class="dialog-backdrop" data-action="dialog-backdrop"><section class="dialog ${extra}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h3 id="dialog-title">${escape(title)}</h3>${button('close', 'close-dialog', 'Close dialog')}</header><div class="dialog-body">${body}</div></section></div>`;
  requestAnimationFrame(() => dialogRoot.querySelector('input, button')?.focus());
}
function closeDialog() { dialogRoot.innerHTML = ''; modalTrigger?.focus(); }
function actionIds() { return openId ? [openId] : [...selected]; }
function perform(action, value = '', ids = actionIds()) {
  if (!ids.length) return;
  if (action === 'trash' && ids.every(id => mails.find(mail => mail.id === id)?.folder === 'trash')) {
    showDialog('Delete permanently?', `<p>This will remove ${ids.length === 1 ? 'this conversation' : `${ids.length} conversations`} from your local mailbox. You can also restore ${ids.length === 1 ? 'it' : 'them'} instead.</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">Cancel</button><button class="danger-button" data-action="permanent-delete" data-ids="${ids.join(',')}">Delete forever</button></div>`); return;
  }
  const previous = mails.filter(mail => ids.includes(mail.id));
  mails = updateMail(mails, ids, action, value);
  const messages = { archive: 'Conversation archived', trash: 'Moved to trash', spam: 'Moved to spam', restore: 'Conversation restored', read: 'Marked as read', unread: 'Marked as unread', label: `Label “${value}” applied`, unlabel: `Label “${value}” removed`, move: `Moved to ${value === 'archive' ? 'archive' : value}`, snooze: `Snoozed until ${fullDate(value)}` };
  if (['archive', 'trash', 'spam', 'move', 'snooze', 'restore'].includes(action)) { openId = null; selected.clear(); page = 0; }
  if (action === 'unread' && openId) openId = null;
  commit(); closeMenu();
  if (messages[action]) toast(ids.length > 1 ? `${ids.length} conversations · ${messages[action]}` : messages[action], () => { mails = mails.map(mail => previous.find(old => old.id === mail.id) ?? mail); commit(); toast('Change undone'); });
}
function navigate(destination) {
  view = destination; query = ''; openId = null; selected.clear(); page = 0; unreadOnly = false; focusIndex = -1; mobileNav = false;
  history.replaceState(null, '', `#${encodeURIComponent(destination)}`); render();
}
function openMail(id) {
  const mail = mails.find(mail => mail.id === id);
  if (!mail) return;
  if (mail.folder === 'drafts') { composer.open({ id: mail.id, to: mail.to ?? '', cc: mail.cc ?? '', bcc: mail.bcc ?? '', subject: mail.subject === '(no subject)' ? '' : mail.subject, body: mail.messages[0].body, bodyHtml: mail.messages[0].bodyHtml, attachments: mail.attachments }); return; }
  openId = id; selected.clear(); expanded.clear();
  mails = updateMail(mails, [id], 'read'); commit();
  shell.querySelector('.mail-scroll')?.scrollTo(0, 0);
}

function previewAttachment(mail, index) {
  const attachment = mail.attachments[index];
  let preview = '';
  if (attachment.data && attachment.kind === 'image' && /^data:image\/(png|jpeg|gif|webp);base64,/.test(attachment.data)) preview = `<img class="attachment-real-image" src="${escape(attachment.data)}" alt="${escape(attachment.name)}">`;
  else if (attachment.data) preview = `<div class="local-file-preview">${icon('draft')}<h3>${escape(attachment.name)}</h3><p>${escape(attachment.size)} · Your original file is ready to download.</p></div>`;
  else if (attachment.kind === 'image') preview = '<div class="website-preview"><div>STUDIO <small>About &nbsp; Work &nbsp; Get in touch ↗</small></div><h2>A little different.<br>A lot more you.</h2><p>Thoughtful design for brands<br>with something to say.</p><div class="preview-art"><span></span><i></i><b></b></div><span class="preview-cta">Discover our work ↗</span></div>';
  else preview = `<div class="document-preview"><span class="document-kicker">STUDIO / ${attachment.kind === 'pdf' ? 'DOCUMENT' : 'ASSET COLLECTION'}</span><h2>${escape(attachment.name.replace(/\.[^.]+$/, ''))}</h2><span class="document-rule"></span><p>Prepared for Alex Morgan<br>${escape(mail.sender)} · ${new Date(mail.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p><h4>${mail.subject.includes('redesign') ? 'A clearer direction' : 'Overview'}</h4><p>${escape(mail.preview)}</p><div class="document-block"><span>01</span><div><h4>Thoughtfully considered</h4><p>Clear hierarchy, a focused experience, and a little room to breathe.</p></div></div><div class="document-block"><span>02</span><div><h4>The details matter</h4><p>Built around real people and the things they need to do every day.</p></div></div><footer>STUDIO &nbsp; / &nbsp; ${attachment.data ? 'LOCAL ATTACHMENT' : 'SAMPLE ATTACHMENT'}<span>01</span></footer></div>`;
  showDialog(attachment.name, `<div class="attachment-preview">${preview}</div><div class="attachment-preview-footer"><span>${escape(attachment.size)} · ${attachment.data ? 'Local file' : 'Seeded preview'}</span><button class="primary-button" data-action="download-attachment" data-id="${mail.id}" data-index="${index}">${icon('download')}Download</button></div>`, 'attachment-dialog');
}
function downloadAttachment(mail, index) {
  const attachment = mail.attachments[index];
  if (attachment.data) { const anchor = document.createElement('a'); anchor.href = attachment.data; anchor.download = attachment.name; anchor.click(); }
  else {
    const content = `${attachment.name}\n${'—'.repeat(40)}\n\n${mail.subject}\nFrom: ${mail.sender}\nDate: ${fullDate(mail.date)}\n\n${mail.messages.at(-1).body}\n\nThis is the text companion to a seeded sample attachment.`;
    downloadText(`${attachment.name.replace(/\.[^.]+$/, '')}.txt`, content);
    toast('Sample attachment downloaded as a text companion');
  }
}

function handleAction(action, target) {
  if (action.startsWith('quick-')) {
    const [command, id] = action.split(':');
    if (command === 'quick-read') perform(mails.find(mail => mail.id === id)?.read ? 'unread' : 'read', '', [id]);
    else if (command === 'quick-snooze') { const rect = target.getBoundingClientRect(); selected = new Set([id]); render(); snoozeMenu({ getBoundingClientRect: () => rect }); }
    else perform(command.replace('quick-', ''), '', [id]);
    return;
  }
  if (action.startsWith('reply:') || action.startsWith('reply-all:') || action.startsWith('forward:')) {
    const [kind, id] = action.split(':'); const mail = mails.find(mail => mail.id === id); if (!mail) return;
    const message = [...mail.messages].reverse().find(m => !m.own) ?? mail.messages.at(-1);
    composer.open({ to: kind === 'forward' ? '' : message.own ? mail.to ?? '' : message.email, subject: `${kind === 'forward' ? 'Fwd: ' : /^Re:/i.test(mail.subject) ? '' : 'Re: '}${mail.subject}`, body: kind === 'forward' ? `\n\n---------- Forwarded message ----------\nFrom: ${message.sender} <${message.email}>\nDate: ${fullDate(message.date)}\nSubject: ${mail.subject}\n\n${message.body}` : '', cc: kind === 'reply-all' ? [...new Set(mail.messages.filter(m => !m.own && m.email !== message.email).map(m => m.email))].join(', ') : '', attachments: kind === 'forward' ? mail.attachments : [], replyTo: kind === 'forward' ? undefined : id });
    return;
  }
  if (action.startsWith('message-more:')) {
    const id = action.split(':')[1]; openMenu(target, `<button data-action="reply:${openId}">${icon('reply')}Reply</button><button data-action="forward:${openId}">${icon('forward')}Forward</button><button data-action="download-message" data-message="${id}">${icon('download')}Download message</button>`); return;
  }
  switch (action) {
    case 'toggle-sidebar': if (window.innerWidth <= 760) mobileNav = !mobileNav; else sidebarCollapsed = !sidebarCollapsed; render(); break;
    case 'navigate': navigate(target.dataset.view); break;
    case 'home': navigate('inbox'); break;
    case 'more-folders': moreFolders = !moreFolders; render(); break;
    case 'compose': composer.open(); break;
    case 'open': openMail(target.dataset.id); break;
    case 'back': openId = null; expanded.clear(); render(); break;
    case 'star-one': perform('star', '', [target.dataset.id]); break;
    case 'star': perform('star'); break;
    case 'archive': case 'trash': case 'spam': case 'read': case 'unread': case 'restore': case 'important': perform(action); break;
    case 'category': category = target.dataset.category; selected.clear(); page = 0; focusIndex = -1; render(); shell.querySelector('.mail-scroll')?.scrollTo(0, 0); break;
    case 'clear-search': query = ''; openId = null; selected.clear(); page = 0; render(); break;
    case 'refresh': { const current = wakeMail(mails); mails = current; commit(); const refresh = shell.querySelector('[data-action="refresh"]'); refresh?.classList.add('spinning'); toast('Mailbox is up to date'); break; }
    case 'search-filters': showDialog('Find exactly what you need', `<form id="advanced-search"><label class="field-label">From<input name="from" placeholder="Name or email address"></label><label class="field-label">Subject<input name="subject" placeholder="A word or phrase"></label><label class="field-label">Has the words<input name="words" placeholder="Anything you remember"></label><div class="filter-options"><label><input type="checkbox" name="unread">Unread only</label><label><input type="checkbox" name="attachment">Has attachment</label></div><div class="dialog-actions"><button class="secondary-button" type="button" data-action="close-dialog">Cancel</button><button class="primary-button" type="submit">${icon('search')}Search mail</button></div></form>`); break;
    case 'selection-menu': openMenu(target, ['All', 'None', 'Read', 'Unread', 'Starred', 'Unstarred'].map(option => `<button data-action="select-option" data-option="${option.toLowerCase()}">${option}</button>`).join('')); break;
    case 'select-option': {
      const option = target.dataset.option; selected = new Set(visibleMail().slice(page*25, page*25+25).filter(mail => option === 'all' || option === 'read' && mail.read || option === 'unread' && !mail.read || option === 'starred' && mail.starred || option === 'unstarred' && !mail.starred).map(mail => mail.id)); closeMenu(); render(); break;
    }
    case 'mailbox-more': openMenu(target, `<button data-action="mark-all-read">${icon('check')}Mark all as read</button><button data-action="toggle-unread">${icon('mail')}${unreadOnly ? 'Show all messages' : 'Show only unread'}</button><div class="menu-divider"></div><button data-action="help">${icon('keyboard')}Keyboard shortcuts <kbd>?</kbd></button>`); break;
    case 'mark-all-read': perform('read', '', visibleMail().map(mail => mail.id)); break;
    case 'toggle-unread': unreadOnly = !unreadOnly; page = 0; selected.clear(); closeMenu(); render(); break;
    case 'snooze-menu': snoozeMenu(target); break;
    case 'snooze-at': perform('snooze', target.dataset.date); break;
    case 'move-menu': openMenu(target, `<div class="menu-heading">Move to</div>${[['inbox', 'inbox', 'Inbox'], ['archive', 'archive', 'Archive'], ['trash', 'trash', 'Trash']].map(([folder, symbol, name]) => `<button data-action="move-to" data-folder="${folder}">${icon(symbol)}${name}</button>`).join('')}`); break;
    case 'move-to': perform('move', target.dataset.folder); break;
    case 'label-menu': {
      const ids = actionIds();
      openMenu(target, `<div class="menu-heading">Label as</div>${labels.map(label => { const allHave = ids.length > 0 && ids.every(id => mails.find(mail => mail.id === id)?.labels.includes(label.name)); return `<button data-action="apply-label" data-label="${escape(label.name)}" data-remove="${allHave}"><span class="label-dot" style="background:${label.color}"></span>${escape(label.name)}${allHave ? icon('check') : ''}</button>`; }).join('')}<div class="menu-divider"></div><button data-action="new-label">${icon('plus')}Create new label</button>`); break;
    }
    case 'apply-label': perform(target.dataset.remove === 'true' ? 'unlabel' : 'label', target.dataset.label); break;
    case 'new-label': showDialog('A place for something important', `<form id="label-form"><label class="field-label">Label name<input name="label" placeholder="e.g. Inspiration" maxlength="28" required></label><span class="field-label">A little color</span><div class="label-colors">${['#8a72df', '#57a38a', '#d3a255', '#6197cc', '#d77589', '#7d8a9d'].map((color, i) => `<label style="--swatch:${color}"><input type="radio" name="color" value="${color}" ${i === 0 ? 'checked' : ''}><span>${icon('check')}</span></label>`).join('')}</div><p class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button><button class="primary-button" type="submit">Create label</button></div></form>`); break;
    case 'next-page': page++; selected.clear(); render(); shell.querySelector('.mail-scroll')?.scrollTo(0, 0); break;
    case 'previous-page': page = Math.max(0, page-1); selected.clear(); render(); shell.querySelector('.mail-scroll')?.scrollTo(0, 0); break;
    case 'previous-message': case 'next-message': { const list = visibleMail(); const index = list.findIndex(mail=>mail.id===openId); const next = list[index+(action === 'next-message' ? 1 : -1)]; if (next) openMail(next.id); break; }
    case 'expand-message': expanded.has(target.dataset.message) ? expanded.delete(target.dataset.message) : expanded.add(target.dataset.message); render(); break;
    case 'conversation-more': openMenu(target, `<button data-action="important">${icon('important')}${activeMail()?.important ? 'Mark as not important' : 'Mark as important'}</button><button data-action="download-conversation">${icon('download')}Download conversation</button><button data-action="print">${icon('print')}Print conversation</button>`); break;
    case 'print': { closeMenu(); const oldExpanded = new Set(expanded); activeMail()?.messages.forEach(message => expanded.add(message.id)); render(); requestAnimationFrame(() => { window.print(); expanded = oldExpanded; render(); }); break; }
    case 'download-conversation': { const mail = activeMail(); downloadText(`${mail.subject}.txt`, mail.messages.map(message => `${message.sender} <${message.email}>\n${fullDate(message.date)}\n\n${message.body}`).join('\n\n---\n\n')); closeMenu(); break; }
    case 'download-message': { const mail = activeMail(); const message = mail.messages.find(m=>m.id===target.dataset.message); downloadText(`${mail.subject}.eml`, `From: ${message.sender} <${message.email}>\r\nTo: ${mail.to ?? USER.email}\r\nSubject: ${mail.subject}\r\nDate: ${new Date(message.date).toUTCString()}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${message.body}`, 'message/rfc822'); closeMenu(); break; }
    case 'preview-attachment': previewAttachment(mails.find(mail=>mail.id===target.dataset.id), Number(target.dataset.index)); break;
    case 'download-attachment': downloadAttachment(mails.find(mail=>mail.id===target.dataset.id), Number(target.dataset.index)); break;
    case 'download-all': activeMail()?.attachments.forEach((_, index)=>downloadAttachment(activeMail(), index)); break;
    case 'permanent-delete': { const ids = target.dataset.ids.split(','); mails = mails.filter(mail=>!ids.includes(mail.id)); selected.clear(); openId = null; closeDialog(); commit(); toast('Permanently deleted'); break; }
    case 'empty-trash': { const ids = mails.filter(mail=>mail.folder==='trash').map(mail=>mail.id); showDialog('Empty the trash?', `<p>Permanently remove ${ids.length} conversations from this device?</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">Cancel</button><button class="danger-button" data-action="permanent-delete" data-ids="${ids.join(',')}">Empty trash</button></div>`); break; }
    case 'undo': { const undo = toastUndo; document.getElementById('toast-root').innerHTML = ''; clearTimeout(toastTimer); toastUndo = null; undo?.(); break; }
    case 'close-toast': document.getElementById('toast-root').innerHTML = ''; clearTimeout(toastTimer); toastUndo = null; break;
    case 'close-dialog': closeDialog(); break;
    case 'dialog-backdrop': if (target === eventTarget) closeDialog(); break;
    case 'help': closeMenu(); showDialog('A little faster, a little easier', `<p class="help-intro">Your inbox, at your fingertips. Shortcuts work when you’re not typing.</p><div class="shortcut-list">${[['c', 'Compose a message'], ['/', 'Search your mail'], ['j / k', 'Next / previous message'], ['Enter', 'Open focused message'], ['x', 'Select focused message'], ['e', 'Archive selected conversation'], ['s', 'Star selected conversation'], ['#', 'Move selected conversation to trash'], ['Esc', 'Close a window or go back'], ['⌘ / Ctrl + Enter', 'Send a message'], ['?', 'Show this guide']].map(([key, description])=>`<div><span>${description}</span><kbd>${key}</kbd></div>`).join('')}</div><div class="search-help"><h4>Find it faster</h4><p>Try <code>from:olivia</code>, <code>is:unread</code>, <code>has:attachment</code>, or <code>label:Work</code>. Combine them to narrow things down.</p></div>`, 'help-dialog'); break;
    case 'settings': closeMenu(); sidePanel = sidePanel === 'settings' ? null : 'settings'; render(); break;
    case 'panel': sidePanel = sidePanel === target.dataset.panel ? null : target.dataset.panel; render(); break;
    case 'close-panel': sidePanel = null; render(); break;
    case 'set-theme': settings.theme = target.dataset.theme; persist('settings', settings); render(); break;
    case 'workspace': openMenu(target, `<div class="menu-heading">A little workspace</div><div class="workspace-menu">${['calendar', 'notes', 'tasks', 'contacts'].map(name=>`<button data-action="panel" data-panel="${name}">${icon(name)}<span>${name[0].toUpperCase()+name.slice(1)}</span></button>`).join('')}</div>`, 'apps-dropdown'); break;
    case 'account': openMenu(target, `<div class="account-menu-header">${avatar('AM', '#deebe4')}<div><strong>Alex Morgan</strong><span>${USER.email}</span><small><i></i> Personal local mailbox</small></div></div><div class="menu-divider"></div><button data-action="settings">${icon('settings')}Account & appearance</button><button data-action="storage">${icon('download')}Export your mailbox</button><button data-action="help">${icon('help')}Help & shortcuts</button>`, 'account-dropdown'); break;
    case 'storage': closeMenu(); showDialog('Your mailbox. Your data.', `<div class="storage-dialog-icon">${icon('cloud')}</div><p>All ${mails.length} conversations, your labels, and settings are saved in this browser. No account connection is needed.</p><div class="storage-stats"><div><strong>${mails.length}</strong><span>Conversations</span></div><div><strong>${labels.length}</strong><span>Labels</span></div><div><strong>${(new Blob([JSON.stringify(mails)]).size / 1024).toFixed(0)} KB</strong><span>Local storage</span></div></div><button class="primary-button full-width" data-action="export-mailbox">${icon('download')}Download mailbox backup</button><p class="storage-footnote">A readable JSON backup of your mail, labels, and settings.</p><div class="dialog-divider"></div><button class="text-danger" data-action="reset-dialog">Restore the sample mailbox</button>`); break;
    case 'export-mailbox': downloadText('gpt-6-mailbox-backup.json', JSON.stringify({ exported: new Date().toISOString(), messages: mails, labels, settings, tasks, notes }, null, 2), 'application/json'); toast('Mailbox backup downloaded'); break;
    case 'reset-dialog': showDialog('Start fresh?', `<p>This replaces your messages and labels with the original sample mailbox. Download a backup first if you want to keep your changes.</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">Cancel</button><button class="danger-button" data-action="reset-confirm">Restore samples</button></div>`); break;
    case 'reset-confirm': composer.state = null; composer.render(); mails = createSeedMail(); labels = [...INITIAL_LABELS]; persist('labels', labels); closeDialog(); navigate('inbox'); commit(); toast('Sample mailbox restored'); break;
    case 'calendar-prev': calendarDate.setMonth(calendarDate.getMonth()-1); activeCalendarDay = 1; render(); break;
    case 'calendar-next': calendarDate.setMonth(calendarDate.getMonth()+1); activeCalendarDay = 1; render(); break;
    case 'calendar-day': activeCalendarDay = Number(target.dataset.day); render(); break;
    case 'add-event': showDialog('Make a little time', `<form id="event-form"><label class="field-label">Event name<input name="title" placeholder="Coffee, a conversation, a good idea…" required maxlength="100"></label><label class="field-label">Time<input name="time" type="time" value="14:00" required></label><div class="dialog-actions"><button class="secondary-button" type="button" data-action="close-dialog">Cancel</button><button class="primary-button" type="submit">Add event</button></div></form>`); break;
    case 'remove-task': tasks = tasks.filter(task=>task.id!==target.dataset.id); persist('tasks', tasks); render(); break;
    case 'contact-compose': composer.open({ to: target.dataset.email }); closeMenu(); break;
    case 'schedule-send': closeMenu(); composer.send('scheduled', target.dataset.date); break;
    case 'compose-emoji': closeMenu(); composer.insert(target.dataset.emoji); break;
  }
}

function snoozeMenu(target) {
  const later = new Date(Date.now() + 3*3600000);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1); tomorrow.setHours(9,0,0,0);
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate()+7); nextWeek.setHours(9,0,0,0);
  openMenu(target, `<div class="menu-heading">A little later</div><button data-action="snooze-at" data-date="${later.toISOString()}">${icon('clock')}Later today<small>${later.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</small></button><button data-action="snooze-at" data-date="${tomorrow.toISOString()}">${icon('sun')}Tomorrow<small>9:00 AM</small></button><button data-action="snooze-at" data-date="${nextWeek.toISOString()}">${icon('calendar')}Next week<small>${nextWeek.toLocaleDateString('en-US',{weekday:'short'})}, 9:00 AM</small></button>`);
}

let eventTarget;
document.addEventListener('click', event => {
  eventTarget = event.target;
  const target = event.target.closest('[data-action]');
  if (target) {
    event.preventDefault();
    if (target.disabled) return;
    const action = target.dataset.action;
    if (!['account', 'workspace', 'selection-menu', 'mailbox-more', 'snooze-menu', 'move-menu', 'label-menu', 'conversation-more'].includes(action) && !action.startsWith('message-more:')) closeMenu();
    handleAction(action, target);
  } else if (!event.target.closest('.dropdown-menu') && !event.target.closest('[data-caction]')) closeMenu();
});
document.addEventListener('input', event => {
  if (event.target.id === 'mail-search') { query = event.target.value; openId = null; selected.clear(); page = 0; focusIndex = -1; render(); }
  if (event.target.id === 'notes-editor') { notes = event.target.value; persist('notes', notes); }
});
document.addEventListener('change', event => {
  const target = event.target;
  if (target.hasAttribute('data-select-all')) { const shown = visibleMail().slice(page*25,page*25+25); selected = target.checked ? new Set(shown.map(mail=>mail.id)) : new Set(); render(); }
  if (target.dataset.select) { target.checked ? selected.add(target.dataset.select) : selected.delete(target.dataset.select); render(); }
  if (target.dataset.task) { tasks = tasks.map(task=>task.id===target.dataset.task ? {...task,done:target.checked} : task); persist('tasks',tasks); render(); }
  if (target.name === 'density') { settings.density = target.value; persist('settings',settings); render(); }
  if (target.id === 'signature-setting') { settings.signature = target.checked; persist('settings',settings); }
});
document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target; const data = new FormData(form);
  if (form.id === 'search-form') document.getElementById('mail-search').blur();
  if (form.id === 'advanced-search') {
    query = [data.get('from')?.trim() && `from:"${data.get('from').trim()}"`, data.get('subject')?.trim() && `subject:"${data.get('subject').trim()}"`, data.get('words')?.trim(), data.has('unread') && 'is:unread', data.has('attachment') && 'has:attachment'].filter(Boolean).join(' ');
    openId = null; selected.clear(); page = 0; closeDialog(); render();
  }
  if (form.id === 'label-form') {
    const name = data.get('label').trim();
    if (!name || labels.some(label=>label.name.toLowerCase()===name.toLowerCase())) { form.querySelector('.form-error').textContent = 'Choose a unique label name.'; return; }
    labels.push({name,color:data.get('color')}); persist('labels',labels); const ids = actionIds(); closeDialog(); if (ids.length) perform('label',name,ids); else { render(); toast(`Label “${name}” created`); }
  }
  if (form.id === 'task-form') { const text = data.get('task').trim(); if (text) { tasks.unshift({id:crypto.randomUUID(),text,done:false}); persist('tasks',tasks); render(); document.querySelector('[name="task"]')?.focus(); } }
  if (form.id === 'event-form') { const events = load('events',[]); events.push({day:`${calendarDate.getFullYear()}-${calendarDate.getMonth()}-${activeCalendarDay}`,title:data.get('title').trim(),time:data.get('time')}); persist('events',events); closeDialog(); render(); toast('A little time, saved'); }
  if (form.id === 'link-form') { const url = data.get('url'); if (!/^https?:\/\//i.test(url)) { form.querySelector('[name="url"]').setCustomValidity('Use an http or https address.'); form.reportValidity(); return; } closeDialog(); const editor = document.querySelector('.compose-editor'); editor.focus(); document.execCommand('insertHTML',false,`<a href="${escape(url)}">${escape(data.get('text'))}</a>`); composer.state.body = editor.innerText; composer.state.bodyHtml = safeHtml(editor.innerHTML); composer.save(); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (dialogRoot.innerHTML) closeDialog(); else if (menuRoot.innerHTML) closeMenu(); else if (composer.state) composer.close(); else if (openId) { openId = null; render(); } else if (mobileNav) { mobileNav = false; render(); } return; }
  if (dialogRoot.innerHTML && event.key === 'Tab') {
    const focusable = [...dialogRoot.querySelectorAll('button,input,select,textarea,a[href]')].filter(el=>!el.disabled);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && composer.state && !dialogRoot.innerHTML) { event.preventDefault(); composer.send(); return; }
  if (dialogRoot.innerHTML || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === '/') { event.preventDefault(); document.getElementById('mail-search').focus(); return; }
  if (event.key === 'c') { composer.open(); return; }
  if (event.key === '?') { handleAction('help',event.target); return; }
  if (event.key === 'e') perform('archive');
  if (event.key === '#') perform('trash');
  if (event.key === 's') perform('star');
  const list = visibleMail().slice(page*25,page*25+25);
  if (event.key === 'j' || event.key === 'k') { event.preventDefault(); if (openId) handleAction(event.key === 'j' ? 'next-message' : 'previous-message', event.target); else { focusIndex = Math.max(0,Math.min(list.length-1,focusIndex+(event.key==='j'?1:-1))); render(); shell.querySelectorAll('.mail-row')[focusIndex]?.scrollIntoView({block:'nearest'}); } }
  if (event.key === 'Enter' && !['BUTTON', 'A'].includes(event.target.tagName) && focusIndex >= 0 && list[focusIndex]) openMail(list[focusIndex].id);
  if (event.key === 'x' && focusIndex >= 0 && list[focusIndex]) { const id = list[focusIndex].id; selected.has(id) ? selected.delete(id) : selected.add(id); render(); }
});
window.addEventListener('storage', event => { if (event.key === `${STORAGE}-messages`) { mails = load('messages', mails); render(); } });
window.addEventListener('resize', closeMenu);
window.addEventListener('beforeunload', () => composer.save());
setInterval(() => { const updated = wakeMail(mails); if (updated.some((mail,index)=>mail!==mails[index])) { mails = updated; commit(); toast('A conversation is ready for you'); } }, 30000);
let initialView = '';
try { initialView = decodeURIComponent(location.hash.slice(1)); } catch { /* Invalid URLs open the inbox. */ }
if (['inbox','starred','sent','drafts','trash','all','spam','snoozed','scheduled','important'].includes(initialView) || initialView.startsWith('label:')) view = initialView;
mails = wakeMail(mails);
render();
