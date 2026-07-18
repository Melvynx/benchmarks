const MODEL_NAME = 'GPT-5.6 Luna';
const STORAGE_KEY = 'gpt-5-6-luna-mailbox-v1';

const me = { name: 'Alex Morgan', email: 'alex.morgan@luna.local', initials: 'AM', color: '#4667ec' };

const iconPaths = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.3 4.3"/>',
  sliders: '<path d="M4 6h16M7 12h13M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="14" cy="18" r="2" fill="currentColor" stroke="none"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inbox: '<path d="M4 5.5h16v13H4z"/><path d="M4 14h4l1.7 2h4.6l1.7-2h4"/>',
  star: '<path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z"/>',
  send: '<path d="m21 3-7.4 18-3.9-7.7L2 9.4zM21 3 9.7 13.3"/>',
  draft: '<path d="M4 5.5h16v13H4z"/><path d="m7 9 5 3 5-3"/>',
  trash: '<path d="M4 7h16M10 11v4M14 11v4M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  archive: '<path d="M4 7h16v13H4zM3 4h18v3H3zM9 12h6"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 5v4h4M4 13a8 8 0 0 0 14 4l2-2M20 19v-4h-4"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  back: '<path d="m15 5-7 7 7 7M8 12h13"/>',
  reply: '<path d="m9 17-6-5 6-5v3c6 0 9 2 11 7-3-2-6-3-11-3z"/>',
  forward: '<path d="m15 17 6-5-6-5v3c-6 0-9 2-11 7 3-2 6-3 11-3z"/>',
  tag: '<path d="M4 5v6l9 9 7-7-9-9z"/><circle cx="9" cy="9" r="1"/>',
  mail: '<path d="M3.5 6.5h17v12h-17z"/><path d="m4 7 8 6 8-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  paperclip: '<path d="m20 11.5-8.6 8.6a5 5 0 0 1-7.1-7.1l8.8-8.8a3.3 3.3 0 0 1 4.7 4.7l-8.8 8.8a1.7 1.7 0 0 1-2.4-2.4l8.1-8.1"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 4-4 3 3 2-2 5 4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/>',
  smile: '<circle cx="12" cy="12" r="8"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 10h.01M15 10h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  minimize: '<path d="M5 12h14"/>',
  expand: '<path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/>',
  sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-.9.9-2 1.2-2 2.7M12 17h.01"/>',
  keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h8M16 14h2"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.4 1.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L9 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H7.7v-2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L9 9l1.4-1.4.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L20 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2h-.2a1.7 1.7 0 0 0-1.7 1z"/>',
};

