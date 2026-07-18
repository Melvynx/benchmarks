const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const icons = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="10.7" cy="10.7" r="5.7"/><path d="m15.2 15.2 4.1 4.1"/>',
  tune: '<path d="M4 7h8M16 7h4M10 5v4M4 12h3M11 12h9M7 10v4M4 17h11M19 17h1M15 15v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inbox: '<path d="M4 5.5h16v12.7H4z"/><path d="M4 14h4l1.4 2h5.2l1.4-2h4"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.5-5-2.6-5 2.6.9-5.5-4-3.9 5.6-.8z"/>',
  send: '<path d="m4 5 16 7-16 7 2.7-7z"/><path d="M6.7 12H20"/>',
  draft: '<path d="M6 4.5h8.5L18 8v11.5H6z"/><path d="M14.5 4.5V8H18M9 12h6M9 15h5"/>',
  trash: '<path d="M5 7h14M9 7V4.5h6V7M7 7l.8 12h8.4L17 7M10 10v6M14 10v6"/>',
  tag: '<path d="M3.8 12 12 3.8H19.5V11.3L11.3 19.5z"/><circle cx="16.2" cy="7.2" r="1"/>',
  archive: '<path d="M4 5h16v4H4zM5.5 9h13v10.5h-13z"/><path d="M9 13h6"/>',
  more: '<circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
  reply: '<path d="M9 7 4 12l5 5v-3c5 0 8 1.5 10 4-1-6-4.4-9-10-9z"/>',
  forward: '<path d="m15 7 5 5-5 5v-3c-5 0-8 1.5-10 4 1-6 4.4-9 10-9z"/>',
  unread: '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
  read: '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/><path d="m16 4 1.4 1.4L21 1.8"/>',
  refresh: '<path d="M19 8V4l-1.6 1.6A7 7 0 1 0 19 12"/>',
  grid: '<rect x="5" y="5" width="4" height="4" rx=".5"/><rect x="15" y="5" width="4" height="4" rx=".5"/><rect x="5" y="15" width="4" height="4" rx=".5"/><rect x="15" y="15" width="4" height="4" rx=".5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.3 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H5v-3h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1z"/>',
  paperclip: '<path d="m8.3 12.6 5.9-5.9a3 3 0 1 1 4.2 4.2l-7.6 7.6a4.5 4.5 0 1 1-6.4-6.4l7-7"/>',
  link: '<path d="M10 13.8a4 4 0 0 0 5.6.1l2-2a4 4 0 0 0-5.7-5.6l-1.1 1.1M14 10.2a4 4 0 0 0-5.6-.1l-2 2a4 4 0 1 0 5.7 5.6l1.1-1.1"/>',
  smile: '<circle cx="12" cy="12" r="8"/><path d="M8.5 14.2s1.2 1.5 3.5 1.5 3.5-1.5 3.5-1.5M9 9.5h.01M15 9.5h.01"/>',
  minimize: '<path d="M7 12h10"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  expand: '<path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/>',
  snooze: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v4l2.5 1.7"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  print: '<path d="M7 9V4h10v5M6 17H4.5v-6h15v6H18M7 14h10v6H7z"/>',
  check: '<path d="m5 12 4.2 4.2L19 6.5"/>',
  calendar: '<rect x="4.5" y="6" width="15" height="13" rx="1.5"/><path d="M8 4v4M16 4v4M4.5 10h15"/>'
};

const icon = (name, className = '') => `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.more}</svg>`;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));

