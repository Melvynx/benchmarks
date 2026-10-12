import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Category, Draft, Label, MailState, Thread } from './types'
import { I } from './icons'
import { Avatar, Btn, Check, Dropdown, MenuItem } from './ui'
import { ComposeWindow, toLocalInput } from './Compose'
import { ThreadView } from './ThreadView'
import { autoReply, deliver, draftIsEmpty, forwardDraft, loadState, newDraft, receiveMail, replyDraft, resetState, saveState, sigHtml } from './ops'
import { ME, ME_NAME, allContacts, firstName, hasAttach, hasSent, lastDate, lastMsg, listDate, nameOf, parseQuery, searchThreads, snippet, snoozeLabel, stripHtml, uid } from './util'

const PAGE = 20
const SYSTEM = [
  { id: 'inbox', name: 'Inbox', icon: 'inbox' },
  { id: 'starred', name: 'Starred', icon: 'starO' },
  { id: 'snoozed', name: 'Snoozed', icon: 'clock' },
  { id: 'sent', name: 'Sent', icon: 'send' },
  { id: 'drafts', name: 'Drafts', icon: 'file' },
  { id: 'scheduled', name: 'Scheduled', icon: 'sched' },
  { id: 'all', name: 'All Mail', icon: 'all' },
  { id: 'spam', name: 'Spam', icon: 'spam' },
  { id: 'trash', name: 'Trash', icon: 'delete' },
]
const CATS: { id: Category; name: string; icon: string; color: string }[] = [
  { id: 'primary', name: 'Primary', icon: 'inbox', color: '#1a73e8' },
  { id: 'promotions', name: 'Promotions', icon: 'tag', color: '#188038' },
  { id: 'social', name: 'Social', icon: 'people', color: '#1a73e8' },
  { id: 'updates', name: 'Updates', icon: 'info', color: '#e37400' },
]
const LABEL_COLORS = ['#1a73e8', '#a142f4', '#188038', '#e37400', '#007b83', '#d93025', '#3c4043']
const AUTOMATED = /notifications|receipts|no-reply|deploybot|calendar|bookings|alerts|news@|hello@|deals|events|trips|frontdesk/

interface Route { view: string; tid?: string; q?: string }
function parseHash(): Route {
  const raw = location.hash.replace(/^#\/?/, '').split('/')
  const view = decodeURIComponent(raw[0] || '') || 'inbox'
  if (view === 'search') return { view, q: decodeURIComponent(raw[1] || ''), tid: raw[2] }
  return { view, tid: raw[1] }
}
const hashFor = (r: Route) => (r.view === 'search' ? `#/search/${encodeURIComponent(r.q || '')}${r.tid ? '/' + r.tid : ''}` : `#/${r.view}${r.tid ? '/' + r.tid : ''}`)

function snoozeOptions(now: number) {
  const at = (add: number, h: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + add)
    d.setHours(h, 0, 0, 0)
    return d.getTime()
  }
  const d = new Date(now)
  const toSat = ((6 - d.getDay() + 7) % 7) || 7
  const toMon = ((8 - d.getDay()) % 7) || 7
  const opts = []
  if (d.getHours() < 15) opts.push({ label: 'Later today', ts: at(0, 18) })
  opts.push({ label: 'Tomorrow', ts: at(1, 8) }, { label: 'This weekend', ts: at(toSat, 8) }, { label: 'Next week', ts: at(toMon, 8) })
  return opts
}

