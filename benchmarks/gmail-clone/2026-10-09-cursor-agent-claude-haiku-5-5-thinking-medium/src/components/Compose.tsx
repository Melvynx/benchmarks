import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Bold, Italic, Underline, Link2, List, ListOrdered, Paperclip, Trash2, Maximize2, Minimize2, X, ChevronDown, Send, CalendarClock, Image as ImageIcon, Eraser, AlertTriangle } from 'lucide-react'
import { useStore } from '../lib/store'
import { useMailActions } from '../lib/actions'
import { collectContacts, formatBytes } from '../lib/mail'
import { sendLaterPresets, toLocalInputValue } from '../lib/view'
import type { Attachment, AttachmentKind, Contact, Message } from '../types'
import { Dropdown, IconButton, MenuItem, MenuLabel, cx } from './ui'

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function parseRecipient(raw: string): Contact | null {
  const t = raw.trim()
  const angled = t.match(/^(.*?)<([^>]+)>$/)
  if (angled && EMAIL_RE.test(angled[2].trim())) {
    return { name: angled[1].trim().replace(/^"|"$/g, '') || angled[2].split('@')[0], email: angled[2].trim() }
  }
  if (EMAIL_RE.test(t)) {
    const local = t.split('@')[0].replace(/[._-]+/g, ' ')
    return { name: local.replace(/\b\w/g, (c) => c.toUpperCase()), email: t }
  }
  return null
}

function kindOf(name: string, type = ''): AttachmentKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  return 'other'
}

export function Compose() {
  const { state } = useStore()
  const id = state.ui.composeId
  const draft = id ? state.data.messages[id] : undefined
  if (!id || !draft) return null
  return <ComposeWindow key={id} draft={draft} />
}

