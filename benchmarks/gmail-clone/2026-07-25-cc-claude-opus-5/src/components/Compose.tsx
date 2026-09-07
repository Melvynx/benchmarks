import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../lib/app'
import { CONTACTS, ME, resolveContact } from '../lib/contacts'
import { ATTACHMENT_TINT, fileSize, makeAttachment, whenLabel } from '../lib/format'
import { useMedia } from '../lib/media'
import { selectFrequentContacts, useDispatch, useStore } from '../lib/store'
import type { Attachment, ComposeWindow, Contact } from '../lib/types'
import { Icon, type IconName } from './Icon'
import { snoozeOptions } from './Menus'
import { Avatar, cx, IconButton, MenuButton, MenuDivider, MenuItem, Tooltip } from './ui'

const SAMPLE_FILES: [string, number][] = [
  ['Q3-roadmap.pdf', 2_412_000],
  ['orbit-brand-kit.zip', 18_900_000],
  ['revenue-model.xlsx', 486_000],
  ['launch-deck.pptx', 7_240_000],
  ['hero-mockup.png', 1_980_000],
  ['migration-notes.md', 14_800],
]

export function Compose({ win }: { win: ComposeWindow }) {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()

  const [to, setTo] = useState(win.to)
  const [cc, setCc] = useState(win.cc)
  const [bcc, setBcc] = useState(win.bcc)
  const [subject, setSubject] = useState(win.subject)
  const [attachments, setAttachments] = useState<Attachment[]>(win.attachments)
  const [showCc, setShowCc] = useState(win.showCc)
  const [showBcc, setShowBcc] = useState(win.showBcc)
  const [sendAt, setSendAt] = useState<number | undefined>(win.sendAt)
  const [formatOpen, setFormatOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const editor = useRef<HTMLDivElement>(null)
  const bodyRef = useRef(win.body)
  const saveTimer = useRef<number | undefined>(undefined)
  /** Set once the window is sent or discarded so unmount doesn't resurrect it. */
  const finalized = useRef(false)

  const inline = !!win.inline
  const full = win.mode === 'full'

  // Body lives in a ref and in the DOM, so typing never re-renders the app.
  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== bodyRef.current) {
      editor.current.innerHTML = bodyRef.current
    }
  }, [win.mode])

  // Replies and forwards start with the cursor in the body, above the quote.
  const focusBody = win.kind !== 'new'
  useEffect(() => {
    if (!focusBody || !editor.current) return
    const el = editor.current
    el.focus()
    const range = document.createRange()
    range.setStart(el, 0)
    range.collapse(true)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [focusBody])

  const snapshot = () => ({
    id: win.id,
    to,
    cc,
    bcc,
    subject,
    body: bodyRef.current,
    attachments,
    threadId: win.threadId,
    inReplyTo: win.inReplyTo,
    showCc,
    showBcc,
  })

  const isEmpty = () =>
    !to.length &&
    !cc.length &&
    !bcc.length &&
    !subject.trim() &&
    !attachments.length &&
    !stripHtml(bodyRef.current).trim()

  const save = () => {
    if (isEmpty()) return
    dispatch({ t: 'draft:save', draft: snapshot(), subject: subject.trim() || '(no subject)' })
  }

  /* Autosave, like Gmail's silent "Draft saved". */
  const queueSave = () => {
    setDirty(true)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      save()
      setDirty(false)
      setSaved(true)
    }, 900)
  }

  // Flush whatever is in flight if the window unmounts mid-edit.
  const flush = useRef(save)
  flush.current = save
  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current)
      if (!finalized.current) flush.current()
    },
    [],
  )

  const doSend = (at?: number) => {
    if (!to.length && !cc.length && !bcc.length) {
      app.toast('Add at least one recipient before sending.')
      return
    }
    window.clearTimeout(saveTimer.current)
    finalized.current = true
    app.send({ ...snapshot(), sendAt: at }, subject.trim() || '(no subject)', at)
  }

  const discard = () => {
    window.clearTimeout(saveTimer.current)
    finalized.current = true
    dispatch({ t: 'draft:discard', messageId: win.id })
    app.closeCompose(win.id)
    app.toast('Draft discarded.')
  }

  const close = () => {
    window.clearTimeout(saveTimer.current)
    finalized.current = true
    if (isEmpty()) {
      dispatch({ t: 'draft:discard', messageId: win.id })
      app.closeCompose(win.id)
      return
    }
    save()
    app.closeCompose(win.id)
    app.toast('Draft saved.')
  }

  const popOut = () => {
    window.clearTimeout(saveTimer.current)
    app.updateCompose(win.id, {
      inline: false,
      to,
      cc,
      bcc,
      subject,
      body: bodyRef.current,
      attachments,
      showCc,
      showBcc,
      sendAt,
    })
  }

  const addFile = (name: string, size: number) => {
    setAttachments((prev) => [...prev, makeAttachment(name, size)])
    queueSave()
  }

  const exec = (cmd: string, value?: string) => {
    editor.current?.focus()
    document.execCommand(cmd, false, value)
    bodyRef.current = editor.current?.innerHTML ?? bodyRef.current
    queueSave()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      doSend(sendAt)
    }
    if (e.key === 'Escape') {
      e.stopPropagation()
      if (inline) app.closeCompose(win.id)
      else app.updateCompose(win.id, { mode: 'minimized' })
    }
  }

  if (win.mode === 'minimized') {
    return (
      <div className="pointer-events-auto flex h-10 w-[min(280px,calc(100vw-24px))] items-center gap-1 rounded-t-lg bg-tooltip px-3 text-tooltip-ink shadow-e2">
        <button
          type="button"
          onClick={() => app.updateCompose(win.id, { mode: 'normal' })}
          className="min-w-0 flex-1 truncate text-left text-[13px] font-medium"
        >
          {subject.trim() || 'New message'}
        </button>
        <button
          type="button"
          aria-label="Expand"
          onClick={() => app.updateCompose(win.id, { mode: 'normal' })}
          className="grid size-6 flex-none place-items-center rounded hover:bg-white/15"
        >
          <Icon name="expandLess" size={16} />
        </button>
        <button
          type="button"
          aria-label="Save and close"
          onClick={close}
          className="grid size-6 flex-none place-items-center rounded hover:bg-white/15"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    )
  }

  const fields = (
    <>
      <RecipientField
        label="To"
        value={to}
        onChange={(v) => (setTo(v), queueSave())}
        autoFocus={!inline && win.kind === 'new'}
        trailing={
          <div className="flex items-center gap-2 text-[12px] text-ink-3">
            {!showCc && (
              <button type="button" onClick={() => setShowCc(true)} className="hover:text-ink">
                Cc
              </button>
            )}
            {!showBcc && (
              <button type="button" onClick={() => setShowBcc(true)} className="hover:text-ink">
                Bcc
              </button>
            )}
          </div>
        }
      />
      {showCc && <RecipientField label="Cc" value={cc} onChange={(v) => (setCc(v), queueSave())} />}
      {showBcc && (
        <RecipientField label="Bcc" value={bcc} onChange={(v) => (setBcc(v), queueSave())} />
      )}
      {!inline && (
        <input
          value={subject}
          onChange={(e) => (setSubject(e.target.value), queueSave())}
          placeholder="Subject"
          aria-label="Subject"
          className="h-10 flex-none border-b border-line-soft px-4 text-[14px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
        />
      )}
    </>
  )

  const editorEl = (
    <div
      ref={editor}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline
      aria-label="Message body"
      onInput={() => {
        bodyRef.current = editor.current?.innerHTML ?? ''
        queueSave()
      }}
      className={cx(
        'mail-body scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[14px] leading-[1.6] text-ink outline-none',
        inline ? 'max-h-[45vh] min-h-[110px]' : 'min-h-[110px]',
      )}
    />
  )

  const attachmentRow = !!attachments.length && (
    <div className="flex flex-none flex-wrap gap-1.5 border-t border-line-soft px-3 py-2">
      {attachments.map((a) => (
        <span
          key={a.id}
          className="flex max-w-full items-center gap-1.5 rounded border border-line-2 bg-panel-alt py-1 pr-1 pl-2 text-[12px]"
        >
          <span
            className="grid size-4 flex-none place-items-center rounded-sm text-white"
            style={{ background: ATTACHMENT_TINT[a.kind] }}
          >
            <Icon name={a.kind} size={11} />
          </span>
          <span className="min-w-0 truncate text-ink">{a.name}</span>
          <span className="flex-none text-ink-4">{fileSize(a.size)}</span>
          <button
            type="button"
            aria-label={`Remove ${a.name}`}
            onClick={() => {
              setAttachments((prev) => prev.filter((x) => x.id !== a.id))
              queueSave()
            }}
            className="grid size-5 flex-none place-items-center rounded-full text-ink-3 hover:bg-hov"
          >
            <Icon name="close" size={13} />
          </button>
        </span>
      ))}
    </div>
  )

  const formatRow = formatOpen && (
    <div className="flex flex-none flex-wrap items-center gap-0.5 border-t border-line-soft px-2 py-1">
      {FORMATS.map((f) => (
        <IconButton
          key={f.cmd + (f.value ?? '')}
          icon={f.icon}
          tip={f.tip}
          size={17}
          padding="p-1.5"
          onClick={() => exec(f.cmd, f.value)}
        />
      ))}
      <IconButton
        icon="link"
        tip="Insert link"
        size={17}
        padding="p-1.5"
        onClick={() => {
          const url = prompt('Link URL', 'https://')
          if (url) exec('createLink', url)
        }}
      />
    </div>
  )

  const footer = (
    <footer className="flex h-14 flex-none items-center gap-0.5 px-2 sm:gap-1 sm:px-3">
      <div className="flex flex-none items-stretch overflow-hidden rounded-full bg-accent text-on-accent">
        <button
          type="button"
          onClick={() => doSend(sendAt)}
          className="h-9 px-4 text-[14px] font-medium transition-[filter] hover:brightness-110 sm:px-5"
        >
          {sendAt ? 'Schedule send' : 'Send'}
        </button>
        <span className="my-2 w-px bg-white/25" />
        <MenuButton
          icon="arrowDropDown"
          placement="top-start"
          width={300}
          render={({ toggle, ref }) => (
            <span ref={ref} className="contents">
              <Tooltip label="More send options">
                <button
                  type="button"
                  aria-label="More send options"
                  onClick={toggle}
                  className="grid h-9 w-8 place-items-center transition-[filter] hover:brightness-110"
                >
                  <Icon name="arrowDropDown" size={20} />
                </button>
              </Tooltip>
            </span>
          )}
        >
          {(closeMenu) => (
            <>
              <MenuItem
                icon="send"
                onClick={() => {
                  closeMenu()
                  setSendAt(undefined)
                  doSend()
                }}
              >
                Send now
              </MenuItem>
              <MenuDivider />
              <MenuHeadingRow>Schedule send</MenuHeadingRow>
              {snoozeOptions().map((o) => (
                <MenuItem
                  key={o.key}
                  icon="scheduleSend"
                  trailing={whenLabel(o.when)}
                  selected={sendAt === o.when}
                  onClick={() => {
                    closeMenu()
                    setSendAt(o.when)
                  }}
                >
                  {o.label}
                </MenuItem>
              ))}
              {sendAt && (
                <>
                  <MenuDivider />
                  <MenuItem icon="close" onClick={() => (closeMenu(), setSendAt(undefined))}>
                    Cancel schedule
                  </MenuItem>
                </>
              )}
            </>
          )}
        </MenuButton>
      </div>

      <MenuButton icon="attach" tip="Attach files" placement="top-start" width={300}>
        {(closeMenu) => {
          const left = SAMPLE_FILES.filter((f) => !attachments.some((a) => a.name === f[0]))
          if (!left.length)
            return <p className="px-4 py-2 text-[13px] text-ink-3">All sample files attached.</p>
          return (
            <>
              <MenuHeadingRow>Attach a sample file</MenuHeadingRow>
              {left.map(([name, size]) => (
                <MenuItem
                  key={name}
                  icon="doc"
                  trailing={fileSize(size)}
                  onClick={() => (closeMenu(), addFile(name, size))}
                >
                  {name}
                </MenuItem>
              ))}
            </>
          )
        }}
      </MenuButton>

      <IconButton
        icon="formatSize"
        tip="Formatting options"
        active={formatOpen}
        onClick={() => setFormatOpen((v) => !v)}
      />

      <MenuButton icon="tune" tip="More options" placement="top-start" width={280}>
        {(closeMenu) => (
          <>
            <MenuItem
              icon="person"
              onClick={() => {
                closeMenu()
                bodyRef.current += `<p><br></p><p>—<br>${state.settings.signature}</p>`
                if (editor.current) editor.current.innerHTML = bodyRef.current
                queueSave()
              }}
            >
              Insert signature
            </MenuItem>
            <MenuItem
              icon="quote"
              onClick={() => {
                closeMenu()
                exec('formatBlock', 'blockquote')
              }}
            >
              Quote selection
            </MenuItem>
            <MenuItem icon="settings" onClick={() => (closeMenu(), app.setDialog({ kind: 'settings' }))}>
              Manage signature
            </MenuItem>
          </>
        )}
      </MenuButton>

      <span className="ml-auto flex flex-none items-center gap-1">
        {sendAt && (
          <span className="hidden rounded-full bg-selected-soft px-2 py-[3px] text-[11px] font-medium text-accent sm:block">
            {whenLabel(sendAt)}
          </span>
        )}
        <span
          className={cx(
            'hidden text-[11px] text-ink-4 transition-opacity sm:block',
            dirty || saved ? 'opacity-100' : 'opacity-0',
          )}
        >
          {dirty ? 'Saving…' : 'Draft saved'}
        </span>
        <IconButton icon="trash" tip="Discard draft" size={18} onClick={discard} />
      </span>
    </footer>
  )

  if (inline) {
    return (
      <div
        onKeyDown={onKeyDown}
        className="flex flex-col overflow-hidden rounded-xl border border-line-2 bg-panel shadow-e1"
      >
        <div className="flex flex-none items-center gap-2 border-b border-line-soft px-3 py-2">
          <Avatar name={ME.name} hue={ME.hue} size={28} />
          <span className="text-[13px] text-ink-2">
            {win.kind === 'replyAll' ? 'Reply all' : win.kind === 'forward' ? 'Forward' : 'Reply'}
          </span>
          <span className="ml-auto flex items-center">
            <IconButton
              icon="openInNew"
              tip="Open in new window"
              size={16}
              padding="p-1.5"
              onClick={popOut}
            />
            <IconButton
              icon="close"
              tip="Discard"
              size={16}
              padding="p-1.5"
              onClick={discard}
            />
          </span>
        </div>
        {fields}
        {editorEl}
        {attachmentRow}
        {formatRow}
        {footer}
      </div>
    )
  }

  return (
    <div
      onKeyDown={onKeyDown}
      role="dialog"
      aria-label="Compose message"
      className={cx(
        'pointer-events-auto flex flex-col overflow-hidden bg-panel shadow-e3',
        full
          ? 'fixed inset-3 z-[210] rounded-lg sm:inset-8'
          : 'max-sm:fixed max-sm:inset-0 max-sm:z-[210] h-[min(580px,calc(100vh-96px))] w-[min(540px,calc(100vw-16px))] rounded-t-lg max-sm:h-auto max-sm:w-auto max-sm:rounded-none',
      )}
    >
      <header className="flex h-10 flex-none items-center gap-1 bg-panel-alt px-3">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
          {win.kind === 'forward'
            ? 'Forward message'
            : win.kind === 'reply' || win.kind === 'replyAll'
              ? 'Reply'
              : subject.trim() || 'New message'}
        </span>
        <IconButton
          icon="minimize"
          tip="Minimise"
          size={16}
          padding="p-1"
          onClick={() => app.updateCompose(win.id, { mode: 'minimized' })}
        />
        <IconButton
          icon={full ? 'fullscreenExit' : 'fullscreen'}
          tip={full ? 'Exit full screen' : 'Full screen'}
          size={16}
          padding="p-1"
          onClick={() => app.updateCompose(win.id, { mode: full ? 'normal' : 'full' })}
        />
        <IconButton icon="close" tip="Save and close" size={16} padding="p-1" onClick={close} />
      </header>
      {fields}
      {editorEl}
      {attachmentRow}
      {formatRow}
      {footer}
    </div>
  )
}

function MenuHeadingRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-0.5 pb-1 text-[11px] font-medium tracking-wide text-ink-3 uppercase">
      {children}
    </div>
  )
}

/* ------------------------------------------------------------ recipients */

function RecipientField({
  label,
  value,
  onChange,
  autoFocus,
  trailing,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  autoFocus?: boolean
  trailing?: React.ReactNode
}) {
  const state = useStore()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const frequent = useMemo(() => selectFrequentContacts(state), [state])
  // On a phone the drop-down covers the whole form, so frequent contacts only
  // appear once there is something to filter on.
  const roomy = useMedia('(min-width: 640px)')
  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q && !roomy) return []
    const pool: Contact[] = q
      ? CONTACTS.filter(
          (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
        )
      : frequent.slice(0, 10).map(resolveContact)
    return pool.filter((c) => !value.includes(c.email) && c.email !== ME.email).slice(0, 6)
  }, [text, value, frequent, roomy])

  const commit = (email: string) => {
    const clean = email.trim().replace(/[,;]+$/, '')
    if (!clean) return
    if (!value.includes(clean)) onChange([...value, clean])
    setText('')
    setOpen(false)
    setActive(0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        commit(suggestions[active].email)
        return
      }
    }
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      commit(text)
      return
    }
    if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
  }

  return (
    <div className="relative flex min-h-10 flex-none items-start gap-2 border-b border-line-soft px-4 py-1.5">
      <span className="mt-[5px] w-8 flex-none text-[13px] text-ink-3">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {value.map((email) => {
          const c = resolveContact(email)
          return (
            <Tooltip key={email} label={email}>
              <span className="flex max-w-full items-center gap-1.5 rounded-full bg-hov py-[2px] pr-1 pl-[3px] text-[13px]">
                <Avatar name={c.name} hue={c.hue} size={20} />
                <span className="min-w-0 truncate text-ink">{c.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  onClick={() => onChange(value.filter((v) => v !== email))}
                  className="grid size-4 flex-none place-items-center rounded-full text-ink-3 hover:bg-hov-strong"
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            </Tooltip>
          )
        })}
        <input
          value={text}
          autoFocus={autoFocus}
          aria-label={`${label} recipients`}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120)
            if (text.trim()) commit(text)
          }}
          placeholder={value.length ? '' : 'Recipients'}
          className="h-7 min-w-[120px] flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      {trailing && <span className="mt-[5px] flex-none">{trailing}</span>}

      {open && suggestions.length > 0 && (
        <ul className="anim-menu absolute top-full left-10 z-[220] mt-0.5 w-[min(360px,calc(100%-40px))] overflow-hidden rounded-lg border border-line bg-raised py-1 shadow-e2">
          {suggestions.map((c, i) => (
            <li key={c.email}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  commit(c.email)
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left',
                  i === active && 'bg-hov',
                )}
              >
                <Avatar name={c.name} hue={c.hue} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{c.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{c.email}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ----------------------------------------------------------- formatting */

const FORMATS: { cmd: string; icon: IconName; tip: string; value?: string }[] = [
  { cmd: 'bold', icon: 'bold', tip: 'Bold (⌘B)' },
  { cmd: 'italic', icon: 'italic', tip: 'Italic (⌘I)' },
  { cmd: 'underline', icon: 'underline', tip: 'Underline (⌘U)' },
  { cmd: 'strikeThrough', icon: 'strike', tip: 'Strikethrough' },
  { cmd: 'insertUnorderedList', icon: 'listBulleted', tip: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: 'listNumbered', tip: 'Numbered list' },
  { cmd: 'removeFormat', icon: 'removeFormat', tip: 'Remove formatting' },
]

/* --------------------------------------------------------------- stack */

export function ComposeStack() {
  const app = useApp()
  const floating = app.compose.filter((c) => !c.inline)
  if (!floating.length) return null

  return (
    <div className="no-print pointer-events-none fixed right-2 bottom-0 z-[200] flex items-end gap-3 sm:right-4">
      {floating.map((c) => (
        <Compose key={c.id} win={c} />
      ))}
    </div>
  )
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
}