function icon(name, className = 'svg-icon') {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.more}</svg>`;
}

const seedMessages = [
  { id: 'm-101', threadId: 't-101', folder: 'inbox', category: 'primary', from: { name: 'Maya Chen', email: 'maya@northstar.studio', initials: 'MC', color: '#6d7fe9' }, to: me.email, subject: 'Next week’s product offsite', preview: 'I pulled together a tighter agenda and a few small details for Lisbon.', body: '<p>Hey Alex,</p><p>I pulled together a tighter agenda and a few small details for Lisbon. The venue confirmed the rooftop room, so we can use the first hour for the roadmap review and keep the afternoon for the working session.</p><p>Could you take a quick pass before Thursday?</p><p>Thanks,<br /><strong>Maya</strong></p>', time: '10:42 AM', date: 'Jul 14, 2026, 10:42 AM', unread: false, starred: true, labels: ['Work', 'Travel'], attachments: [{ name: 'Lisbon-offsite-agenda.pdf', size: '1.2 MB', type: 'pdf' }] },
  { id: 'm-102', threadId: 't-101', folder: 'inbox', category: 'primary', from: { name: 'Maya Chen', email: 'maya@northstar.studio', initials: 'MC', color: '#6d7fe9' }, to: me.email, subject: 'Re: Next week’s product offsite', preview: 'Here’s a first pass at how we could structure the two days.', body: '<p>Here’s a first pass at how we could structure the two days. I’ll add the final dinner details once the restaurant confirms.</p><p class="quote">Here are the three outcomes we need from the session...</p>', time: 'Jul 13', date: 'Jul 13, 2026, 4:10 PM', unread: false, starred: false, labels: ['Work'], attachments: [] },
  { id: 'm-201', threadId: 't-201', folder: 'inbox', category: 'primary', from: { name: 'Noah Williams', email: 'noah@fieldnotes.co', initials: 'NW', color: '#43a78a' }, to: me.email, subject: 'You’re invited: studio community roundtable', preview: 'A small conversation about making calm tools for creative teams.', body: '<p>Hi Alex,</p><p>We’re hosting a small conversation about making calm tools for creative teams, and I’d love to have you join us.</p><p>It’s next Wednesday at 18:30, with a handful of product folks from around the city. No slides, just good questions and a little wine.</p><p>Would you like me to save you a seat?</p><p>— Noah</p>', time: '9:18 AM', date: 'Jul 14, 2026, 9:18 AM', unread: true, starred: false, labels: ['Personal'], attachments: [] },
  { id: 'm-301', threadId: 't-301', folder: 'inbox', category: 'updates', from: { name: 'Stripe', email: 'receipts@stripe.com', initials: 'ST', color: '#7566d8' }, to: me.email, subject: 'Your June invoice is ready', preview: 'Your invoice for Luna Studio is now available to view.', body: '<p>Your June invoice for Luna Studio is now available to view.</p><p><strong>Total:</strong> €128.00<br /><strong>Due:</strong> Jul 20, 2026</p><p>View your invoice securely from your billing dashboard.</p>', time: '8:04 AM', date: 'Jul 14, 2026, 8:04 AM', unread: true, starred: false, labels: ['Finance'], attachments: [{ name: 'invoice-june-2026.pdf', size: '244 KB', type: 'pdf' }] },
  { id: 'm-401', threadId: 't-401', folder: 'inbox', category: 'promotions', from: { name: 'The Signal', email: 'hello@thesignal.news', initials: 'TS', color: '#e18a55' }, to: me.email, subject: 'The new issue of Signal / Summer reading list', preview: 'Seven links for a slower, smarter week on the internet.', body: '<p>Seven links for a slower, smarter week on the internet.</p><p>In this issue: the case for boring software, a field guide to independent magazines, and what we keep when we stop optimizing everything.</p><p>See you next Sunday,<br />The Signal team</p>', time: 'Jul 13', date: 'Jul 13, 2026, 7:24 AM', unread: false, starred: false, labels: [], attachments: [] },
  { id: 'm-501', threadId: 't-501', folder: 'inbox', category: 'primary', from: { name: 'Eli Turner', email: 'eli@turner.house', initials: 'ET', color: '#cc7392' }, to: me.email, subject: 'A small favor for Saturday?', preview: 'Could you bring the little projector when you come over?', body: '<p>Hey,</p><p>Could you bring the little projector when you come over on Saturday? I want to test the new wall before everyone arrives.</p><p>And don’t forget the good coffee.</p><p>– Eli</p>', time: 'Jul 12', date: 'Jul 12, 2026, 3:51 PM', unread: true, starred: true, labels: ['Personal'], attachments: [] },
  { id: 'm-601', threadId: 't-601', folder: 'inbox', category: 'primary', from: { name: 'Ava Patel', email: 'ava@northstar.studio', initials: 'AP', color: '#4f9ca9' }, to: me.email, subject: 'Q2 planning / notes & follow-ups', preview: 'A few notes from today’s planning session are below.', body: '<p>Hi team,</p><p>A few notes from today’s planning session are below. I captured the decisions and linked the open questions for next week.</p><ul><li>Prioritize the onboarding refresh</li><li>Keep the current pricing page through August</li><li>Review the mobile handoff with design on Friday</li></ul><p>Thanks,<br />Ava</p>', time: 'Jul 11', date: 'Jul 11, 2026, 11:20 AM', unread: false, starred: false, labels: ['Work'], attachments: [{ name: 'Q2-planning-notes.docx', size: '88 KB', type: 'doc' }] },
  { id: 'm-701', threadId: 't-701', folder: 'inbox', category: 'updates', from: { name: 'Aeromail', email: 'trips@aeromail.com', initials: 'AM', color: '#4a98c6' }, to: me.email, subject: 'Flight change confirmation · BCN → LIS', preview: 'Your itinerary has been updated. Departure is now 08:15.', body: '<p>Your itinerary has been updated.</p><p><strong>Departure:</strong> Barcelona (BCN) → Lisbon (LIS)<br /><strong>Date:</strong> Tue, Jul 21<br /><strong>New departure:</strong> 08:15</p><p>We’re sorry for the change. Your seat and baggage selections remain the same.</p>', time: 'Jul 10', date: 'Jul 10, 2026, 9:02 AM', unread: false, starred: false, labels: ['Travel'], attachments: [{ name: 'itinerary-bcn-lis.pdf', size: '310 KB', type: 'pdf' }] },
  { id: 'm-801', threadId: 't-801', folder: 'sent', category: 'primary', from: me, to: 'ava@northstar.studio', subject: 'Re: Project Atlas kickoff', preview: 'The proposed milestones look good from my side.', body: '<p>Hi Ava,</p><p>The proposed milestones look good from my side. I added two notes to the handoff doc, but otherwise we’re ready to move.</p><p>Thanks,<br />Alex</p>', time: 'Jul 9', date: 'Jul 9, 2026, 2:36 PM', unread: false, starred: false, labels: ['Work'], attachments: [] },
  { id: 'm-901', threadId: 't-901', folder: 'sent', category: 'primary', from: me, to: 'noah@fieldnotes.co', subject: 'Coffee next week', preview: 'Wednesday morning works beautifully for me.', body: '<p>Wednesday morning works beautifully for me. I’ll bring the first cut of the notes.</p><p>Alex</p>', time: 'Jul 8', date: 'Jul 8, 2026, 9:12 AM', unread: false, starred: false, labels: ['Personal'], attachments: [] },
  { id: 'm-1001', threadId: 't-1001', folder: 'drafts', category: 'primary', from: me, to: '', subject: 'Re: Design handoff', preview: 'I made a few notes on the latest pass…', body: '<p>One thing I noticed in the latest pass is the spacing around the empty state. It might be worth testing</p>', time: 'Jul 7', date: 'Jul 7, 2026, 5:48 PM', unread: false, starred: false, labels: [], attachments: [] },
  { id: 'm-1002', threadId: 't-1002', folder: 'drafts', category: 'primary', from: me, to: '', subject: '', preview: 'No recipients · No subject', body: '', time: 'Jul 4', date: 'Jul 4, 2026, 10:03 AM', unread: false, starred: false, labels: [], attachments: [] },
  { id: 'm-1101', threadId: 't-1101', folder: 'trash', category: 'promotions', from: { name: 'Weekend Market', email: 'hello@weekendmarket.example', initials: 'WM', color: '#bb8356' }, to: me.email, subject: 'Last chance: summer tableware', preview: 'Your saved items are still waiting for you.', body: '<p>Your saved items are still waiting for you. Take 15% off this weekend only.</p>', time: 'Jul 2', date: 'Jul 2, 2026, 8:03 AM', unread: false, starred: false, labels: [], attachments: [] },
];

const state = {
  messages: loadMessages(),
  folder: 'inbox',
  category: 'primary',
  search: '',
  selected: new Set(),
  threadId: null,
  compose: null,
  accountMenu: false,
  labelMenu: false,
  sidebarOpen: true,
};

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* use seed */ }
  return structuredClone(seedMessages);
}

function saveMessages() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function initialsFor(name) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function allThreadMessages(threadId) {
  return state.messages.filter((message) => message.threadId === threadId).sort((a, b) => a.id.localeCompare(b.id));
}

function latestMessage(threadId) {
  return allThreadMessages(threadId).at(-1);
}

function uniqueThreads(messages) {
  const seen = new Set();
  return messages
    .sort((a, b) => b.id.localeCompare(a.id))
    .filter((message) => {
      if (seen.has(message.threadId)) return false;
      seen.add(message.threadId);
      return true;
    });
}

function folderMatches(message) {
  if (state.folder === 'starred') return message.starred && message.folder !== 'trash';
  if (state.folder === 'label:Work') return message.labels?.includes('Work') && message.folder !== 'trash';
  if (state.folder === 'label:Personal') return message.labels?.includes('Personal') && message.folder !== 'trash';
  if (state.folder === 'label:Travel') return message.labels?.includes('Travel') && message.folder !== 'trash';
  if (state.folder === 'label:Finance') return message.labels?.includes('Finance') && message.folder !== 'trash';
  return message.folder === state.folder;
}

function visibleThreads() {
  const query = state.search.trim().toLowerCase();
  let matches = state.messages.filter(folderMatches);
  if (state.folder === 'inbox' && state.category !== 'all') matches = matches.filter((message) => message.category === state.category);
  if (query) {
    matches = matches.filter((message) => [message.from?.name, message.from?.email, message.to, message.subject, message.preview, message.body, ...(message.labels || [])].join(' ').toLowerCase().includes(query));
  }
  return uniqueThreads(matches);
}

function folderLabel(folder) {
  return ({ inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts', trash: 'Trash', 'label:Work': 'Work', 'label:Personal': 'Personal', 'label:Travel': 'Travel', 'label:Finance': 'Finance' }[folder] || 'Inbox');
}

function folderIcon(folder) {
  return ({ inbox: 'inbox', starred: 'star', sent: 'send', drafts: 'draft', trash: 'trash', 'label:Work': 'tag', 'label:Personal': 'tag', 'label:Travel': 'tag', 'label:Finance': 'tag' }[folder] || 'inbox');
}

function countFolder(folder) {
  if (folder === 'starred') return state.messages.filter((message) => message.starred && message.folder !== 'trash').length;
  if (folder === 'inbox') return state.messages.filter((message) => message.folder === 'inbox' && message.unread).length;
  return state.messages.filter((message) => message.folder === folder).length;
}

function countLabel(label) {
  return state.messages.filter((message) => message.labels?.includes(label) && message.folder !== 'trash').length;
}

function avatar(person, extraClass = '') {
  const safe = person || { initials: '?', color: '#8d99af' };
  return `<span class="sender-avatar ${extraClass}" style="background:${safe.color || '#8d99af'}">${escapeHtml(safe.initials || initialsFor(safe.name || '?'))}</span>`;
}

function labelPill(label) {
  return `<span class="mini-label ${label.toLowerCase()}">${escapeHtml(label)}</span>`;
}

function navItem(folder, label, iconName, count = '', active = false, dotClass = '') {
  return `<button class="nav-item ${active ? 'active' : ''}" data-action="navigate" data-folder="${folder}" aria-label="${label}">${icon(iconName)}<span class="nav-item-label">${label}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
}

