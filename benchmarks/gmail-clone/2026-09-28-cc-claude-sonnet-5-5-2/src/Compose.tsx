import { useEffect, useMemo, useRef, useState } from 'react'
import type { Att, Draft, Person } from './types'
import { Icon } from './Icon'
import { Avatar, DateTimePicker, IconBtn, Menu, MenuItem } from './ui'
import { cx, fmtFuture, fmtSize, htmlToText, isEmail, sanitize, snoozeOptions, uid } from './util'

function Recipients({ label, value, onChange, contacts, autoFocus, extra }: { label: string; value: string[]; onChange: (v: string[]) => void; contacts: Person[]; autoFocus?: boolean; extra?: React.ReactNode }) {
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(false)
  const [idx, setIdx] = useState(0)
  const sugg = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return []
    return contacts.filter((c) => !value.includes(c.email) && (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))).slice(0, 5)
  }, [text, contacts, value])
  const commit = (s = text) => {
    const parts = s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)
    if (parts.length) onChange([...value, ...parts.filter((x) => !value.includes(x))])
    setText('')
  }
  return (
    <div className="rcpt">
      <span className="rcpt-l">{label}</span>
      <div className="rcpt-f">
        {value.map((e) => {
          const c = contacts.find((x) => x.email === e)
          return <span key={e} className={cx('chip', !isEmail(e) && 'bad')} title={e}><Avatar name={c?.name ?? e} email={e} size={20} />{c?.name ?? e}<button aria-label={`Remove ${e}`} onClick={() => onChange(value.filter((x) => x !== e))}><Icon n="x" s={12} /></button></span>
        })}
        <input aria-label={label} value={text} autoFocus={autoFocus} onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); commit() }}
          onChange={(e) => { setText(e.target.value); setIdx(0); if (/[,;]$/.test(e.target.value)) commit(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && sugg.length) { e.preventDefault(); setIdx((i) => (i + 1) % sugg.length) }
            else if (e.key === 'ArrowUp' && sugg.length) { e.preventDefault(); setIdx((i) => (i - 1 + sugg.length) % sugg.length) }
            else if ((e.key === 'Enter' || e.key === 'Tab') && text.trim()) { e.preventDefault(); if (sugg.length) { onChange([...value, sugg[idx].email]); setText('') } else commit() }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
          }} />
        {focus && sugg.length > 0 && (
          <div className="sugg">
            {sugg.map((c, i) => <button key={c.email} className={cx('sugg-i', i === idx && 'on')} onMouseDown={(e) => { e.preventDefault(); onChange([...value, c.email]); setText('') }}><Avatar name={c.name} email={c.email} size={28} /><span><b>{c.name}</b><small>{c.email}</small></span></button>)}
          </div>
        )}
      </div>
      {extra}
    </div>
  )
}

export type ComposeState = Draft & { mode: 'window' | 'inline'; minimized?: boolean; maximized?: boolean; kind?: 'new' | 'reply' | 'forward'; quote?: string }

