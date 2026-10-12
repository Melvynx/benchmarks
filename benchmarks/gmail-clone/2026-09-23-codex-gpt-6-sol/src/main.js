import { createMailbox, labelColors, me } from './data.js'

const STORAGE_KEY = 'gpt-6-mailbox-v1'
const SETTINGS_KEY = 'gpt-6-settings-v1'
const PAGE_SIZE = 12
const root = document.getElementById('root')

const paths = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  mailOpen: '<path d="m3 9 9 6 9-6M5 7l7-4 7 4M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9"/>',
  inbox: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  star: '<path d="m12 2 3.1 6.4 7.1 1-5.1 5 .9 7-6-3.3-6.2 3.3 1.1-7-5.1-5 7.1-1z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  tag: '<path d="M20 13 13 20a2 2 0 0 1-3 0l-8-8V3h9l9 8a2 2 0 0 1 0 2Z"/><circle cx="7" cy="8" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  pen: '<path d="m15 5 4 4M4 20l4-.7L20 7.4 16.6 4 4.7 16Z"/>',
  moon: '<path d="M20.6 14.3A9 9 0 0 1 9.7 3.4 9 9 0 1 0 20.6 14.3Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-4M4 3v5h5M4 13a8 8 0 0 0 14.8 4M20 21v-5h-5"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7M5 12h14"/>',
  arrowRight: '<path d="m12 5 7 7-7 7M19 12H5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  paperclip: '<path d="m21 11.5-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
  reply: '<path d="m9 17-6-5 6-5M3 12h11a7 7 0 0 1 7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  minimize: '<path d="m5 9 7 7 7-7M5 19h14"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-1.5 1-2 1.6-2 3M12 17h.01"/>',
}
const icon = (name, size = 19, fill = false) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.mail}</svg>`
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const attr = value => esc(value)
const ib = (action, name, title, extra = '', data = '') => `<button type="button" class="icon-button ${extra}" title="${attr(title)}" aria-label="${attr(title)}" data-action="${action}" ${extra.includes('disabled-look') ? 'disabled' : ''} ${data}>${icon(name)}</button>`
const agoDate = iso => new Date(iso)
const latest = thread => thread.messages[thread.messages.length - 1]
const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const avatarColor = name => ['#dfebe7', '#f5e8d9', '#ece7f4', '#e1eaf3', '#f2e4e8', '#e8ecdc'][[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6]
const badge = name => `<span class="label-badge" style="--label-color:${labelColors[name] || '#8290a4'}"><span></span>${esc(name)}</span>`

function listDate(iso) {
  const date = agoDate(iso), today = new Date(), yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
const fullDate = iso => agoDate(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function readStoredMailbox() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (value && Array.isArray(value.threads) && Array.isArray(value.drafts) && Array.isArray(value.labels)) return value
  } catch { /* The sample mailbox remains available. */ }
  return null
}
const loadMailbox = () => readStoredMailbox() ?? createMailbox()
function loadSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY))
    if (value) return { theme: value.theme === 'dark' ? 'dark' : 'light', density: value.density === 'compact' ? 'compact' : 'comfortable' }
  } catch { /* Keep defaults. */ }
  return { theme: 'light', density: 'comfortable' }
}

const state = {
  mailbox: loadMailbox(), settings: loadSettings(), view: 'inbox', category: 'primary', query: '', unreadOnly: false,
  selected: new Set(), openId: null, expanded: new Set(), collapsed: new Set(), compose: null, minimized: false, preview: null,
  toast: null, undo: null, labelMenu: false, labelTargets: [], accountOpen: false, mobileNav: false, sidebarToggled: false, page: 0,
}
let toastTimer
const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.mailbox))
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings))
  } catch { /* The mailbox remains usable when browser storage is restricted. */ }
}
const notify = (text, undo = null) => {
  state.toast = text; state.undo = undo; renderToast()
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { state.toast = null; state.undo = null; renderToast() }, undo ? 6000 : 3500)
}
const navigate = view => {
  Object.assign(state, { view, query: '', openId: null, unreadOnly: false, page: 0, labelMenu: false, mobileNav: false })
  state.selected.clear()
  render()
}
const inboxUnread = () => state.mailbox.threads.filter(t => t.folder === 'inbox' && t.unread).length
const keepDraft = draft => !!(draft.body.trim() || (!draft.replyToThreadId && (draft.to.trim() || draft.subject.trim())))
const syncDraft = draft => {
  state.mailbox.drafts = state.mailbox.drafts.filter(item => item.id !== draft.id)
  if (keepDraft(draft)) state.mailbox.drafts.push(draft)
  persist()
}
const refreshMailbox = () => {
  const stored = readStoredMailbox()
  if (!stored || JSON.stringify(stored) === JSON.stringify(state.mailbox)) return notify('Your mailbox is up to date')
  state.mailbox = stored
  state.selected.clear()
  if (state.openId && !stored.threads.some(thread => thread.id === state.openId)) state.openId = null
  if (state.compose) { renderSidebar(); renderMain() }
  else render()
  notify('Mailbox refreshed')
}

function searchMatches(thread, query) {
  const tokens = query.toLowerCase().match(/(?:[^\s"]+|"[^"]*")+/g) || []
  const haystack = [thread.subject, ...thread.labels, ...thread.messages.flatMap(m => [m.from, m.email, m.to, m.body, ...(m.attachments || [])])].join(' ').toLowerCase()
  return tokens.every(token => {
    const [operator, ...parts] = token.split(':')
    const value = parts.join(':').replace(/^"|"$/g, '')
    if (parts.length) {
      if (operator === 'from') return thread.messages.some(m => `${m.from} ${m.email}`.toLowerCase().includes(value))
      if (operator === 'to') return thread.messages.some(m => m.to.toLowerCase().includes(value))
      if (operator === 'subject') return thread.subject.toLowerCase().includes(value)
      if (operator === 'label') return thread.labels.some(label => label.toLowerCase().includes(value))
      if (operator === 'is' && value === 'unread') return thread.unread
      if (operator === 'is' && value === 'starred') return thread.starred
      if (operator === 'has' && value === 'attachment') return thread.messages.some(m => m.attachments?.length)
      if (operator === 'in') return (value === 'sent' && thread.messages.some(m => m.outgoing)) || thread.folder === value || (value === 'all' && thread.folder !== 'trash')
    }
    return haystack.includes(token.replace(/^"|"$/g, ''))
  })
}

function entries() {
  const { view, category, mailbox, unreadOnly, query } = state
  let items = view === 'drafts' ? mailbox.drafts.map(data => ({ type: 'draft', data })) : mailbox.threads.filter(thread => {
    if (view === 'inbox') return thread.folder === 'inbox' && thread.category === category
    if (view === 'starred') return thread.starred && thread.folder !== 'trash'
    if (view === 'sent') return thread.folder !== 'trash' && thread.messages.some(m => m.outgoing)
    if (view === 'archive') return thread.folder === 'archive'
    if (view === 'trash') return thread.folder === 'trash'
    if (view === 'all') return thread.folder !== 'trash'
    if (view === 'search') return (thread.folder !== 'trash' || /(?:^|\s)in:trash(?:\s|$)/i.test(query)) && searchMatches(thread, query)
    if (view.startsWith('label:')) return thread.folder !== 'trash' && thread.labels.includes(view.slice(6))
    return false
  }).map(data => ({ type: 'thread', data }))
  if (unreadOnly && view !== 'drafts') items = items.filter(item => item.type === 'thread' && item.data.unread)
  return items.sort((a, b) => new Date(b.type === 'thread' ? latest(b.data).date : b.data.updatedAt) - new Date(a.type === 'thread' ? latest(a.data).date : a.data.updatedAt))
}

function applyThreads(ids, transform, message) {
  const before = state.mailbox.threads.flatMap((thread, index) => ids.includes(thread.id) ? [{ thread: structuredClone(thread), index }] : [])
  state.mailbox.threads = state.mailbox.threads.flatMap(thread => {
    if (!ids.includes(thread.id)) return [thread]
    const next = transform(thread)
    return next ? [next] : []
  })
  state.selected.clear()
  if (ids.includes(state.openId)) state.openId = null
  persist(); render(); notify(message, () => {
    const threads = state.mailbox.threads.slice()
    for (const { thread, index } of before) {
      const current = threads.findIndex(item => item.id === thread.id)
      if (current >= 0) threads[current] = thread
      else threads.splice(Math.min(index, threads.length), 0, thread)
    }
    state.mailbox.threads = threads
    persist(); render()
  })
}
const archiveThreads = ids => applyThreads(ids, thread => ({ ...thread, folder: 'archive' }), ids.length > 1 ? `${ids.length} conversations archived` : 'Conversation archived')
const trashThreads = ids => applyThreads(ids, thread => thread.folder === 'trash' ? null : { ...thread, folder: 'trash' }, state.view === 'trash' ? 'Deleted forever' : ids.length > 1 ? `${ids.length} conversations moved to Trash` : 'Moved to Trash')
const restoreThreads = ids => applyThreads(ids, thread => ({ ...thread, folder: 'inbox' }), 'Restored to Inbox')
const markThreads = (ids, unread) => applyThreads(ids, thread => ({ ...thread, unread }), `Marked as ${unread ? 'unread' : 'read'}`)
const toggleStar = id => { const thread = state.mailbox.threads.find(t => t.id === id); if (thread) thread.starred = !thread.starred; persist(); renderSidebar(); renderMain() }
const openThread = id => { state.openId = id; state.selected.clear(); state.expanded.clear(); state.collapsed.clear(); const thread = state.mailbox.threads.find(t => t.id === id); if (thread) thread.unread = false; persist(); renderSidebar(); renderMain() }
const deleteDrafts = ids => {
  const before = state.mailbox.drafts.flatMap((draft, index) => ids.includes(draft.id) ? [{ draft: structuredClone(draft), index }] : [])
  state.mailbox.drafts = state.mailbox.drafts.filter(d => !ids.includes(d.id))
  if (state.compose && ids.includes(state.compose.id)) state.compose = null
  state.selected.clear(); persist(); render()
  notify(ids.length > 1 ? `${ids.length} drafts discarded` : 'Draft discarded', () => {
    const drafts = state.mailbox.drafts.slice()
    for (const { draft, index } of before) {
      const current = drafts.findIndex(item => item.id === draft.id)
      if (current >= 0) drafts[current] = draft
      else drafts.splice(Math.min(index, drafts.length), 0, draft)
    }
    state.mailbox.drafts = drafts
    persist(); render()
  })
}
const newCompose = options => {
  if (state.compose) syncDraft(state.compose)
  state.compose = { id: crypto.randomUUID(), to: '', subject: '', body: '', updatedAt: new Date().toISOString(), ...options }
  state.minimized = false; state.mobileNav = false; render()
}
const closeCompose = () => {
  const draft = state.compose
  if (draft) {
    draft.updatedAt = new Date().toISOString()
    syncDraft(draft)
    if (keepDraft(draft)) notify('Draft saved')
  }
  state.compose = null; state.minimized = false; render()
}
const sendMessage = () => {
  const draft = state.compose
  if (!draft) return
  const recipients = draft.to.split(',').map(value => value.trim()).filter(Boolean)
  if (!recipients.length || recipients.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) { document.getElementById('compose-to')?.focus(); return notify('Enter a valid recipient email address') }
  if (!draft.body.trim()) { document.querySelector('.compose-body')?.focus(); return notify('Write a message before sending') }
  const message = { id: crypto.randomUUID(), from: me.name, email: me.email, to: recipients.join(', '), date: new Date().toISOString(), body: draft.body, outgoing: true }
  state.mailbox.drafts = state.mailbox.drafts.filter(d => d.id !== draft.id)
  if (draft.replyToThreadId) {
    const thread = state.mailbox.threads.find(t => t.id === draft.replyToThreadId)
    if (thread) { thread.messages.push(message); thread.unread = false; if (thread.folder === 'trash') thread.folder = 'inbox' }
    else state.mailbox.threads.unshift({ id: crypto.randomUUID(), subject: draft.subject.trim() || '(no subject)', messages: [message], folder: 'sent', category: 'primary', labels: [], unread: false, starred: false })
  } else state.mailbox.threads.unshift({ id: crypto.randomUUID(), subject: draft.subject.trim() || '(no subject)', messages: [message], folder: 'sent', category: 'primary', labels: [], unread: false, starred: false })
  state.compose = null; state.minimized = false; persist(); render(); notify('Message sent')
}
const applyLabel = name => {
  const targets = state.labelTargets.length ? state.labelTargets : state.openId ? [state.openId] : [...state.selected]
  const allHave = targets.every(id => state.mailbox.threads.find(t => t.id === id)?.labels.includes(name))
  for (const thread of state.mailbox.threads) if (targets.includes(thread.id)) thread.labels = allHave ? thread.labels.filter(label => label !== name) : [...new Set([...thread.labels, name])]
  state.labelMenu = false; persist(); renderMain(); notify(allHave ? `Removed ${name} label` : `Added ${name} label`)
}
const createLabel = name => {
  name = name.trim()
  if (!name) return
  if (state.mailbox.labels.some(label => label.toLowerCase() === name.toLowerCase())) return notify('That label already exists')
  const targets = state.labelTargets.length ? state.labelTargets : state.openId ? [state.openId] : [...state.selected]
  state.mailbox.labels.push(name)
  for (const thread of state.mailbox.threads) if (targets.includes(thread.id)) thread.labels = [...new Set([...thread.labels, name])]
  state.labelMenu = false; state.labelTargets = []; persist(); render()
  notify(targets.length ? `${name} label created and applied` : `${name} label created`)
}

const navItems = [
  ['inbox', 'Inbox', 'inbox'], ['starred', 'Starred', 'star'], ['sent', 'Sent', 'send'],
  ['drafts', 'Drafts', 'fileText'], ['archive', 'Archive', 'archive'], ['all', 'All mail', 'mail'], ['trash', 'Trash', 'trash'],
]
const categories = [
  ['primary', 'Primary', 'inbox'], ['updates', 'Updates', 'bell'],
  ['promotions', 'Promotions', 'tag'], ['social', 'Social', 'mail'],
]

function renderTop() {
  document.getElementById('topbar').innerHTML = `
    <div class="topbar-brand">
      ${ib('toggle-menu', 'menu', 'Toggle menu', 'menu-button')}
      <span class="brand-mark">${icon('mail', 20)}</span><h1>GPT-6</h1>
    </div>
    <div class="search-box">${icon('search', 20)}<input id="mail-search" aria-label="Search mail" placeholder="Search mail" value="${attr(state.query)}" />
      <kbd id="search-hint" ${state.query ? 'hidden' : ''}>/</kbd>${ib('clear-search', 'x', 'Clear search', '', `id="search-clear" ${state.query ? '' : 'hidden'}`)}</div>
    <div class="topbar-actions">
      <button class="topbar-text-button" title="${state.settings.theme === 'light' ? 'Dark mode' : 'Light mode'}" data-action="theme">${icon(state.settings.theme === 'light' ? 'moon' : 'sun', 20)}</button>
      <div class="account-wrap"><button class="account-button" data-action="account" aria-label="Account and settings"><span class="account-avatar">MC</span></button>
      ${state.accountOpen ? `<div class="popover account-popover">
        <div class="account-card"><span class="account-avatar large">MC</span><div><strong>${me.name}</strong><span>${me.email}</span></div></div>
        <div class="popover-divider"></div>
        <button data-action="density">${icon('settings', 17)} ${state.settings.density === 'comfortable' ? 'Use compact density' : 'Use comfortable density'}</button>
        <button data-action="theme">${icon(state.settings.theme === 'light' ? 'moon' : 'sun', 17)} Switch to ${state.settings.theme === 'light' ? 'dark' : 'light'} mode</button>
        <button data-action="reset">${icon('refresh', 17)} Reset sample mailbox</button>
        <p>Saved locally in this browser</p>
      </div>` : ''}</div>
    </div>`
}

function renderSidebar() {
  const count = id => id === 'inbox' ? inboxUnread() : id === 'drafts' ? state.mailbox.drafts.length : id === 'starred' ? state.mailbox.threads.filter(t => t.starred && t.folder !== 'trash').length : 0
  document.getElementById('sidebar').innerHTML = `
    <button class="compose-main" data-action="compose" aria-label="Compose">${icon('pen', 20)}<span>Compose</span></button>
    <div class="sidebar-section-label">MAILBOX</div>
    <nav class="nav-list" aria-label="Mailbox folders">${navItems.map(([id, name, symbol]) => `<button class="nav-item ${state.view === id ? 'active' : ''}" data-action="nav" data-value="${id}" aria-label="${name}" title="${name}">${icon(symbol, 19, symbol === 'star' && state.view === id)}<span>${name}</span>${count(id) ? `<b>${count(id)}</b>` : ''}</button>`).join('')}</nav>
    <div class="labels-heading"><span>LABELS</span><button title="Create label" aria-label="Create label" data-action="new-label">${icon('plus', 18)}</button></div>
    <nav class="nav-list label-nav" aria-label="Labels">${state.mailbox.labels.map(name => `<button class="nav-item ${state.view === `label:${name}` ? 'active' : ''}" data-action="nav" data-value="label:${attr(name)}"><span class="nav-label-dot" style="background:${labelColors[name] || '#8290a4'}"></span><span>${esc(name)}</span></button>`).join('')}</nav>
    <div class="sidebar-footer"><span class="storage-icon">${icon('check', 13)}</span><span>Everything is up to date</span></div>`
  document.getElementById('sidebar').classList.toggle('mobile-open', state.mobileNav)
  const scrim = document.getElementById('mobile-scrim')
  scrim.hidden = !state.mobileNav
}

function labelPopover() {
  const targets = state.labelTargets.length ? state.labelTargets : state.openId ? [state.openId] : [...state.selected]
  return `<div class="popover label-popover" data-popover="label"><div class="popover-heading">Label as</div>
    ${state.mailbox.labels.map(name => {
      const checked = targets.length && targets.every(id => state.mailbox.threads.find(t => t.id === id)?.labels.includes(name))
      return `<button class="label-option" data-action="apply-label" data-value="${attr(name)}"><span class="mini-check ${checked ? 'checked' : ''}">${checked ? icon('check', 12) : ''}</span><span class="label-dot" style="background:${labelColors[name] || '#8290a4'}"></span>${esc(name)}</button>`
    }).join('')}<div class="popover-divider"></div>
    <form class="new-label" data-form="new-label"><input aria-label="New label name" placeholder="New label" name="label"/><button title="Create label">${icon('plus', 16)}</button></form></div>`
}

function viewName() {
  if (state.view === 'search') return 'Search results'
  if (state.view.startsWith('label:')) return state.view.slice(6)
  return ({ inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts', archive: 'Archive', trash: 'Trash', all: 'All mail' })[state.view]
}

function listRow(item) {
  if (item.type === 'draft') {
    const draft = item.data
    const checked = state.selected.has(draft.id)
    return `<div class="mail-row draft-row ${checked ? 'selected' : ''}" role="listitem" tabindex="0" data-action="open-draft" data-id="${attr(draft.id)}">
      <button class="selection-check ${checked ? 'checked' : ''}" title="Select draft" aria-label="Select draft ${attr(draft.subject)}" data-action="select" data-id="${attr(draft.id)}">${checked ? icon('check', 13) : ''}</button>
      <span class="row-star-placeholder"></span><span class="row-avatar draft-avatar">${icon('pen', 17)}</span><div class="row-sender draft-sender">Draft</div>
      <div class="row-main"><div class="row-text"><span class="row-subject">${esc(draft.subject || '(no subject)')}</span><span class="row-divider">—</span><span class="row-snippet">${esc(draft.body || draft.to || 'Continue writing your message')}</span></div><div class="draft-recipient">To: ${esc(draft.to || 'No recipient')}</div></div>
      <div class="row-end"><time>${listDate(draft.updatedAt)}</time></div></div>`
  }
  const thread = item.data, message = latest(thread), checked = state.selected.has(thread.id)
  return `<div class="mail-row ${thread.unread ? 'unread' : ''} ${checked ? 'selected' : ''}" role="listitem" tabindex="0" data-action="open-thread" data-id="${attr(thread.id)}">
    <button class="selection-check ${checked ? 'checked' : ''}" title="Select conversation" aria-label="Select ${attr(thread.subject)}" data-action="select" data-id="${attr(thread.id)}">${checked ? icon('check', 13) : ''}</button>
    ${ib('star', 'star', thread.starred ? 'Remove star' : 'Star', `row-star ${thread.starred ? 'starred' : ''}`, `data-id="${attr(thread.id)}"`)}
    <span class="row-avatar" style="background:${avatarColor(message.from)}">${esc(initials(message.from))}</span>
    <div class="row-sender">${esc(message.from)}${thread.messages.length > 1 ? `<span class="thread-count">${thread.messages.length}</span>` : ''}</div>
    <div class="row-main"><div class="row-text"><span class="row-subject">${esc(thread.subject)}</span><span class="row-divider">—</span><span class="row-snippet">${esc(message.body.replace(/\s+/g, ' ').trim())}</span></div>${thread.labels.length ? `<div class="row-labels">${thread.labels.slice(0, 2).map(badge).join('')}</div>` : ''}</div>
    <div class="row-end">${thread.messages.some(m => m.attachments?.length) ? `<span class="row-paperclip">${icon('paperclip', 15)}</span>` : ''}<time>${listDate(message.date)}</time></div>
    <div class="row-hover-actions">${thread.folder === 'archive' || thread.folder === 'trash' ? ib('restore-one', 'inbox', 'Move to Inbox', '', `data-id="${attr(thread.id)}"`) : ib('archive-one', 'archive', 'Archive', '', `data-id="${attr(thread.id)}"`)}${ib('trash-one', 'trash', thread.folder === 'trash' ? 'Delete forever' : 'Move to Trash', '', `data-id="${attr(thread.id)}"`)}${ib('mark-one', thread.unread ? 'mailOpen' : 'mail', thread.unread ? 'Mark as read' : 'Mark as unread', '', `data-id="${attr(thread.id)}"`)}</div>
  </div>`
}

function renderList() {
  const all = entries(), pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE)), page = Math.min(state.page, pages - 1)
  state.page = page
  const visible = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const allSelected = visible.length > 0 && visible.every(item => state.selected.has(item.data.id))
  const selectedThreads = state.mailbox.threads.filter(t => state.selected.has(t.id))
  const selectedDrafts = state.mailbox.drafts.filter(d => state.selected.has(d.id))
  const selectedCount = state.selected.size
  const description = state.view === 'inbox' ? `${inboxUnread()} unread across your inbox` : state.view === 'search' ? `Showing matches for “${state.query}”` : state.view === 'drafts' ? 'Pick up where you left off' : `${all.length} ${all.length === 1 ? 'conversation' : 'conversations'}`
  const tabs = state.view === 'inbox' ? `<div class="category-tabs" role="tablist" aria-label="Inbox categories">${categories.map(([id, name, symbol]) => {
    const count = state.mailbox.threads.filter(t => t.folder === 'inbox' && t.category === id && t.unread).length
    return `<button role="tab" aria-selected="${state.category === id}" class="${state.category === id ? 'active' : ''}" data-action="category" data-value="${id}">${icon(symbol, 18)}<span>${name}</span>${count ? `<b>${count}</b>` : ''}</button>`
  }).join('')}</div>` : ''
  let actions = ''
  if (selectedCount) {
    actions = `<span class="selection-count">${selectedCount} selected</span><span class="toolbar-separator"></span>`
    if (selectedThreads.length) actions += `${state.view === 'trash' || state.view === 'archive' ? ib('restore-selected', 'inbox', 'Move to Inbox') : ib('archive-selected', 'archive', 'Archive selected')}${ib('mark-selected', selectedThreads.every(t => t.unread) ? 'mailOpen' : 'mail', selectedThreads.every(t => t.unread) ? 'Mark as read' : 'Mark as unread')}<div class="relative">${ib('labels', 'tag', 'Label selected')}${state.labelMenu ? labelPopover() : ''}</div>`
    actions += ib('trash-selected', 'trash', state.view === 'trash' ? 'Delete forever' : selectedDrafts.length ? 'Discard selected' : 'Move to Trash')
  } else actions = `${ib('refresh', 'refresh', 'Refresh mailbox')}${state.view !== 'drafts' ? `<button class="filter-button ${state.unreadOnly ? 'active' : ''}" data-action="unread-filter"><span class="filter-dot"></span>Unread</button>` : ''}`
  const emptyTitle = state.view === 'search' ? 'No matching conversations' : state.unreadOnly ? 'All caught up' : state.view === 'drafts' ? 'No drafts yet' : 'Nothing here yet'
  const emptyDescription = state.view === 'search' ? 'Try another name, keyword, or search operator.' : state.unreadOnly ? 'There are no unread messages in this view.' : state.view === 'drafts' ? 'Messages you start writing will appear here.' : 'Messages in this section will show up here.'
  return `<div class="mail-heading"><div><div class="heading-kicker">YOUR MAILBOX</div><h2>${esc(viewName())}</h2><p>${esc(description)}</p></div><div class="heading-accent">${icon('mailOpen', 24)}</div></div>
    ${tabs}<div class="list-toolbar toolbar ${selectedCount ? 'has-selection' : ''}">
      <button class="selection-check ${allSelected ? 'checked' : ''}" title="${allSelected ? 'Deselect page' : 'Select page'}" aria-label="${allSelected ? 'Deselect page' : 'Select page'}" data-action="select-page" ${visible.length ? '' : 'disabled'}>${allSelected ? icon('check', 14) : ''}</button>
      ${actions}<span class="toolbar-spacer"></span><span class="pagination-text">${all.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, all.length)} of ${all.length}` : '0 of 0'}</span>
      ${ib('page-prev', 'left', 'Previous page', page === 0 ? 'disabled-look' : '')}${ib('page-next', 'right', 'Next page', page >= pages - 1 ? 'disabled-look' : '')}
    </div><div class="mail-list" role="list">${visible.length ? visible.map(listRow).join('') : `<div class="empty-state"><div class="empty-art">${icon('mailOpen', 34)}</div><h3>${emptyTitle}</h3><p>${emptyDescription}</p>${state.view === 'drafts' ? '<button class="empty-action" data-action="compose">Compose a message</button>' : ''}</div>`}</div>
    <div class="list-footer"><span>Local mailbox · changes are saved automatically</span><span>${icon('help', 14)} Press <kbd>/</kbd> to search · <kbd>c</kbd> to compose</span></div>`
}

