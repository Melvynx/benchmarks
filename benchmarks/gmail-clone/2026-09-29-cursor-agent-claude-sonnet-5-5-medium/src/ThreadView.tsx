import { useEffect, useState } from 'react'
import type { Label, Message, Thread } from './types'
import { I } from './icons'
import { Avatar } from './ui'
import { fmtSize, fullDate, ME, nameOf, listDate, stripHtml, lastMsg } from './util'

const KIND_COLOR: Record<string, string> = { pdf: '#d93025', image: '#188038', doc: '#1a73e8', sheet: '#0b8043', zip: '#e37400', cal: '#a142f4' }

function MessageCard({ m, thread, open, onToggle, now, onReply, onReplyAll, onForward, onStarThread, isLast }: {
  m: Message
  thread: Thread
  open: boolean
  onToggle: () => void
  now: number
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
  onStarThread: () => void
  isLast: boolean
}) {
  const [details, setDetails] = useState(false)
  const nm = m.from === ME ? 'me' : nameOf(m.from)
  if (!open) {
    return (
      <div className="msg collapsed" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle()}>
        <Avatar email={m.from} size={40} />
        <div className="msg-sum">
          <b>{nm}</b>
          <span className="snip">{stripHtml(m.html).slice(0, 140)}</span>
        </div>
        {m.attachments && <I n="attach" s={16} />}
        <span className="msg-date">{listDate(m.date, now)}</span>
      </div>
    )
  }
  const toNames = m.to.map((e) => (e === ME ? 'me' : nameOf(e)))
  return (
    <article className="msg open">
      <header className="msg-head" onClick={onToggle}>
        <Avatar email={m.from} size={40} />
        <div className="msg-who">
          <div className="msg-from">
            <b>{nm}</b> <span className="addr">&lt;{m.from}&gt;</span>
          </div>
          <button type="button" className="to-line" onClick={(e) => { e.stopPropagation(); setDetails(!details) }}>
            to {toNames.join(', ')}{m.cc?.length ? `, cc: ${m.cc.map(nameOf).join(', ')}` : ''} <I n="down" s={16} />
          </button>
        </div>
        <span className="msg-date full">{fullDate(m.date, now)}</span>
        <span className="msg-date short">{listDate(m.date, now)}</span>
        {isLast && (
          <button type="button" className={`star ${thread.starred ? 'on' : ''}`} title={thread.starred ? 'Starred' : 'Not starred'} aria-label="Toggle star" onClick={(e) => { e.stopPropagation(); onStarThread() }}>
            <I n={thread.starred ? 'star' : 'starO'} s={20} />
          </button>
        )}
        <button type="button" className="ibtn sm" title="Reply" aria-label="Reply" onClick={(e) => { e.stopPropagation(); onReply() }}><I n="reply" s={20} /></button>
      </header>
      {details && (
        <dl className="details">
          <dt>from:</dt><dd>{nameOf(m.from)} &lt;{m.from}&gt;</dd>
          <dt>to:</dt><dd>{m.to.join(', ')}</dd>
          {m.cc?.length ? (<><dt>cc:</dt><dd>{m.cc.join(', ')}</dd></>) : null}
          <dt>date:</dt><dd>{fullDate(m.date, now).replace(/ \(.*\)$/, '')}</dd>
          <dt>subject:</dt><dd>{thread.subject}</dd>
        </dl>
      )}
      <div className="msg-body" dangerouslySetInnerHTML={{ __html: m.html }} onClick={(e) => { const a = (e.target as HTMLElement).closest('a'); if (a) e.preventDefault() }} />
      {m.attachments && m.attachments.length > 0 && (
        <div className="atts">
          <div className="atts-h">{m.attachments.length} attachment{m.attachments.length > 1 ? 's' : ''}</div>
          <div className="atts-l">
            {m.attachments.map((a) => (
              <div className="att-card" key={a.name} title={`${a.name} (${fmtSize(a.size)})`}>
                <div className="att-prev" style={{ color: KIND_COLOR[a.kind] }}><I n="file" s={40} /></div>
                <div className="att-meta"><span style={{ background: KIND_COLOR[a.kind] }} className="att-k">{a.kind.toUpperCase()}</span><span className="att-n">{a.name}</span><small>{fmtSize(a.size)}</small></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isLast && (
        <div className="actions-row">
          <button type="button" className="pill" onClick={onReply}><I n="reply" s={18} /> Reply</button>
          <button type="button" className="pill" onClick={onReplyAll}><I n="replyAll" s={18} /> Reply all</button>
          <button type="button" className="pill" onClick={onForward}><I n="forward" s={18} /> Forward</button>
        </div>
      )}
    </article>
  )
}

export function ThreadView({ thread, labels, now, onReply, onReplyAll, onForward, onStar, onQuick, onLabelNav, onRemoveLabel, onRemoveInbox }: {
  thread: Thread
  labels: Label[]
  now: number
  onReply: (all: boolean) => void
  onReplyAll: () => void
  onForward: () => void
  onStar: () => void
  onQuick: (text: string) => void
  onLabelNav: (id: string) => void
  onRemoveLabel: (id: string) => void
  onRemoveInbox: () => void
}) {
  const last = lastMsg(thread)
  const [open, setOpen] = useState<Set<string>>(new Set([last.id]))
  useEffect(() => setOpen(new Set([lastMsg(thread).id])), [thread.id, thread.messages.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const smart = last.from !== ME && thread.box !== 'spam' ? ['Sounds good!', 'Thanks, will do.', 'Can we talk tomorrow?'] : []
  return (
    <div className="thread">
      <h1 className="t-subject">
        <span>{thread.subject}</span>
        <span className="t-chips">
          {thread.box === 'inbox' && (
            <span className="tchip">Inbox <button type="button" aria-label="Remove from inbox" onClick={onRemoveInbox}><I n="close" s={12} /></button></span>
          )}
          {thread.box === 'trash' && <span className="tchip">Trash</span>}
          {thread.box === 'spam' && <span className="tchip">Spam</span>}
          {thread.labels.map((id) => {
            const l = labels.find((x) => x.id === id)
            if (!l) return null
            return (
              <span key={id} className="tchip lbl" style={{ background: l.color }} onClick={() => onLabelNav(id)}>
                {l.name} <button type="button" aria-label={`Remove label ${l.name}`} onClick={(e) => { e.stopPropagation(); onRemoveLabel(id) }}><I n="close" s={12} /></button>
              </span>
            )
          })}
        </span>
      </h1>
      <div className="msgs">
        {thread.messages.map((m, i) => (
          <MessageCard
            key={m.id}
            m={m}
            thread={thread}
            now={now}
            open={open.has(m.id)}
            isLast={i === thread.messages.length - 1}
            onToggle={() => {
              const n = new Set(open)
              n.has(m.id) ? n.delete(m.id) : n.add(m.id)
              setOpen(n)
            }}
            onReply={() => onReply(false)}
            onReplyAll={onReplyAll}
            onForward={onForward}
            onStarThread={onStar}
          />
        ))}
      </div>
      {smart.length > 0 && (
        <div className="smart">
          {smart.map((s) => (
            <button key={s} type="button" onClick={() => onQuick(s)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}