const seededMessages = [
  {
    id: 'm-aurora', sender: 'Aurora Labs', email: 'nina@auroralabs.co', initials: 'AL', color: 'violet', subject: 'Design review, final notes for the launch',
    snippet: 'The motion pass is in. I added the decisions from this morning and a few open questions for us.', time: '10:42', date: 'Jul 14, 2026, 10:42 AM', unread: true, star: true, category: 'primary', labels: ['inbox', 'work'], attachments: ['Launch-notes.pdf', 'motion-pass.mp4'],
    messages: [
      { name: 'Nina Campos', email: 'nina@auroralabs.co', initials: 'NC', color: 'violet', time: '9:18 AM', body: 'Hi Melvyn,\n\nThe motion pass is in. I added the decisions from this morning and marked the two places where we need your call before handoff.\n\nThe launch sequence is feeling much calmer now. The product moments have room to breathe, and the confirmation states are clearer.\n\nCould you take a look at the hero handoff and the final empty state today?', attachments: ['Launch-notes.pdf'] },
      { name: 'You', email: 'melvyn@example.com', initials: 'ME', color: 'me', time: '9:47 AM', body: 'This is much closer. I like the slower handoff between the preview and the confirmation. Let’s keep the empty state quiet and move the secondary action below the fold.' },
      { name: 'Nina Campos', email: 'nina@auroralabs.co', initials: 'NC', color: 'violet', time: '10:42 AM', body: 'Perfect. I made those changes and included a short motion export for review. The only remaining question is whether the review badge should appear after the animation completes, or immediately when the screen opens.' , attachments: ['motion-pass.mp4'] }
    ]
  },
  {
    id: 'm-github', sender: 'GitHub', email: 'notifications@github.com', initials: 'GH', color: 'ink', subject: '[lumail] Pull request #482 is ready for review',
    snippet: 'Maya requested your review on “Improve mailbox filtering and keyboard focus”.', time: '9:36', date: 'Jul 14, 2026, 9:36 AM', unread: true, star: false, category: 'updates', labels: ['inbox', 'work'], attachments: [],
    messages: [{ name: 'GitHub', email: 'notifications@github.com', initials: 'GH', color: 'ink', time: '9:36 AM', body: 'Maya Laurent requested your review on lumail / Pull request #482\n\nImprove mailbox filtering and keyboard focus\n\n7 commits, 14 files changed\n\nReview changes in GitHub to leave comments or approve the update.' }]
  },
  {
    id: 'm-maya', sender: 'Maya Laurent', email: 'maya@northstar.studio', initials: 'ML', color: 'coral', subject: 'A small thought on the client brief',
    snippet: 'I rewrote the first section after our call. It now gets to the decision before the process.', time: 'Yesterday', date: 'Jul 13, 2026, 4:18 PM', unread: false, star: true, category: 'primary', labels: ['inbox', 'important'], attachments: [],
    messages: [{ name: 'Maya Laurent', email: 'maya@northstar.studio', initials: 'ML', color: 'coral', time: 'Yesterday, 4:18 PM', body: 'I rewrote the first section after our call. It now gets to the decision before the process, which makes the whole brief feel more confident.\n\nThere are three highlighted questions near the end. Nothing is blocked, but your instincts on the case study order would help.' }]
  },
  {
    id: 'm-air', sender: 'Air France', email: 'trips@airfrance.com', initials: 'AF', color: 'blue', subject: 'Your trip to Paris is ready',
    snippet: 'Your boarding pass and trip details are available for your flight tomorrow morning.', time: 'Yesterday', date: 'Jul 13, 2026, 1:28 PM', unread: false, star: false, category: 'promotions', labels: ['inbox', 'travel'], attachments: ['Boarding-pass.pdf'],
    messages: [{ name: 'Air France', email: 'trips@airfrance.com', initials: 'AF', color: 'blue', time: 'Yesterday, 1:28 PM', body: 'Your trip is ready.\n\nKyiv to Paris\nWednesday, July 15 · 8:20 AM\n\nYour boarding pass is attached. Please arrive at the airport at least two hours before departure.', attachments: ['Boarding-pass.pdf'] }]
  },
  {
    id: 'm-notion', sender: 'Notion', email: 'team@notion.so', initials: 'NO', color: 'ink', subject: 'Weekly workspace digest',
    snippet: '12 updates in Product, 4 pages mentioned you, and a handful of decisions worth catching up on.', time: 'Jul 12', date: 'Jul 12, 2026, 8:02 AM', unread: false, star: false, category: 'updates', labels: ['inbox'], attachments: [],
    messages: [{ name: 'Notion', email: 'team@notion.so', initials: 'NO', color: 'ink', time: 'Jul 12, 8:02 AM', body: 'Here is your weekly workspace digest.\n\n12 updates in Product\n4 pages mentioned you\n2 decisions waiting for a response\n\nOpen your workspace to catch up where it matters.' }]
  },
  {
    id: 'm-leo', sender: 'Leo Martins', email: 'leo@atelierm.co', initials: 'LM', color: 'lime', subject: 'Coffee when you’re back?',
    snippet: 'No agenda, I would simply love to hear what you learned from the last few launches.', time: 'Jul 11', date: 'Jul 11, 2026, 6:11 PM', unread: false, star: false, category: 'primary', labels: ['inbox', 'personal'], attachments: [],
    messages: [{ name: 'Leo Martins', email: 'leo@atelierm.co', initials: 'LM', color: 'lime', time: 'Jul 11, 6:11 PM', body: 'No agenda, I would simply love to hear what you learned from the last few launches.\n\nWhen you are back, shall we find forty minutes for coffee near the studio?' }]
  },
  {
    id: 'm-figma', sender: 'Figma', email: 'notification@figma.com', initials: 'FG', color: 'pink', subject: 'New comments on Gmail clone',
    snippet: 'Sam left 3 comments in the responsive review section.', time: 'Jul 10', date: 'Jul 10, 2026, 2:20 PM', unread: true, star: false, category: 'updates', labels: ['inbox', 'work'], attachments: [],
    messages: [{ name: 'Figma', email: 'notification@figma.com', initials: 'FG', color: 'pink', time: 'Jul 10, 2:20 PM', body: 'Sam left 3 comments on Gmail clone.\n\n“Could the mobile controls use the same action vocabulary as the desktop view?”\n\nOpen the file to reply or resolve the comments.' }]
  },
  {
    id: 'm-stripe', sender: 'Stripe', email: 'receipts@stripe.com', initials: 'ST', color: 'purple', subject: 'Your receipt from Linear',
    snippet: 'Thanks for your payment. Your receipt is attached to this email.', time: 'Jul 8', date: 'Jul 8, 2026, 11:13 AM', unread: false, star: false, category: 'updates', labels: ['inbox', 'receipts'], attachments: ['Receipt-0726.pdf'],
    messages: [{ name: 'Stripe', email: 'receipts@stripe.com', initials: 'ST', color: 'purple', time: 'Jul 8, 11:13 AM', body: 'Thanks for your payment to Linear.\n\nAmount paid: $16.00 USD\nReceipt number: 9AB2-31C2\n\nA copy of your receipt is attached.', attachments: ['Receipt-0726.pdf'] }]
  },
  {
    id: 'm-sent', sender: 'You', email: 'melvyn@example.com', initials: 'ME', color: 'me', subject: 'Re: Proposal, next steps',
    snippet: 'Thanks, I have added a short recommendation to each option and sent the planning link.', time: 'Jul 7', date: 'Jul 7, 2026, 3:05 PM', unread: false, star: false, category: 'primary', labels: ['sent'], attachments: [],
    messages: [{ name: 'You', email: 'melvyn@example.com', initials: 'ME', color: 'me', time: 'Jul 7, 3:05 PM', body: 'Thanks, I have added a short recommendation to each option and sent the planning link.\n\nMy preference is to start with the core workflow and let the reporting layer follow from real usage.' }]
  },
  {
    id: 'm-trash', sender: 'Old newsletter', email: 'hello@oldnewsletter.com', initials: 'ON', color: 'sand', subject: 'A note from last month',
    snippet: 'A collection of links you may have missed.', time: 'Jul 2', date: 'Jul 2, 2026, 7:40 AM', unread: false, star: false, category: 'promotions', labels: ['trash'], attachments: [],
    messages: [{ name: 'Old newsletter', email: 'hello@oldnewsletter.com', initials: 'ON', color: 'sand', time: 'Jul 2, 7:40 AM', body: 'A collection of links you may have missed.' }]
  }
];