function renderThread(thread) {
  const all = entries(), position = all.findIndex(item => item.data.id === thread.id)
  const content = thread.messages.map((message, index) => {
    const expanded = !state.collapsed.has(message.id) && (index === thread.messages.length - 1 || state.expanded.has(message.id))
    return `<article class="message-card ${expanded ? 'expanded' : 'collapsed'}">
      <button class="message-heading" data-action="expand-message" data-id="${attr(message.id)}" aria-expanded="${expanded}">
        <span class="sender-avatar" style="background:${avatarColor(message.from)}">${esc(initials(message.from))}</span>
        <span class="message-sender-details"><strong>${esc(message.from)}</strong><span>${expanded ? `to ${esc(message.to)}` : esc(message.body.replace(/\s+/g, ' ').slice(0, 85))}</span></span>
        <span class="message-date">${fullDate(message.date)}</span>${icon('down', 16)}
      </button>
      ${expanded ? `<div class="message-expanded-content"><div class="sender-email">&lt;${esc(message.email)}&gt;</div>
        <div class="message-body">${message.body.split('\n').map(part => `<p>${part ? esc(part) : '&nbsp;'}</p>`).join('')}</div>
        ${message.attachments?.length ? `<div class="attachments"><div class="attachment-label">${icon('paperclip', 15)} ${message.attachments.length} ${message.attachments.length === 1 ? 'attachment' : 'attachments'}</div><div class="attachment-list">${message.attachments.map(file => `<button class="attachment-card" data-action="attachment" data-value="${attr(file)}" data-id="${attr(thread.id)}" title="Preview ${attr(file)}">${icon(/\.(png|jpg|jpeg)$/i.test(file) ? 'image' : 'file', 22)}<span>${esc(file)}</span>${icon('right', 16)}</button>`).join('')}</div></div>` : ''}
      </div>` : ''}</article>`
  }).join('')
  return `<div class="thread-toolbar toolbar">
    ${ib('back', 'arrowLeft', 'Back to messages')}<span class="toolbar-separator"></span>
    ${thread.folder === 'trash' || thread.folder === 'archive' ? ib('restore-one', 'inbox', 'Move to Inbox', '', `data-id="${attr(thread.id)}"`) : ib('archive-one', 'archive', 'Archive', '', `data-id="${attr(thread.id)}"`)}
    ${ib('trash-one', 'trash', state.view === 'trash' ? 'Delete forever' : 'Move to Trash', '', `data-id="${attr(thread.id)}"`)}
    ${ib('mark-unread', 'mail', 'Mark as unread', '', `data-id="${attr(thread.id)}"`)}
    <div class="relative">${ib('labels', 'tag', 'Labels')}${state.labelMenu ? labelPopover() : ''}</div>
    <span class="toolbar-spacer"></span><span class="thread-position">${position < 0 ? 'Conversation' : `${position + 1} of ${all.length}`}</span>
    ${ib('thread-prev', 'left', 'Previous conversation', position <= 0 ? 'disabled-look' : '')}${ib('thread-next', 'right', 'Next conversation', position < 0 || position >= all.length - 1 ? 'disabled-look' : '')}
  </div><div class="thread-content"><div class="thread-title-row"><div><div class="thread-eyebrow">CONVERSATION · ${thread.messages.length} ${thread.messages.length === 1 ? 'MESSAGE' : 'MESSAGES'}</div>
    <h2>${esc(thread.subject)}</h2><div class="thread-labels">${thread.labels.map(badge).join('')}</div></div>
    ${ib('star', 'star', thread.starred ? 'Remove star' : 'Star conversation', thread.starred ? 'starred' : '', `data-id="${attr(thread.id)}"`)}</div>
    <div class="conversation">${content}</div>
    <div class="thread-reply-actions"><button data-action="reply">${icon('reply', 17)} Reply</button><button data-action="forward">${icon('arrowRight', 17)} Forward</button></div>
  </div>`
}

