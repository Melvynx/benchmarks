import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { Compose } from './Compose'
import { useApp } from './ctx'
import { LabelMenu, SnoozeMenu } from './MailList'
import { ME } from './seed'
import type { Msg, Thread } from './types'
import { Avatar, IconBtn, Menu, MenuItem, MenuSep } from './ui'
import { cx, fmtSize, linkify, listDate, longDate, sanitize, htmlToText } from './util'
import { threadsFor } from './views'
import { threadDate } from './store'

function MessageView({ t, m, last, open, onToggle, onDelete }: { t: Thread; m: Msg; last: boolean; open: boolean; onToggle: () => void; onDelete: () => void }) {
  const { replyTo, preview } = useApp()
  const [details, setDetails] = useState(false)
  const me = m.from.email === ME.email
  const toLine = m.to.map((p) => (p.email === ME.email ? 'me' : p.name.split(' ')[0])).join(', ')
  const html = useMemo(() => linkify(sanitize(m.html)), [m.html])
  if (!open) {
    return (
      <div className="msg collapsed" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle()}>
        <Avatar name={m.from.name} email={m.from.email} size={32} />
        <b className="msg-name">{me ? 'me' : m.from.name}</b>
        <span className="msg-snip ellip">{htmlToText(m.html).slice(0, 160)}</span>
        {m.atts?.length ? <Icon n="clip" s={15} /> : null}
        <span className="msg-date">{listDate(m.date)}</span>
      </div>
    )
  }
  return (
    <div className="msg open" id={'msg-' + m.id}>
      <div className="msg-head">
        <Avatar name={m.from.name} email={m.from.email} size={40} />
        <div className="msg-who" onClick={onToggle}>
          <div><b className="msg-name">{me ? 'me' : m.from.name}</b> <span className="msg-email">&lt;{m.from.email}&gt;</span></div>
          <div className="msg-to">
            to {toLine}{m.cc?.length ? `, cc ${m.cc.map((p) => p.name.split(' ')[0]).join(', ')}` : ''}
            <button className="link-btn plain" aria-label="Show details" onClick={(e) => { e.stopPropagation(); setDetails((d) => !d) }}><Icon n="down" s={14} /></button>
          </div>
        </div>
        <span className="msg-date long">{longDate(m.date)}</span>
        <span className="msg-actions">
          <IconBtn n="reply" label="Reply" onClick={() => replyTo(t.id, 'reply', m.id)} />
          <Menu align="right" trigger={({ toggle }) => <IconBtn n="more" label="More" onClick={toggle} />}>
            {(close) => <>
              <MenuItem icon="reply" onClick={() => { close(); replyTo(t.id, 'reply', m.id) }}>Reply</MenuItem>
              <MenuItem icon="reply-all" onClick={() => { close(); replyTo(t.id, 'all', m.id) }}>Reply to all</MenuItem>
              <MenuItem icon="forward" onClick={() => { close(); replyTo(t.id, 'forward', m.id) }}>Forward</MenuItem>
              <MenuSep />
              <MenuItem icon="trash" danger onClick={() => { close(); onDelete() }}>Delete this message</MenuItem>
            </>}
          </Menu>
        </span>
      </div>
      {details && (
        <table className="msg-details"><tbody>
          <tr><th>from:</th><td>{m.from.name} &lt;{m.from.email}&gt;</td></tr>
          <tr><th>to:</th><td>{m.to.map((p) => `${p.name} <${p.email}>`).join(', ')}</td></tr>
          {m.cc?.length ? <tr><th>cc:</th><td>{m.cc.map((p) => `${p.name} <${p.email}>`).join(', ')}</td></tr> : null}
          <tr><th>date:</th><td>{new Date(m.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>
          <tr><th>subject:</th><td>{t.subject}</td></tr>
        </tbody></table>
      )}
      <div className="msg-body" dangerouslySetInnerHTML={{ __html: html }} />
      {m.atts?.length ? (
        <div className="att-grid">
          {m.atts.map((a) => (
            <button key={a.id} className="att-card" onClick={() => preview(a, m.from.name)}>
              <span className={cx('att-thumb', a.kind)}><Icon n={a.kind === 'image' ? 'image' : 'file'} s={28} /><em>{a.name.split('.').pop()?.toUpperCase()}</em></span>
              <span className="att-info"><b className="ellip">{a.name}</b><small>{fmtSize(a.size)}</small></span>
            </button>
          ))}
        </div>
      ) : null}
      {last && (
        <div className="reply-bar">
          <button className="btn outline" onClick={() => replyTo(t.id, 'reply', m.id)}><Icon n="reply" s={18} />Reply</button>
          {(m.to.length + (m.cc?.length ?? 0) > 1) && <button className="btn outline" onClick={() => replyTo(t.id, 'all', m.id)}><Icon n="reply-all" s={18} />Reply all</button>}
          <button className="btn outline" onClick={() => replyTo(t.id, 'forward', m.id)}><Icon n="forward" s={18} />Forward</button>
        </div>
      )}
    </div>
  )
}

export function ThreadView() {
  const { s, act, nav, view, openId, q, composes, updateCompose, closeCompose, discardCompose, sendCompose } = useApp()
  const t = s.threads.find((x) => x.id === openId)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const list = useMemo(() => threadsFor(view, s, q, (sessionStorage.getItem('tab') as never) || 'primary'), [view, s, q])
  const idx = t ? list.findIndex((x) => x.id === t.id) : -1
  const base = view === 'search' ? 'search/' + encodeURIComponent(q) : view
  useEffect(() => {
    if (!t) return
    setExpanded(new Set(t.messages.length ? [t.messages[t.messages.length - 1].id] : []))
    if (t.unread) act({ t: 'read', ids: [t.id], value: true })
    window.scrollTo(0, 0)
  }, [t?.id]) // eslint-disable-line
  useEffect(() => { if (t && t.messages.length && !expanded.has(t.messages[t.messages.length - 1].id) && t.messages[t.messages.length - 1].from.email !== ME.email) setExpanded((e) => new Set(e).add(t.messages[t.messages.length - 1].id)) }, [t?.messages.length]) // eslint-disable-line
  if (!t) return <section className="thread-pane"><div className="empty"><h3>Conversation not found</h3><button className="btn" onClick={() => nav('/' + base)}>Back</button></div></section>
  const back = () => nav('/' + base)
  const after = (a: Parameters<typeof act>[0], msg: string) => { act(a, msg); back() }
  const inline = composes.find((c) => c.mode === 'inline' && c.threadId === t.id)
  const labels = t.labels.map((id) => s.labels.find((l) => l.id === id)).filter(Boolean)
  const allOpen = t.messages.every((m) => expanded.has(m.id))
  return (
    <section className="thread-pane">
      <div className="toolbar">
        <IconBtn n="back" label="Back to list" onClick={back} />
        {t.trashed ? <>
          <IconBtn n="inbox" label="Move to Inbox" onClick={() => after({ t: 'restore', ids: [t.id] }, 'Conversation moved to Inbox')} />
          <IconBtn n="trash" label="Delete forever" onClick={() => { if (confirm('Delete forever?')) after({ t: 'purge', ids: [t.id] }, 'Deleted forever') }} />
        </> : <>
          <IconBtn n="archive" label="Archive" onClick={() => after({ t: 'archive', ids: [t.id] }, 'Conversation archived')} />
          <IconBtn n="alert" label={t.spam ? 'Not spam' : 'Report spam'} onClick={() => after({ t: 'spam', ids: [t.id], value: !t.spam }, t.spam ? 'Moved to Inbox' : 'Conversation reported as spam')} />
          <IconBtn n="trash" label="Delete" onClick={() => after({ t: 'trash', ids: [t.id] }, 'Conversation moved to Trash')} />
          <span className="tsep" />
          <IconBtn n="mail" label="Mark as unread" onClick={() => { act({ t: 'read', ids: [t.id], value: false }); back() }} />
          <SnoozeMenu ids={[t.id]}>{({ toggle }) => <IconBtn n="clock" label="Snooze" onClick={toggle} />}</SnoozeMenu>
          <LabelMenu ids={[t.id]} />
          <Menu trigger={({ toggle }) => <IconBtn n="more" label="More" onClick={toggle} />}>
            {(close) => <>
              <MenuItem onClick={() => { close(); act({ t: 'star', ids: [t.id], value: !t.starred }) }}>{t.starred ? 'Remove star' : 'Add star'}</MenuItem>
              <MenuItem onClick={() => { close(); act({ t: 'patch', ids: [t.id], patch: { important: !t.important } }) }}>{t.important ? 'Mark as not important' : 'Mark as important'}</MenuItem>
              <MenuItem onClick={() => { close(); setExpanded(new Set(allOpen ? [] : t.messages.map((m) => m.id))) }}>{allOpen ? 'Collapse all' : 'Expand all'}</MenuItem>
              <MenuItem onClick={() => { close(); window.print() }}>Print</MenuItem>
            </>}
          </Menu>
        </>}
        <span className="grow" />
        <span className="pager"><span className="pager-t">{idx >= 0 ? `${idx + 1} of ${list.length}` : ''}</span>
          <IconBtn n="left" label="Newer" disabled={idx <= 0} onClick={() => nav(`/${base}/${list[idx - 1].id}`)} />
          <IconBtn n="right" label="Older" disabled={idx < 0 || idx >= list.length - 1} onClick={() => nav(`/${base}/${list[idx + 1].id}`)} /></span>
      </div>
      <div className="thread-scroll">
        <div className="thread-title">
          <h1>{t.subject}</h1>
          {labels.map((l) => <span key={l!.id} className="lchip big" style={{ ['--c' as string]: l!.color }}>{l!.name}<button aria-label={`Remove label ${l!.name}`} onClick={() => act({ t: 'label', ids: [t.id], label: l!.id, on: false })}><Icon n="x" s={12} /></button></span>)}
          {t.snoozedUntil && <span className="lchip big snz-chip"><Icon n="clock" s={13} /> Snoozed</span>}
          <span className="grow" />
          <button className={cx('starb', t.starred && 'on')} aria-label="Star" onClick={() => act({ t: 'star', ids: [t.id], value: !t.starred })}><Icon n="star" s={22} fill={t.starred} /></button>
        </div>
        {t.messages.map((m, i) => (
          <MessageView key={m.id} t={t} m={m} last={i === t.messages.length - 1 && !inline} open={expanded.has(m.id)}
            onToggle={() => setExpanded((e) => { const n = new Set(e); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n })}
            onDelete={() => act({ t: 'delMsg', threadId: t.id, msgId: m.id }, 'Message deleted')} />
        ))}
        {inline && (
          <div className="inline-wrap">
            <Compose c={inline} contacts={s.contacts} onChange={(p) => updateCompose(inline.id, p)} onClose={() => closeCompose(inline.id)} onDiscard={() => discardCompose(inline.id)}
              onSend={(d, at) => sendCompose(inline, d, at)} onSaved={(d) => act({ t: 'draft', draft: d })} />
          </div>
        )}
        <div className="thread-end">Last activity {longDate(threadDate(t))}</div>
      </div>
    </section>
  )
}