const defaultState = {
  messages: seededMessages,
  mailbox: 'inbox',
  tab: 'primary',
  selected: [],
  currentId: null,
  search: '',
  navOpen: false,
  labelMenu: false,
  accountMenu: false,
  compose: { open: false, minimized: false, draftId: null, to: '', subject: '', body: '', attachments: [] },
  undo: null,
  toast: null
};

let state = loadState();
let toastTimer;

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem('terra-mail-state'));
    return stored?.messages ? { ...defaultState, ...stored, selected: [], currentId: null, toast: null, navOpen: false, labelMenu: false, accountMenu: false } : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  const persistable = { ...state, selected: [], currentId: null, navOpen: false, labelMenu: false, accountMenu: false, toast: null };
  localStorage.setItem('terra-mail-state', JSON.stringify(persistable));
}

function setToast(message, action = null) {
  state.toast = { message, action };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.toast = null;
    render();
  }, 4200);
}

function getMessage(id) { return state.messages.find(message => message.id === id); }
function setMessage(id, patch) { Object.assign(getMessage(id), patch); saveState(); }
function selectedMessages() { return state.messages.filter(message => state.selected.includes(message.id)); }
function hasLabel(message, label) { return message.labels.includes(label); }

function mailboxMessages() {
  let messages = state.messages.filter(message => {
    if (state.mailbox === 'starred') return message.star && !hasLabel(message, 'trash');
    if (state.mailbox === 'drafts') return hasLabel(message, 'drafts');
    return hasLabel(message, state.mailbox);
  });
  if (state.mailbox === 'inbox' && state.tab !== 'all') messages = messages.filter(message => message.category === state.tab);
  const needle = state.search.trim().toLowerCase();
  if (needle) messages = state.messages.filter(message => [message.sender, message.email, message.subject, message.snippet, message.labels.join(' '), ...message.messages.map(item => item.body)].join(' ').toLowerCase().includes(needle) && !hasLabel(message, 'trash'));
  return messages;
}

function unreadCount(label) { return state.messages.filter(message => hasLabel(message, label) && message.unread).length; }
function navCount(name) { return name === 'starred' ? state.messages.filter(message => message.star && !hasLabel(message, 'trash')).length : state.messages.filter(message => hasLabel(message, name)).length; }

function avatar(message, small = false) {
  return `<span class="avatar ${message.color || 'ink'} ${small ? 'avatar-small' : ''}" aria-hidden="true">${escapeHtml(message.initials || message.sender.slice(0, 2).toUpperCase())}</span>`;
}

function tooltip(label, action, extra = '') {
  return `<button class="icon-button ${extra}" data-action="${action}" aria-label="${label}" title="${label}">${icon(action)}</button>`;
}

function navItem(name, label, iconName, count = null) {
  const active = state.mailbox === name && !state.search;
  return `<button class="nav-item ${active ? 'active' : ''}" data-action="mailbox" data-mailbox="${name}">${icon(iconName)}<span>${label}</span>${count ? `<b>${count}</b>` : ''}</button>`;
}

function renderSidebar() {
  return `<aside class="sidebar ${state.navOpen ? 'open' : ''}" aria-label="Mailbox navigation">
    <div class="sidebar-top"><button class="compose-button" data-action="compose">${icon('plus')}<span>Compose</span></button></div>
    <nav>
      ${navItem('inbox', 'Inbox', 'inbox', unreadCount('inbox'))}
      ${navItem('starred', 'Starred', 'star')}
      ${navItem('sent', 'Sent', 'send')}
      ${navItem('drafts', 'Drafts', 'draft', navCount('drafts') || null)}
      <button class="nav-item" data-action="label-view" data-label="work">${icon('tag')}<span>Work</span><b>${state.messages.filter(message => hasLabel(message, 'work') && !hasLabel(message, 'trash')).length || ''}</b></button>
      ${navItem('trash', 'Trash', 'trash')}
    </nav>
    <div class="sidebar-labels">
      <p>Labels</p>
      <button class="label-row" data-action="label-view" data-label="important"><span class="label-dot important"></span>Important</button>
      <button class="label-row" data-action="label-view" data-label="personal"><span class="label-dot personal"></span>Personal</button>
      <button class="label-row" data-action="label-view" data-label="receipts"><span class="label-dot receipts"></span>Receipts</button>
    </div>
    <div class="storage"><div class="storage-line"><span>Storage</span><span>6%</span></div><div class="storage-meter"><i></i></div><small>1.1 GB of 20 GB used</small></div>
  </aside>`;
}

