import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Smile,
  Type,
  ChevronDown,
  Undo2,
  Redo2,
  Strikethrough,
  Quote,
  RemoveFormatting,
  ArrowLeft,
  SendHorizontal,
  Clock,
  ExternalLink,
  MoreVertical,
} from 'lucide-react'
import type { Attachment, Contact, Draft } from '../types'
import { useMail } from '../store/mail'
import { useUI } from '../store/ui'
import { uid } from '../lib/id'
import { stripHtml } from '../lib/html'
import { atHour, formatScheduleLabel, formatSize, nextWeekday } from '../lib/format'
import { goView } from '../lib/router'
import { Avatar, Button, cx, Dropdown, IconButton, MenuDivider, MenuItem, MenuLabel, Modal, useIsMobile } from './ui'
import { KIND_META } from './Attachments'
import { DateTimeDialog } from './menus'
import type { AttachmentKind } from '../types'

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

export function parseAddress(raw: string): Contact | null {
  const s = raw.trim().replace(/[,;]$/, '')
  if (!s) return null
  const m = /^(.*)<([^>]+)>$/.exec(s)
  if (m) return { name: m[1].trim().replace(/^"|"$/g, '') || m[2].trim(), email: m[2].trim() }
  const known = useMail.getState().contacts.find((c) => c.email.toLowerCase() === s.toLowerCase())
  return known ?? { name: s, email: s }
}

const isValid = (c: Contact) => EMAIL_RE.test(c.email)

