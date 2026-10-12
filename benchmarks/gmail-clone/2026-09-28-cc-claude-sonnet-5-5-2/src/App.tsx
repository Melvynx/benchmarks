import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Compose, type ComposeState } from './Compose'
import { Icon } from './Icon'
import { C, useApp, type Ctx } from './ctx'
import { MailList } from './MailList'
import { ME, PEOPLE } from './seed'
import { Settings, Shortcuts } from './Settings'
import { load, reducer, save, type Action } from './store'
import { ThreadView } from './ThreadView'
import type { Att, Category, Draft, Person, State, Thread } from './types'
import { Avatar, IconBtn, Menu, MenuItem, MenuSep, Modal, useOutside } from './ui'
import { cx, fmtSize, htmlToText, linkify, sanitize, uid, longDate, matchThread, parseQuery, nameFromEmail } from './util'
import { FOLDERS, threadsFor } from './views'

const parseHash = (h: string) => {
  const seg = h.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  if (seg[0] === 'search') return { view: 'search', q: seg[1] ?? '', openId: seg[2] || null }
  return { view: seg[0] || 'inbox', q: '', openId: seg[1] || null }
}

const INCOMING: { from: Person; subject: string; cat: Category; html: string }[] = [
  { from: PEOPLE.sofia, subject: 'Quick question about the empty states', cat: 'primary', html: '<p>Hey Alex, do you have the final copy for the empty states handy? Priya is waiting on it to finish the illustrations.</p><p>Thanks! — Sofia</p>' },
  { from: PEOPLE.dan, subject: 'Standup moved to 10:15', cat: 'primary', html: '<p>Heads up: tomorrow\'s standup moves to 10:15 because of the all-hands prep. Same room.</p>' },
  { from: PEOPLE.cloud, subject: 'Your invoice for September is ready', cat: 'updates', html: '<p>Your invoice <b>#NB-20931</b> for <b>$9.99</b> is now available.</p>' },
  { from: PEOPLE.jonah, subject: 'Trailhead parking is full 😬', cat: 'primary', html: '<p>Just drove past the main lot, it is already packed. We should try the north entrance instead.</p>' },
]
const REPLIES = ['Thanks, that works for me!', 'Got it — I will take a look and get back to you shortly.', 'Sounds good. Let\'s sync later this week.', 'Perfect, appreciate the quick note. 🙌', 'Received, thank you!']