function renderTopbar() {
  return `<header class="topbar">
    <div class="brand"><button class="icon-button mobile-menu" data-action="toggle-nav" aria-label="Open navigation">${icon('menu')}</button><div class="mail-mark" aria-hidden="true"><i></i><i></i><i></i></div><h1 class="brand-word">gpt-5.6-terra</h1></div>
    <div class="search-wrap"><label class="search-box"><span>${icon('search')}</span><input id="search-input" value="${escapeHtml(state.search)}" autocomplete="off" placeholder="Search mail" aria-label="Search mail"/><kbd>/</kbd></label><button class="icon-button search-filter" data-action="filter" aria-label="Search options" title="Search options">${icon('tune')}</button></div>
    <div class="top-actions"><button class="icon-button desktop-only" data-action="refresh" aria-label="Refresh" title="Refresh">${icon('refresh')}</button><button class="icon-button desktop-only" data-action="settings" aria-label="Settings" title="Settings">${icon('settings')}</button><button class="icon-button desktop-only" data-action="apps" aria-label="Apps" title="Apps">${icon('grid')}</button><button class="account" data-action="account" aria-haspopup="menu" aria-expanded="${state.accountMenu}"><span>ME</span></button></div>
    ${state.accountMenu ? `<div class="account-menu" role="menu"><div class="account-identity"><span class="avatar me">ME</span><div><strong>Melvyn</strong><small>melvyn@example.com</small></div></div><button data-action="reset">Reset demo mailbox</button><button data-action="close-account">Close account menu</button></div>` : ''}
  </header>`;
}

function mailboxTitle() {
  if (state.search) return `Search results`;
  if (state.mailbox === 'inbox') return 'Inbox';
  return state.mailbox.slice(0, 1).toUpperCase() + state.mailbox.slice(1);
}

function renderToolbar(messages) {
  const hasSelected = state.selected.length > 0;
  return `<div class="toolbar ${hasSelected ? 'has-selection' : ''}">
    <div class="toolbar-leading">
      <label class="check-wrap"><input type="checkbox" data-action="select-all" ${messages.length && state.selected.length === messages.length ? 'checked' : ''} aria-label="Select all mail"/><span></span></label>
      ${hasSelected ? `<strong class="selection-count">${state.selected.length} selected</strong>` : `<button class="icon-button" data-action="refresh" aria-label="Refresh" title="Refresh">${icon('refresh')}</button>`}
      <span class="toolbar-divider"></span>
      ${hasSelected ? `
        <button class="icon-button" data-action="archive-selected" aria-label="Archive" title="Archive">${icon('archive')}</button>
        <button class="icon-button" data-action="trash-selected" aria-label="Delete" title="Delete">${icon('trash')}</button>
        <button class="icon-button" data-action="mark-selected" aria-label="Mark unread" title="Mark unread">${icon('unread')}</button>
        <button class="icon-button" data-action="open-labels" aria-label="Label as" title="Label as">${icon('tag')}</button>
        <button class="icon-button" data-action="snooze-selected" aria-label="Snooze" title="Snooze">${icon('snooze')}</button>` : ''}
    </div>
    <div class="toolbar-trailing"><span>${messages.length ? `1–${messages.length} of ${messages.length}` : '0 messages'}</span><button class="icon-button" data-action="previous" aria-label="Previous page" title="Previous page">${icon('back')}</button><button class="icon-button" data-action="next" aria-label="Next page" title="Next page">${icon('chevron')}</button></div>
    ${state.labelMenu ? `<div class="label-menu"><strong>Label as</strong><button data-action="apply-label" data-label="work"><span class="label-dot work"></span>Work</button><button data-action="apply-label" data-label="important"><span class="label-dot important"></span>Important</button><button data-action="apply-label" data-label="personal"><span class="label-dot personal"></span>Personal</button><button data-action="apply-label" data-label="receipts"><span class="label-dot receipts"></span>Receipts</button></div>` : ''}
  </div>`;
}

function renderTabs() {
  if (state.mailbox !== 'inbox' || state.search) return '';
  const tabs = [['primary', 'Primary', 'inbox'], ['updates', 'Updates', 'tag'], ['promotions', 'Promotions', 'tag']];
  return `<div class="tabs" role="tablist">${tabs.map(([name, label, iconName]) => `<button role="tab" class="tab ${state.tab === name ? 'active' : ''}" aria-selected="${state.tab === name}" data-action="tab" data-tab="${name}">${icon(iconName)}<span>${label}</span>${unreadCount('inbox') && name === 'primary' ? `<b>${state.messages.filter(message => message.category === name && message.unread && hasLabel(message, 'inbox')).length || ''}</b>` : ''}</button>`).join('')}</div>`;
}