function renderMain() {
  const thread = state.mailbox.threads.find(t => t.id === state.openId)
  document.getElementById('mail-panel').innerHTML = thread ? renderThread(thread) : renderList()
}

function renderCompose() {
  const target = document.getElementById('compose-layer')
  const draft = state.compose
  if (!draft) { target.innerHTML = ''; return }
  target.innerHTML = `<div class="compose-window ${state.minimized ? 'minimized' : ''}">
    <div class="compose-header"><div><span class="compose-status-dot"></span>${esc(state.minimized ? draft.subject || 'New message' : 'New message')}</div><div>
      ${ib('minimize', 'minimize', state.minimized ? 'Expand draft' : 'Minimize draft')}${ib('close-compose', 'x', 'Save and close')}</div></div>
    ${state.minimized ? '' : `<div class="compose-fields"><label><span>To</span><input id="compose-to" data-compose-field="to" aria-label="Recipients" placeholder="Recipients, separated by commas" value="${attr(draft.to)}" /></label>
      <label><span>Subject</span><input data-compose-field="subject" aria-label="Subject" placeholder="Subject" value="${attr(draft.subject)}" ${draft.replyToThreadId ? 'readonly' : ''} /></label></div>
      <textarea class="compose-body" data-compose-field="body" aria-label="Message body" placeholder="Write your message...">${esc(draft.body)}</textarea>
      <div class="compose-footer"><button class="send-button" data-action="send">Send ${icon('send', 16)}</button><span>⌘ Enter to send</span>${ib('discard', 'trash', 'Discard draft')}</div>`}
  </div>`
}