function RecipientField({
  label,
  value,
  onChange,
  autoFocus,
  right,
}: {
  label: string
  value: Contact[]
  onChange: (v: Contact[]) => void
  autoFocus?: boolean
  right?: React.ReactNode
}) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const contacts = useMail((s) => s.contacts)
  const q = text.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!q) return []
    return contacts
      .filter((c) => !value.some((v) => v.email === c.email))
      .filter((c) => c.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || c.name.toLowerCase().startsWith(q) || c.email.toLowerCase().startsWith(q))
      .slice(0, 6)
  }, [q, contacts, value])

  const commit = (c?: Contact | null) => {
    const contact = c ?? parseAddress(text)
    if (contact) onChange([...value, contact])
    setText('')
    setActive(0)
  }

  return (
    <div className="relative flex min-h-10 items-center border-b border-line px-4" onClick={() => input.current?.focus()}>
      <span className="mr-2 shrink-0 text-[14px] text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1">
        {value.map((c, i) => (
          <span
            key={c.email + i}
            title={c.email}
            className={cx(
              'inline-flex h-6 max-w-full items-center gap-1 rounded-full border pl-0.5 pr-1 text-[13px]',
              isValid(c) ? 'border-line-strong/70 bg-surface' : 'border-danger bg-danger/10 text-danger',
            )}
          >
            <Avatar contact={c} size={20} className="text-[10px]" />
            <span className="truncate">{c.name !== c.email ? c.name : c.email}</span>
            <button
              type="button"
              aria-label={`Remove ${c.email}`}
              onClick={(e) => {
                e.stopPropagation()
                onChange(value.filter((_, j) => j !== i))
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-hover-strong"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={input}
          autoFocus={autoFocus}
          value={text}
          aria-label={label}
          onChange={(e) => {
            const v = e.target.value
            if (/[,;]\s*$/.test(v) && v.trim().length > 1) {
              const c = parseAddress(v)
              if (c) onChange([...value, c])
              setText('')
              return
            }
            setText(v)
            setActive(0)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            if (text.trim()) commit()
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text')
            if (/[,;\n]/.test(t)) {
              e.preventDefault()
              const list = t.split(/[,;\n]/).map(parseAddress).filter(Boolean) as Contact[]
              onChange([...value, ...list])
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === 'Tab') && (suggestions.length || text.trim())) {
              if (e.key === 'Enter' || suggestions.length) e.preventDefault()
              commit(suggestions[active] ?? null)
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1))
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, suggestions.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            }
          }}
          className="h-7 min-w-[80px] flex-1 bg-transparent text-[14px] outline-none"
        />
      </div>
      {right}
      {focused && suggestions.length > 0 && (
        <div className="animate-pop absolute left-10 right-4 top-full z-30 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-pop">
          {suggestions.map((c, i) => (
            <button
              key={c.email}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                commit(c)
              }}
              onMouseEnter={() => setActive(i)}
              className={cx('flex w-full items-center gap-3 px-3 py-2 text-left', i === active && 'bg-hover')}
            >
              <Avatar contact={c} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-[14px]">{c.name}</span>
                <span className="block truncate text-[12px] text-muted">{c.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const EMOJIS = ['😀', '😂', '😊', '😍', '🤔', '😅', '🙏', '👍', '👏', '🎉', '🔥', '❤️', '✅', '🚀', '☕', '🍝', '🌟', '💡', '📎', '📅', '😎', '🥳', '🤝', '👀']

function kindFromFile(f: File): AttachmentKind {
  if (f.type.startsWith('image/')) return 'image'
  if (f.type === 'application/pdf') return 'pdf'
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'slides'
  if (['zip', 'gz', 'tar', 'rar'].includes(ext)) return 'zip'
  return 'other'
}

function readFile(f: File): Promise<Attachment> {
  return new Promise((resolve) => {
    const base: Attachment = { id: uid('a'), name: f.name, size: f.size, kind: kindFromFile(f), hue: Math.floor(Math.random() * 360) }
    if (base.kind === 'image' && f.size < 400_000) {
      const r = new FileReader()
      r.onload = () => resolve({ ...base, dataUrl: String(r.result) })
      r.onerror = () => resolve(base)
      r.readAsDataURL(f)
    } else resolve(base)
  })
}

function isDraftEmpty(d: Draft) {
  const sig = useMail.getState().settings.signature
  const text = stripHtml(d.html).replace(stripHtml(sig.replace(/\n/g, ' ')), '').replace(/^--/, '').replace(/--$/, '').trim()
  return !d.to.length && !d.cc.length && !d.bcc.length && !d.subject.trim() && !text && !d.attachments.length
}

export interface ComposeFormProps {
  draftId: string
  variant: 'window' | 'full' | 'inline' | 'mobile'
  onClose: () => void
  onMinimize?: () => void
  onToggleMax?: () => void
  onPopOut?: () => void
}

export function sendDraft(d: Draft, at?: number) {
  const mail = useMail.getState()
  const ui = useUI.getState()
  if (at) {
    mail.queueSend(d, at, true)
    ui.showToast(`Send scheduled for ${formatScheduleLabel(at)}.`, {
      action: {
        label: 'Undo',
        run: () => {
          const back = useMail.getState().cancelSend(d.id)
          if (back) useUI.getState().openDraft(back.id)
        },
      },
      secondary: { label: 'View message', run: () => goView({ kind: 'folder', folder: 'scheduled' }) },
    })
    return
  }
  const secs = mail.settings.undoSeconds
  if (secs <= 0) {
    mail.queueSend(d, Date.now(), false)
    const id = useMail.getState().deliverNow(d.id)
    ui.showToast('Message sent.', { secondary: id ? { label: 'View message', run: () => goView({ kind: 'folder', folder: 'sent' }, id) } : undefined })
    return
  }
  mail.queueSend(d, Date.now() + secs * 1000, false)
  ui.showToast('Message sent.', {
    duration: secs * 1000 + 1500,
    action: {
      label: 'Undo',
      run: () => {
        const back = useMail.getState().cancelSend(d.id)
        if (back) {
          useUI.getState().openDraft(back.id)
          useUI.getState().showToast('Sending undone.', { duration: 3000 })
        }
      },
    },
    secondary: {
      label: 'View message',
      run: () => {
        const id = useMail.getState().deliverNow(d.id)
        if (id) goView({ kind: 'folder', folder: 'sent' }, id)
      },
    },
  })
}

export function ComposeForm({ draftId, variant, onClose, onMinimize, onToggleMax, onPopOut }: ComposeFormProps) {
  const exists = useMail((s) => !!s.drafts[draftId])
  const initial = useRef(useMail.getState().drafts[draftId]).current
  const saveDraft = useMail((s) => s.saveDraft)
  const discardDraft = useMail((s) => s.discardDraft)
  const showToast = useUI((s) => s.showToast)
  const [to, setTo] = useState<Contact[]>(initial?.to ?? [])
  const [cc, setCc] = useState<Contact[]>(initial?.cc ?? [])
  const [bcc, setBcc] = useState<Contact[]>(initial?.bcc ?? [])
  const [showCc, setShowCc] = useState((initial?.cc.length ?? 0) > 0)
  const [showBcc, setShowBcc] = useState((initial?.bcc.length ?? 0) > 0)
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [attachments, setAttachments] = useState<Attachment[]>(initial?.attachments ?? [])
  const [html, setHtml] = useState(initial?.html ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [formatBar, setFormatBar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleCustom, setScheduleCustom] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [recipientsOpen, setRecipientsOpen] = useState(variant !== 'inline' || !initial?.to.length)
  const editor = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const savedRange = useRef<Range | null>(null)
  const dirty = useRef(false)

  const current = useCallback(
    (): Draft => ({
      ...(initial ?? { id: draftId, updatedAt: Date.now() }),
      id: draftId,
      to,
      cc,
      bcc,
      subject,
      attachments,
      html: editor.current?.innerHTML ?? html,
      updatedAt: Date.now(),
    }),
    [initial, draftId, to, cc, bcc, subject, attachments, html],
  )

  // mount editor content once
  useEffect(() => {
    if (editor.current && initial) editor.current.innerHTML = initial.html
    if (variant === 'inline' && editor.current) {
      editor.current.focus()
      placeCaretAtStart(editor.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  // autosave
  useEffect(() => {
    if (!dirty.current) return
    setStatus('saving')
    const id = setTimeout(() => {
      if (useMail.getState().drafts[draftId]) saveDraft(current())
      setStatus('saved')
    }, 700)
    return () => clearTimeout(id)
  }, [to, cc, bcc, subject, attachments, html, current, saveDraft, draftId])

  const touch = () => {
    dirty.current = true
  }

  if (!initial || !exists) return null

  const persistNow = () => {
    if (useMail.getState().drafts[draftId]) saveDraft(current())
  }

  const close = () => {
    const d = current()
    if (isDraftEmpty(d)) discardDraft(draftId)
    else if (useMail.getState().drafts[draftId]) {
      saveDraft(d)
      if (dirty.current && variant !== 'inline') showToast('Draft saved.', { duration: 2500 })
    }
    onClose()
  }

  const discard = () => {
    discardDraft(draftId)
    onClose()
    showToast('Draft discarded.', {
      action: {
        label: 'Undo',
        run: () => {
          useMail.getState().saveDraft(current())
          useUI.getState().openDraft(draftId)
        },
      },
    })
  }

  const trySend = (at?: number) => {
    const d = current()
    const all = [...d.to, ...d.cc, ...d.bcc]
    if (!all.length) {
      setError('Please specify at least one recipient.')
      return
    }
    const bad = all.find((c) => !isValid(c))
    if (bad) {
      setError(`The address "${bad.email}" in the "To" field was not recognized. Please make sure that all addresses are properly formed.`)
      return
    }
    if (!d.subject.trim() && !stripHtml(d.html).trim()) {
      if (!confirm('Send this message without a subject or text in the body?')) return
    }
    onClose()
    sendDraft(d, at)
  }

  const exec = (cmd: string, value?: string) => {
    editor.current?.focus()
    if (savedRange.current) {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(savedRange.current)
    }
    document.execCommand(cmd, false, value)
    touch()
    setHtml(editor.current?.innerHTML ?? '')
  }

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount && editor.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange()
  }

  const addFiles = async (files: FileList | File[]) => {
    const list = await Promise.all(Array.from(files).map(readFile))
    const total = [...attachments, ...list].reduce((n, a) => n + a.size, 0)
    if (total > 25 * 1024 * 1024) {
      showToast('Attachments exceed 25 MB. Large files would be sent as links.')
    }
    touch()
    setAttachments((a) => [...a, ...list])
  }

  const title = subject.trim() || (variant === 'inline' ? '' : 'New Message')
  const isInline = variant === 'inline'
  const isMobile = variant === 'mobile'

  const schedOpts = [
    { label: 'Tomorrow morning', at: atHour(1, 8) },
    { label: 'Tomorrow afternoon', at: atHour(1, 13) },
    { label: 'Monday morning', at: nextWeekday(1, 8) },
  ]

  const sendButton = (
    <div className="flex h-9 overflow-hidden rounded-full bg-accent text-on-accent">
      <button type="button" onClick={() => trySend()} className="px-5 text-[14px] font-medium hover:bg-black/10" title="Send (Ctrl-Enter)">
        Send
      </button>
      <Dropdown
        width={300}
        trigger={({ toggle }) => (
          <button type="button" aria-label="More send options" onClick={toggle} className="flex w-8 items-center justify-center border-l border-white/30 hover:bg-black/10">
            <ChevronDown size={16} />
          </button>
        )}
      >
        {(closeMenu) => (
          <>
            <MenuLabel>Schedule send</MenuLabel>
            {schedOpts.map((o) => (
              <MenuItem key={o.label} icon={<Clock size={16} />} hint={formatScheduleLabel(o.at)} onClick={() => { closeMenu(); trySend(o.at) }}>
                {o.label}
              </MenuItem>
            ))}
            <MenuDivider />
            <MenuItem onClick={() => { closeMenu(); setScheduleCustom(true) }}>Pick date &amp; time</MenuItem>
          </>
        )}
      </Dropdown>
    </div>
  )

  return (
    <div
      className={cx('relative flex min-h-0 flex-1 flex-col', dragOver && 'ring-2 ring-accent ring-inset')}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault()
          trySend()
        } else if (e.key === 'Escape' && !isInline) {
          e.stopPropagation()
          close()
        }
        e.stopPropagation()
      }}
    >
      {/* header */}
      {!isInline && !isMobile && (
        <div
          className={cx('flex h-10 shrink-0 cursor-pointer items-center gap-1 pl-4 pr-2', variant === 'full' ? 'rounded-t-2xl bg-surface-2' : 'rounded-t-xl bg-search')}
          onClick={() => { persistNow(); onMinimize?.() }}
        >
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{title}</span>
          <IconButton size="sm" label="Minimize" onClick={(e) => { e.stopPropagation(); persistNow(); onMinimize?.() }}>
            <Minus size={16} />
          </IconButton>
          <IconButton size="sm" label={variant === 'full' ? 'Exit full screen' : 'Full screen'} onClick={(e) => { e.stopPropagation(); persistNow(); onToggleMax?.() }}>
            {variant === 'full' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </IconButton>
          <IconButton size="sm" label="Save & close" onClick={(e) => { e.stopPropagation(); close() }}>
            <X size={17} />
          </IconButton>
        </div>
      )}
      {isMobile && (
        <div className="flex h-14 shrink-0 items-center gap-1 px-1">
          <IconButton label="Save & close" onClick={close}>
            <ArrowLeft size={22} />
          </IconButton>
          <span className="flex-1 truncate pl-2 text-[18px]">{subject.trim() || 'Compose'}</span>
          <IconButton label="Attach files" onClick={() => fileInput.current?.click()}>
            <Paperclip size={20} />
          </IconButton>
          <IconButton label="Send" onClick={() => trySend()} className="text-accent">
            <SendHorizontal size={22} />
          </IconButton>
          <Dropdown
            align="right"
            width={240}
            trigger={({ toggle }) => (
              <IconButton label="More" onClick={toggle}>
                <MoreVertical size={20} />
              </IconButton>
            )}
          >
            {(cm) => (
              <>
                {schedOpts.map((o) => (
                  <MenuItem key={o.label} icon={<Clock size={16} />} onClick={() => { cm(); trySend(o.at) }}>
                    Schedule: {o.label}
                  </MenuItem>
                ))}
                <MenuItem onClick={() => { cm(); setScheduleCustom(true) }}>Schedule: pick date &amp; time</MenuItem>
                <MenuDivider />
                <MenuItem danger icon={<Trash2 size={16} />} onClick={() => { cm(); discard() }}>
                  Discard
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      )}

      {/* recipients */}
      {isInline && !recipientsOpen ? (
        <button type="button" onClick={() => setRecipientsOpen(true)} className="flex h-10 items-center gap-2 border-b border-line px-4 text-left text-[14px] text-ink hover:bg-hover">
          <span className="text-muted">{initial.replyMode === 'forward' ? 'Forward' : 'Reply'}</span>
          <span className="truncate">{[...to, ...cc].map((c) => c.name).join(', ') || 'Add recipients'}</span>
        </button>
      ) : (
        <>
          <RecipientField
            label="To"
            value={to}
            onChange={(v) => { touch(); setTo(v) }}
            autoFocus={!isInline && to.length === 0}
            right={
              <span className="ml-2 flex shrink-0 gap-2 text-[14px] text-muted">
                {!showCc && <button type="button" onClick={(e) => { e.stopPropagation(); setShowCc(true) }} className="hover:text-ink hover:underline">Cc</button>}
                {!showBcc && <button type="button" onClick={(e) => { e.stopPropagation(); setShowBcc(true) }} className="hover:text-ink hover:underline">Bcc</button>}
              </span>
            }
          />
          {showCc && <RecipientField label="Cc" value={cc} onChange={(v) => { touch(); setCc(v) }} autoFocus={cc.length === 0} />}
          {showBcc && <RecipientField label="Bcc" value={bcc} onChange={(v) => { touch(); setBcc(v) }} autoFocus={bcc.length === 0} />}
          {!isInline && (
            <div className="flex h-10 items-center border-b border-line px-4">
              <input
                value={subject}
                onChange={(e) => { touch(); setSubject(e.target.value) }}
                placeholder="Subject"
                aria-label="Subject"
                className="h-full w-full bg-transparent text-[14px] outline-none placeholder:text-muted"
              />
            </div>
          )}
        </>
      )}

      {/* body */}
      <div className={cx('scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-3', isInline && 'min-h-[140px]')} onClick={(e) => e.target === e.currentTarget && editor.current?.focus()}>
        <div
          ref={editor}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline
          aria-label="Message Body"
          data-placeholder="Say hello…"
          onInput={() => {
            touch()
            setHtml(editor.current?.innerHTML ?? '')
          }}
          onKeyUp={saveSelection}
          onMouseUp={(e) => {
            const sel = window.getSelection()
            const node = sel?.anchorNode
            const el = node && (node.nodeType === 1 ? (node as Element) : node.parentElement)
            // clicking blank space below the text lands the caret in the signature/quote
            if (e.target === editor.current && sel?.isCollapsed && el?.closest('.signature, .quote')) placeCaretAtStart(editor.current)
            saveSelection()
          }}
          onBlur={saveSelection}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault()
              addFiles(e.clipboardData.files)
            }
          }}
          className="editor mail-body relative min-h-[120px] text-[14px] outline-none"
        />
        {attachments.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {attachments.map((a) => {
              const meta = KIND_META[a.kind]
              const Icon = meta.icon
              return (
                <div key={a.id} className="flex h-9 max-w-[420px] items-center gap-2 rounded bg-surface-2 px-3 text-[13px]">
                  <Icon size={16} style={{ color: meta.color }} />
                  <span className="min-w-0 flex-1 truncate font-medium text-accent">{a.name}</span>
                  <span className="text-muted">({formatSize(a.size)})</span>
                  <button type="button" aria-label={`Remove ${a.name}`} onClick={() => { touch(); setAttachments(attachments.filter((x) => x.id !== a.id)) }} className="rounded p-1 hover:bg-hover">
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* formatting bar */}
      {formatBar && (
        <div className="mx-3 mb-1 flex shrink-0 flex-wrap items-center gap-0.5 rounded-lg border border-line bg-surface px-1 py-0.5 shadow-sm" onMouseDown={(e) => e.preventDefault()}>
          <IconButton size="sm" label="Undo" tipBelow={false} onClick={() => exec('undo')}><Undo2 size={16} /></IconButton>
          <IconButton size="sm" label="Redo" tipBelow={false} onClick={() => exec('redo')}><Redo2 size={16} /></IconButton>
          <span className="mx-1 h-5 w-px bg-line" />
          <select
            aria-label="Size"
            onChange={(e) => exec('fontSize', e.target.value)}
            defaultValue="3"
            className="h-7 rounded bg-transparent px-1 text-[13px] hover:bg-hover"
          >
            <option value="2">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="6">Huge</option>
          </select>
          <span className="mx-1 h-5 w-px bg-line" />
          <IconButton size="sm" label="Bold (⌘B)" tipBelow={false} onClick={() => exec('bold')}><Bold size={16} /></IconButton>
          <IconButton size="sm" label="Italic (⌘I)" tipBelow={false} onClick={() => exec('italic')}><Italic size={16} /></IconButton>
          <IconButton size="sm" label="Underline (⌘U)" tipBelow={false} onClick={() => exec('underline')}><Underline size={16} /></IconButton>
          <Dropdown
            width={196}
            trigger={({ toggle }) => (
              <IconButton size="sm" label="Text color" tipBelow={false} onClick={toggle}>
                <span className="text-[15px] font-bold underline decoration-[3px]" style={{ textDecorationColor: '#d93025' }}>A</span>
              </IconButton>
            )}
          >
            {(cm) => (
              <div className="grid grid-cols-6 gap-2 px-3 py-1">
                {['#1f1f1f', '#5f6368', '#d93025', '#e37400', '#f9ab00', '#188038', '#1a73e8', '#a142f4', '#c5221f', '#0b8043', '#12b5cb', '#f439a0'].map((c) => (
                  <button key={c} type="button" aria-label={`Color ${c}`} className="h-6 w-6 rounded-full" style={{ background: c }} onClick={() => { cm(); exec('foreColor', c) }} />
                ))}
              </div>
            )}
          </Dropdown>
          <span className="mx-1 h-5 w-px bg-line" />
          <IconButton size="sm" label="Numbered list" tipBelow={false} onClick={() => exec('insertOrderedList')}><ListOrdered size={16} /></IconButton>
          <IconButton size="sm" label="Bulleted list" tipBelow={false} onClick={() => exec('insertUnorderedList')}><List size={16} /></IconButton>
          <IconButton size="sm" label="Quote" tipBelow={false} onClick={() => exec('formatBlock', 'blockquote')}><Quote size={16} /></IconButton>
          <IconButton size="sm" label="Strikethrough" tipBelow={false} onClick={() => exec('strikeThrough')}><Strikethrough size={16} /></IconButton>
          <IconButton size="sm" label="Remove formatting" tipBelow={false} onClick={() => exec('removeFormat')}><RemoveFormatting size={16} /></IconButton>
        </div>
      )}

      {/* footer */}
      <div className={cx('flex shrink-0 items-center gap-1 px-3 pb-3 pt-1', isMobile && 'hidden')}>
        {sendButton}
        <IconButton label="Formatting options" tipBelow={false} active={formatBar} onClick={() => setFormatBar(!formatBar)} className="ml-2">
          <Type size={18} />
        </IconButton>
        <IconButton label="Attach files" tipBelow={false} onClick={() => fileInput.current?.click()}>
          <Paperclip size={18} />
        </IconButton>
        <LinkButton onInsert={(url, text) => {
          if (text) exec('insertHTML', `<a href="${url.replace(/"/g, '')}">${text.replace(/</g, '&lt;')}</a>`)
          else exec('createLink', url)
        }} onOpen={saveSelection} />
        <Dropdown
          width={264}
          trigger={({ toggle }) => (
            <IconButton label="Insert emoji" tipBelow={false} onClick={() => { saveSelection(); toggle() }}>
              <Smile size={18} />
            </IconButton>
          )}
        >
          {(cm) => (
            <div className="grid grid-cols-8 gap-1 px-2">
              {EMOJIS.map((em) => (
                <button key={em} type="button" className="flex h-8 w-8 items-center justify-center rounded text-[20px] hover:bg-hover" onClick={() => { cm(); exec('insertText', em) }}>
                  {em}
                </button>
              ))}
            </div>
          )}
        </Dropdown>
        {isInline && onPopOut && (
          <IconButton label="Pop out reply" tipBelow={false} onClick={() => { saveDraft(current()); onPopOut() }}>
            <ExternalLink size={17} />
          </IconButton>
        )}
        <span className="ml-auto pr-1 text-[12px] text-muted" aria-live="polite">
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Draft saved' : ''}
        </span>
        <IconButton label="Discard draft" tipBelow={false} onClick={discard}>
          <Trash2 size={18} />
        </IconButton>
      </div>
      <input ref={fileInput} type="file" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />

      <Modal open={!!error} onClose={() => setError(null)} title="Error" width={420} footer={<Button variant="filled" onClick={() => setError(null)}>OK</Button>}>
        <p className="pb-2 text-[14px]">{error}</p>
      </Modal>
      {scheduleCustom && (
        <DateTimeDialog open title="Pick date & time" confirm="Schedule send" onClose={() => setScheduleCustom(false)} onPick={(ts) => trySend(ts)} />
      )}
    </div>
  )
}

function placeCaretAtStart(el: HTMLElement) {
  const range = document.createRange()
  const first = el.firstElementChild
  range.setStart(first && first.tagName === 'P' ? first : el, 0)
  range.collapse(true)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function LinkButton({ onInsert, onOpen }: { onInsert: (url: string, text: string) => void; onOpen: () => void }) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  return (
    <Dropdown
      width={300}
      onOpenChange={(o) => {
        if (o) onOpen()
        else {
          setUrl('')
          setText('')
        }
      }}
      trigger={({ toggle }) => (
        <IconButton label="Insert link" tipBelow={false} onClick={() => { onOpen(); toggle() }}>
          <Link2 size={18} />
        </IconButton>
      )}
    >
      {(close) => (
        <form
          className="flex flex-col gap-2 px-4 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!url.trim()) return
            const href = /^(https?:|mailto:)/.test(url) ? url.trim() : `https://${url.trim()}`
            onInsert(href, text.trim())
            close()
          }}
        >
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Text to display (optional)" className="h-9 border-b border-line-strong bg-transparent text-[14px] outline-none focus:border-accent" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Web address or email" className="h-9 border-b border-line-strong bg-transparent text-[14px] outline-none focus:border-accent" />
          <div className="flex justify-end">
            <Button variant="text" type="submit">Insert</Button>
          </div>
        </form>
      )}
    </Dropdown>
  )
}

export function ComposeDock() {
  const composes = useUI((s) => s.composes)
  const drafts = useMail((s) => s.drafts)
  const close = useUI((s) => s.closeCompose)
  const update = useUI((s) => s.updateCompose)
  const mobile = useIsMobile()

  // drop windows whose draft vanished (sent / discarded elsewhere)
  useEffect(() => {
    composes.forEach((c) => {
      if (!drafts[c.id]) close(c.id)
    })
  }, [composes, drafts, close])

  const live = composes.filter((c) => drafts[c.id])
  if (!live.length) return null

  if (mobile) {
    const top = live[live.length - 1]
    return createPortal(
      <div className="animate-slide-up fixed inset-0 z-[70] flex flex-col bg-surface">
        <ComposeForm key={top.id} draftId={top.id} variant="mobile" onClose={() => close(top.id)} />
      </div>,
      document.body,
    )
  }

  const max = live.find((c) => c.maximized && !c.minimized)
  return (
    <>
      <div className="no-print pointer-events-none fixed bottom-0 right-4 z-[60] flex items-end gap-4">
        {live.map((c) => {
          const d = drafts[c.id]
          if (c.maximized && !c.minimized) return null
          if (c.minimized) {
            return (
              <div key={c.id} className="pointer-events-auto flex h-10 w-[280px] cursor-pointer items-center gap-1 rounded-t-xl bg-search pl-4 pr-2 shadow-pop" onClick={() => update(c.id, { minimized: false })}>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{d.subject || 'New Message'}</span>
                <IconButton size="sm" label="Restore" onClick={(e) => { e.stopPropagation(); update(c.id, { minimized: false }) }}>
                  <Minus size={16} />
                </IconButton>
                <IconButton size="sm" label="Full screen" onClick={(e) => { e.stopPropagation(); update(c.id, { minimized: false, maximized: true }) }}>
                  <Maximize2 size={15} />
                </IconButton>
                <IconButton size="sm" label="Close" onClick={(e) => { e.stopPropagation(); close(c.id) }}>
                  <X size={17} />
                </IconButton>
              </div>
            )
          }
          return (
            <div key={c.id} className="animate-slide-up pointer-events-auto flex h-[min(620px,calc(100vh-80px))] w-[min(560px,calc(100vw-32px))] flex-col rounded-t-xl bg-surface shadow-pop">
              <ComposeForm
                draftId={c.id}
                variant="window"
                onClose={() => close(c.id)}
                onMinimize={() => update(c.id, { minimized: true })}
                onToggleMax={() => update(c.id, { maximized: true })}
              />
            </div>
          )
        })}
      </div>
      {max &&
        createPortal(
          <div className="animate-fade fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-6 max-lg:p-2" onPointerDown={(e) => e.target === e.currentTarget && update(max.id, { maximized: false })}>
            <div className="animate-pop flex h-full max-h-[860px] w-full max-w-[1100px] flex-col rounded-2xl bg-surface shadow-pop">
              <ComposeForm
                key={max.id}
                draftId={max.id}
                variant="full"
                onClose={() => close(max.id)}
                onMinimize={() => update(max.id, { minimized: true, maximized: false })}
                onToggleMax={() => update(max.id, { maximized: false })}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
