import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { useApp } from './ctx'
import { threadDate, snippet } from './store'
import type { Category, Draft, Scheduled, Thread } from './types'
import { DateTimePicker, IconBtn, Menu, MenuItem, MenuSep } from './ui'
import { cx, fmtFuture, highlight, htmlToText, listDate, parseQuery, snoozeOptions } from './util'
import { ME } from './seed'
import { CATS, threadsFor, viewName } from './views'

export function SnoozeMenu({ ids, children }: { ids: string[]; children: (p: { toggle: () => void }) => React.ReactNode }) {
  const { act } = useApp()
  return (
    <Menu trigger={({ toggle }) => <>{children({ toggle })}</>}>
      {(close) => <>
        <div className="menu-h">Snooze until…</div>
        {snoozeOptions().map((o) => <MenuItem key={o.label} onClick={() => { close(); act({ t: 'snooze', ids, until: o.ts }, `Snoozed until ${fmtFuture(o.ts)}`) }}>{o.label}<small className="mi-sub">{fmtFuture(o.ts)}</small></MenuItem>)}
        <MenuSep />
        <DateTimePicker onPick={(ts) => { close(); act({ t: 'snooze', ids, until: ts }, `Snoozed until ${fmtFuture(ts)}`) }} />
      </>}
    </Menu>
  )
}

export function LabelMenu({ ids }: { ids: string[] }) {
  const { s, act } = useApp()
  const [name, setName] = useState('')
  const threads = s.threads.filter((t) => ids.includes(t.id))
  return (
    <Menu trigger={({ toggle }) => <IconBtn n="tag" label="Labels" onClick={toggle} />}>
      {() => <>
        <div className="menu-h">Label as:</div>
        {s.labels.map((l) => {
          const all = threads.length > 0 && threads.every((t) => t.labels.includes(l.id))
          return <MenuItem key={l.id} checked={all} onClick={() => act({ t: 'label', ids, label: l.id, on: !all }, all ? `Removed label ${l.name}` : `Labeled ${l.name}`)}><span className="dot" style={{ background: l.color }} />{l.name}</MenuItem>
        })}
        <MenuSep />
        <form className="new-label" onSubmit={(e) => {
          e.preventDefault(); const n = name.trim(); if (!n) return
          const id = n.toLowerCase().replace(/\W+/g, '-') + '-' + Math.random().toString(36).slice(2, 5)
          act({ t: 'addLabel', label: { id, name: n, color: ['#1a73e8', '#188038', '#e37400', '#8430ce', '#d93025', '#12857a'][s.labels.length % 6] } })
          act({ t: 'label', ids, label: id, on: true }, `Created label ${n}`); setName('')
        }}>
          <input placeholder="Create new label" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn sm" disabled={!name.trim()}>Add</button>
        </form>
      </>}
    </Menu>
  )
}

function Participants({ t, view }: { t: Thread; view: string }) {
  const names: string[] = []
  const seen = new Set<string>()
  const sentView = view === 'sent'
  for (const m of t.messages) {
    if (sentView) { if (m.from.email === ME.email) for (const p of m.to) if (!seen.has(p.email)) { seen.add(p.email); names.push(p.name.split(' ')[0]) } continue }
    const me = m.from.email === ME.email
    const k = m.from.email
    if (!seen.has(k)) { seen.add(k); names.push(me ? 'me' : (t.messages.length === 1 ? m.from.name : m.from.name.split(' ')[0])) }
  }
  const shown = names.length > 3 ? [names[0], '…', ...names.slice(-2)] : names
  return <span className="who ellip">{sentView && <span className="to-l">To: </span>}{shown.join(', ')}{t.messages.length > 1 && <span className="cnt"> {t.messages.length}</span>}</span>
}