function RecipientField({
  label,
  recipients,
  onChange,
  contacts,
  autoFocus,
}: {
  label: string
  recipients: Contact[]
  onChange: (next: Contact[]) => void
  contacts: Contact[]
  autoFocus?: boolean
}) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return []
    return contacts
      .filter((c) => !recipients.some((r) => r.email === c.email) && (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)))
      .slice(0, 6)
  }, [text, contacts, recipients])

  const add = (c: Contact) => {
    if (!recipients.some((r) => r.email === c.email)) onChange([...recipients, c])
    setText('')
    setActive(0)
  }

  const commitText = (raw: string) => {
    const c = parseRecipient(raw)
    if (c) add(c)
    return Boolean(c)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (!text.trim()) return
      if (suggestions.length && (e.key === 'Enter' || e.key === 'Tab') && !EMAIL_RE.test(text.trim())) {
        e.preventDefault()
        add(suggestions[active] ?? suggestions[0])
        return
      }
      if (commitText(text)) e.preventDefault()
    } else if (e.key === 'Backspace' && !text && recipients.length) {
      onChange(recipients.slice(0, -1))
    } else if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault()
      setActive((a) => (a + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault()
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length)
    }
  }

  return (
    <div className="relative flex min-h-10 items-center gap-2 border-b border-line py-1.5 text-[13px]">
      <span className="w-12 shrink-0 text-ink-3">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {recipients.map((r) => (
          <span key={r.email} className="inline-flex max-w-full items-center gap-1 rounded-full bg-hover px-2.5 py-0.5 text-[12.5px] text-ink">
            <span className="truncate" title={r.email}>{r.name}</span>
            <button type="button" aria-label={`Remove ${r.name}`} onClick={() => onChange(recipients.filter((x) => x.email !== r.email))} className="rounded-full text-ink-3 hover:text-ink">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={text}
          autoFocus={autoFocus}
          aria-label={label}
          onChange={(e) => {
            setText(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (text.trim()) commitText(text)
            setText('')
          }}
          placeholder={recipients.length ? '' : 'Recipients'}
          className="min-w-[120px] flex-1 bg-transparent py-1 outline-none placeholder:text-ink-3"
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute left-12 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-xl" role="listbox">
          {suggestions.map((c, i) => (
            <li key={c.email}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(c)
                }}
                className={cx('flex w-full items-center gap-3 px-3 py-1.5 text-left', i === active ? 'bg-hover' : '')}
              >
                <span className="truncate font-medium text-ink">{c.name}</span>
                <span className="truncate text-ink-3">{c.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ComposeWindow({ draft }: { draft: Message }) {
  const { state, dispatch } = useStore()
  const { data, ui } = state
  const actions = useMailActions()
  const contacts = useMemo(() => collectContacts(data), [data])

  const [to, setTo] = useState<Contact[]>(draft.to)
  const [cc, setCc] = useState<Contact[]>(draft.cc)
  const [bcc, setBcc] = useState<Contact[]>(draft.bcc)
  const [showCc, setShowCc] = useState(draft.cc.length > 0)
  const [showBcc, setShowBcc] = useState(draft.bcc.length > 0)
  const [subject, setSubject] = useState(draft.subject)
  const [attachments, setAttachments] = useState<Attachment[]>(draft.attachments)
  const [body, setBody] = useState(draft.body)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attachWarning, setAttachWarning] = useState(false)
  const [customAt, setCustomAt] = useState(toLocalInputValue(ui.now + 86_400_000))
  const bodyRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(false)
  const isReply = Boolean(draft.threadId) && draft.subject.toLowerCase().startsWith('re:')
  const wasEmptyOnOpen = useRef(!draft.subject && !draft.to.length)

  // Put the seeded HTML in the editable area once, then keep it uncontrolled to avoid caret jumps
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = draft.body
    bodyRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced autosave into the drafts store
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const t = window.setTimeout(() => {
      dispatch({ type: 'patch', id: draft.id, patch: { to, cc, bcc, subject, body, attachments } })
      setSavedAt(Date.now())
    }, 400)
    return () => window.clearTimeout(t)
  }, [to, cc, bcc, subject, body, attachments, draft.id, dispatch])

  // Ctrl/Cmd + Enter sends
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        send()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const currentPatch = (): Partial<Message> => ({ to, cc, bcc, subject, body, attachments })

  const bodyText = () => bodyRef.current?.innerText ?? ''

  const hasRecipients = to.length + cc.length + bcc.length > 0
  const mentionsAttachment = /\b(attach|attached|attachment|enclosed)\b/i.test(`${subject} ${bodyText()}`)

  const send = () => {
    if (!hasRecipients) {
      setError('Add at least one recipient before sending.')
      return
    }
    if (mentionsAttachment && attachments.length === 0 && !attachWarning) {
      setAttachWarning(true)
      return
    }
    actions.sendDraft(draft.id, currentPatch())
  }

  const schedule = (at: number) => {
    if (!hasRecipients) {
      setError('Add at least one recipient before scheduling.')
      return
    }
    actions.scheduleDraft(draft.id, at, currentPatch())
  }

  const exec = (cmd: string, value?: string) => {
    bodyRef.current?.focus()
    document.execCommand(cmd, false, value)
    setBody(bodyRef.current?.innerHTML ?? '')
  }

  const onFiles = (files: FileList | null) => {
    if (!files) return
    const next = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      kind: kindOf(f.name, f.type),
    }))
    setAttachments((a) => [...a, ...next])
    setAttachWarning(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const discard = () => actions.discardDraft(draft.id)
  const close = () => actions.closeCompose()
  const full = ui.composeFull
  const title = subject.trim() || (isReply ? 'Reply' : 'New Message')
  const presets = sendLaterPresets(ui.now)
  const savedLabel = savedAt ? `Draft saved ${new Date(savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Draft'

  return (
    <div
      role="dialog"
      aria-label="Compose message"
      className={cx(
        'fixed z-[55] flex flex-col bg-surface text-ink shadow-[0_8px_32px_rgba(0,0,0,0.28)] animate-toast-in',
        full ? 'inset-0 md:inset-6 md:rounded-2xl' : 'inset-0 md:inset-auto md:bottom-0 md:right-6 md:w-[580px] md:max-h-[80vh] md:rounded-t-2xl',
        'border-line md:border',
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-1 rounded-t-2xl bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))] px-4">
        <h2 className="min-w-0 flex-1 truncate text-[14px] font-medium">{title}</h2>
        <IconButton title={full ? 'Exit full screen' : 'Full screen'} size="sm" className="hidden md:inline-flex" onClick={() => dispatch({ type: 'composeFull', full: !full })}>
          {full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </IconButton>
        <IconButton title="Close (draft is kept)" size="sm" onClick={close}>
          <X size={18} />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 md:px-5">
        <div className="pt-1">
          <RecipientField label="To" recipients={to} onChange={setTo} contacts={contacts} autoFocus={!draft.to.length && wasEmptyOnOpen.current} />
          {showCc && <RecipientField label="Cc" recipients={cc} onChange={setCc} contacts={contacts} />}
          {showBcc && <RecipientField label="Bcc" recipients={bcc} onChange={setBcc} contacts={contacts} />}
          <div className="flex items-center justify-end gap-3 pt-1 text-[12px] text-accent">
            {!showCc && <button type="button" onClick={() => setShowCc(true)}>Cc</button>}
            {!showBcc && <button type="button" onClick={() => setShowBcc(true)}>Bcc</button>}
          </div>
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          aria-label="Subject"
          className="h-11 w-full border-b border-line bg-transparent text-[14px] outline-none placeholder:text-ink-3"
        />
        {error && <div className="py-2 text-[12.5px] text-danger">{error}</div>}

        <div
          ref={bodyRef}
          role="textbox"
          aria-multiline="true"
          aria-label="Message body"
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Write your message"
          onInput={(e) => {
            setBody((e.target as HTMLDivElement).innerHTML)
            setError(null)
            setAttachWarning(false)
          }}
          className="compose-body msg-body min-h-[180px] flex-1 overflow-y-auto py-3 text-[14px] outline-none md:min-h-[200px]"
        />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3">
            {attachments.map((a) => (
              <span key={a.id} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px]">
                <Paperclip size={14} className="text-ink-3" />
                <span className="truncate font-medium">{a.name}</span>
                <span className="text-ink-3">{formatBytes(a.size)}</span>
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAttachments((list) => list.filter((x) => x.id !== a.id))} className="text-ink-3 hover:text-ink">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        {attachWarning && (
          <div role="alert" className="mb-3 flex items-center gap-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] px-3 py-2 text-[13px]">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">You mention an attachment, but nothing is attached. Did you mean to attach a file?</span>
            <button type="button" onClick={() => fileRef.current?.click()} className="font-medium text-accent">Attach</button>
            <button type="button" onClick={() => { setAttachWarning(false); actions.sendDraft(draft.id, currentPatch()) }} className="font-medium text-ink-2">Send anyway</button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 border-t border-line px-3 py-2.5 md:px-4">
        <div className="flex items-center rounded-full bg-accent text-accent-ink">
          <button
            type="button"
            onClick={send}
            className="flex h-9 items-center gap-2 rounded-l-full pl-5 pr-4 text-[14px] font-medium transition hover:brightness-110"
          >
            Send
            <Send size={15} />
          </button>
          <Dropdown
            align="left"
            placement="up"
            width="w-72"
            className="h-9"
            trigger={(toggle, open) => (
              <button type="button" aria-label="More send options" onClick={toggle} className={cx('flex h-9 w-8 items-center justify-center rounded-r-full border-l border-white/30 transition hover:brightness-110', open && 'brightness-110')}>
                <ChevronDown size={16} />
              </button>
            )}
          >
            {(close) => (
              <div>
                <MenuLabel>Schedule send</MenuLabel>
                {presets.map((p) => (
                  <MenuItem key={p.label} icon={<CalendarClock size={15} />} onClick={() => { close(); schedule(p.at) }}>
                    <span>{p.label}</span>
                    <span className="ml-2 text-[12px] text-ink-3">{p.hint}</span>
                  </MenuItem>
                ))}
                <form
                  className="grid gap-2 border-t border-line px-3 pb-2 pt-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const at = new Date(customAt).getTime()
                    if (Number.isNaN(at) || at <= ui.now) return
                    close()
                    schedule(at)
                  }}
                >
                  <span className="text-[12px] text-ink-3">Pick date and time</span>
                  <div className="flex gap-2">
                    <input type="datetime-local" value={customAt} onChange={(e) => setCustomAt(e.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-[13px]" />
                    <button type="submit" className="rounded-full bg-accent px-3 text-[13px] font-medium text-accent-ink">Schedule</button>
                  </div>
                </form>
              </div>
            )}
          </Dropdown>
        </div>

        <div className="mx-1 h-6 w-px bg-line" />
        <FormatButton title="Bold (Ctrl+B)" onAct={() => exec('bold')}><Bold size={16} /></FormatButton>
        <FormatButton title="Italic (Ctrl+I)" onAct={() => exec('italic')}><Italic size={16} /></FormatButton>
        <FormatButton title="Underline (Ctrl+U)" onAct={() => exec('underline')}><Underline size={16} /></FormatButton>
        <FormatButton title="Bulleted list" onAct={() => exec('insertUnorderedList')}><List size={16} /></FormatButton>
        <FormatButton title="Numbered list" onAct={() => exec('insertOrderedList')}><ListOrdered size={16} /></FormatButton>
        <FormatButton
          title="Insert link"
          onAct={() => {
            const url = window.prompt('Link address', 'https://')
            if (url && url !== 'https://') exec('createLink', url)
          }}
        >
          <Link2 size={16} />
        </FormatButton>
        <FormatButton title="Clear formatting" onAct={() => exec('removeFormat')}><Eraser size={16} /></FormatButton>

        <IconButton title="Attach files" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip size={18} />
        </IconButton>
        <IconButton title="Insert image" size="sm" onClick={() => fileRef.current?.click()} className="hidden sm:inline-flex">
          <ImageIcon size={18} />
        </IconButton>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />

        <div className="ml-auto flex items-center gap-1">
          <span className="hidden whitespace-nowrap text-[12px] text-ink-3 lg:inline">{savedLabel}</span>
          <IconButton title="Discard draft" size="sm" onClick={discard}>
            <Trash2 size={18} />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

function FormatButton({ title, onAct, children }: { title: string; onAct: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onAct}
      className="hidden h-7 w-7 items-center justify-center rounded text-ink-2 hover:bg-hover hover:text-ink md:inline-flex"
    >
      {children}
    </button>
  )
}