function renderLabels(message) {
  const labels = message.labels.filter(label => !['inbox', 'sent', 'drafts', 'trash'].includes(label));
  return labels.slice(0, 2).map(label => `<span class="mail-label ${label}">${escapeHtml(label)}</span>`).join('');
}

function renderMessageRow(message) {
  const selected = state.selected.includes(message.id);
  const draft = hasLabel(message, 'drafts');
  return `<article class="mail-row ${message.unread ? 'unread' : ''} ${selected ? 'selected' : ''} ${draft ? 'draft-row' : ''}" data-message="${message.id}">
    <div class="row-select"><label class="check-wrap"><input type="checkbox" data-action="toggle-select" data-id="${message.id}" ${selected ? 'checked' : ''} aria-label="Select ${escapeHtml(message.subject)}"/><span></span></label></div>
    <button class="row-star ${message.star ? 'starred' : ''}" data-action="star" data-id="${message.id}" aria-label="${message.star ? 'Unstar' : 'Star'} ${escapeHtml(message.subject)}">${icon('star')}</button>
    <button class="sender" data-action="open-message" data-id="${message.id}">${draft ? '<em>Draft</em>' : escapeHtml(message.sender)}</button>
    <button class="mail-summary" data-action="open-message" data-id="${message.id}"><strong>${escapeHtml(message.subject)}</strong><span class="row-labels">${renderLabels(message)}</span><small>— ${escapeHtml(message.snippet)}</small></button>
    ${message.attachments.length ? `<span class="row-attachment" title="${message.attachments.length} attachment${message.attachments.length > 1 ? 's' : ''}">${icon('paperclip')}</span>` : ''}
    <time>${escapeHtml(message.time)}</time>
  </article>`;
}

function renderEmpty() {
  const labels = { inbox: ['You’re all caught up', 'New messages will show here when they arrive.'], starred: ['No starred mail', 'Star messages you want to keep close.'], sent: ['Nothing sent yet', 'Messages you send will appear here.'], drafts: ['No drafts', 'Start a message and your draft will be saved here.'], trash: ['Trash is empty', 'Deleted messages will stay here until you clear them.'] };
  const [heading, body] = labels[state.mailbox] || ['No mail here', 'Try a different mailbox or search.'];
  return `<div class="empty-state">${icon(state.mailbox === 'drafts' ? 'draft' : 'inbox')}<h2>${heading}</h2><p>${body}</p>${state.mailbox === 'drafts' ? '<button class="text-button" data-action="compose">Compose a message</button>' : ''}</div>`;
}

function renderList() {
  const messages = mailboxMessages();
  return `<section class="mail-list-view" aria-label="${mailboxTitle()}">
    <div class="view-heading"><div><p>${state.search ? `Results for “${escapeHtml(state.search)}”` : 'Mailbox'}</p><h2>${mailboxTitle()}</h2></div><button class="mobile-compose" data-action="compose" aria-label="Compose">${icon('plus')}</button></div>
    ${renderToolbar(messages)}
    ${renderTabs()}
    <div class="mail-list">${messages.length ? messages.map(renderMessageRow).join('') : renderEmpty()}</div>
  </section>`;
}

function attachment(name) {
  const suffix = name.split('.').pop().toUpperCase();
  return `<button class="attachment" data-action="download-attachment" data-file="${escapeHtml(name)}">${icon('paperclip')}<span><strong>${escapeHtml(name)}</strong><small>${suffix} attachment</small></span><span class="attachment-type">${suffix}</span></button>`;
}

function renderMessageBubble(item, index, total) {
  const expanded = index === total - 1 || total < 3;
  return `<article class="conversation-message ${expanded ? 'expanded' : 'collapsed'}" data-conversation-index="${index}">
    <button class="message-header" data-action="toggle-conversation" data-index="${index}">${avatar(item, true)}<span class="message-person"><strong>${escapeHtml(item.name)}</strong><small>to ${item.name === 'You' ? 'Nina Campos' : 'me'}</small></span><time>${escapeHtml(item.time)}</time>${icon('more')}</button>
    <div class="message-content"><div class="message-copy">${escapeHtml(item.body).replace(/\n/g, '<br>')}</div>${item.attachments?.length ? `<div class="attachments">${item.attachments.map(attachment).join('')}</div>` : ''}${index === total - 1 && item.name !== 'You' ? `<div class="reply-actions"><button class="reply-button" data-action="reply">${icon('reply')}Reply</button><button class="reply-button" data-action="forward">${icon('forward')}Forward</button></div>` : ''}</div>
  </article>`;
}