function Hl({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
  return (
    <>
      {text.split(re).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}
    </>
  )
}

export default function App() {
  const [mail, setMail] = useState<MailState>(() => {
    const s = loadState()
    return { ...s, drafts: s.drafts.filter((d) => !draftIsEmpty(d)) }
  })
  const mailRef = useRef(mail)
  mailRef.current = mail
  const [route, setRoute] = useState<Route>(parseHash)
  const [now, setNow] = useState(Date.now())
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [cat, setCat] = useState<Category>('primary')
  const [cursor, setCursor] = useState(-1)
  const [page, setPage] = useState(0)
  const [composes, setComposes] = useState<{ id: string; min: boolean; max: boolean }[]>([])
  const [toasts, setToasts] = useState<{ id: string; msg: string; undo?: () => void; action?: { label: string; fn: () => void } }[]>([])
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [help, setHelp] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [spin, setSpin] = useState(false)
  const [newLabel, setNewLabel] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const gPending = useRef(false)

  const { view, tid } = route
  const q = route.q || ''
  const dark = mail.settings.theme

  useEffect(() => {
    const h = () => setRoute(parseHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  const nav = useCallback((r: Route) => {
    const h = hashFor(r)
    if (location.hash === h) setRoute(r)
    else location.hash = h
    setDrawer(false)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => saveState(mail), 250)
    return () => clearTimeout(id)
  }, [mail])

  useEffect(() => {
    const apply = () => {
      const t = dark === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : dark
      document.documentElement.dataset.theme = t
    }
    apply()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [dark])

  const toast = useCallback((msg: string, undo?: () => void, action?: { label: string; fn: () => void }) => {
    const id = uid()
    setToasts((t) => [...t.slice(-2), { id, msg, undo, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6500)
  }, [])

  // ticker: snooze expiry, scheduled sends
  useEffect(() => {
    const tick = () => {
      const n = Date.now()
      setNow(n)
      const s = mailRef.current
      const due = s.drafts.filter((d) => d.sendAt && d.sendAt <= n)
      const wake = s.threads.some((t) => t.snoozedUntil && t.snoozedUntil <= n)
      if (!due.length && !wake) return
      let next = s
      const replies: { threadId: string; from: string }[] = []
      for (const d of due) {
        const r = deliver(next, { ...d, sendAt: undefined })
        next = r.state
        const who = d.to.find((e) => !AUTOMATED.test(e) && e !== ME)
        if (who) replies.push({ threadId: r.threadId, from: who })
      }
      if (wake) next = { ...next, threads: next.threads.map((t) => (t.snoozedUntil && t.snoozedUntil <= n ? { ...t, snoozedUntil: undefined, read: false, box: 'inbox' } : t)) }
      setMail(next)
      if (due.length) toast(due.length > 1 ? `${due.length} scheduled messages sent` : 'Scheduled message sent')
      if (wake) toast('A snoozed conversation is back in your inbox')
      replies.forEach((r) => setTimeout(() => setMail((m) => autoReply(m, r.threadId, r.from)), 9000))
    }
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [toast])

  const contacts = useMemo(() => allContacts(mail.extraContacts), [mail.extraContacts])
  const terms = useMemo(() => (view === 'search' ? parseQuery(q).terms : []), [view, q])

  // ---- lists
  const live = useCallback((t: Thread) => !(t.snoozedUntil && t.snoozedUntil > now), [now])
  const list = useMemo(() => {
    const T = mail.threads
    let r: Thread[]
    if (view === 'search') r = searchThreads(T, q, mail.labels, now)
    else if (view === 'inbox') r = T.filter((t) => t.box === 'inbox' && live(t) && t.category === cat)
    else if (view === 'starred') r = T.filter((t) => t.starred && (t.box === 'inbox' || t.box === 'archive'))
    else if (view === 'snoozed') r = T.filter((t) => !live(t) && t.box !== 'trash')
    else if (view === 'sent') r = T.filter((t) => hasSent(t) && t.box !== 'trash' && t.box !== 'spam')
    else if (view === 'all') r = T.filter((t) => t.box === 'inbox' || t.box === 'archive')
    else if (view === 'spam' || view === 'trash') r = T.filter((t) => t.box === view)
    else if (view.startsWith('label:')) r = T.filter((t) => t.labels.includes(view.slice(6)) && t.box !== 'trash' && t.box !== 'spam')
    else r = []
    return [...r].sort((a, b) => (view === 'snoozed' ? (a.snoozedUntil! - b.snoozedUntil!) : lastDate(b) - lastDate(a)))
  }, [mail.threads, mail.labels, view, cat, q, now, live])

  const draftRows = useMemo(() => {
    if (view === 'drafts') return mail.drafts.filter((d) => !d.sendAt).sort((a, b) => b.updatedAt - a.updatedAt)
    if (view === 'scheduled') return mail.drafts.filter((d) => d.sendAt).sort((a, b) => a.sendAt! - b.sendAt!)
    return []
  }, [mail.drafts, view])
  const isDraftView = view === 'drafts' || view === 'scheduled'
  const total = isDraftView ? draftRows.length : list.length
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const pageList = list.slice(page * PAGE, page * PAGE + PAGE)
  const openThread = tid ? mail.threads.find((t) => t.id === tid) : undefined

  useEffect(() => {
    setSel(new Set())
    setPage(0)
    setCursor(-1)
  }, [view, q, cat])
  useEffect(() => {
    if (page >= pages) setPage(pages - 1)
  }, [page, pages])
  useEffect(() => {
    if (view === 'search') setSearchText(q)
    else if (!searchFocus) setSearchText('')
  }, [view, q]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (openThread && !openThread.read) setMail((m) => ({ ...m, threads: m.threads.map((t) => (t.id === openThread.id ? { ...t, read: true } : t)) }))
  }, [openThread?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const unreadIn = (c: Category) => mail.threads.filter((t) => t.box === 'inbox' && live(t) && !t.read && t.category === c).length
  const inboxUnread = mail.threads.filter((t) => t.box === 'inbox' && live(t) && !t.read).length
  const draftCount = mail.drafts.filter((d) => !d.sendAt).length
  const schedCount = mail.drafts.filter((d) => d.sendAt).length
  const spamUnread = mail.threads.filter((t) => t.box === 'spam' && !t.read).length

  // ---- mutations
  const mutate = (ids: string[], fn: (t: Thread) => Thread, msg?: string, leave = false) => {
    if (!ids.length) return
    const prev = mailRef.current.threads
    setMail((m) => ({ ...m, threads: m.threads.map((t) => (ids.includes(t.id) ? fn(t) : t)) }))
    if (msg) toast(msg, () => setMail((m) => ({ ...m, threads: prev })))
    setSel(new Set())
    if (leave && tid) {
      const idx = list.findIndex((t) => t.id === tid)
      const nxt = list[idx + 1] || list[idx - 1]
      nav({ view, q: route.q, tid: undefined })
      void nxt
    }
  }
  const targets = () => (openThread ? [openThread.id] : Array.from(sel))
  const plural = (n: number) => (n > 1 ? `${n} conversations` : 'Conversation')
  const archive = (ids = targets()) => mutate(ids, (t) => ({ ...t, box: 'archive' }), `${plural(ids.length)} archived`, true)
  const trash = (ids = targets()) => mutate(ids, (t) => ({ ...t, box: 'trash', snoozedUntil: undefined }), `${plural(ids.length)} moved to Trash`, true)
  const spam = (ids = targets()) => mutate(ids, (t) => ({ ...t, box: 'spam' }), `${plural(ids.length)} marked as spam`, true)
  const toInbox = (ids = targets()) => mutate(ids, (t) => ({ ...t, box: 'inbox' }), `${plural(ids.length)} moved to Inbox`, true)
  const markRead = (read: boolean, ids = targets()) => mutate(ids, (t) => ({ ...t, read }), undefined, true)
  const snooze = (ts: number, ids = targets()) => mutate(ids, (t) => ({ ...t, snoozedUntil: ts }), `Snoozed until ${snoozeLabel(ts)}`, true)
  const unsnooze = (ids = targets()) => mutate(ids, (t) => ({ ...t, snoozedUntil: undefined }), 'Snooze removed', true)
  const toggleStar = (id: string) => setMail((m) => ({ ...m, threads: m.threads.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)) }))
  const starIds = (on: boolean, ids = targets()) => mutate(ids, (t) => ({ ...t, starred: on }))
  const deleteForever = (ids = targets()) => {
    if (!ids.length) return
    const prev = mailRef.current.threads
    setMail((m) => ({ ...m, threads: m.threads.filter((t) => !ids.includes(t.id)) }))
    toast(`${plural(ids.length)} deleted forever`, () => setMail((m) => ({ ...m, threads: prev })))
    setSel(new Set())
    if (tid) nav({ view, q: route.q })
  }
  const emptyTrash = () => {
    const n = mailRef.current.threads.filter((t) => t.box === view).length
    if (!n) return
    deleteForever(mailRef.current.threads.filter((t) => t.box === view).map((t) => t.id))
  }
  const setLabel = (labelId: string, on: boolean, ids = targets()) => mutate(ids, (t) => ({ ...t, labels: on ? Array.from(new Set([...t.labels, labelId])) : t.labels.filter((x) => x !== labelId) }))
  const createLabel = (name: string, apply = false) => {
    const nm = name.trim()
    if (!nm) return
    if (mailRef.current.labels.some((l) => l.name.toLowerCase() === nm.toLowerCase())) return toast('A label with that name already exists')
    const l: Label = { id: uid(), name: nm, color: LABEL_COLORS[mailRef.current.labels.length % LABEL_COLORS.length] }
    setMail((m) => ({ ...m, labels: [...m.labels, l] }))
    if (apply) setLabel(l.id, true)
    else toast(`Label “${nm}” created`)
  }
  const deleteLabel = (l: Label) => {
    if (!window.confirm(`Delete label “${l.name}”? Conversations are not deleted.`)) return
    setMail((m) => ({ ...m, labels: m.labels.filter((x) => x.id !== l.id), threads: m.threads.map((t) => ({ ...t, labels: t.labels.filter((x) => x !== l.id) })) }))
    if (view === 'label:' + l.id) nav({ view: 'inbox' })
  }

  const refresh = () => {
    setSpin(true)
    setTimeout(() => {
      setSpin(false)
      const r = receiveMail(mailRef.current)
      if (r.subject) {
        setMail(r.state)
        toast(`1 new message: ${r.subject}`)
      } else toast('You’re all caught up')
    }, 700)
  }

  // ---- compose
  const openCompose = (d: Draft) => {
    setMail((m) => ({ ...m, drafts: m.drafts.some((x) => x.id === d.id) ? m.drafts : [...m.drafts, d] }))
    setComposes((c) => (c.some((x) => x.id === d.id) ? c.map((x) => (x.id === d.id ? { ...x, min: false } : x)) : [...c, { id: d.id, min: false, max: false }].slice(-3)))
  }
  const compose = (p: Partial<Draft> = {}) => openCompose(newDraft({ html: `<p><br></p>${sigHtml(mailRef.current.settings.signature)}`, ...p }))
  const patchDraft = (id: string, p: Partial<Draft>) => setMail((m) => ({ ...m, drafts: m.drafts.map((d) => (d.id === id ? { ...d, ...p, updatedAt: Date.now() } : d)) }))
  const dropCompose = (id: string) => setComposes((c) => c.filter((x) => x.id !== id))
  const closeCompose = (id: string) => {
    const d = mailRef.current.drafts.find((x) => x.id === id)
    dropCompose(id)
    if (!d) return
    if (draftIsEmpty(d)) {
      setMail((m) => ({ ...m, drafts: m.drafts.filter((x) => x.id !== id) }))
    } else toast('Draft saved', undefined, { label: 'View', fn: () => nav({ view: 'drafts' }) })
  }
  const discard = (id: string) => {
    dropCompose(id)
    setMail((m) => ({ ...m, drafts: m.drafts.filter((x) => x.id !== id) }))
    toast('Draft discarded')
  }
  const scheduleReply = (threadId: string, d: Draft) => {
    const who = d.to.find((e) => !AUTOMATED.test(e) && e !== ME)
    if (who) setTimeout(() => setMail((m) => (m.threads.some((t) => t.id === threadId) ? autoReply(m, threadId, who) : m)), 9000)
  }
  const sendDraft = (id: string, override?: Draft) => {
    const d = override || mailRef.current.drafts.find((x) => x.id === id)
    if (!d) return
    if (!d.to.length && !d.cc.length && !d.bcc.length) return toast('Please specify at least one recipient')
    const prev = mailRef.current
    const r = deliver(prev, d)
    setMail(r.state)
    dropCompose(id)
    toast(
      'Message sent',
      () => {
        setMail((m) => ({ ...m, threads: prev.threads, drafts: [...m.drafts.filter((x) => x.id !== d.id), d] }))
        setComposes((c) => [...c.filter((x) => x.id !== d.id), { id: d.id, min: false, max: false }])
      },
      { label: 'View message', fn: () => nav({ view: 'sent', tid: r.threadId }) },
    )
    scheduleReply(r.threadId, d)
  }
  const scheduleDraft = (id: string, ts: number) => {
    patchDraft(id, { sendAt: ts })
    const d = mailRef.current.drafts.find((x) => x.id === id)
    if (d && !d.to.length && !d.cc.length && !d.bcc.length) {
      patchDraft(id, { sendAt: undefined })
      return toast('Please specify at least one recipient')
    }
    dropCompose(id)
    toast(`Send scheduled for ${snoozeLabel(ts)}`, () => {
      patchDraft(id, { sendAt: undefined })
      setComposes((c) => [...c, { id, min: false, max: false }])
    }, { label: 'View', fn: () => nav({ view: 'scheduled' }) })
  }
  const reply = (t: Thread, all: boolean) => openCompose(replyDraft(t, all, mail.settings.signature, Date.now()))
  const quickReply = (t: Thread, text: string) => {
    const d = replyDraft(t, false, '', Date.now())
    sendDraft(d.id, { ...d, html: `<p>${text}</p>` })
  }

  // ---- keyboard
  const kb = useRef<(e: KeyboardEvent) => void>(() => {})
  kb.current = (e) => {
    const el = e.target as HTMLElement
    if (el.closest('input,textarea,select,[contenteditable="true"]')) {
      if (e.key === 'Escape') (el as HTMLElement).blur()
      return
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const k = e.key
    if (gPending.current) {
      gPending.current = false
      const map: Record<string, string> = { i: 'inbox', s: 'starred', t: 'sent', d: 'drafts', a: 'all', b: 'snoozed' }
      if (map[k]) return nav({ view: map[k] })
    }
    const rows = pageList
    const cur = rows[cursor]
    if (k === 'c') { e.preventDefault(); return compose() }
    if (k === '/') { e.preventDefault(); return searchRef.current?.focus() }
    if (k === '?') return setHelp((h) => !h)
    if (k === 'g') { gPending.current = true; setTimeout(() => (gPending.current = false), 1000); return }
    if (k === 'Escape') { if (help) return setHelp(false); if (openThread) return nav({ view, q: route.q }); if (sel.size) return setSel(new Set()); if (view === 'search') return nav({ view: 'inbox' }) }
    if (k === 'u') { if (openThread) nav({ view, q: route.q }); return }
    if (k === 'j' || k === 'k') {
      if (openThread) {
        const idx = list.findIndex((t) => t.id === openThread.id)
        const n = list[idx + (k === 'j' ? 1 : -1)]
        if (n) nav({ view, q: route.q, tid: n.id })
      } else setCursor((c) => Math.max(0, Math.min(rows.length - 1, c + (k === 'j' ? 1 : -1))))
      return
    }
    if ((k === 'Enter' || k === 'o') && cur && !openThread) { e.preventDefault(); return nav({ view, q: route.q, tid: cur.id }) }
    const t = openThread || cur
    if (k === 'x' && cur && !openThread) return setSel((s) => { const n = new Set(s); n.has(cur.id) ? n.delete(cur.id) : n.add(cur.id); return n })
    const ids = openThread ? [openThread.id] : sel.size ? Array.from(sel) : cur ? [cur.id] : []
    if (k === 's' && t) return ids.forEach(toggleStar)
    if (k === 'e' && ids.length) return archive(ids)
    if (k === '#' && ids.length) return view === 'trash' ? deleteForever(ids) : trash(ids)
    if (k === '!' && ids.length) return spam(ids)
    if (k === 'I' && ids.length) return markRead(true, ids)
    if (k === 'U' && ids.length) return markRead(false, ids)
    if (k === 'z') { const u = toasts[toasts.length - 1]?.undo; if (u) { u(); setToasts([]) } return }
    if (openThread && k === 'r') { e.preventDefault(); return reply(openThread, false) }
    if (openThread && k === 'a') { e.preventDefault(); return reply(openThread, true) }
    if (openThread && k === 'f') { e.preventDefault(); return openCompose(forwardDraft(openThread, mail.settings.signature, Date.now())) }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => kb.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ---- search
  const submitSearch = (text: string) => {
    const v = text.trim()
    if (!v) return
    setMail((m) => ({ ...m, recent: [v, ...m.recent.filter((r) => r !== v)].slice(0, 6) }))
    setSearchFocus(false)
    searchRef.current?.blur()
    nav({ view: 'search', q: v })
  }
  const quickResults = useMemo(() => (searchText.trim() ? searchThreads(mail.threads, searchText, mail.labels, now).slice(0, 5) : []), [searchText, mail.threads, mail.labels, now])

  // ---- render helpers
  const viewName = view === 'search' ? 'Search results' : view.startsWith('label:') ? mail.labels.find((l) => l.id === view.slice(6))?.name || 'Label' : SYSTEM.find((s) => s.id === view)?.name || ''
  const allSelected = pageList.length > 0 && pageList.every((t) => sel.has(t.id))
  const someSelected = sel.size > 0 && !allSelected
  const selThreads = (openThread ? [openThread] : mail.threads.filter((t) => sel.has(t.id)))
  const inTrash = view === 'trash'
  const inSpam = view === 'spam'

  const snoozeMenu = (
    <Dropdown trigger={(_o, t) => <Btn icon="clock" title="Snooze" onClick={t} />}>
      {(close) => (
        <div className="sched">
          <div className="menu-h">Snooze until…</div>
          {snoozeOptions(now).map((o) => (
            <MenuItem key={o.label} onClick={() => { close(); snooze(o.ts) }} right={new Date(o.ts).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}>{o.label}</MenuItem>
          ))}
          <SnoozePick onPick={(ts) => { close(); snooze(ts) }} now={now} />
        </div>
      )}
    </Dropdown>
  )

  const labelMenu = (
    <Dropdown trigger={(_o, t) => <Btn icon="label" title="Labels" onClick={t} />}>
      {(close) => <LabelMenu labels={mail.labels} threads={selThreads} onToggle={(id, on) => setLabel(id, on)} onCreate={(n) => { close(); createLabel(n, true) }} />}
    </Dropdown>
  )

  const hasTargets = openThread || sel.size > 0

  const toolbar = (
    <div className="toolbar">
      {openThread ? (
        <Btn icon="back" title="Back to list" onClick={() => nav({ view, q: route.q })} />
      ) : (
        <Dropdown
          className="selector"
          trigger={(_o, t) => (
            <span className="sel-wrap">
              <Check checked={allSelected} indeterminate={someSelected} label="Select" onChange={() => setSel(allSelected || someSelected ? new Set() : new Set(list.map((x) => x.id)))} />
              <button type="button" className="ibtn tiny" aria-label="Selection options" onClick={t}><I n="down" s={18} /></button>
            </span>
          )}
        >
          {(close) => (
            <>
              <MenuItem onClick={() => { close(); setSel(new Set(list.map((t) => t.id))) }}>All</MenuItem>
              <MenuItem onClick={() => { close(); setSel(new Set()) }}>None</MenuItem>
              <MenuItem onClick={() => { close(); setSel(new Set(list.filter((t) => t.read).map((t) => t.id))) }}>Read</MenuItem>
              <MenuItem onClick={() => { close(); setSel(new Set(list.filter((t) => !t.read).map((t) => t.id))) }}>Unread</MenuItem>
              <MenuItem onClick={() => { close(); setSel(new Set(list.filter((t) => t.starred).map((t) => t.id))) }}>Starred</MenuItem>
              <MenuItem onClick={() => { close(); setSel(new Set(list.filter((t) => !t.starred).map((t) => t.id))) }}>Unstarred</MenuItem>
            </>
          )}
        </Dropdown>
      )}
      {!hasTargets && !isDraftView && <Btn icon="refresh" title="Refresh" onClick={refresh} className={spin ? 'spin' : ''} />}
      {hasTargets && (
        <>
          {!inTrash && !inSpam && thread_box_ok(openThread, view) && <Btn icon="archive" title="Archive (e)" onClick={() => archive()} />}
          {!inSpam ? <Btn icon="spam" title="Report spam (!)" onClick={() => spam()} /> : <Btn icon="inbox" title="Not spam" onClick={() => toInbox()} />}
          <Btn icon="delete" title={inTrash ? 'Delete forever' : 'Delete (#)'} onClick={() => (inTrash ? deleteForever() : trash())} />
          <span className="sep" />
          {selThreads.every((t) => t.read) ? <Btn icon="mail" title="Mark as unread (U)" onClick={() => markRead(false)} /> : <Btn icon="drafts" title="Mark as read (I)" onClick={() => markRead(true)} />}
          {view === 'snoozed' ? <Btn icon="clock" title="Unsnooze" onClick={() => unsnooze()} /> : snoozeMenu}
          {labelMenu}
          <Dropdown trigger={(_o, t) => <Btn icon="more" title="More" onClick={t} />}>
            {(close) => (
              <>
                {(inTrash || view === 'all' || view === 'sent' || openThread?.box === 'archive') && <MenuItem icon="inbox" onClick={() => { close(); toInbox() }}>Move to Inbox</MenuItem>}
                <MenuItem icon="star" onClick={() => { close(); starIds(true) }}>Add star</MenuItem>
                <MenuItem icon="starO" onClick={() => { close(); starIds(false) }}>Remove star</MenuItem>
                <MenuItem icon="mail" onClick={() => { close(); markRead(false) }}>Mark as unread</MenuItem>
                <MenuItem icon="drafts" onClick={() => { close(); markRead(true) }}>Mark as read</MenuItem>
              </>
            )}
          </Dropdown>
        </>
      )}
      {!hasTargets && !isDraftView && (
        <Dropdown trigger={(_o, t) => <Btn icon="more" title="More" onClick={t} />}>
          {(close) => (
            <>
              <MenuItem icon="drafts" onClick={() => { close(); markRead(true, list.map((t) => t.id)) }}>Mark all as read</MenuItem>
              {(inTrash || inSpam) && <MenuItem icon="delete" onClick={() => { close(); emptyTrash() }}>Delete all {inTrash ? 'trash' : 'spam'} forever</MenuItem>}
              <MenuItem icon="info" onClick={() => { close(); setHelp(true) }}>Keyboard shortcuts</MenuItem>
            </>
          )}
        </Dropdown>
      )}
      <span className="grow" />
      {sel.size > 0 && !openThread && <span className="selcount">{sel.size} selected</span>}
      {openThread ? (
        (() => {
          const idx = list.findIndex((t) => t.id === openThread.id)
          return (
            <span className="pager">
              {idx >= 0 && <span className="pg-t">{idx + 1} of {list.length}</span>}
              <Btn icon="left" title="Newer" disabled={idx <= 0} onClick={() => nav({ view, q: route.q, tid: list[idx - 1].id })} />
              <Btn icon="right" title="Older" disabled={idx < 0 || idx >= list.length - 1} onClick={() => nav({ view, q: route.q, tid: list[idx + 1].id })} />
            </span>
          )
        })()
      ) : (
        <span className="pager">
          <span className="pg-t">{total === 0 ? '0' : `${page * PAGE + 1}–${Math.min(total, page * PAGE + PAGE)} of ${total}`}</span>
          <Btn icon="left" title="Newer" disabled={page === 0} onClick={() => setPage(page - 1)} />
          <Btn icon="right" title="Older" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} />
        </span>
      )}
    </div>
  )

  const renderRow = (t: Thread, i: number) => {
    const senders = (() => {
      if (view === 'sent') return 'To: ' + Array.from(new Set(t.messages.filter((m) => m.from === ME).flatMap((m) => m.to))).map(firstName).join(', ')
      const seen: string[] = []
      t.messages.forEach((m) => { if (!seen.includes(m.from)) seen.push(m.from) })
      const names = seen.map(firstName)
      const shown = names.length > 3 ? [names[0], '…', names[names.length - 1]] : names
      return shown.join(', ')
    })()
    const sender = t.messages.length > 1 && view !== 'sent' ? `${senders} (${t.messages.length})` : senders
    const draftInThread = false
    void draftInThread
    const first = t.messages.find((m) => m.from !== ME) || t.messages[0]
    return (
      <div
        key={t.id}
        className={`row ${t.read ? 'read' : 'unread'} ${sel.has(t.id) ? 'selected' : ''} ${cursor === i ? 'cursor' : ''}`}
        onClick={() => nav({ view, q: route.q, tid: t.id })}
        role="row"
      >
        <span className="r-check" onClick={(e) => e.stopPropagation()}>
          <Check checked={sel.has(t.id)} label="Select conversation" onChange={() => setSel((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n })} />
        </span>
        <span className="r-avatar" onClick={(e) => { e.stopPropagation(); setSel((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n }) }}>
          {sel.has(t.id) ? <span className="avatar sel" style={{ width: 40, height: 40 }}><I n="check" s={22} c="#fff" /></span> : <Avatar email={first.from} size={40} />}
        </span>
        <button type="button" className={`star r-star ${t.starred ? 'on' : ''}`} aria-label={t.starred ? 'Unstar' : 'Star'} title={t.starred ? 'Starred' : 'Not starred'} onClick={(e) => { e.stopPropagation(); toggleStar(t.id) }}>
          <I n={t.starred ? 'star' : 'starO'} s={20} />
        </button>
        <span className="r-sender"><Hl text={sender} terms={terms} /></span>
        <span className="r-main">
          {t.labels.map((id) => {
            const l = mail.labels.find((x) => x.id === id)
            return l ? <span key={id} className="lchip" style={{ background: l.color }}>{l.name}</span> : null
          })}
          {view === 'search' && t.box !== 'inbox' && <span className="lchip gray">{t.box === 'archive' ? 'All Mail' : t.box}</span>}
          <span className="r-subject"><Hl text={t.subject} terms={terms} /></span>
          <span className="r-snip"> – <Hl text={snippet(t)} terms={terms} /></span>
        </span>
        {hasAttach(t) && <span className="r-att"><I n="attach" s={16} /></span>}
        <span className="r-date">{view === 'snoozed' && t.snoozedUntil ? <span className="sn"><I n="clock" s={14} /> {snoozeLabel(t.snoozedUntil)}</span> : listDate(lastDate(t), now)}</span>
        <span className="r-actions" onClick={(e) => e.stopPropagation()}>
          {!inTrash && <Btn icon="archive" title="Archive" onClick={() => archive([t.id])} />}
          <Btn icon="delete" title={inTrash ? 'Delete forever' : 'Delete'} onClick={() => (inTrash ? deleteForever([t.id]) : trash([t.id]))} />
          <Btn icon={t.read ? 'mail' : 'drafts'} title={t.read ? 'Mark as unread' : 'Mark as read'} onClick={() => markRead(!t.read, [t.id])} />
          <Btn icon="clock" title="Snooze" onClick={() => snooze(snoozeOptions(now)[0].ts, [t.id])} />
        </span>
      </div>
    )
  }

  const renderDraftRow = (d: Draft) => (
    <div key={d.id} className="row read draftrow" onClick={() => openCompose(d)} role="row">
      <span className="r-check" />
      <span className="r-avatar"><span className="avatar" style={{ width: 40, height: 40, background: '#d93025' }}>D</span></span>
      <span className="r-star" />
      <span className="r-sender"><span className="draft-t">{d.sendAt ? 'Scheduled' : 'Draft'}</span></span>
      <span className="r-main">
        <span className="r-subject">{d.subject || '(no subject)'}</span>
        <span className="r-snip"> – {d.to.length ? `To: ${d.to.map(firstName).join(', ')} – ` : ''}{stripHtml(d.html).slice(0, 120)}</span>
      </span>
      <span className="r-att" />
      <span className="r-date">{d.sendAt ? snoozeLabel(d.sendAt) : listDate(d.updatedAt, now)}</span>
      <span className="r-actions" onClick={(e) => e.stopPropagation()}>
        {d.sendAt && <Btn icon="close" title="Cancel scheduled send" onClick={() => patchDraft(d.id, { sendAt: undefined })} />}
        <Btn icon="delete" title="Discard draft" onClick={() => { setMail((m) => ({ ...m, drafts: m.drafts.filter((x) => x.id !== d.id) })); toast('Draft discarded', () => setMail((m) => ({ ...m, drafts: [...m.drafts, d] }))) }} />
      </span>
    </div>
  )

  const emptyMsg: Record<string, [string, string]> = {
    inbox: ['Your inbox is empty', 'Nothing in this tab. Enjoy the quiet.'],
    starred: ['No starred conversations', 'Stars let you give messages a special status.'],
    snoozed: ['No snoozed conversations', 'Snooze messages to have them come back when you need them.'],
    sent: ['No sent messages', 'Messages you send show up here.'],
    drafts: ['No saved drafts', 'Drafts are saved automatically as you write.'],
    scheduled: ['No scheduled messages', 'Use the arrow next to Send to schedule delivery.'],
    spam: ['No spam here', 'Great news.'],
    trash: ['Trash is empty', 'Conversations in Trash are deleted forever after 30 days.'],
    all: ['No mail', ''],
  }
  const [emptyT, emptyD] = view === 'search' ? [`No messages matched “${q}”`, 'Try operators like from:, has:attachment, is:unread or label:work.'] : emptyMsg[view] || ['Nothing here', 'No conversations with this label.']

  const density = mail.settings.density

  return (
    <div className={`app d-${density} ${collapsed ? 'collapsed' : ''} ${drawer ? 'drawer-open' : ''}`}>
      <header className="topbar">
        <Btn icon="menu" title="Main menu" onClick={() => (window.innerWidth < 900 ? setDrawer(!drawer) : setCollapsed(!collapsed))} />
        <a className="logo" href="#/inbox" onClick={() => setCat('primary')}>
          <I n="mail" s={30} c="#d93025" />
          <span>Claude Sonnet 5.5</span>
        </a>
        <div className={`search ${searchFocus ? 'focus' : ''}`}>
          <button type="button" className="ibtn" title="Search" aria-label="Search" onClick={() => submitSearch(searchText)}><I n="search" /></button>
          <input
            ref={searchRef}
            value={searchText}
            placeholder="Search mail"
            aria-label="Search mail"
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSearch(searchText)
              if (e.key === 'Escape') { setSearchFocus(false); searchRef.current?.blur() }
            }}
          />
          {searchText && (
            <button type="button" className="ibtn" title="Clear search" aria-label="Clear search" onClick={() => { setSearchText(''); searchRef.current?.focus(); if (view === 'search') nav({ view: 'inbox' }) }}><I n="close" /></button>
          )}
          {searchFocus && (
            <div className="s-panel" onMouseDown={(e) => e.preventDefault()}>
              {!searchText.trim() ? (
                <>
                  <div className="s-chips">
                    {[['is:unread', 'Unread'], ['has:attachment', 'Attachments'], ['is:starred', 'Starred'], ['in:sent', 'Sent'], ['category:promotions', 'Promotions']].map(([v, n]) => (
                      <button type="button" key={v} onClick={() => submitSearch(v)}>{n}</button>
                    ))}
                    {mail.labels.slice(0, 3).map((l) => <button type="button" key={l.id} onClick={() => submitSearch(`label:${l.name}`)}>{l.name}</button>)}
                  </div>
                  {mail.recent.length > 0 && <div className="menu-h">Recent searches</div>}
                  {mail.recent.map((r) => (
                    <div className="s-item" key={r} onClick={() => { setSearchText(r); submitSearch(r) }}>
                      <I n="clock" s={18} /> <span>{r}</span>
                      <button type="button" className="ibtn tiny" aria-label="Remove" onClick={(e) => { e.stopPropagation(); setMail((m) => ({ ...m, recent: m.recent.filter((x) => x !== r) })) }}><I n="close" s={16} /></button>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {quickResults.map((t) => (
                    <div className="s-item" key={t.id} onClick={() => { setSearchFocus(false); nav({ view: 'search', q: searchText.trim(), tid: t.id }) }}>
                      <Avatar email={lastMsg(t).from} size={28} />
                      <span className="s-t"><b>{t.subject}</b><small>{nameOf(lastMsg(t).from)} · {snippet(t).slice(0, 70)}</small></span>
                      <small>{listDate(lastDate(t), now)}</small>
                    </div>
                  ))}
                  <div className="s-item" onClick={() => submitSearch(searchText)}><I n="search" s={18} /> <span>Search all mail for “{searchText.trim()}”</span></div>
                </>
              )}
            </div>
          )}
        </div>
        <span className="grow" />
        <Btn icon="help" title="Keyboard shortcuts" onClick={() => setHelp(true)} className="hide-m" />
        <Dropdown align="right" trigger={(_o, t) => <Btn icon="settings" title="Settings" onClick={t} />}>
          {() => (
            <div className="settings">
              <div className="menu-h">Quick settings</div>
              <div className="set-l">Theme</div>
              <div className="seg">
                {(['light', 'dark', 'system'] as const).map((th) => (
                  <button type="button" key={th} className={mail.settings.theme === th ? 'on' : ''} onClick={() => setMail((m) => ({ ...m, settings: { ...m.settings, theme: th } }))}>{th}</button>
                ))}
              </div>
              <div className="set-l">Density</div>
              <div className="seg">
                {(['default', 'comfortable', 'compact'] as const).map((d) => (
                  <button type="button" key={d} className={mail.settings.density === d ? 'on' : ''} onClick={() => setMail((m) => ({ ...m, settings: { ...m.settings, density: d } }))}>{d}</button>
                ))}
              </div>
              <div className="set-l">Signature</div>
              <textarea value={mail.settings.signature} rows={3} aria-label="Signature" onChange={(e) => setMail((m) => ({ ...m, settings: { ...m.settings, signature: e.target.value } }))} />
            </div>
          )}
        </Dropdown>
        <Dropdown align="right" trigger={(_o, t) => <button type="button" className="me-btn" onClick={t} aria-label="Account"><Avatar email={ME} size={32} /></button>}>
          {(close) => (
            <div className="account">
              <Avatar email={ME} size={64} />
              <b>{ME_NAME}</b>
              <span>{ME}</span>
              <div className="storage"><i style={{ width: '18%' }} /></div>
              <small>2.7 GB of 15 GB used</small>
              <button type="button" className="pill" onClick={() => { close(); if (window.confirm('Reset the mailbox to the original demo data?')) { setMail(resetState()); nav({ view: 'inbox' }); toast('Mailbox reset') } }}>Reset demo data</button>
            </div>
          )}
        </Dropdown>
      </header>

      <div className="body">
        <div className="scrim" onClick={() => setDrawer(false)} />
        <aside className="sidebar">
          <button type="button" className="compose-btn" onClick={() => compose()}>
            <I n="edit" s={24} />
            <span>Compose</span>
          </button>
          <nav>
            {SYSTEM.map((s) => {
              const count = s.id === 'inbox' ? inboxUnread : s.id === 'drafts' ? draftCount : s.id === 'scheduled' ? schedCount : s.id === 'spam' ? spamUnread : 0
              if (s.id === 'scheduled' && !schedCount) return null
              return (
                <a key={s.id} href={`#/${s.id}`} className={`nav-item ${view === s.id && !tid ? 'on' : view === s.id ? 'on' : ''}`} onClick={() => setCat('primary')} title={s.name}>
                  <I n={s.id === 'starred' && view === 'starred' ? 'star' : s.icon} s={20} />
                  <span className="nl">{s.name}</span>
                  {count > 0 && <span className="cnt">{count}</span>}
                </a>
              )
            })}
            <div className="nav-h">
              <span>Labels</span>
              <button type="button" className="ibtn tiny" title="Create new label" aria-label="Create new label" onClick={() => setNewLabel('')}><I n="add" s={18} /></button>
            </div>
            {newLabel !== null && (
              <form className="new-label" onSubmit={(e) => { e.preventDefault(); createLabel(newLabel); setNewLabel(null) }}>
                <input autoFocus value={newLabel} placeholder="Label name" aria-label="New label name" onChange={(e) => setNewLabel(e.target.value)} onBlur={() => setNewLabel(null)} onKeyDown={(e) => e.key === 'Escape' && setNewLabel(null)} />
              </form>
            )}
            {mail.labels.map((l) => {
              const c = mail.threads.filter((t) => t.labels.includes(l.id) && !t.read && t.box !== 'trash' && t.box !== 'spam').length
              return (
                <a key={l.id} href={`#/label:${l.id}`} className={`nav-item ${view === 'label:' + l.id ? 'on' : ''}`} title={l.name}>
                  <I n="label" s={20} c={l.color} />
                  <span className="nl">{l.name}</span>
                  {c > 0 && <span className="cnt">{c}</span>}
                  <button type="button" className="lbl-x" title="Delete label" aria-label={`Delete label ${l.name}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteLabel(l) }}><I n="close" s={14} /></button>
                </a>
              )
            })}
          </nav>
        </aside>

        <main className="panel">
          {toolbar}
          {openThread ? (
            <div className="scroll">
              <ThreadView
                thread={openThread}
                labels={mail.labels}
                now={now}
                onReply={() => reply(openThread, false)}
                onReplyAll={() => reply(openThread, true)}
                onForward={() => openCompose(forwardDraft(openThread, mail.settings.signature, Date.now()))}
                onStar={() => toggleStar(openThread.id)}
                onQuick={(txt) => quickReply(openThread, txt)}
                onLabelNav={(id) => nav({ view: 'label:' + id })}
                onRemoveLabel={(id) => setLabel(id, false, [openThread.id])}
                onRemoveInbox={() => archive([openThread.id])}
              />
            </div>
          ) : (
            <>
              {view === 'inbox' && (
                <div className="tabs" role="tablist">
                  {CATS.map((c) => {
                    const n = unreadIn(c.id)
                    return (
                      <button type="button" role="tab" aria-selected={cat === c.id} key={c.id} className={`tab ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)} style={{ ['--tc' as string]: c.color }}>
                        <I n={c.icon} s={20} />
                        <span>{c.name}</span>
                        {n > 0 && <span className="newb" style={{ background: c.color }}>{n} new</span>}
                      </button>
                    )
                  })}
                </div>
              )}
              {view === 'search' && (
                <div className="banner">Results for <b>{q}</b> <button type="button" onClick={() => nav({ view: 'inbox' })}>Clear search</button></div>
              )}
              {(inTrash || inSpam) && list.length > 0 && (
                <div className="banner">{inTrash ? 'Messages that have been in Trash more than 30 days will be automatically deleted.' : 'Messages that have been in Spam more than 30 days will be automatically deleted.'} <button type="button" onClick={emptyTrash}>Delete all {inTrash ? 'trash' : 'spam'} forever</button></div>
              )}
              {view !== 'inbox' && view !== 'search' && !isDraftView && <div className="view-h">{viewName}</div>}
              <div className="list scroll" role="grid" aria-label={viewName}>
                {isDraftView ? draftRows.map(renderDraftRow) : pageList.map(renderRow)}
                {total === 0 && (
                  <div className="empty">
                    <div className="empty-i"><I n={view === 'search' ? 'search' : SYSTEM.find((s) => s.id === view)?.icon || 'label'} s={64} /></div>
                    <h3>{emptyT}</h3>
                    <p>{emptyD}</p>
                  </div>
                )}
                {total > 0 && <div className="foot-note">Showing {total} conversation{total > 1 ? 's' : ''}</div>}
              </div>
            </>
          )}
        </main>
      </div>

      <button type="button" className="fab" aria-label="Compose" onClick={() => compose()}><I n="edit" s={24} /></button>

      <div className="composes">
        {composes.map((c) => {
          const d = mail.drafts.find((x) => x.id === c.id)
          if (!d) return null
          return (
            <ComposeWindow
              key={c.id}
              draft={d}
              state={c}
              contacts={contacts}
              now={now}
              onPatch={(p) => patchDraft(c.id, p)}
              onState={(s) => setComposes((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...s } : x)))}
              onClose={() => closeCompose(c.id)}
              onSend={() => sendDraft(c.id)}
              onSchedule={(ts) => scheduleDraft(c.id, ts)}
              onDiscard={() => discard(c.id)}
              onError={toast}
            />
          )
        })}
      </div>

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.msg}</span>
            {t.undo && <button type="button" onClick={() => { t.undo!(); setToasts((x) => x.filter((y) => y.id !== t.id)) }}>Undo</button>}
            {t.action && <button type="button" onClick={() => { t.action!.fn(); setToasts((x) => x.filter((y) => y.id !== t.id)) }}>{t.action.label}</button>}
            <button type="button" className="tx" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><I n="close" s={16} /></button>
          </div>
        ))}
      </div>

      {help && <Help onClose={() => setHelp(false)} />}
    </div>
  )
}