function Row({ t, i, view, q }: { t: Thread; i: number; view: string; q: string }) {
  const { s, act, nav, sel, setSel, cursor, setCursor } = useApp()
  const checked = sel.has(t.id)
  const words = useMemo(() => view === 'search' ? parseQuery(q).text : [], [view, q])
  const labels = t.labels.map((id) => s.labels.find((l) => l.id === id)).filter(Boolean)
  const hasAtt = t.messages.some((m) => m.atts?.length)
  const atts = t.messages.flatMap((m) => m.atts ?? []).slice(0, 2)
  const toggle = (e: React.SyntheticEvent) => { e.stopPropagation(); const n = new Set(sel); checked ? n.delete(t.id) : n.add(t.id); setSel(n) }
  const inTrash = view === 'trash'
  return (
    <div className={cx('row', t.unread && 'unread', checked && 'checked', cursor === i && 'cursor')} role="row" onClick={() => nav(`/${view === 'search' ? 'search/' + encodeURIComponent(q) : view}/${t.id}`)} onMouseMove={() => cursor !== i && setCursor(i)} data-id={t.id}>
      <span className="row-lead">
        <button className={cx('cbox', checked && 'on')} role="checkbox" aria-checked={checked} aria-label="Select conversation" onClick={toggle}>{checked && <Icon n="check" s={14} />}</button>
        <button className={cx('starb', t.starred && 'on')} aria-label={t.starred ? 'Starred' : 'Not starred'} onClick={(e) => { e.stopPropagation(); act({ t: 'star', ids: [t.id], value: !t.starred }) }}><Icon n="star" s={19} fill={t.starred} /></button>
        <span className={cx('imp', t.important && 'on')} title={t.important ? 'Marked important' : ''}><Icon n="important" s={16} fill={t.important} /></span>
      </span>
      <span className="row-who"><Participants t={t} view={view} /></span>
      <span className="row-main">
        <span className="row-mobile-top"><Participants t={t} view={view} /><span className="row-date m">{listDate(threadDate(t))}</span></span>
        <span className="row-subj">
          {labels.map((l) => <span key={l!.id} className="lchip" style={{ ['--c' as string]: l!.color }}>{l!.name}</span>)}
          <b className="subj" dangerouslySetInnerHTML={{ __html: highlight(t.subject, words) }} />
          {s.settings.preview && <span className="snip" dangerouslySetInnerHTML={{ __html: ' – ' + highlight(snippet(t), words) }} />}
        </span>
        {hasAtt && <span className="row-atts">{atts.map((a) => <span key={a.id} className="att-mini"><Icon n={a.kind === 'image' ? 'image' : 'file'} s={13} />{a.name}</span>)}</span>}
      </span>
      <span className="row-meta">
        {hasAtt && <Icon n="clip" s={16} className="clip" />}
        <span className="row-date">{t.snoozedUntil ? <span className="snz"><Icon n="clock" s={13} /> {fmtFuture(t.snoozedUntil)}</span> : listDate(threadDate(t))}</span>
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          {inTrash ? <>
            <IconBtn n="inbox" label="Move to inbox" onClick={() => act({ t: 'restore', ids: [t.id] }, 'Conversation moved to Inbox')} />
            <IconBtn n="trash" label="Delete forever" onClick={() => { if (confirm('Delete this conversation forever?')) act({ t: 'purge', ids: [t.id] }, 'Conversation deleted forever') }} />
          </> : <>
            <IconBtn n="archive" label="Archive" onClick={() => act({ t: 'archive', ids: [t.id] }, 'Conversation archived')} />
            <IconBtn n="trash" label="Delete" onClick={() => act({ t: 'trash', ids: [t.id] }, 'Conversation moved to Trash')} />
            <IconBtn n={t.unread ? 'mail-open' : 'mail'} label={t.unread ? 'Mark as read' : 'Mark as unread'} onClick={() => act({ t: 'read', ids: [t.id], value: t.unread })} />
            <SnoozeMenu ids={[t.id]}>{({ toggle }) => <IconBtn n="clock" label="Snooze" onClick={toggle} />}</SnoozeMenu>
          </>}
        </span>
      </span>
    </div>
  )
}