function renderToast() {
  const target = document.getElementById('toast-layer')
  if (!target) return
  target.innerHTML = state.toast ? `<div class="toast" role="status"><span>${esc(state.toast)}</span>${state.undo ? '<button data-action="undo">Undo</button>' : ''}<button class="toast-close" data-action="dismiss" title="Dismiss">${icon('x', 15)}</button></div>` : ''
}

function renderPreview() {
  const target = document.getElementById('preview-layer')
  if (!target) return
  const preview = state.preview
  if (!preview) { target.innerHTML = ''; return }
  const thread = state.mailbox.threads.find(t => t.id === preview.threadId)
  const message = thread?.messages.find(m => m.attachments?.includes(preview.filename))
  target.innerHTML = `<div class="preview-scrim" data-action="close-preview"><div class="preview-dialog">
    <div class="preview-header"><div>${icon('file', 20)}<strong>${esc(preview.filename)}</strong></div>${ib('close-preview', 'x', 'Close preview')}</div>
    <div class="preview-page"><div class="preview-document-icon">${icon(/\.(png|jpg|jpeg)$/i.test(preview.filename) ? 'image' : 'fileText', 30)}</div>
      <span class="preview-kicker">SAMPLE ATTACHMENT</span><h3>${esc(preview.filename)}</h3>
      <p>Shared by ${esc(message?.from || 'a sender')} in “${esc(thread?.subject || 'a conversation')}”.</p>
      <div class="preview-context">${esc(message?.body.slice(0, 360) || '')}</div>
    </div><div class="preview-footer"><span>Local preview of the seeded message context</span><button data-action="save-preview">${icon('download', 16)} Save summary</button></div>
  </div></div>`
}