function renderShell(content) {
  return `<div class="app-frame">
    <header class="topbar">
      <div class="brand-block">
        <button class="icon-button compact mobile-only" data-action="toggle-sidebar" aria-label="Toggle navigation">${icon('menu')}</button>
        <div class="brand-mark">${icon('mail')}</div>
        <div><div class="brand-title">${MODEL_NAME}</div><div class="brand-subtitle">A quieter way to work</div></div>
      </div>
      <div class="search-wrap">
        ${icon('search')}
        <input class="search-input" id="search-input" type="search" value="${escapeHtml(state.search)}" placeholder="Search mail" aria-label="Search mail" autocomplete="off" />
        ${state.search ? `<button class="icon-button compact search-clear" data-action="clear-search" aria-label="Clear search">${icon('close')}</button>` : ''}
        <button class="icon-button compact search-filter" data-action="show-search-help" aria-label="Search options">${icon('sliders')}</button>
      </div>
      <div class="top-actions">
        <button class="icon-button optional-action" data-action="show-toast" data-toast="All caught up for now" aria-label="Help">${icon('help')}</button>
        <button class="icon-button optional-action" data-action="show-toast" data-toast="Keyboard shortcuts: j / k to browse, c to compose" aria-label="Keyboard shortcuts">${icon('keyboard')}</button>
        <button class="icon-button hide-small" data-action="toggle-theme" aria-label="Toggle theme">${icon('sun')}</button>
        <button class="account-button" data-action="toggle-account" aria-label="Open account menu">AM</button>
      </div>
    </header>
    <div class="body-layout">
      <aside class="sidebar ${state.sidebarOpen ? '' : 'collapsed'}">
        <button class="compose-button" data-action="open-compose">${icon('plus')}<span>Compose</span></button>
        <nav class="nav-section" aria-label="Mailbox">
          <div class="nav-section-label">Mailbox</div>
          ${navItem('inbox', 'Inbox', 'inbox', countFolder('inbox') || '', state.folder === 'inbox')}
          ${navItem('starred', 'Starred', 'star', countFolder('starred') || '', state.folder === 'starred')}
          ${navItem('sent', 'Sent', 'send', '', state.folder === 'sent')}
          ${navItem('drafts', 'Drafts', 'draft', countFolder('drafts') || '', state.folder === 'drafts')}
          ${navItem('trash', 'Trash', 'trash', '', state.folder === 'trash')}
        </nav>
        <nav class="nav-section label-list" aria-label="Labels">
          <div class="nav-section-label">Labels</div>
          ${navItem('label:Work', 'Work', 'tag', countLabel('Work'), state.folder === 'label:Work')}
          ${navItem('label:Personal', 'Personal', 'tag', countLabel('Personal'), state.folder === 'label:Personal')}
          ${navItem('label:Travel', 'Travel', 'tag', countLabel('Travel'), state.folder === 'label:Travel')}
          ${navItem('label:Finance', 'Finance', 'tag', countLabel('Finance'), state.folder === 'label:Finance')}
        </nav>
        <div class="sidebar-footer"><span>Storage</span><div class="storage-meter"><span></span></div><span>3.1 GB of 15 GB used</span></div>
      </aside>
      <main class="main-panel"><div class="content-wrap">${content}</div></main>
    </div>
    ${state.accountMenu ? renderAccountMenu() : ''}
    ${state.compose ? renderCompose() : ''}
  </div>`;
}