export function Compose({ c, contacts, onChange, onClose, onDiscard, onSend, onSaved }: {
  c: ComposeState; contacts: Person[]; onChange: (p: Partial<ComposeState>) => void; onClose: () => void; onDiscard: () => void
  onSend: (d: Draft, sendAt?: number) => void; onSaved: (d: Draft) => void
}) {
  const ed = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const touched = useRef(false)
  const [showCc, setShowCc] = useState(c.cc.length > 0 || c.bcc.length > 0)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState<number | null>(null)
  const [drag, setDrag] = useState(false)
  useEffect(() => { if (ed.current) ed.current.innerHTML = c.html }, []) // eslint-disable-line
  const draftOf = (): Draft => ({ id: c.id, to: c.to, cc: c.cc, bcc: c.bcc, subject: c.subject, html: c.html, atts: c.atts, threadId: c.threadId, updatedAt: Date.now() })
  const empty = !c.to.length && !c.cc.length && !c.subject && !htmlToText(c.html) && !c.atts.length
  const stamp = useRef(0)
  useEffect(() => {
    if (empty) return
    const t = setTimeout(() => { const d = draftOf(); onSaved(d); stamp.current = Date.now(); setSaved(Date.now()) }, 900)
    return () => clearTimeout(t)
  }, [c.to, c.cc, c.bcc, c.subject, c.html, c.atts]) // eslint-disable-line
  const exec = (cmd: string, v?: string) => { ed.current?.focus(); document.execCommand(cmd, false, v); onChange({ html: ed.current!.innerHTML }) }
  const send = (at?: number) => {
    const bad = [...c.to, ...c.cc, ...c.bcc].filter((e) => !isEmail(e))
    if (!c.to.length && !c.cc.length && !c.bcc.length) { setErr('Please specify at least one recipient.'); return }
    if (bad.length) { setErr(`"${bad[0]}" is not a valid email address.`); return }
    onSend({ ...draftOf(), html: sanitize(c.html) }, at)
  }
  const addFiles = (fs: FileList | null) => {
    if (!fs) return
    const kinds = (n: string): Att['kind'] => /\.(png|jpe?g|gif|webp|svg)$/i.test(n) ? 'image' : /\.pdf$/i.test(n) ? 'pdf' : /\.(xlsx?|csv)$/i.test(n) ? 'sheet' : /\.(zip|tar|gz)$/i.test(n) ? 'zip' : /\.(docx?|txt|md)$/i.test(n) ? 'doc' : 'other'
    onChange({ atts: [...c.atts, ...[...fs].map((f) => ({ id: uid('a'), name: f.name, size: f.size, kind: kinds(f.name) }))] })
  }
  const link = () => { const u = prompt('Link URL', 'https://'); if (u) exec('createLink', u) }
  const inline = c.mode === 'inline'
  const title = c.subject || (c.kind === 'reply' ? 'Reply' : 'New Message')

  if (c.minimized && !inline) {
    return (
      <div className="compose min" onClick={() => onChange({ minimized: false })}>
        <div className="compose-h"><span className="grow ellip">{title}</span>
          <IconBtn n="max" label="Expand" s={16} onClick={(e) => { e.stopPropagation(); onChange({ minimized: false }) }} />
          <IconBtn n="x" label="Save & close" s={16} onClick={(e) => { e.stopPropagation(); onClose() }} /></div>
      </div>
    )
  }
  return (
    <div className={cx('compose', inline && 'inline', c.maximized && 'maxi', drag && 'drag')} role="dialog" aria-label="Compose"
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}>
      {!inline && (
        <div className="compose-h" onDoubleClick={() => onChange({ minimized: true })}>
          <span className="grow ellip">{title}</span>
          <IconBtn n="min" label="Minimize" s={16} onClick={() => onChange({ minimized: true })} />
          <IconBtn n="max" label={c.maximized ? 'Exit full screen' : 'Full screen'} s={16} onClick={() => onChange({ maximized: !c.maximized })} />
          <IconBtn n="x" label="Save & close" s={16} onClick={onClose} />
        </div>
      )}
      <div className="compose-body">
        <Recipients label="To" value={c.to} onChange={(to) => { setErr(''); onChange({ to }) }} contacts={contacts} autoFocus={!inline && !c.to.length}
          extra={!showCc && <button className="link-btn" onClick={() => setShowCc(true)}>Cc Bcc</button>} />
        {showCc && <><Recipients label="Cc" value={c.cc} onChange={(cc) => onChange({ cc })} contacts={contacts} /><Recipients label="Bcc" value={c.bcc} onChange={(bcc) => onChange({ bcc })} contacts={contacts} /></>}
        {!inline && <div className="rcpt"><input className="subj-in" placeholder="Subject" aria-label="Subject" value={c.subject} onChange={(e) => onChange({ subject: e.target.value })} /></div>}
        <div ref={ed} className="editor" contentEditable suppressContentEditableWarning role="textbox" aria-multiline aria-label="Message body" data-ph="Write your message…"
          onFocus={() => { if (!touched.current) { touched.current = true; setTimeout(() => { const r = document.createRange(); r.setStart(ed.current!, 0); r.collapse(true); const sel = getSelection(); sel?.removeAllRanges(); sel?.addRange(r) }, 0) } }} onInput={() => onChange({ html: ed.current!.innerHTML })} onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')) }}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send() } }} />
        {c.atts.length > 0 && (
          <div className="atts">{c.atts.map((a) => <span key={a.id} className="att-chip"><Icon n={a.kind === 'image' ? 'image' : 'file'} s={16} />{a.name}<small>{fmtSize(a.size)}</small><button aria-label="Remove attachment" onClick={() => onChange({ atts: c.atts.filter((x) => x.id !== a.id) })}><Icon n="x" s={12} /></button></span>)}</div>
        )}
      </div>
      {err && <div className="compose-err" role="alert">{err}</div>}
      <div className="compose-f">
        <div className="split-send">
          <button className="btn primary send" onClick={() => send()} title="Send (Ctrl/⌘+Enter)">Send</button>
          <Menu up trigger={({ toggle }) => <button className="btn primary send-more" aria-label="More send options" onClick={toggle}><Icon n="up" s={16} /></button>}>
            {(close) => <>
              <div className="menu-h">Schedule send</div>
              {snoozeOptions().map((o) => <MenuItem key={o.label} icon="sched" onClick={() => { close(); send(o.ts) }}>{o.label}<small className="mi-sub">{fmtFuture(o.ts)}</small></MenuItem>)}
              <DateTimePicker onPick={(ts) => { close(); send(ts) }} />
            </>}
          </Menu>
        </div>
        <div className="fmt">
          <IconBtn n="bold" label="Bold" s={16} onClick={() => exec('bold')} /><IconBtn n="italic" label="Italic" s={16} onClick={() => exec('italic')} />
          <IconBtn n="underline" label="Underline" s={16} onClick={() => exec('underline')} /><IconBtn n="list" label="Bulleted list" s={16} onClick={() => exec('insertUnorderedList')} />
          <IconBtn n="olist" label="Numbered list" s={16} onClick={() => exec('insertOrderedList')} /><IconBtn n="link" label="Insert link" s={16} onClick={link} />
          <IconBtn n="clip" label="Attach files" s={16} onClick={() => file.current?.click()} />
          <input ref={file} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </div>
        <span className="grow saved">{saved ? 'Draft saved' : ''}</span>
        {inline && <IconBtn n="max" label="Pop out" s={16} onClick={() => onChange({ mode: 'window' })} />}
        <IconBtn n="trash" label="Discard draft" s={18} onClick={onDiscard} />
      </div>
    </div>
  )
}