function renderLabelModal() {
  const target = document.getElementById('label-modal-layer')
  if (!target) return
  target.innerHTML = state.labelMenu && !state.openId && !state.selected.size ? `<div class="label-modal-scrim" data-action="close-label"><div class="popover standalone-label-popover"><div class="popover-heading">Create a label</div><form class="new-label" data-form="new-label"><input aria-label="New label name" placeholder="Label name" name="label" autofocus /><button title="Create label">${icon('plus', 16)}</button></form></div></div>` : ''
}

function render() {
  document.documentElement.dataset.theme = state.settings.theme
  document.documentElement.dataset.density = state.settings.density
  root.innerHTML = `<div class="app-shell"><header class="topbar" id="topbar"></header><div class="workspace ${state.sidebarToggled ? 'sidebar-toggled' : ''}" id="workspace"><button id="mobile-scrim" class="mobile-scrim" data-action="toggle-menu" aria-label="Close menu" hidden></button><aside class="sidebar" id="sidebar"></aside><main class="mail-panel" id="mail-panel"></main></div><div id="label-modal-layer"></div><div id="compose-layer"></div><div id="preview-layer"></div><div id="toast-layer"></div></div>`
  renderTop(); renderSidebar(); renderMain(); renderLabelModal(); renderCompose(); renderPreview(); renderToast()
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]')
  if (!button) {
    if (state.accountOpen && !event.target.closest('.account-popover')) { state.accountOpen = false; renderTop() }
    if (state.labelMenu && !event.target.closest('[data-popover="label"]')) { state.labelMenu = false; renderMain(); renderLabelModal() }
    return
  }
  const action = button.dataset.action, id = button.dataset.id, value = button.dataset.value
  if (action === 'nav') return navigate(value)
  if (action === 'toggle-menu') {
    if (typeof window !== 'undefined' && window.innerWidth <= 650) state.mobileNav = !state.mobileNav
    else state.sidebarToggled = !state.sidebarToggled
    document.getElementById('workspace').classList.toggle('sidebar-toggled', state.sidebarToggled)
    renderSidebar(); return
  }
  if (action === 'compose') { newCompose(); document.getElementById('compose-to')?.focus(); return }
  if (action === 'theme') { state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light'; persist(); render(); return }
  if (action === 'density') { state.settings.density = state.settings.density === 'comfortable' ? 'compact' : 'comfortable'; state.accountOpen = false; persist(); render(); return }
  if (action === 'account') { state.accountOpen = !state.accountOpen; renderTop(); return }
  if (action === 'reset') { if (confirm('Reset the sample mailbox and discard your local changes?')) { state.mailbox = createMailbox(); state.compose = null; state.accountOpen = false; navigate('inbox'); persist(); notify('Mailbox reset') } return }
  if (action === 'clear-search') { navigate('inbox'); document.getElementById('mail-search')?.focus(); return }
  if (action === 'new-label') { state.labelMenu = true; state.labelTargets = []; state.selected.clear(); state.openId = null; renderMain(); renderLabelModal(); document.querySelector('.standalone-label-popover input')?.focus(); return }
  if (action === 'close-label') { if (event.target === button) { state.labelMenu = false; renderLabelModal() } return }
  if (action === 'labels') { state.labelMenu = !state.labelMenu; state.labelTargets = state.openId ? [state.openId] : [...state.selected]; renderMain(); return }
  if (action === 'apply-label') return applyLabel(value)
  if (action === 'category') { state.category = value; state.page = 0; state.selected.clear(); renderMain(); return }
  if (action === 'unread-filter') { state.unreadOnly = !state.unreadOnly; state.page = 0; state.selected.clear(); renderMain(); return }
  if (action === 'refresh') return refreshMailbox()
  if (action === 'select') { state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id); renderMain(); return }
  if (action === 'select-page') {
    const pageItems = entries().slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE)
    const allSelected = pageItems.every(item => state.selected.has(item.data.id))
    pageItems.forEach(item => allSelected ? state.selected.delete(item.data.id) : state.selected.add(item.data.id)); renderMain(); return
  }
  if (action === 'page-prev' || action === 'page-next') { state.page = Math.max(0, Math.min(Math.ceil(entries().length / PAGE_SIZE) - 1, state.page + (action === 'page-prev' ? -1 : 1))); renderMain(); return }
  if (action === 'open-thread') return openThread(id)
  if (action === 'open-draft') { if (state.compose) syncDraft(state.compose); state.compose = state.mailbox.drafts.find(d => d.id === id); state.minimized = false; renderCompose(); return }
  if (action === 'star') return toggleStar(id)
  if (action === 'archive-one') return archiveThreads([id])
  if (action === 'trash-one') return trashThreads([id])
  if (action === 'restore-one') return restoreThreads([id])
  if (action === 'mark-one') { const thread = state.mailbox.threads.find(t => t.id === id); if (thread) markThreads([id], !thread.unread); return }
  if (action === 'mark-unread') return markThreads([id], true)
  if (action === 'archive-selected') return archiveThreads([...state.selected].filter(id => state.mailbox.threads.some(t => t.id === id)))
  if (action === 'trash-selected') {
    const threads = [...state.selected].filter(id => state.mailbox.threads.some(t => t.id === id))
    const drafts = [...state.selected].filter(id => state.mailbox.drafts.some(d => d.id === id))
    if (threads.length) trashThreads(threads)
    if (drafts.length) deleteDrafts(drafts)
    return
  }
  if (action === 'restore-selected') return restoreThreads([...state.selected])
  if (action === 'mark-selected') { const threads = state.mailbox.threads.filter(t => state.selected.has(t.id)); return markThreads(threads.map(t => t.id), !threads.every(t => t.unread)) }
  if (action === 'back') { state.openId = null; renderMain(); return }
  if (action === 'thread-prev' || action === 'thread-next') { const all = entries(), index = all.findIndex(item => item.data.id === state.openId); if (index < 0) return; const next = all[index + (action === 'thread-prev' ? -1 : 1)]; if (next?.type === 'thread') openThread(next.data.id); return }
  if (action === 'expand-message') {
    const thread = state.mailbox.threads.find(t => t.id === state.openId)
    if (latest(thread).id === id) state.collapsed.has(id) ? state.collapsed.delete(id) : state.collapsed.add(id)
    else state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id)
    renderMain(); return
  }
  if (action === 'reply' || action === 'forward') {
    const thread = state.mailbox.threads.find(t => t.id === state.openId), message = latest(thread)
    if (action === 'reply') newCompose({ to: message.outgoing ? thread.messages.find(m => !m.outgoing)?.email || '' : message.email, subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`, replyToThreadId: thread.id })
    else newCompose({ subject: `Fwd: ${thread.subject}`, body: `\n\n---------- Forwarded message ----------\nFrom: ${message.from} <${message.email}>\nDate: ${fullDate(message.date)}\nSubject: ${thread.subject}\n\n${message.body}` })
    document.getElementById(action === 'reply' ? 'compose-to' : 'compose-to')?.focus(); return
  }
  if (action === 'attachment') { state.preview = { filename: value, threadId: id }; renderPreview(); return }
  if (action === 'close-preview') { if (button === event.target || button.dataset.action === 'close-preview' && button.tagName === 'BUTTON') { state.preview = null; renderPreview() } return }
  if (action === 'save-preview') {
    const preview = state.preview, thread = state.mailbox.threads.find(t => t.id === preview.threadId)
    const message = thread?.messages.find(m => m.attachments?.includes(preview.filename))
    const content = `${preview.filename}\n\nShared by ${message?.from || 'a sender'}\nConversation: ${thread?.subject || ''}\n\n${message?.body || ''}`
    const link = document.createElement('a'), url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    link.href = url; link.download = `${preview.filename}.summary.txt`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('Summary saved'); return
  }
  if (action === 'minimize') { state.minimized = !state.minimized; renderCompose(); return }
  if (action === 'close-compose') return closeCompose()
  if (action === 'discard') return deleteDrafts([state.compose.id])
  if (action === 'send') return sendMessage()
  if (action === 'undo') { const undo = state.undo; state.toast = null; state.undo = null; if (undo) undo(); renderToast(); return }
  if (action === 'dismiss') { state.toast = null; state.undo = null; renderToast() }
})

document.addEventListener('input', event => {
  if (event.target.id === 'mail-search') {
    state.query = event.target.value
    state.view = state.query ? 'search' : 'inbox'
    state.openId = null; state.selected.clear(); state.page = 0
    document.getElementById('search-hint').hidden = !!state.query
    document.getElementById('search-clear').hidden = !state.query
    renderSidebar(); renderMain()
    return
  }
  const field = event.target.dataset.composeField
  if (field && state.compose) {
    state.compose[field] = event.target.value
    state.compose.updatedAt = new Date().toISOString()
    syncDraft(state.compose)
  }
})

document.addEventListener('submit', event => {
  if (event.target.dataset.form === 'new-label') { event.preventDefault(); createLabel(new FormData(event.target).get('label') || '') }
})

document.addEventListener('keydown', event => {
  const typing = ['INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable
  if (event.target.matches?.('.mail-row') && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault()
    if (event.target.dataset.action === 'open-thread') openThread(event.target.dataset.id)
    else if (event.target.dataset.action === 'open-draft') { if (state.compose) syncDraft(state.compose); state.compose = state.mailbox.drafts.find(d => d.id === event.target.dataset.id); state.minimized = false; renderCompose() }
    return
  }
  if (event.key === 'Escape') {
    if (state.preview) { state.preview = null; renderPreview() }
    else if (state.labelMenu) { state.labelMenu = false; renderMain(); renderLabelModal() }
    else if (state.accountOpen) { state.accountOpen = false; renderTop() }
    else if (state.mobileNav) { state.mobileNav = false; renderSidebar() }
    else if (state.compose) closeCompose()
    else if (state.openId) { state.openId = null; renderMain() }
    return
  }
  if (state.compose && (event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); sendMessage(); return }
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return
  if (event.key === '/') { event.preventDefault(); document.getElementById('mail-search')?.focus() }
  if (event.key.toLowerCase() === 'c') { newCompose(); document.getElementById('compose-to')?.focus() }
})

if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) refreshMailbox()
  if (event.key === SETTINGS_KEY) { state.settings = loadSettings(); render() }
})

persist()
render()