function renderAccountMenu() {
  return `<div class="account-menu">
    <div class="account-menu-head">${avatar(me)}<div><strong>${me.name}</strong><span>${me.email}</span></div></div>
    <div style="height:7px"></div>
    <button class="menu-item" data-action="show-toast" data-toast="Settings are local to this workspace">${icon('settings')} Settings</button>
    <button class="menu-item" data-action="show-toast" data-toast="Your mailbox is stored locally in this browser">${icon('help')} About this mailbox</button>
  </div>`;
}

function renderPage() {
  if (state.threadId) return renderShell(renderMessageView());
  return renderShell(renderMailbox());
}

function renderMailbox() {
  const threads = visibleThreads();
  const selectedVisible = threads.filter((message) => state.selected.has(message.threadId)).length;
  const allSelected = threads.length > 0 && selectedVisible === threads.length;
  const categoryTabs = state.folder === 'inbox' ? `<div class="category-tabs">
    <button class="category-tab ${state.category === 'primary' ? 'active' : ''}" data-action="set-category" data-category="primary">Primary</button>
    <button class="category-tab ${state.category === 'updates' ? 'active' : ''}" data-action="set-category" data-category="updates">Updates</button>
    <button class="category-tab ${state.category === 'promotions' ? 'active' : ''}" data-action="set-category" data-category="promotions">Promotions</button>
    <button class="category-tab ${state.category === 'all' ? 'active' : ''}" data-action="set-category" data-category="all">All mail</button>
  </div>` : '';
  const headingCopy = state.search ? `${threads.length} result${threads.length === 1 ? '' : 's'} for “${escapeHtml(state.search)}”` : state.folder === 'inbox' ? 'A focused view of what needs your attention.' : `${countFolder(state.folder) || countLabel(state.folder.replace('label:', '')) || 0} conversations`;
  return `<section class="page-heading"><div><p class="eyebrow">Your workspace</p><h1>${folderLabel(state.folder)}</h1><p class="heading-meta">${headingCopy}</p></div><div class="view-actions"><button class="icon-button" data-action="show-toast" data-toast="Mailbox refreshed just now" aria-label="Refresh">${icon('refresh')}</button><button class="icon-button" data-action="show-toast" data-toast="More mailbox options" aria-label="More options">${icon('more')}</button></div></section>
  <section class="page-card">
    ${categoryTabs}
    <div class="toolbar">
      <div class="select-wrap"><input class="checkbox" type="checkbox" data-action="select-all" ${allSelected ? 'checked' : ''} aria-label="Select all conversations" /></div>
      <button class="icon-button toolbar-extra" data-action="refresh" aria-label="Refresh mail">${icon('refresh')}</button>
      ${selectedVisible ? `<div class="toolbar-divider"></div><button class="icon-button" data-action="mark-unread" aria-label="Mark unread">${icon('mail')}</button><button class="icon-button" data-action="archive-selected" aria-label="Archive">${icon('archive')}</button><button class="icon-button danger" data-action="delete-selected" aria-label="Delete">${icon('trash')}</button><button class="icon-button" data-action="toggle-label-menu" aria-label="Label">${icon('tag')}</button>` : ''}
      <span class="toolbar-spacer"></span><span class="result-count">${threads.length ? `${threads.length} conversation${threads.length === 1 ? '' : 's'}` : 'No conversations'}</span><button class="icon-button" data-action="show-toast" data-toast="You’re viewing the latest mail first" aria-label="More information">${icon('more')}</button>
      ${state.labelMenu ? renderLabelMenu() : ''}
    </div>
    <div class="mail-list">
      ${threads.length ? threads.map((message) => renderMailRow(message)).join('') : renderEmptyState()}
    </div>
  </section>
  ${state.folder === 'inbox' && !state.search ? `<div class="welcome-card"> <div class="welcome-icon">${icon('check')}</div><div><strong>You’re all set for now.</strong><span>New mail will appear here as it arrives. Your focused inbox has ${state.messages.filter((message) => message.folder === 'inbox').length} conversations.</span></div><button data-action="show-toast" data-toast="Nice work keeping your inbox clear">View tips ${icon('forward')}</button></div>` : ''}`;
}