export default function App() {
  const [s, dispatch] = useReducer(reducer, undefined, load)
  const [hash, setHash] = useState(location.hash)
  const { view, q, openId } = useMemo(() => parseHash(hash), [hash])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState(0)
  const [composes, setComposes] = useState<ComposeState[]>([])
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [modal, setModal] = useState<null | 'settings' | 'keys' | { att: Att; from: string }>(null)
  const [toastS, setToastS] = useState<{ id: number; msg: string; label?: string; fn?: () => void } | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const sRef = useRef(s); sRef.current = s
  const toastT = useRef<number>(0)

  useEffect(() => { const h = () => setHash(location.hash); addEventListener('hashchange', h); if (!location.hash) location.hash = '#/inbox'; return () => removeEventListener('hashchange', h) }, [])
  useEffect(() => save(s), [s])
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const ap = () => document.documentElement.dataset.theme = s.settings.theme === 'system' ? (mq.matches ? 'dark' : 'light') : s.settings.theme
    ap(); mq.addEventListener('change', ap); return () => mq.removeEventListener('change', ap)
  }, [s.settings.theme])
  useEffect(() => { document.documentElement.dataset.density = s.settings.density }, [s.settings.density])
  useEffect(() => { setDrawer(false) }, [hash])

  const toast = useCallback((msg: string, o?: { label: string; fn: () => void }) => {
    const id = Date.now(); clearTimeout(toastT.current)
    setToastS({ id, msg, label: o?.label, fn: o?.fn })
    toastT.current = window.setTimeout(() => setToastS((t) => (t?.id === id ? null : t)), o ? Math.max(5, sRef.current.settings.undoSeconds) * 1000 : 4000)
  }, [])
  const nav = useCallback((p: string) => { location.hash = '#' + p; window.scrollTo(0, 0) }, [])
  const act = useCallback((a: Action, msg?: string) => {
    const prev = sRef.current
    dispatch(a)
    if (msg) toast(msg, { label: 'Undo', fn: () => { dispatch({ t: 'replace', state: prev }); setToastS(null) } })
  }, [toast])

  /* timers: scheduled send + snooze */
  useEffect(() => { const f = () => dispatch({ t: 'deliver', now: Date.now() }); f(); const i = setInterval(f, 5000); return () => clearInterval(i) }, [])

  const newMail = useCallback((silent?: boolean) => {
    const n = +(localStorage.getItem('mail-pool') || 0)
    const it = INCOMING[n]
    if (!it) { if (!silent) toast('No new mail'); return }
    localStorage.setItem('mail-pool', String(n + 1))
    const th: Thread = { id: uid('t'), subject: it.subject, category: it.cat, labels: [], inbox: true, starred: false, unread: true, trashed: false, spam: false, important: it.cat === 'primary', messages: [{ id: uid('m'), from: it.from, to: [ME], date: Date.now(), html: it.html }] }
    dispatch({ t: 'add', thread: th })
    toast(`New message from ${it.from.name}`, { label: 'View', fn: () => { nav(`/inbox/${th.id}`); setToastS(null) } })
  }, [toast, nav])
  useEffect(() => { if (+(localStorage.getItem('mail-pool') || 0) === 0) { const t = setTimeout(() => newMail(true), 45000); return () => clearTimeout(t) } }, [newMail])

  /* compose */
  const sigHtml = () => (sRef.current.settings.signature ? `<p><br></p><p>${sRef.current.settings.signature.replace(/</g, '&lt;')}</p>` : '<p><br></p>')
  const openCompose = useCallback((init: Partial<ComposeState> = {}) => {
    setComposes((cs) => {
      if (init.id && cs.some((c) => c.id === init.id)) return cs.map((c) => (c.id === init.id ? { ...c, minimized: false } : c))
      const c: ComposeState = { id: uid('d'), to: [], cc: [], bcc: [], subject: '', html: init.html ?? sigHtml(), atts: [], updatedAt: Date.now(), mode: 'window', ...init }
      return [...cs.filter((x) => x.mode === 'inline' || true), c].slice(-4)
    })
  }, [])
  const updateCompose = useCallback((id: string, p: Partial<ComposeState>) => setComposes((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c))), [])
  const isEmpty = (c: Draft) => !c.to.length && !c.cc.length && !c.subject && !htmlToText(c.html).replace(sRef.current.settings.signature, '').trim() && !c.atts.length
  const closeCompose = useCallback((id: string) => {
    setComposes((cs) => {
      const c = cs.find((x) => x.id === id)
      if (c) {
        if (isEmpty(c) || (c.kind && !htmlToText(c.html).replace(sRef.current.settings.signature, '').trim() && !c.atts.length && c.mode === 'inline' && false)) dispatch({ t: 'delDraft', id })
        else { const { mode: _m, minimized: _n, maximized: _x, kind: _k, quote: _q, ...d } = c; dispatch({ t: 'draft', draft: { ...d, updatedAt: Date.now() } }); setTimeout(() => toast('Draft saved'), 0) }
      }
      return cs.filter((x) => x.id !== id)
    })
  }, [toast])
  const discardCompose = useCallback((id: string) => { dispatch({ t: 'delDraft', id }); setComposes((cs) => cs.filter((c) => c.id !== id)); toast('Draft discarded') }, [toast])
  const sendCompose = useCallback((c: ComposeState, d: Draft, at?: number) => {
    const prev = sRef.current
    const threadId = d.threadId ?? uid('t')
    const draft = { ...d, threadId, subject: d.subject || (d.threadId ? '' : '(no subject)') }
    dispatch({ t: 'send', draft, sendAt: at })
    setComposes((cs) => cs.filter((x) => x.id !== c.id))
    if (at) toast(`Message scheduled for ${new Date(at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`, { label: 'Undo', fn: () => { dispatch({ t: 'replace', state: prev }); setComposes((cs) => [...cs, c]); setToastS(null) } })
    else {
      toast('Message sent', { label: 'Undo', fn: () => { dispatch({ t: 'replace', state: prev }); setComposes((cs) => [...cs.filter((x) => x.id !== c.id), c]); setToastS(null); clearTimeout(replyT.current) } })
      const who = sRef.current.contacts.find((p) => p.email === d.to[0] && !/no-reply|notifications|receipts|billing|calendar/.test(p.email))
      if (who && sRef.current.settings.autoReply) {
        clearTimeout(replyT.current)
        replyT.current = window.setTimeout(() => {
          dispatch({ t: 'incoming', threadId, from: who, html: `<p>${REPLIES[Math.floor(Math.random() * REPLIES.length)]}</p><p>${who.name.split(' ')[0]}</p>` })
          toast(`New reply from ${who.name}`, { label: 'View', fn: () => { nav(`/inbox/${threadId}`); setToastS(null) } })
        }, 14000 + Math.random() * 8000)
      }
    }
  }, [toast, nav])
  const replyT = useRef(0)

  const replyTo = useCallback((threadId: string, kind: 'reply' | 'all' | 'forward', msgId?: string) => {
    const t = sRef.current.threads.find((x) => x.id === threadId); if (!t) return
    const m = t.messages.find((x) => x.id === msgId) ?? t.messages[t.messages.length - 1]
    const me = ME.email
    let to: string[] = [], cc: string[] = []
    if (kind === 'reply') to = [m.from.email === me ? m.to[0]?.email ?? m.from.email : m.from.email]
    if (kind === 'all') {
      to = [m.from.email === me ? m.to[0]?.email : m.from.email].filter(Boolean) as string[]
      cc = [...m.to.slice(m.from.email === me ? 1 : 0), ...(m.cc ?? [])].map((p) => p.email).filter((e) => e !== me && !to.includes(e))
    }
    const quoted = `<div class="quote"><div>On ${longDate(m.date).replace(/ \(.*\)/, '')}, ${m.from.name} &lt;${m.from.email}&gt; wrote:</div><blockquote>${sanitize(m.html)}</blockquote></div>`
    const fwd = `<div class="quote"><div>---------- Forwarded message ---------<br>From: ${m.from.name} &lt;${m.from.email}&gt;<br>Date: ${new Date(m.date).toLocaleString()}<br>Subject: ${t.subject}<br>To: ${m.to.map((p) => p.email).join(', ')}</div><br>${sanitize(m.html)}</div>`
    const subject = kind === 'forward' ? (/^fwd:/i.test(t.subject) ? t.subject : 'Fwd: ' + t.subject) : /^re:/i.test(t.subject) ? t.subject : 'Re: ' + t.subject
    const existing = composes.find((c) => c.threadId === threadId && c.mode === 'inline')
    if (existing) setComposes((cs) => cs.filter((c) => c.id !== existing.id))
    openCompose({
      to, cc, subject, threadId: kind === 'forward' ? undefined : threadId, kind: kind === 'forward' ? 'forward' : 'reply', mode: kind === 'forward' ? 'window' : 'inline',
      html: sigHtml() + (kind === 'forward' ? fwd : quoted), atts: kind === 'forward' ? (m.atts ?? []) : [],
    })
    if (kind !== 'forward') setTimeout(() => document.querySelector<HTMLElement>('.inline-wrap .editor')?.focus(), 60)
  }, [composes, openCompose])

  const preview = useCallback((att: Att, from: string) => setModal({ att, from }), [])
  const refresh = useCallback(() => { setTimeout(() => newMail(), 600) }, [newMail])

  /* keyboard */
  const gRef = useRef(0)
  const ctxRef = useRef<Ctx>(null as never)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input,textarea,select,[contenteditable=true]')) { if (e.key === 'Escape') (el as HTMLElement).blur(); return }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const c = ctxRef.current, st = sRef.current, k = e.key
      if (document.querySelector('.scrim')) return
      const tab = (sessionStorage.getItem('tab') as Category) || 'primary'
      const list = c.view === 'drafts' || c.view === 'scheduled' ? [] : threadsFor(c.view, st, c.q, tab)
      const cur = list[c.cursor]
      const targets = () => c.openId ? [c.openId] : c.sel.size ? [...c.sel] : cur ? [cur.id] : []
      const nextGo = (v: string) => { if (Date.now() - gRef.current < 1200) { gRef.current = 0; c.nav('/' + v); return true } return false }
      const done = () => c.setSel(new Set())
      const after = () => { if (c.openId) c.nav('/' + (c.view === 'search' ? 'search/' + encodeURIComponent(c.q) : c.view)); done() }
      const ids = targets()
      const on = (fn: () => void) => { e.preventDefault(); fn() }
      switch (k) {
        case 'c': on(() => c.openCompose()); break
        case '/': on(() => document.querySelector<HTMLInputElement>('.search input')?.focus()); break
        case '?': on(() => setModal('keys')); break
        case 'g': gRef.current = Date.now(); break
        case 'i': if (!nextGo('inbox')) { if (e.shiftKey) { /* handled below */ } } break
        case 'I': if (ids.length) on(() => { c.act({ t: 'read', ids, value: true }, 'Marked as read'); after() }); break
        case 'U': if (ids.length) on(() => { c.act({ t: 'read', ids, value: false }, 'Marked as unread'); after() }); break
        case 'j': case 'ArrowDown': if (c.openId) { const i = list.findIndex((t) => t.id === c.openId); const n = list[i + 1]; if (n) on(() => c.nav(`/${c.view === 'search' ? 'search/' + encodeURIComponent(c.q) : c.view}/${n.id}`)) } else on(() => c.setCursor(Math.min(list.length - 1, c.cursor + 1))); break
        case 'k': case 'ArrowUp': if (c.openId) { const i = list.findIndex((t) => t.id === c.openId); const n = list[i - 1]; if (n) on(() => c.nav(`/${c.view === 'search' ? 'search/' + encodeURIComponent(c.q) : c.view}/${n.id}`)) } else on(() => c.setCursor(Math.max(0, c.cursor - 1))); break
        case 'o': case 'Enter': if (!c.openId && cur) on(() => c.nav(`/${c.view === 'search' ? 'search/' + encodeURIComponent(c.q) : c.view}/${cur.id}`)); break
        case 'u': if (c.openId) on(after); break
        case 'x': if (cur && !c.openId) on(() => { const n = new Set(c.sel); n.has(cur.id) ? n.delete(cur.id) : n.add(cur.id); c.setSel(n) }); break
        case 's': if (nextGo('starred')) break; if (ids.length) on(() => { const t = st.threads.find((x) => x.id === ids[0]); c.act({ t: 'star', ids, value: !t?.starred }) }); break
        case 't': nextGo('sent'); break
        case 'd': nextGo('drafts'); break
        case 'a': if (nextGo('all')) break; if (c.openId) on(() => c.replyTo(c.openId!, 'all')); break
        case 'e': if (ids.length && c.view !== 'trash') on(() => { c.act({ t: 'archive', ids }, `${ids.length > 1 ? ids.length + ' conversations' : 'Conversation'} archived`); after() }); break
        case '#': case 'Delete': if (ids.length) on(() => { c.act({ t: 'trash', ids }, 'Conversation moved to Trash'); after() }); break
        case '!': if (ids.length) on(() => { c.act({ t: 'spam', ids, value: true }, 'Reported as spam'); after() }); break
        case 'r': if (c.openId) on(() => c.replyTo(c.openId!, 'reply')); break
        case 'f': if (c.openId) on(() => c.replyTo(c.openId!, 'forward')); break
        case 'z': on(() => { const t = document.querySelector<HTMLButtonElement>('.toast button'); t?.click() }); break
        case 'Escape': if (c.openId) after(); else if (c.sel.size) done(); break
      }
    }
    addEventListener('keydown', h); return () => removeEventListener('keydown', h)
  }, [])

  const ctx: Ctx = { s, act, toast, nav, view, openId, q, sel, setSel, openCompose, updateCompose, composes, closeCompose, discardCompose, sendCompose, replyTo, preview, refresh, cursor, setCursor }
  ctxRef.current = ctx

  const unread = (f: (t: Thread) => boolean) => s.threads.filter((t) => t.unread && !t.trashed && f(t)).length
  const counts: Record<string, number> = {
    inbox: unread((t) => t.inbox && !t.spam && !t.snoozedUntil), drafts: s.drafts.length, spam: unread((t) => t.spam), scheduled: s.scheduled.length,
  }
  const winComposes = composes.filter((c) => c.mode === 'window')
  const shownFolders = FOLDERS.filter((f) => !f.more || moreOpen || view === f.id)

  return (
    <C.Provider value={ctx}>
      <div className={cx('app', collapsed && 'collapsed', drawer && 'drawer-open')}>
        <Header onMenu={() => (matchMedia('(max-width: 900px)').matches ? setDrawer(true) : setCollapsed((c) => !c))} onSettings={() => setModal('settings')} onKeys={() => setModal('keys')} />
        <div className="scrim-d" onClick={() => setDrawer(false)} />
        <nav className="sidebar" aria-label="Mailbox">
          <button className="compose-btn" onClick={() => { setDrawer(false); openCompose() }}><Icon n="pencil" s={22} /><span>Compose</span></button>
          {shownFolders.map((f) => (
            <a key={f.id} href={`#/${f.id}`} className={cx('nav-i', view === f.id && 'on')} aria-current={view === f.id ? 'page' : undefined}>
              <Icon n={f.icon} s={20} fill={view === f.id && f.id === 'starred'} /><span className="nav-n">{f.name}</span>{counts[f.id] > 0 && <span className="nav-c">{counts[f.id]}</span>}
            </a>
          ))}
          <button className="nav-i more" onClick={() => setMoreOpen((m) => !m)}><Icon n={moreOpen ? 'up' : 'down'} s={20} /><span className="nav-n">{moreOpen ? 'Less' : 'More'}</span></button>
          <div className="nav-h"><span>Labels</span><IconBtn n="plus" label="Create label" s={16} onClick={() => setModal('settings')} /></div>
          {s.labels.map((l) => {
            const n = s.threads.filter((t) => t.unread && !t.trashed && !t.spam && t.labels.includes(l.id)).length
            return <a key={l.id} href={`#/label:${l.id}`} className={cx('nav-i', view === 'label:' + l.id && 'on')}><span className="dot lg" style={{ background: l.color }} /><span className="nav-n">{l.name}</span>{n > 0 && <span className="nav-c">{n}</span>}</a>
          })}
        </nav>
        <main className="main">{openId ? <ThreadView /> : <MailList />}</main>
        <button className="fab" aria-label="Compose" onClick={() => openCompose()}><Icon n="pencil" s={24} /><span>Compose</span></button>
        <div className="compose-stack">
          {winComposes.map((c) => (
            <Compose key={c.id} c={c} contacts={s.contacts} onChange={(p) => updateCompose(c.id, p)} onClose={() => closeCompose(c.id)} onDiscard={() => discardCompose(c.id)}
              onSend={(d, at) => sendCompose(c, d, at)} onSaved={(d) => dispatch({ t: 'draft', draft: d })} />
          ))}
        </div>
        {toastS && <div className="toast" role="status"><span>{toastS.msg}</span>{toastS.label && <button onClick={toastS.fn}>{toastS.label}</button>}<button className="x" aria-label="Dismiss" onClick={() => setToastS(null)}><Icon n="x" s={16} /></button></div>}
        {modal === 'settings' && <Settings onClose={() => setModal(null)} />}
        {modal === 'keys' && <Shortcuts onClose={() => setModal(null)} />}
        {modal && typeof modal === 'object' && <AttPreview att={modal.att} from={modal.from} onClose={() => setModal(null)} />}
      </div>
    </C.Provider>
  )
}