function DraftRow({ d, sched }: { d?: Draft; sched?: Scheduled }) {
  const { s, openCompose, act } = useApp()
  const dr = (d ?? sched!.draft)
  const to = dr.to.map((e) => s.contacts.find((c) => c.email === e)?.name.split(' ')[0] ?? e).join(', ')
  return (
    <div className="row unread draft" role="row" onClick={() => sched ? undefined : openCompose(dr)}>
      <span className="row-lead"><span className="cbox ghost" /><span className="starb ghost"><Icon n="star" s={19} /></span><span className="imp" /></span>
      <span className="row-who"><span className="who ellip">{sched ? <>To: {to}</> : <><span className="draft-l">Draft</span>{to && ', ' + to}</>}</span></span>
      <span className="row-main"><span className="row-subj"><b className="subj">{dr.subject || '(no subject)'}</b><span className="snip"> – {htmlToText(dr.html).slice(0, 120)}</span></span></span>
      <span className="row-meta">
        <span className="row-date">{sched ? <span className="snz"><Icon n="sched" s={13} /> {fmtFuture(sched.sendAt)}</span> : listDate(dr.updatedAt)}</span>
        <span className="row-actions" onClick={(e) => e.stopPropagation()}>
          {sched ? <IconBtn n="x" label="Cancel send" onClick={() => act({ t: 'cancelScheduled', id: sched.id }, 'Send canceled')} /> : <IconBtn n="trash" label="Discard draft" onClick={() => act({ t: 'delDraft', id: dr.id }, 'Draft discarded')} />}
        </span>
      </span>
    </div>
  )
}

const EMPTY: Record<string, [string, string]> = {
  inbox: ['Nothing here. Enjoy the quiet.', 'You are all caught up in this tab.'], starred: ['No starred messages', 'Stars let you give messages a special status to make them easier to find.'],
  snoozed: ['No snoozed messages', 'Snooze messages until later when you are ready to deal with them.'], sent: ['No sent messages', 'Send your first message and it will show up here.'],
  drafts: ['You do not have any saved drafts', 'Saving a draft allows you to keep a message you are not ready to send yet.'], scheduled: ['No scheduled messages', 'Use the arrow next to Send to schedule delivery.'],
  trash: ['No conversations in Trash', 'Deleted messages stay here for 30 days.'], spam: ['Hooray, no spam here!', ''], search: ['No messages matched your search', 'Try different keywords or remove filters.'], all: ['No mail', ''],
}