function thread_box_ok(t: Thread | undefined, view: string) {
  if (t) return t.box !== 'trash' && t.box !== 'spam'
  return view !== 'trash' && view !== 'spam'
}

function SnoozePick({ onPick, now }: { onPick: (ts: number) => void; now: number }) {
  const [v, setV] = useState('')
  return (
    <div className="pick">
      <input type="datetime-local" aria-label="Pick snooze date and time" value={v} min={toLocalInput(now)} onChange={(e) => setV(e.target.value)} />
      <button type="button" disabled={!v || new Date(v).getTime() <= Date.now()} onClick={() => onPick(new Date(v).getTime())}>Save</button>
    </div>
  )
}

function LabelMenu({ labels, threads, onToggle, onCreate }: { labels: Label[]; threads: Thread[]; onToggle: (id: string, on: boolean) => void; onCreate: (n: string) => void }) {
  const [f, setF] = useState('')
  const shown = labels.filter((l) => l.name.toLowerCase().includes(f.toLowerCase()))
  return (
    <div className="labelmenu">
      <div className="menu-h">Label as:</div>
      <input autoFocus className="lm-in" placeholder="Search or create" aria-label="Search labels" value={f} onChange={(e) => setF(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && f.trim() && !shown.some((l) => l.name.toLowerCase() === f.trim().toLowerCase()) && onCreate(f)} />
      {shown.map((l) => {
        const n = threads.filter((t) => t.labels.includes(l.id)).length
        const all = threads.length > 0 && n === threads.length
        return (
          <button type="button" key={l.id} className="mitem" onClick={() => onToggle(l.id, !all)}>
            <Check checked={all} indeterminate={n > 0 && !all} label={l.name} onChange={() => onToggle(l.id, !all)} />
            <I n="label" s={18} c={l.color} />
            <span className="mi-t">{l.name}</span>
          </button>
        )
      })}
      {f.trim() && !labels.some((l) => l.name.toLowerCase() === f.trim().toLowerCase()) && (
        <button type="button" className="mitem" onClick={() => onCreate(f)}><I n="add" s={18} /><span className="mi-t">Create “{f.trim()}”</span></button>
      )}
    </div>
  )
}

function Help({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['c', 'Compose'], ['/', 'Search'], ['j / k', 'Next / previous'], ['Enter or o', 'Open conversation'], ['u', 'Back to list'], ['x', 'Select conversation'],
    ['s', 'Star'], ['e', 'Archive'], ['#', 'Delete'], ['!', 'Report spam'], ['Shift+I', 'Mark as read'], ['Shift+U', 'Mark as unread'],
    ['r / a / f', 'Reply / reply all / forward'], ['g then i', 'Go to Inbox'], ['g then s', 'Go to Starred'], ['g then t', 'Go to Sent'], ['g then d', 'Go to Drafts'], ['z', 'Undo last action'], ['⌘/Ctrl+Enter', 'Send (in compose)'],
  ]
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h"><h2>Keyboard shortcuts</h2><Btn icon="close" title="Close" onClick={onClose} /></div>
        <div className="keys">
          {rows.map(([k, d]) => (
            <div key={k}><kbd>{k}</kbd><span>{d}</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export type { ReactNode }