function renderThread() {
  const message = getMessage(state.currentId);
  if (!message) return renderList();
  const threadCount = message.messages.length;
  return `<section class="thread-view" aria-label="Message thread">
    <div class="thread-toolbar"><div class="thread-controls"><button class="icon-button" data-action="back" aria-label="Back to ${mailboxTitle()}" title="Back">${icon('back')}</button><span class="toolbar-divider"></span><button class="icon-button" data-action="archive-current" aria-label="Archive" title="Archive">${icon('archive')}</button><button class="icon-button" data-action="trash-current" aria-label="Delete" title="Delete">${icon('trash')}</button><button class="icon-button" data-action="snooze-current" aria-label="Snooze" title="Snooze">${icon('snooze')}</button><button class="icon-button" data-action="mark-current" aria-label="${message.unread ? 'Mark as read' : 'Mark as unread'}" title="Mark as unread">${icon(message.unread ? 'read' : 'unread')}</button><button class="icon-button" data-action="open-labels" aria-label="Label as" title="Label as">${icon('tag')}</button><button class="icon-button desktop-only" data-action="print" aria-label="Print" title="Print">${icon('print')}</button></div><div class="thread-controls"><button class="icon-button desktop-only" data-action="previous" aria-label="Previous message">${icon('back')}</button><button class="icon-button desktop-only" data-action="next" aria-label="Next message">${icon('chevron')}</button></div>${state.labelMenu ? `<div class="label-menu thread-label-menu"><strong>Label as</strong><button data-action="apply-label" data-label="work"><span class="label-dot work"></span>Work</button><button data-action="apply-label" data-label="important"><span class="label-dot important"></span>Important</button><button data-action="apply-label" data-label="personal"><span class="label-dot personal"></span>Personal</button></div>` : ''}</div>
    <div class="thread-content"><div class="subject-line"><h2>${escapeHtml(message.subject)}</h2>${renderLabels(message)}<button class="thread-star ${message.star ? 'starred' : ''}" data-action="star" data-id="${message.id}" aria-label="Star message">${icon('star')}</button></div><div class="conversation">${message.messages.map((item, index) => renderMessageBubble(item, index, threadCount)).join('')}</div></div>
  </section>`;
}

function renderComposer() {
  const compose = state.compose;
  if (!compose.open) return '';
  if (compose.minimized) return `<button class="minimized-compose" data-action="restore-compose"><span class="compose-dot"></span><strong>${compose.subject || 'New message'}</strong><span>${icon('expand')}</span></button>`;
  const showSuggestions = compose.to && !compose.to.includes('@');
  return `<section class="composer" aria-label="New message"><header class="composer-header"><strong>${compose.draftId ? 'Draft' : 'New message'}</strong><div><button class="icon-button composer-top-button" data-action="minimize-compose" aria-label="Minimize compose">${icon('minimize')}</button><button class="icon-button composer-top-button" data-action="close-compose" aria-label="Close compose">${icon('close')}</button></div></header><div class="compose-fields"><label><span>To</span><input id="compose-to" data-compose-field="to" value="${escapeHtml(compose.to)}" autocomplete="off" placeholder="Recipients"/></label>${showSuggestions ? `<div class="recipient-suggestions"><button data-action="suggest-recipient" data-email="nina@auroralabs.co">${avatar({ initials: 'NC', color: 'violet' }, true)}<span><strong>Nina Campos</strong><small>nina@auroralabs.co</small></span></button><button data-action="suggest-recipient" data-email="maya@northstar.studio">${avatar({ initials: 'ML', color: 'coral' }, true)}<span><strong>Maya Laurent</strong><small>maya@northstar.studio</small></span></button></div>` : ''}<label><span>Subject</span><input data-compose-field="subject" value="${escapeHtml(compose.subject)}" placeholder="Subject"/></label></div><textarea data-compose-field="body" placeholder="Write your message…">${escapeHtml(compose.body)}</textarea>${(compose.attachments || []).length ? `<div class="compose-attachments">${compose.attachments.map((file, index) => `<button data-action="remove-attachment" data-index="${index}">${icon('paperclip')} ${escapeHtml(file)} <span>×</span></button>`).join('')}</div>` : ''}<footer class="compose-footer"><button class="send-button" data-action="send">Send ${icon('send')}</button><div><button class="icon-button" data-action="attach" aria-label="Attach files" title="Attach files">${icon('paperclip')}</button><button class="icon-button" data-action="insert-link" aria-label="Insert link" title="Insert link">${icon('link')}</button><button class="icon-button" data-action="emoji" aria-label="Insert emoji" title="Insert emoji">${icon('smile')}</button><button class="icon-button" data-action="discard-compose" aria-label="Discard draft" title="Discard draft">${icon('trash')}</button></div></footer></section>`;
}

function renderToast() {
  if (!state.toast) return '';
  return `<div class="toast" role="status"><span>${escapeHtml(state.toast.message)}</span>${state.toast.action ? `<button data-action="${state.toast.action}">Undo</button>` : '<button data-action="dismiss-toast" aria-label="Dismiss">×</button>'}</div>`;
}

function render() {
  const app = $('#app');
  app.innerHTML = `<div class="mail-app">${renderTopbar()}<div class="shell">${renderSidebar()}<div class="mobile-scrim ${state.navOpen ? 'visible' : ''}" data-action="close-nav"></div><section class="workspace">${state.currentId ? renderThread() : renderList()}</section></div>${renderComposer()}${renderToast()}</div>`;
  const searchInput = $('#search-input');
  if (searchInput && document.activeElement?.id === 'search-input') searchInput.focus();
}

function setMailbox(mailbox) {
  state.mailbox = mailbox; state.search = ''; state.selected = []; state.currentId = null; state.navOpen = false; state.labelMenu = false; saveState(); render();
}

function toggleSelection(id) {
  state.selected = state.selected.includes(id) ? state.selected.filter(item => item !== id) : [...state.selected, id]; render();
}

function openMessage(id) {
  const message = getMessage(id);
  if (hasLabel(message, 'drafts')) return openDraft(message);
  message.unread = false; state.currentId = id; state.selected = []; saveState(); render();
}