function AttPreview({ att, from, onClose }: { att: Att; from: string; onClose: () => void }) {
  const download = () => {
    const blob = new Blob([`${att.name}\nSent by ${from}\n\n(Demo attachment — generated locally.)\n`], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = att.name + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <Modal title={att.name} onClose={onClose} wide>
      <div className="preview">
        <div className={cx('preview-art', att.kind)}>
          {att.kind === 'image' ? <svg viewBox="0 0 400 260" width="100%"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6d365" /><stop offset="1" stopColor="#fda085" /></linearGradient></defs><rect width="400" height="260" fill="url(#g)" /><circle cx="300" cy="80" r="34" fill="#fff" opacity=".7" /><path d="M0 260V180l90-70 80 60 70-40 160 90v40z" fill="#5b3a29" opacity=".55" /></svg>
            : <div className="doc-sheet"><i /><i /><i /><i className="s" /><i /><i className="s" /></div>}
        </div>
        <div className="preview-meta"><b>{att.name}</b><span>{fmtSize(att.size)} · from {from}</span><button className="btn primary" onClick={download}><Icon n="download" s={18} />Download</button></div>
      </div>
    </Modal>
  )
}

function Header({ onMenu, onSettings, onKeys }: { onMenu: () => void; onSettings: () => void; onKeys: () => void }) {
  const { s, q: hq, view, nav, act, openCompose } = useApp()
  const [text, setText] = useState(hq)
  const [focus, setFocus] = useState(false)
  const [adv, setAdv] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { setText(view === 'search' ? hq : '') }, [hq, view])
  useOutside(box, () => { setFocus(false); setAdv(false) }, focus || adv)
  const results = useMemo(() => { if (!text.trim()) return []; const pq = parseQuery(text); return s.threads.filter((t) => matchThread(t, pq, s)).sort((a, b) => b.messages[b.messages.length - 1].date - a.messages[a.messages.length - 1].date) }, [text, s])
  const run = (v = text) => { if (!v.trim()) return; act({ t: 'recent', q: v }); setFocus(false); setAdv(false); nav('/search/' + encodeURIComponent(v.trim())); (document.activeElement as HTMLElement)?.blur() }
  const [f, setF] = useState({ from: '', to: '', subject: '', words: '', att: false, unread: false, inn: '' })
  const build = () => [f.words, f.from && `from:${f.from}`, f.to && `to:${f.to}`, f.subject && `subject:${f.subject}`, f.att && 'has:attachment', f.unread && 'is:unread', f.inn && `in:${f.inn}`].filter(Boolean).join(' ')
  const chips = ['from:', 'to:', 'subject:', 'has:attachment', 'is:unread', 'is:starred', 'in:trash', 'newer_than:7d']
  const [acct, setAcct] = useState(false)
  const acctRef = useRef<HTMLDivElement>(null); useOutside(acctRef, () => setAcct(false), acct)
  return (
    <header className="header">
      <IconBtn n="menu" label="Main menu" onClick={onMenu} className="hamb" />
      <a className="logo" href="#/inbox" aria-label="Claude Sonnet 5.5"><svg width="30" height="30" viewBox="0 0 24 24"><path fill="#ea4335" d="M2 6l10 7 10-7v-1a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z" /><path fill="#c5221f" d="M2 8v11a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V8l-10 7z" /></svg><span>Claude Sonnet 5.5</span></a>
      <div className={cx('search', (focus || adv) && 'focus')} ref={box}>
        <button className="ibtn" aria-label="Search" onClick={() => run()}><Icon n="search" /></button>
        <input placeholder="Search mail" aria-label="Search mail" value={text} onFocus={() => setFocus(true)} onChange={(e) => { setText(e.target.value); setFocus(true) }}
          onKeyDown={(e) => { if (e.key === 'Enter') run(); if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); setFocus(false) } }} />
        {text && <IconBtn n="x" label="Clear search" onClick={() => { setText(''); if (view === 'search') nav('/inbox') }} />}
        <IconBtn n="sliders" label="Show search options" onClick={() => { setAdv((a) => !a); setFocus(false) }} active={adv} />
        {focus && !adv && (
          <div className="search-pop">
            {!text.trim() ? <>
              <div className="sp-h">Recent searches</div>
              {s.recent.map((r) => <button key={r} className="sp-i" onClick={() => run(r)}><Icon n="clock" s={18} />{r}</button>)}
              <div className="sp-h">Try</div>
              <div className="sp-chips">{chips.map((c) => <button key={c} className="fchip" onClick={() => { setText((t) => (t ? t + ' ' : '') + c); (box.current?.querySelector('input') as HTMLInputElement).focus() }}>{c}</button>)}</div>
            </> : <>
              {results.slice(0, 6).map((t) => { const m = t.messages[t.messages.length - 1]; return (
                <button key={t.id} className="sp-i res" onClick={() => { act({ t: 'recent', q: text }); setFocus(false); nav(`/search/${encodeURIComponent(text)}/${t.id}`) }}>
                  <Avatar name={m.from.name} email={m.from.email} size={28} /><span className="sp-t"><b className="ellip">{t.subject}</b><small className="ellip">{m.from.name} — {htmlToText(m.html).slice(0, 80)}</small></span>
                </button>) })}
              <button className="sp-i all" onClick={() => run()}><Icon n="search" s={18} />See all {results.length} result{results.length === 1 ? '' : 's'} for “{text}”</button>
            </>}
          </div>
        )}
        {adv && (
          <form className="adv" onSubmit={(e) => { e.preventDefault(); const v = build(); setText(v); run(v) }}>
            {([['From', 'from'], ['To', 'to'], ['Subject', 'subject'], ['Has the words', 'words']] as const).map(([l, k]) => <label key={k}><span>{l}</span><input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>)}
            <label><span>Search</span><select value={f.inn} onChange={(e) => setF({ ...f, inn: e.target.value })}><option value="">All mail</option><option value="inbox">Inbox</option><option value="sent">Sent</option><option value="starred">Starred</option><option value="trash">Trash</option><option value="spam">Spam</option><option value="anywhere">Mail &amp; Spam &amp; Trash</option></select></label>
            <div className="adv-checks"><label><input type="checkbox" checked={f.att} onChange={(e) => setF({ ...f, att: e.target.checked })} /> Has attachment</label><label><input type="checkbox" checked={f.unread} onChange={(e) => setF({ ...f, unread: e.target.checked })} /> Unread only</label></div>
            <div className="adv-f"><button type="button" className="btn" onClick={() => setF({ from: '', to: '', subject: '', words: '', att: false, unread: false, inn: '' })}>Clear</button><button className="btn primary">Search</button></div>
          </form>
        )}
      </div>
      <div className="head-r">
        <IconBtn n="help" label="Keyboard shortcuts" onClick={onKeys} className="hide-m" />
        <IconBtn n={document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'} label="Toggle theme" className="hide-m" onClick={() => act({ t: 'settings', patch: { theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' } })} />
        <IconBtn n="settings" label="Settings" onClick={onSettings} className="hide-m" />
        <div className="menu-wrap" ref={acctRef}>
          <button className="acct" aria-label="Account" onClick={() => setAcct((a) => !a)}><Avatar name={ME.name} email={ME.email} size={34} /></button>
          {acct && (
            <div className="menu right acct-card">
              <Avatar name={ME.name} email={ME.email} size={64} /><b>{ME.name}</b><small>{ME.email}</small>
              <div className="storage"><div><i style={{ width: '38%' }} /></div><small>5.7 GB of 15 GB used</small></div>
              <button className="btn outline" onClick={() => { setAcct(false); onSettings() }}>Settings</button>
              <button className="btn outline" onClick={() => { setAcct(false); openCompose() }}>Compose</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