function renderLabelMenu() {
  return `<div class="label-menu"><button data-action="apply-label" data-label="Work"><span class="label-dot"></span>Work</button><button data-action="apply-label" data-label="Personal"><span class="label-dot green"></span>Personal</button><button data-action="apply-label" data-label="Travel"><span class="label-dot orange"></span>Travel</button><button data-action="apply-label" data-label="Finance"><span class="label-dot pink"></span>Finance</button></div>`;
}

function renderMailRow(message) {
  const threadMessages = allThreadMessages(message.threadId);
  const unread = threadMessages.some((item) => item.unread);
  const starred = threadMessages.some((item) => item.starred);
  const labels = [...new Set(threadMessages.flatMap((item) => item.labels || []))].slice(0, 2);
  const isSelected = state.selected.has(message.threadId);
  return `<div class="mail-row ${unread ? 'unread' : ''} ${isSelected ? 'selected' : ''}" data-action="open-thread" data-thread="${message.threadId}">
    <input class="checkbox" type="checkbox" data-action="select-thread" data-thread="${message.threadId}" ${isSelected ? 'checked' : ''} aria-label="Select ${escapeHtml(message.subject || 'draft')}" />
    <button class="icon-button compact row-star" data-action="toggle-star-thread" data-thread="${message.threadId}" aria-label="${starred ? 'Unstar' : 'Star'} conversation">${icon('star', `svg-icon star-icon ${starred ? 'starred' : ''}`)}</button>
    <div class="sender"><span class="sender-text">${escapeHtml(message.from?.name || 'Draft')}</span>${threadMessages.length > 1 ? ` <span style="color:#9ca5b4;font-size:10px">(${threadMessages.length})</span>` : ''}</div>
    <div class="subject-line"><span class="subject">${escapeHtml(message.subject || '(no subject)')}</span><span class="preview">— ${escapeHtml(message.preview || 'No message content')}</span><span class="row-labels">${labels.map(labelPill).join('')}</span>${message.attachments?.length ? icon('paperclip', 'svg-icon compact') : ''}</div>
    <div class="row-time">${escapeHtml(message.time || '')}</div><span></span>
  </div>`;
}

function renderEmptyState() {
  const copy = state.search ? ['Nothing matched your search', 'Try a sender, subject, label, or a shorter phrase.'] : state.folder === 'trash' ? ['Trash is empty', 'Deleted conversations will stay here until you clear them.'] : state.folder === 'drafts' ? ['No drafts yet', 'Start a new message whenever you’re ready.'] : ['Nothing here yet', 'This view will fill up as your mailbox changes.'];
  return `<div class="empty-state">${icon('inbox', 'empty-icon')}<h3>${copy[0]}</h3><p>${copy[1]}</p></div>`;
}

function renderMessageView() {
  const messages = allThreadMessages(state.threadId);
  if (!messages.length) { state.threadId = null; return renderMailbox(); }
  const latest = messages.at(-1);
  const subject = latest.subject || '(no subject)';
  const unread = messages.some((message) => message.unread);
  const recipient = latest.from?.email === me.email ? latest.to : `to ${me.name}`;
  return `<section class="message-view"><div class="message-topline"><button class="back-button" data-action="close-thread">${icon('back')} Back to ${folderLabel(state.folder).toLowerCase()}</button><div class="view-actions"><button class="icon-button" data-action="show-toast" data-toast="Conversation link copied">${icon('link')}</button><button class="icon-button" data-action="show-toast" data-toast="More conversation options">${icon('more')}</button></div></div>
    <article class="thread-card"><header class="thread-header"><h1 class="thread-subject">${escapeHtml(subject)}</h1><div class="thread-submeta"><span>${messages.length} message${messages.length === 1 ? '' : 's'}</span><span class="dot"></span><span>${escapeHtml(recipient)}</span><span class="dot"></span><span>${escapeHtml(latest.date || latest.time || '')}</span></div><div class="thread-actions"><button class="action-button" data-action="reply-thread">${icon('reply')} Reply</button><button class="action-button" data-action="forward-thread">${icon('forward')} Forward</button><button class="action-button" data-action="toggle-thread-read">${icon(unread ? 'mail' : 'check')} ${unread ? 'Mark read' : 'Mark unread'}</button><button class="action-button" data-action="delete-thread">${icon('trash')} Delete</button></div></header><div class="conversation">${messages.map((message, index) => renderMessageBlock(message, index === messages.length - 1)).join('')}</div></article></section>`;
}