function openDraft(message) {
  state.compose = { open: true, minimized: false, draftId: message.id, to: message.to || '', subject: message.subject || '', body: message.body || message.messages?.[0]?.body || '', attachments: message.attachments || [] };
  state.currentId = null; render(); setTimeout(() => $('#compose-to')?.focus(), 0);
}

function activeTarget() { return state.currentId ? [getMessage(state.currentId)] : selectedMessages(); }
function removeInbox(message) { message.labels = message.labels.filter(label => label !== 'inbox'); }
function addLabel(message, label) { if (!message.labels.includes(label)) message.labels.push(label); }

function archive(targets = activeTarget()) {
  state.undo = { kind: 'archive', ids: targets.map(message => message.id) }; targets.forEach(removeInbox); state.selected = []; state.currentId = null; state.labelMenu = false; saveState(); setToast(`${targets.length === 1 ? 'Conversation' : `${targets.length} conversations`} archived`, 'undo-archive'); render();
}
function trash(targets = activeTarget()) {
  state.undo = { kind: 'trash', ids: targets.map(message => message.id) }; targets.forEach(message => { message.labels = message.labels.filter(label => label !== 'inbox'); addLabel(message, 'trash'); }); state.selected = []; state.currentId = null; state.labelMenu = false; saveState(); setToast(`${targets.length === 1 ? 'Conversation' : `${targets.length} conversations`} moved to Trash`, 'undo-trash'); render();
}
function mark(targets = activeTarget()) {
  const makeUnread = targets.some(message => !message.unread); targets.forEach(message => message.unread = makeUnread); state.selected = []; saveState(); setToast(makeUnread ? 'Marked as unread' : 'Marked as read'); render();
}
function snooze(targets = activeTarget()) { state.undo = { kind: 'snooze', ids: targets.map(message => message.id) }; targets.forEach(message => { removeInbox(message); addLabel(message, 'snoozed'); }); state.selected = []; state.currentId = null; saveState(); setToast(`Snoozed until tomorrow, 8:00 AM`, 'undo-snooze'); render(); }
function undoLabel(label) { const ids = state.undo?.ids || []; state.messages.filter(message => ids.includes(message.id)).forEach(message => { if (label === 'undo-trash') message.labels = message.labels.filter(item => item !== 'trash'); if (label === 'undo-archive' || label === 'undo-snooze') addLabel(message, 'inbox'); if (label === 'undo-snooze') message.labels = message.labels.filter(item => item !== 'snoozed'); }); state.undo = null; saveState(); setToast('Action undone'); render(); }

function persistDraft() {
  const compose = state.compose;
  if (!compose.open || !(compose.to || compose.subject || compose.body)) return;
  let draft = compose.draftId ? getMessage(compose.draftId) : null;
  if (!draft) {
    draft = { id: `draft-${Date.now()}`, sender: 'You', email: 'melvyn@example.com', initials: 'ME', color: 'me', subject: '', snippet: '', time: 'Draft', date: 'Just now', unread: false, star: false, category: 'primary', labels: ['drafts'], attachments: [], messages: [] };
    state.messages.unshift(draft); compose.draftId = draft.id;
  }
  Object.assign(draft, { to: compose.to, subject: compose.subject || '(No subject)', snippet: compose.body.replace(/\n/g, ' ').slice(0, 92), body: compose.body, attachments: compose.attachments || [], time: 'Draft', messages: [{ name: 'You', email: 'melvyn@example.com', initials: 'ME', color: 'me', time: 'Draft', body: compose.body, attachments: compose.attachments || [] }] });
  saveState();
}

function closeComposer(showToast = true) { persistDraft(); const saved = state.compose.draftId; state.compose = { open: false, minimized: false, draftId: null, to: '', subject: '', body: '', attachments: [] }; if (showToast && saved) setToast('Draft saved'); render(); }
function newComposer(extra = {}) { state.compose = { open: true, minimized: false, draftId: null, to: '', subject: '', body: '', attachments: [], ...extra }; render(); setTimeout(() => $('#compose-to')?.focus(), 0); }

function sendComposer() {
  const compose = state.compose;
  if (!compose.to.trim()) { setToast('Add at least one recipient before sending'); render(); $('#compose-to')?.focus(); return; }
  const record = { id: compose.draftId || `sent-${Date.now()}`, sender: 'You', email: 'melvyn@example.com', initials: 'ME', color: 'me', subject: compose.subject || '(No subject)', snippet: compose.body.replace(/\n/g, ' ').slice(0, 92) || '(No message)', time: 'Now', date: 'Just now', unread: false, star: false, category: 'primary', labels: ['sent'], attachments: compose.attachments || [], to: compose.to, messages: [{ name: 'You', email: 'melvyn@example.com', initials: 'ME', color: 'me', time: 'Just now', body: compose.body || '(No message)', attachments: compose.attachments || [] }] };
  const existingIndex = state.messages.findIndex(message => message.id === record.id);
  if (existingIndex >= 0) state.messages.splice(existingIndex, 1, record); else state.messages.unshift(record);
  state.compose = { open: false, minimized: false, draftId: null, to: '', subject: '', body: '', attachments: [] }; saveState(); setToast('Message sent'); render();
}

function toggleConversation(index) {
  const item = $(`[data-conversation-index="${index}"]`);
  if (item) item.classList.toggle('collapsed');
}