export function MailList() {
  const { s, act, view, q, sel, setSel, toast, nav, refresh, cursor, setCursor } = useApp()
  const [tab, setTab] = useState<Category>(() => (sessionStorage.getItem('tab') as Category) || 'primary')
  useEffect(() => sessionStorage.setItem('tab', tab), [tab])
  const list = useMemo(() => view === 'drafts' || view === 'scheduled' ? [] : threadsFor(view, s, q, tab), [view, s, q, tab])
  const [page, setPage] = useState(0)
  const PER = 50
  useEffect(() => { setPage(0); setSel(new Set()) }, [view, q, tab]) // eslint-disable-line
  const rows = list.slice(page * PER, page * PER + PER)
  useEffect(() => { if (cursor >= rows.length) setCursor(Math.max(0, rows.length - 1)) }, [rows.length]) // eslint-disable-line
  const ids = [...sel].filter((id) => list.some((t) => t.id === id))
  const selThreads = list.filter((t) => sel.has(t.id))
  const allSel = rows.length > 0 && rows.every((t) => sel.has(t.id))
  const anyUnread = selThreads.some((t) => t.unread)
  const done = () => setSel(new Set())
  const selectWhere = (f: (t: Thread) => boolean) => setSel(new Set(rows.filter(f).map((t) => t.id)))
  const inTrash = view === 'trash', inSpam = view === 'spam'
  const tabCounts = useMemo(() => Object.fromEntries(CATS.map((c) => [c.id, s.threads.filter((t) => t.inbox && !t.trashed && !t.spam && !t.snoozedUntil && t.category === c.id && t.unread).length])), [s.threads])
  const [spin, setSpin] = useState(false)
  const draftsN = view === 'drafts' ? s.drafts.length : view === 'scheduled' ? s.scheduled.length : 0
  const total = view === 'drafts' || view === 'scheduled' ? draftsN : list.length

  return (
    <section className="list-pane">
      <div className="toolbar">
        <Menu trigger={({ toggle }) => (
          <span className="sel-split">
            <button className={cx('cbox big', allSel && 'on', !allSel && ids.length > 0 && 'mixed')} role="checkbox" aria-checked={allSel} aria-label="Select all" onClick={() => allSel || ids.length ? done() : selectWhere(() => true)}>{allSel ? <Icon n="check" s={14} /> : ids.length > 0 ? <span className="dash" /> : null}</button>
            <button className="ibtn tiny" aria-label="Selection options" onClick={toggle}><Icon n="down" s={14} /></button>
          </span>)}>
          {(close) => <>
            <MenuItem onClick={() => { close(); selectWhere(() => true) }}>All</MenuItem><MenuItem onClick={() => { close(); done() }}>None</MenuItem>
            <MenuItem onClick={() => { close(); selectWhere((t) => !t.unread) }}>Read</MenuItem><MenuItem onClick={() => { close(); selectWhere((t) => t.unread) }}>Unread</MenuItem>
            <MenuItem onClick={() => { close(); selectWhere((t) => t.starred) }}>Starred</MenuItem><MenuItem onClick={() => { close(); selectWhere((t) => !t.starred) }}>Unstarred</MenuItem>
          </>}
        </Menu>
        {ids.length === 0 ? <>
          <IconBtn n="refresh" label="Refresh" className={cx(spin && 'spin')} onClick={() => { setSpin(true); refresh(); setTimeout(() => setSpin(false), 800) }} />
          <Menu trigger={({ toggle }) => <IconBtn n="more" label="More" onClick={toggle} />}>
            {(close) => <>
              <MenuItem onClick={() => { close(); act({ t: 'read', ids: rows.map((t) => t.id), value: true }, 'Marked all in view as read') }}>Mark all as read</MenuItem>
              <MenuItem onClick={() => { close(); selectWhere(() => true) }}>Select all</MenuItem>
              {inTrash && <MenuItem danger onClick={() => { close(); if (list.length && confirm(`Permanently delete ${list.length} conversation(s)?`)) act({ t: 'purge', ids: list.map((t) => t.id) }, 'Trash emptied') }}>Empty Trash now</MenuItem>}
            </>}
          </Menu></> : <>
          {inTrash ? <>
            <IconBtn n="inbox" label="Move to Inbox" onClick={() => { act({ t: 'restore', ids }, `${ids.length} moved to Inbox`); done() }} />
            <IconBtn n="trash" label="Delete forever" onClick={() => { if (confirm('Delete forever?')) { act({ t: 'purge', ids }, 'Deleted forever'); done() } }} />
          </> : <>
            <IconBtn n="archive" label="Archive" onClick={() => { act({ t: 'archive', ids }, `${ids.length} archived`); done() }} />
            <IconBtn n="alert" label={inSpam ? 'Not spam' : 'Report spam'} onClick={() => { act({ t: 'spam', ids, value: !inSpam }, inSpam ? 'Moved to Inbox' : `${ids.length} marked as spam`); done() }} />
            <IconBtn n="trash" label="Delete" onClick={() => { act({ t: 'trash', ids }, `${ids.length} moved to Trash`); done() }} />
            <span className="tsep" />
            <IconBtn n={anyUnread ? 'mail-open' : 'mail'} label={anyUnread ? 'Mark as read' : 'Mark as unread'} onClick={() => { act({ t: 'read', ids, value: anyUnread }); done() }} />
            <SnoozeMenu ids={ids}>{({ toggle }) => <IconBtn n="clock" label="Snooze" onClick={toggle} />}</SnoozeMenu>
            <LabelMenu ids={ids} />
            <Menu trigger={({ toggle }) => <IconBtn n="more" label="More" onClick={toggle} />}>
              {(close) => <>
                <MenuItem onClick={() => { close(); act({ t: 'star', ids, value: true }, 'Starred'); done() }}>Add star</MenuItem>
                <MenuItem onClick={() => { close(); act({ t: 'star', ids, value: false }); done() }}>Remove star</MenuItem>
                <MenuItem onClick={() => { close(); act({ t: 'patch', ids, patch: { important: true } }); done() }}>Mark as important</MenuItem>
                <MenuItem onClick={() => { close(); act({ t: 'patch', ids, patch: { important: false } }); done() }}>Mark as not important</MenuItem>
              </>}
            </Menu>
          </>}
          <span className="sel-count">{ids.length} selected</span>
        </>}
        <span className="grow" />
        <span className="pager">
          <span className="pager-t">{total === 0 ? '0' : `${page * PER + 1}–${Math.min(total, page * PER + PER)} of ${total}`}</span>
          <IconBtn n="left" label="Newer" disabled={page === 0} onClick={() => setPage(page - 1)} />
          <IconBtn n="right" label="Older" disabled={(page + 1) * PER >= total} onClick={() => setPage(page + 1)} />
        </span>
      </div>

      {view === 'inbox' && s.settings.tabs && (
        <div className="tabs" role="tablist">
          {CATS.map((c) => (
            <button key={c.id} role="tab" aria-selected={tab === c.id} className={cx('tab', tab === c.id && 'on')} onClick={() => setTab(c.id)}>
              <Icon n={c.icon} s={18} /><span>{c.name}</span>{tabCounts[c.id] > 0 && <span className="badge">{tabCounts[c.id]} new</span>}
            </button>
          ))}
        </div>
      )}
      {view === 'search' && <div className="banner">Results for <b>{q}</b> <button className="link-btn" onClick={() => nav('/inbox')}>Clear search</button></div>}
      {inTrash && list.length > 0 && <div className="banner">Messages that have been in Trash more than 30 days will be automatically deleted. <button className="link-btn" onClick={() => { if (confirm('Permanently delete all?')) act({ t: 'purge', ids: list.map((t) => t.id) }, 'Trash emptied') }}>Empty Trash now</button></div>}
      {inSpam && list.length > 0 && <div className="banner">Messages in Spam for more than 30 days will be automatically deleted.</div>}

      <div className="rows" role="grid" aria-label={viewName(view, s)}>
        {view === 'drafts' && s.drafts.map((d) => <DraftRow key={d.id} d={d} />)}
        {view === 'scheduled' && [...s.scheduled].sort((a, b) => a.sendAt - b.sendAt).map((x) => <DraftRow key={x.id} sched={x} />)}
        {rows.map((t, i) => <Row key={t.id} t={t} i={i} view={view} q={q} />)}
        {total === 0 && (
          <div className="empty">
            <svg width="120" height="90" viewBox="0 0 120 90"><rect x="12" y="20" width="96" height="60" rx="8" fill="var(--empty1)" /><path d="M12 28l48 30 48-30" stroke="var(--empty2)" strokeWidth="4" fill="none" strokeLinejoin="round" /><circle cx="94" cy="20" r="14" fill="var(--accent)" opacity=".9" /><path d="M88 20l5 5 8-9" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <h3>{(EMPTY[view.startsWith('label:') ? 'all' : view] ?? EMPTY.all)[0]}</h3>
            <p>{view.startsWith('label:') ? 'No messages with this label.' : (EMPTY[view] ?? EMPTY.all)[1]}</p>
          </div>
        )}
        {total > 0 && view === 'inbox' && <div className="foot">{total} conversation{total === 1 ? '' : 's'} in {CATS.find((c) => c.id === tab)?.name}</div>}
      </div>
    </section>
  )
}