function renderMessageBlock(message, expanded) {
  const person = message.from?.email === me.email ? me : message.from;
  return `<section class="message-block"><div class="message-head">${avatar(person)}<div class="message-who"><strong>${escapeHtml(person?.name || 'Unknown sender')}</strong><span>${escapeHtml(person?.email || '')}${message.to ? ` · to ${escapeHtml(message.to === me.email ? 'me' : message.to)}` : ''}</span></div><span class="message-date">${escapeHtml(message.date || message.time || '')}</span><button class="icon-button compact" data-action="reply-thread" aria-label="Reply">${icon('reply')}</button></div>${expanded ? `<div class="message-body">${message.body || '<p>No message content.</p>'}</div>${message.attachments?.length ? `<div class="attachments">${message.attachments.map(renderAttachment).join('')}</div>` : ''}` : `<div class="message-body"><p class="quote">${escapeHtml(message.preview || 'Click to expand this message')}</p></div>`}</section>`;
}

function renderAttachment(file) {
  return `<div class="attachment"><span class="file-icon ${file.type === 'pdf' ? 'pdf' : ''}">${icon(file.type === 'pdf' ? 'file' : 'file')}</span><span class="file-name"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.size || 'Attachment')}</span></span><button class="icon-button compact" data-action="show-toast" data-toast="${escapeHtml(file.name)} is ready locally">${icon('more')}</button></div>`;
}

function renderCompose() {
  const draft = state.compose;
  const attachmentChips = (draft.attachments || []).map((file) => `<span class="draft-chip">${escapeHtml(file.name || file)}</span>`).join('');
  return `<div class="compose-overlay" data-action="overlay-close"><section class="compose-window" role="dialog" aria-label="Compose message" data-compose-window><header class="compose-header"><strong>${draft.id ? 'Draft' : 'New message'}</strong><span class="compose-save">${draft.saving ? 'Saving…' : draft.id ? 'Saved locally' : ''}</span><button class="icon-button" data-action="minimize-compose" aria-label="Minimize">${icon('minimize')}</button><button class="icon-button" data-action="close-compose" aria-label="Close">${icon('close')}</button></header><div class="compose-body"><div class="compose-field"><label for="compose-to">To</label><input id="compose-to" data-compose="to" value="${escapeHtml(draft.to)}" placeholder="Recipients" autocomplete="off" /><button class="field-link" data-action="toggle-cc">Cc / Bcc</button></div>${draft.showCc ? `<div class="compose-field"><label>Cc</label><input data-compose="cc" value="${escapeHtml(draft.cc || '')}" placeholder="Cc recipients" /></div><div class="compose-field"><label>Bcc</label><input data-compose="bcc" value="${escapeHtml(draft.bcc || '')}" placeholder="Bcc recipients" /></div>` : ''}<div class="compose-field"><label for="compose-subject">Subject</label><input id="compose-subject" data-compose="subject" value="${escapeHtml(draft.subject)}" placeholder="Subject" /></div><textarea class="compose-textarea" data-compose="body" placeholder="Write your message…">${escapeHtml(draft.body)}</textarea><div class="attachment-preview ${draft.attachments?.length ? 'visible' : ''}">${attachmentChips}</div><footer class="compose-footer"><button class="send-button" data-action="send-compose">${icon('send')} Send</button><button class="compose-tool" data-action="attach-file" aria-label="Attach files">${icon('paperclip')}</button><button class="compose-tool" data-action="show-toast" data-toast="Rich text formatting is ready for your next pass" aria-label="Formatting">A</button><button class="compose-tool" data-action="show-toast" data-toast="Add a reaction after sending" aria-label="Emoji">${icon('smile')}</button><span class="compose-save">Saved to this browser</span><button class="compose-tool" data-action="discard-compose" aria-label="Discard draft">${icon('trash')}</button></footer></div></section><input id="file-input" type="file" multiple hidden /></div>`;
}

function render() {
  document.querySelector('#app').innerHTML = renderPage();
  bindSearchFocus();
}

