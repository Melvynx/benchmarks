import { useEffect, useMemo, useRef, useState } from 'react'
import { CONTACTS, contactByEmail, ME } from '../lib/contacts'
import { makeAttachment } from '../lib/format'
import { useApp } from '../lib/app'
import { useDispatch, useMedia, useStore } from '../lib/store'
import type { ComposeWindow } from '../lib/types'
import { Icon } from './Icon'
import { cx } from './ui'

export function ComposeStack() {
  const compose = useStore().compose
  const mobile = useMedia('(max-width: 767px)')
  const visible = compose.filter((c) => !c.inline)
  if (visible.length === 0) return null
  return (
    <div className="no-print pointer-events-none fixed right-0 bottom-0 z-[110] flex flex-row-reverse items-end gap-2 p-0 sm:p-2">
      {visible.map((c) => (
        <ComposeCard key={c.id} compose={c} mobile={mobile} />
      ))}
    </div>
  )
}

function ComposeCard({ compose: c, mobile }: { compose: ComposeWindow; mobile: boolean }) {
  const store = useStore()
  const dispatch = useDispatch()
  const app = useApp()
  const full = c.mode === 'full' || mobile
  const mini = c.mode === 'minimized' && !mobile

  const patch = (p: Partial<ComposeWindow>) => dispatch({ t: 'patchCompose', id: c.id, patch: p })

  if (mini) {
    return (
      <button
        type="button"
        className="pointer-events-auto flex h-10 w-[256px] items-center justify-between rounded-t-xl bg-ink px-3 text-[13px] text-panel shadow-e3"
        onClick={() => patch({ mode: 'normal' })}
      >
        <span className="truncate">{c.subject || 'New Message'}</span>
        <span className="flex">
          <span
            className="grid size-8 place-items-center"
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ t: 'closeCompose', id: c.id })
            }}
          >
            <Icon name="close" size={16} />
          </span>
        </span>
      </button>
    )
  }

  return (
    <div
      className={cx(
        'pointer-events-auto flex flex-col overflow-hidden bg-panel shadow-e3',
        full
          ? 'fixed inset-0 z-[130] sm:inset-6 sm:rounded-2xl'
          : 'h-[min(560px,70vh)] w-[min(100vw,480px)] rounded-t-xl',
      )}
    >
      <div className="flex h-10 flex-none items-center bg-ink px-3 text-[13px] text-panel">
        <span className="flex-1 truncate font-medium">{c.subject || 'New Message'}</span>
        {!mobile && (
          <>
            <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="Minimize" onClick={() => patch({ mode: 'minimized' })}>
              <Icon name="minimize" size={16} />
            </button>
            <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="Full screen" onClick={() => patch({ mode: c.mode === 'full' ? 'normal' : 'full' })}>
              <Icon name="expand" size={16} />
            </button>
          </>
        )}
        <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="Save & close" onClick={() => dispatch({ t: 'closeCompose', id: c.id })}>
          <Icon name="close" size={16} />
        </button>
      </div>

      <RecipientRow label="To" value={c.to} onChange={(to) => patch({ to })} />
      {c.showCc && <RecipientRow label="Cc" value={c.cc} onChange={(cc) => patch({ cc })} />}
      {c.showBcc && <RecipientRow label="Bcc" value={c.bcc} onChange={(bcc) => patch({ bcc })} />}
      {!c.showCc || !c.showBcc ? (
        <div className="flex justify-end gap-3 border-b border-line px-3 py-1 text-[12px] text-accent">
          {!c.showCc && (
            <button type="button" onClick={() => patch({ showCc: true })}>
              Cc
            </button>
          )}
          {!c.showBcc && (
            <button type="button" onClick={() => patch({ showBcc: true })}>
              Bcc
            </button>
          )}
        </div>
      ) : null}

      <input
        value={c.subject}
        onChange={(e) => patch({ subject: e.target.value })}
        placeholder="Subject"
        className="h-10 flex-none border-b border-line px-3 outline-none"
      />

      <Editor
        html={c.body}
        onChange={(body) => patch({ body })}
        signature={store.settings.signature}
        kind={c.kind}
      />

      {c.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2">
          {c.attachments.map((a) => (
            <span key={a.id} className="flex items-center gap-1 rounded-full bg-chip px-2 py-1 text-[12px]">
              {a.name}
              <button type="button" aria-label={`Remove ${a.name}`} onClick={() => patch({ attachments: c.attachments.filter((x) => x.id !== a.id) })}>
                <Icon name="close" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-none items-center gap-1 px-3 py-2">
        <div className="flex overflow-hidden rounded-full bg-accent text-panel">
          <button
            type="button"
            className="h-9 px-5 text-[14px] font-medium disabled:opacity-40"
            disabled={!c.to.length && !c.cc.length}
            onClick={() => dispatch({ t: 'send', id: c.id })}
          >
            Send
          </button>
          <button
            type="button"
            className="grid h-9 w-8 place-items-center border-l border-white/20"
            aria-label="Schedule send"
            onClick={() => app.setDialog({ kind: 'schedule', composeId: c.id })}
          >
            <Icon name="drop" size={18} />
          </button>
        </div>
        <FormatBar
          onCmd={(cmd) => document.execCommand(cmd)}
          onAttach={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.onchange = () => {
              const files = [...(input.files ?? [])]
              patch({
                attachments: [
                  ...c.attachments,
                  ...files.map((f) => makeAttachment(f.name, f.size)),
                ],
              })
            }
            input.click()
          }}
        />
        <button
          type="button"
          className="ml-auto grid size-9 place-items-center rounded-full text-ink-3 hover:bg-hov"
          aria-label="Discard draft"
          onClick={() => dispatch({ t: 'closeCompose', id: c.id, discard: true })}
        >
          <Icon name="trash" size={18} />
        </button>
      </div>
    </div>
  )
}

function RecipientRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const suggestions = useMemo(() => {
    const q = text.toLowerCase()
    if (!q) return CONTACTS.filter((c) => c.email !== ME.email).slice(0, 6)
    return CONTACTS.filter(
      (c) => c.email !== ME.email && (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
    ).slice(0, 6)
  }, [text])

  const commit = (raw: string) => {
    const email = raw.trim().replace(/[;,]$/, '')
    if (!email) return
    const c = CONTACTS.find((x) => x.email === email || x.name.toLowerCase() === email.toLowerCase())
    const addr = c?.email ?? email
    if (!value.includes(addr)) onChange([...value, addr])
    setText('')
    setOpen(false)
  }

  return (
    <div className="relative flex min-h-10 flex-wrap items-center gap-1 border-b border-line px-3 py-1">
      <span className="w-8 text-[13px] text-ink-3">{label}</span>
      {value.map((e) => {
        const c = contactByEmail(e)
        return (
          <span key={e} className="flex items-center gap-1 rounded-full bg-chip py-0.5 pr-1 pl-2 text-[13px]">
            {c.name}
            <button type="button" className="grid size-5 place-items-center rounded-full hover:bg-hov" aria-label={`Remove ${c.name}`} onClick={() => onChange(value.filter((x) => x !== e))}>
              <Icon name="close" size={12} />
            </button>
          </span>
        )
      })}
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (['Enter', 'Tab', ',', ';'].includes(e.key)) {
            e.preventDefault()
            commit(text)
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        className="min-w-[120px] flex-1 bg-transparent py-1 outline-none"
        aria-label={label}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-8 z-[20] mt-1 w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-xl bg-panel py-1 shadow-e3">
          {suggestions.map((s) => (
            <button
              key={s.email}
              type="button"
              className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-hov"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(s.email)}
            >
              <span className="text-[13px] font-medium">{s.name}</span>
              <span className="text-[12px] text-ink-3">{s.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Editor({
  html,
  onChange,
  signature,
  kind,
}: {
  html: string
  onChange: (h: string) => void
  signature: string
  kind: ComposeWindow['kind']
}) {
  const ref = useRef<HTMLDivElement>(null)
  const seeded = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    if (document.activeElement === ref.current) return
    if (ref.current.innerHTML !== html) ref.current.innerHTML = html
  }, [html])

  useEffect(() => {
    if (seeded.current || kind !== 'new') return
    if (html) return
    seeded.current = true
    const sig = signature
      .split('\n')
      .map((l) => l || '<br>')
      .join('<br>')
    const initial = `<p></p><p></p><p style="color:#5f6368">${sig}</p>`
    onChange(initial)
  }, [html, kind, onChange, signature])

  return (
    <div
      ref={ref}
      className="compose-editor scrollbar-thin min-h-[160px] flex-1 overflow-auto px-3 py-2 text-[14px] leading-relaxed outline-none"
      contentEditable
      role="textbox"
      aria-label="Message body"
      data-placeholder="Write your message"
      onInput={() => onChange(ref.current?.innerHTML ?? '')}
    />
  )
}

function FormatBar({ onCmd, onAttach }: { onCmd: (c: string) => void; onAttach: () => void }) {
  return (
    <div className="flex items-center">
      {(['bold', 'italic', 'underline', 'insertUnorderedList'] as const).map((cmd) => (
        <button
          key={cmd}
          type="button"
          className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-hov"
          aria-label={cmd}
          onMouseDown={(e) => {
            e.preventDefault()
            onCmd(cmd === 'insertUnorderedList' ? 'insertUnorderedList' : cmd)
          }}
        >
          <Icon name={cmd === 'insertUnorderedList' ? 'list' : cmd} size={16} />
        </button>
      ))}
      <button type="button" className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-hov" aria-label="Attach" onClick={onAttach}>
        <Icon name="attach" size={16} />
      </button>
    </div>
  )
}