function handleAction(action, element) {
  switch (action) {
    case 'toggle-nav': state.navOpen = !state.navOpen; render(); break;
    case 'close-nav': state.navOpen = false; render(); break;
    case 'mailbox': setMailbox(element.dataset.mailbox); break;
    case 'label-view': state.mailbox = element.dataset.label; state.search = ''; state.currentId = null; state.selected = []; state.navOpen = false; render(); break;
    case 'compose': newComposer(); break;
    case 'open-message': openMessage(element.dataset.id); break;
    case 'back': state.currentId = null; state.labelMenu = false; render(); break;
    case 'star': { const message = getMessage(element.dataset.id); message.star = !message.star; saveState(); render(); break; }
    case 'toggle-select': toggleSelection(element.dataset.id); break;
    case 'select-all': { const messages = mailboxMessages(); state.selected = element.checked ? messages.map(message => message.id) : []; render(); break; }
    case 'archive-selected': archive(); break;
    case 'trash-selected': trash(); break;
    case 'mark-selected': mark(); break;
    case 'snooze-selected': snooze(); break;
    case 'archive-current': archive(); break;
    case 'trash-current': trash(); break;
    case 'mark-current': mark(); break;
    case 'snooze-current': snooze(); break;
    case 'open-labels': state.labelMenu = !state.labelMenu; render(); break;
    case 'apply-label': { const targets = activeTarget(); targets.forEach(message => addLabel(message, element.dataset.label)); state.labelMenu = false; saveState(); setToast(`Label “${element.dataset.label}” added`); render(); break; }
    case 'tab': state.tab = element.dataset.tab; state.selected = []; render(); break;
    case 'refresh': setToast('Mailbox is up to date'); render(); break;
    case 'previous': setToast('You’re viewing the latest messages'); render(); break;
    case 'next': setToast('You’re viewing the latest messages'); render(); break;
    case 'account': state.accountMenu = !state.accountMenu; render(); break;
    case 'close-account': state.accountMenu = false; render(); break;
    case 'reset': localStorage.removeItem('terra-mail-state'); state = structuredClone(defaultState); setToast('Demo mailbox reset'); render(); break;
    case 'filter': setToast('Search supports sender, subject, content, and labels'); render(); break;
    case 'settings': setToast('Settings are saved locally in this demo'); render(); break;
    case 'apps': setToast('Your apps are within reach'); render(); break;
    case 'reply': { const message = getMessage(state.currentId); newComposer({ to: message.email, subject: `Re: ${message.subject}`, body: '\n\n' }); break; }
    case 'forward': { const message = getMessage(state.currentId); newComposer({ subject: `Fwd: ${message.subject}`, body: `\n\n---------- Forwarded message ----------\nFrom: ${message.sender} <${message.email}>\n\n${message.messages.at(-1).body}` }); break; }
    case 'toggle-conversation': toggleConversation(element.dataset.index); break;
    case 'print': window.print(); break;
    case 'download-attachment': setToast(`${element.dataset.file} is ready to download`); render(); break;
    case 'minimize-compose': persistDraft(); state.compose.minimized = true; render(); break;
    case 'restore-compose': state.compose.minimized = false; render(); break;
    case 'close-compose': closeComposer(); break;
    case 'discard-compose': { if (state.compose.draftId) state.messages = state.messages.filter(message => message.id !== state.compose.draftId); state.compose = { open: false, minimized: false, draftId: null, to: '', subject: '', body: '', attachments: [] }; saveState(); setToast('Draft discarded'); render(); break; }
    case 'send': sendComposer(); break;
    case 'suggest-recipient': state.compose.to = element.dataset.email; persistDraft(); render(); break;
    case 'attach': state.compose.attachments = [...(state.compose.attachments || []), `Reference-${(state.compose.attachments?.length || 0) + 1}.txt`]; persistDraft(); setToast('Attachment added to draft'); render(); break;
    case 'remove-attachment': state.compose.attachments.splice(Number(element.dataset.index), 1); persistDraft(); render(); break;
    case 'insert-link': state.compose.body += `${state.compose.body ? '\n' : ''}https://`; persistDraft(); render(); break;
    case 'emoji': state.compose.body += ' ✦'; persistDraft(); render(); break;
    case 'dismiss-toast': state.toast = null; render(); break;
    case 'undo-archive': case 'undo-trash': case 'undo-snooze': undoLabel(action); break;
  }
}

document.addEventListener('click', event => {
  const actionElement = event.target.closest('[data-action]');
  if (actionElement) { event.preventDefault(); handleAction(actionElement.dataset.action, actionElement); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'search-input') { state.search = event.target.value; state.currentId = null; state.selected = []; render(); }
  const field = event.target.dataset.composeField;
  if (field) { state.compose[field] = event.target.value; persistDraft(); }
});

document.addEventListener('keydown', event => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (event.key === '/' && !typing) { event.preventDefault(); $('#search-input')?.focus(); }
  if (event.key.toLowerCase() === 'c' && !typing) { event.preventDefault(); newComposer(); }
  if (event.key === 'Escape') {
    if (state.navOpen) { state.navOpen = false; render(); }
    else if (state.labelMenu || state.accountMenu) { state.labelMenu = false; state.accountMenu = false; render(); }
    else if (state.currentId) { state.currentId = null; render(); }
  }
});

render();