function bindSearchFocus() {
  const input = document.querySelector('#search-input');
  if (input && document.activeElement?.id === 'search-input') {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function toast(message, type = 'success') {
  const region = document.querySelector('#toast-region');
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.innerHTML = `<span class="toast-check">${icon(type === 'success' ? 'check' : 'help')}</span><span>${escapeHtml(message)}</span>`;
  region.append(item);
  setTimeout(() => item.remove(), 2800);
}

function threadIdsFromSelection() {
  return [...state.selected];
}

function updateThreads(ids, updater) {
  state.messages.forEach((message) => { if (ids.includes(message.threadId)) updater(message); });
  saveMessages();
}

function ensureSelectionToast(action) {
  if (!state.selected.size) { toast(`Select a conversation to ${action}`, 'info'); return false; }
  return true;
}

function openCompose(draft = null) {
  state.accountMenu = false;
  state.compose = draft ? { id: draft.id, threadId: draft.threadId, to: draft.to || '', cc: draft.cc || '', bcc: draft.bcc || '', subject: draft.subject || '', body: draft.body?.replace(/<[^>]*>/g, '') || '', attachments: draft.attachments || [], showCc: false, saving: false } : { id: null, threadId: null, to: '', cc: '', bcc: '', subject: '', body: '', attachments: [], showCc: false, saving: false };
  render();
  requestAnimationFrame(() => document.querySelector('#compose-to')?.focus());
}

function saveComposeDraft(closeAfter = false) {
  const draft = state.compose;
  if (!draft) return;
  const hasContent = draft.to.trim() || draft.subject.trim() || draft.body.trim() || draft.attachments.length;
  if (hasContent) {
    if (draft.id) {
      const existing = state.messages.find((message) => message.id === draft.id);
      if (existing) Object.assign(existing, { to: draft.to, subject: draft.subject, preview: draft.body.replace(/\s+/g, ' ').slice(0, 90), body: draft.body ? `<p>${escapeHtml(draft.body).replace(/\n/g, '<br />')}</p>` : '', attachments: draft.attachments });
    } else {
      const id = `m-${Date.now()}`;
      const newDraft = { id, threadId: `t-${Date.now()}`, folder: 'drafts', category: 'primary', from: me, to: draft.to, subject: draft.subject, preview: draft.body.replace(/\s+/g, ' ').slice(0, 90) || 'No recipients · No subject', body: draft.body ? `<p>${escapeHtml(draft.body).replace(/\n/g, '<br />')}</p>` : '', time: 'Just now', date: new Date().toLocaleString(), unread: false, starred: false, labels: [], attachments: draft.attachments };
      state.messages.push(newDraft);
      draft.id = id;
      draft.threadId = newDraft.threadId;
    }
    saveMessages();
  }
  if (closeAfter) { state.compose = null; render(); }
}

function sendCompose() {
  const draft = state.compose;
  if (!draft) return;
  if (!draft.to.trim()) { toast('Add at least one recipient first', 'info'); document.querySelector('#compose-to')?.focus(); return; }
  if (!draft.subject.trim() && !draft.body.trim()) { toast('Add a subject or message before sending', 'info'); return; }
  if (draft.id) {
    const existing = state.messages.find((message) => message.id === draft.id);
    if (existing) Object.assign(existing, { folder: 'sent', to: draft.to, subject: draft.subject || '(no subject)', preview: draft.body.replace(/\s+/g, ' ').slice(0, 90), body: draft.body ? `<p>${escapeHtml(draft.body).replace(/\n/g, '<br />')}</p>` : '<p></p>', time: 'Just now', date: new Date().toLocaleString() });
  } else {
    state.messages.push({ id: `m-${Date.now()}`, threadId: `t-${Date.now()}`, folder: 'sent', category: 'primary', from: me, to: draft.to, subject: draft.subject || '(no subject)', preview: draft.body.replace(/\s+/g, ' ').slice(0, 90), body: draft.body ? `<p>${escapeHtml(draft.body).replace(/\n/g, '<br />')}</p>` : '<p></p>', time: 'Just now', date: new Date().toLocaleString(), unread: false, starred: false, labels: [], attachments: draft.attachments });
  }
  saveMessages(); state.compose = null; render(); toast('Message sent');
}

function toggleTheme() {
  document.body.classList.toggle('soft-dark');
  toast(document.body.classList.contains('soft-dark') ? 'Focus mode on' : 'Light mode on');
}

document.addEventListener('click', (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) {
    if (state.accountMenu && !event.target.closest('.account-menu') && !event.target.closest('[data-action="toggle-account"]')) { state.accountMenu = false; render(); }
    return;
  }
  const action = actionTarget.dataset.action;
  if (action === 'toggle-account') { state.accountMenu = !state.accountMenu; state.labelMenu = false; render(); return; }
  if (action === 'show-toast') { toast(actionTarget.dataset.toast || 'Done'); return; }
  if (action === 'toggle-sidebar') { state.sidebarOpen = !state.sidebarOpen; render(); return; }
  if (action === 'navigate') { state.folder = actionTarget.dataset.folder; state.category = state.folder === 'inbox' ? 'primary' : 'all'; state.threadId = null; state.selected.clear(); state.labelMenu = false; render(); return; }
  if (action === 'set-category') { state.category = actionTarget.dataset.category; state.selected.clear(); render(); return; }
  if (action === 'clear-search') { state.search = ''; render(); document.querySelector('#search-input')?.focus(); return; }
  if (action === 'refresh') { toast('Mailbox refreshed just now'); return; }
  if (action === 'open-compose') { openCompose(); return; }
  if (action === 'close-compose' || action === 'minimize-compose') { saveComposeDraft(true); return; }
  if (action === 'overlay-close' && !event.target.closest('[data-compose-window]')) { saveComposeDraft(true); return; }
  if (action === 'attach-file') { document.querySelector('#file-input')?.click(); return; }
  if (action === 'toggle-cc') { if (state.compose) state.compose.showCc = !state.compose.showCc; render(); return; }
  if (action === 'send-compose') { sendCompose(); return; }
  if (action === 'discard-compose') { if (state.compose?.id) state.messages = state.messages.filter((message) => message.id !== state.compose.id); state.compose = null; saveMessages(); render(); toast('Draft discarded'); return; }
  if (action === 'toggle-theme') { toggleTheme(); return; }
  if (action === 'select-thread') { event.stopPropagation(); const id = actionTarget.dataset.thread; if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id); render(); return; }
  if (action === 'select-all') { const visible = visibleThreads().map((message) => message.threadId); if (state.selected.size === visible.length && visible.length) visible.forEach((id) => state.selected.delete(id)); else visible.forEach((id) => state.selected.add(id)); render(); return; }
  if (action === 'open-thread') { const threadId = actionTarget.dataset.thread; const latest = latestMessage(threadId); if (latest?.folder === 'drafts') { openCompose(latest); return; } state.threadId = threadId; state.selected.delete(threadId); updateThreads([threadId], (message) => { message.unread = false; }); render(); return; }
  if (action === 'close-thread') { state.threadId = null; render(); return; }
  if (action === 'toggle-star-thread') { event.stopPropagation(); const threadId = actionTarget.dataset.thread; const starred = !allThreadMessages(threadId).some((message) => message.starred); updateThreads([threadId], (message) => { message.starred = starred; }); render(); toast(starred ? 'Conversation starred' : 'Removed from starred'); return; }
  if (action === 'archive-selected') { if (!ensureSelectionToast('archive')) return; const ids = threadIdsFromSelection(); updateThreads(ids, (message) => { if (message.folder === 'inbox') message.folder = 'archive'; }); state.selected.clear(); render(); toast('Conversation archived'); return; }
  if (action === 'delete-selected') { if (!ensureSelectionToast('delete')) return; const ids = threadIdsFromSelection(); updateThreads(ids, (message) => { message.folder = 'trash'; }); state.selected.clear(); render(); toast('Moved to Trash'); return; }
  if (action === 'mark-unread') { if (!ensureSelectionToast('mark unread')) return; const ids = threadIdsFromSelection(); updateThreads(ids, (message) => { message.unread = true; }); state.selected.clear(); render(); toast('Marked as unread'); return; }
  if (action === 'toggle-label-menu') { state.labelMenu = !state.labelMenu; render(); return; }
  if (action === 'apply-label') { if (!ensureSelectionToast('label')) return; const label = actionTarget.dataset.label; updateThreads(threadIdsFromSelection(), (message) => { message.labels = [...new Set([...(message.labels || []), label])]; }); state.selected.clear(); state.labelMenu = false; render(); toast(`Labeled as ${label}`); return; }
  if (action === 'reply-thread' || action === 'forward-thread') { const latest = latestMessage(state.threadId); if (!latest) return; const sender = latest.from?.email === me.email ? latest.to : latest.from?.email; openCompose({ id: null, threadId: null, to: action === 'reply-thread' ? sender : '', subject: `${action === 'reply-thread' && !latest.subject.startsWith('Re:') ? 'Re: ' : action === 'forward-thread' && !latest.subject.startsWith('Fwd:') ? 'Fwd: ' : ''}${latest.subject}`, body: action === 'reply-thread' ? `\n\n—\n${latest.from?.name || 'Sender'} wrote:\n${latest.preview || ''}` : '', attachments: [], showCc: false }); return; }
  if (action === 'toggle-thread-read') { updateThreads([state.threadId], (message) => { message.unread = !message.unread; }); render(); toast('Conversation updated'); return; }
  if (action === 'delete-thread') { updateThreads([state.threadId], (message) => { message.folder = 'trash'; }); state.threadId = null; render(); toast('Moved to Trash'); return; }
  if (action === 'show-search-help') { toast('Search sender, subject, label, or any phrase'); return; }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'search-input') { state.search = event.target.value; render(); const searchInput = document.querySelector('#search-input'); searchInput?.focus(); searchInput?.setSelectionRange(searchInput.value.length, searchInput.value.length); return; }
  const field = event.target.dataset.compose;
  if (field && state.compose) { state.compose[field] = event.target.value; state.compose.saving = true; clearTimeout(window.composeTimer); window.composeTimer = setTimeout(() => { saveComposeDraft(); if (state.compose) state.compose.saving = false; }, 650); }
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'file-input' && state.compose) {
    state.compose.attachments = [...state.compose.attachments, ...[...event.target.files].map((file) => ({ name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB`, type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file' }))];
    render();
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#search-input')?.focus(); return; }
  if (event.target.matches('input, textarea')) return;
  if (event.key.toLowerCase() === 'c') { event.preventDefault(); openCompose(); return; }
  if (event.key === 'Escape') { if (state.compose) { saveComposeDraft(true); } else if (state.threadId) { state.threadId = null; render(); } }
});

render();
