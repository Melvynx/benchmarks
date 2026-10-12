import { useEffect, useMemo, useRef, useState } from 'react'
import type { Attachment, Contact, Draft } from './types'
import { I } from './icons'
import { Avatar, Dropdown, MenuItem } from './ui'
import { fmtSize, isEmail, nameOf } from './util'

function Recipients({ label, value, onChange, contacts, autoFocus }: { label: string; value: string[]; onChange: (v: string[]) => void; contacts: Contact[]; autoFocus?: boolean }) {
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(false)
  const [hi, setHi] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const sugg = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return []
    return contacts.filter((c) => !value.includes(c.email) && (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))).slice(0, 6)
  }, [text, contacts, value])
  const commit = (raw?: string) => {
    const v = (raw ?? text).trim().replace(/[,;]$/, '')
    if (v && isEmail(v) && !value.includes(v)) onChange([...value, v])
    if (!v || isEmail(v)) setText('')
    else if (raw === undefined) return
  }
  return (
    <div className="rcpt-row" onClick={() => inputRef.current?.focus()}>
      <span className="rcpt-label">{label}</span>
      <div className="rcpt-box">
        {value.map((e) => (
          <span key={e} className={`chip ${isEmail(e) ? '' : 'bad'}`} title={e}>
            <Avatar email={e} size={20} />
            {nameOf(e)}
            <button type="button" aria-label={`Remove ${e}`} onClick={() => onChange(value.filter((x) => x !== e))}>
              <I n="close" s={14} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          aria-label={label}
          value={text}
          onChange={(e) => {
            const v = e.target.value
            if (/[,;\s]$/.test(v) && isEmail(v.replace(/[,;\s]+$/, ''))) commit(v.replace(/[,;\s]+$/, ''))
            else setText(v)
            setHi(0)
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => {
            setFocus(false)
            commit()
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && sugg.length) {
              e.preventDefault()
              setHi((hi + 1) % sugg.length)
            } else if (e.key === 'ArrowUp' && sugg.length) {
              e.preventDefault()
              setHi((hi - 1 + sugg.length) % sugg.length)
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              if (sugg.length) {
                e.preventDefault()
                commit(sugg[hi].email)
              } else if (text.trim()) {
                e.preventDefault()
                commit()
              }
            } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
          }}
        />
        {focus && sugg.length > 0 && (
          <div className="suggest">
            {sugg.map((c, i) => (
              <button type="button" key={c.email} className={i === hi ? 'hi' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => commit(c.email)}>
                <Avatar email={c.email} size={28} />
                <span>
                  <b>{c.name}</b>
                  <small>{c.email}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function scheduleOptions(now: number) {
  const d = new Date(now)
  const at = (add: number, h: number) => {
    const x = new Date(now)
    x.setDate(x.getDate() + add)
    x.setHours(h, 0, 0, 0)
    return x.getTime()
  }
  const toMon = ((8 - d.getDay()) % 7) || 7
  return [
    { label: 'Tomorrow morning', ts: at(1, 8) },
    { label: 'Tomorrow afternoon', ts: at(1, 13) },
    { label: 'Monday morning', ts: at(toMon, 8) },
  ]
}

export const toLocalInput = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ComposeWindow({
  draft, state, contacts, now, onPatch, onState, onClose, onSend, onSchedule, onDiscard, onError,
}: {
  draft: Draft
  state: { min: boolean; max: boolean }
  contacts: Contact[]
  now: number
  onPatch: (p: Partial<Draft>) => void
  onState: (s: { min: boolean; max: boolean }) => void
  onClose: () => void
  onSend: () => void
  onSchedule: (ts: number) => void
  onDiscard: () => void
  onError: (msg: string) => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showCc, setShowCc] = useState(draft.cc.length > 0)
  const [showBcc, setShowBcc] = useState(draft.bcc.length > 0)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [pick, setPick] = useState('')
  const title = draft.subject.trim() || (draft.threadId ? 'Reply' : 'New Message')

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = draft.html
    if (draft.to.length && bodyRef.current) {
      bodyRef.current.focus()
      const r = document.createRange()
      r.selectNodeContents(bodyRef.current)
      r.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setSavedAt(Date.now()), 900)
    return () => clearTimeout(id)
  }, [draft.updatedAt])

  const fmt = (cmd: string, val?: string) => {
    bodyRef.current?.focus()
    document.execCommand(cmd, false, val)
    onPatch({ html: bodyRef.current?.innerHTML || '' })
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const list: Attachment[] = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      kind: f.type.startsWith('image') ? 'image' : /pdf/.test(f.type) ? 'pdf' : /sheet|excel|csv/.test(f.type) ? 'sheet' : /zip/.test(f.type) ? 'zip' : 'doc',
    }))
    onPatch({ attachments: [...draft.attachments, ...list] })
  }

  const cls = `compose ${state.min ? 'min' : ''} ${state.max ? 'max' : ''}`
  return (
    <div className={cls} role="dialog" aria-label={title}>
      <div className="c-head" onClick={() => state.min && onState({ ...state, min: false })}>
        <span className="c-title">{title}</span>
        <button type="button" title="Minimize" onClick={(e) => { e.stopPropagation(); onState({ min: !state.min, max: false }) }}><I n="min" s={18} c="currentColor" /></button>
        <button type="button" title="Full screen" className="hide-m" onClick={(e) => { e.stopPropagation(); onState({ min: false, max: !state.max }) }}><I n="max" s={16} /></button>
        <button type="button" title="Save & close" onClick={(e) => { e.stopPropagation(); onClose() }}><I n="close" s={18} /></button>
      </div>
      {!state.min && (
        <>
          <div className="c-fields">
            <Recipients label="To" value={draft.to} onChange={(to) => onPatch({ to })} contacts={contacts} autoFocus={!draft.to.length} />
            {!showCc && !showBcc && (
              <span className="ccbcc">
                <button type="button" onClick={() => setShowCc(true)}>Cc</button>
                <button type="button" onClick={() => setShowBcc(true)}>Bcc</button>
              </span>
            )}
            {showCc && <Recipients label="Cc" value={draft.cc} onChange={(cc) => onPatch({ cc })} contacts={contacts} />}
            {showBcc && <Recipients label="Bcc" value={draft.bcc} onChange={(bcc) => onPatch({ bcc })} contacts={contacts} />}
            <input className="c-subject" placeholder="Subject" aria-label="Subject" value={draft.subject} onChange={(e) => onPatch({ subject: e.target.value })} />
          </div>
          <div
            ref={bodyRef}
            className="c-body"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Message body"
            onInput={() => onPatch({ html: bodyRef.current?.innerHTML || '' })}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSend()
            }}
          />
          {draft.attachments.length > 0 && (
            <div className="c-atts">
              {draft.attachments.map((a, i) => (
                <span key={a.name + i} className="att-chip">
                  <I n="file" s={16} /> {a.name} <small>({fmtSize(a.size)})</small>
                  <button type="button" aria-label="Remove attachment" onClick={() => onPatch({ attachments: draft.attachments.filter((_, j) => j !== i) })}><I n="close" s={14} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="c-foot">
            <div className="send-group">
              <button type="button" className="send" onClick={onSend}>Send</button>
              <Dropdown
                className="up"
                trigger={(_o, t) => <button type="button" className="send-more" title="More send options" aria-label="More send options" onClick={t}><I n="down" s={20} c="#fff" /></button>}
              >
                {(close) => (
                  <div className="sched">
                    <div className="menu-h">Schedule send</div>
                    {scheduleOptions(now).map((o) => (
                      <MenuItem key={o.label} onClick={() => { close(); onSchedule(o.ts) }} right={new Date(o.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}>{o.label}</MenuItem>
                    ))}
                    <div className="pick">
                      <input type="datetime-local" aria-label="Pick date and time" value={pick} min={toLocalInput(now)} onChange={(e) => setPick(e.target.value)} />
                      <button type="button" disabled={!pick} onClick={() => { const ts = new Date(pick).getTime(); if (ts > Date.now()) { close(); onSchedule(ts) } else onError('Pick a time in the future') }}>Schedule</button>
                    </div>
                  </div>
                )}
              </Dropdown>
            </div>
            <div className="fmt">
              <button type="button" title="Bold (⌘B)" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('bold')}><b>B</b></button>
              <button type="button" title="Italic (⌘I)" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('italic')}><i>I</i></button>
              <button type="button" title="Underline (⌘U)" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('underline')}><u>U</u></button>
              <button type="button" title="Bulleted list" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('insertUnorderedList')}>•≡</button>
              <button type="button" title="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('insertOrderedList')}>1≡</button>
              <button type="button" title="Insert link" onMouseDown={(e) => e.preventDefault()} onClick={() => { const u = window.prompt('Link URL', 'https://'); if (u) fmt('createLink', u) }}>🔗</button>
              <button type="button" title="Attach files" onClick={() => fileRef.current?.click()}><I n="attach" s={18} /></button>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </div>
            <span className="saved">{savedAt ? 'Draft saved' : ''}</span>
            <button type="button" className="disc" title="Discard draft" aria-label="Discard draft" onClick={onDiscard}><I n="delete" s={20} /></button>
          </div>
        </>
      )}
    </div>
  )
}
