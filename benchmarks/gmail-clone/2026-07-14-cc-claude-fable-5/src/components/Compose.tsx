import { useEffect, useRef, useState } from 'react'
import { CaseSensitive, Maximize2, Minimize2, Minus, Paperclip, Trash2, X } from 'lucide-react'
import { useMail } from '../store/store'
import { useIsMobile } from '../hooks/hooks'
import { cx, formatSize, kindFromFilename, uid } from '../lib/utils'
import type { ComposeState } from '../types'
import { BodyEditor, FormatToolbar, RecipientField } from './editor'
import { IconButton } from './ui'

function ComposeWindow({ composer, index }: { composer: ComposeState; index: number }) {
  const c = composer
  const isMobile = useIsMobile()
  const updateComposer = useMail((s) => s.updateComposer)
  const closeComposer = useMail((s) => s.closeComposer)
  const sendComposer = useMail((s) => s.sendComposer)
  const saveComposerDraft = useMail((s) => s.saveComposerDraft)
  const threads = useMail((s) => s.threads)

  const [showCc, setShowCc] = useState(c.cc.length > 0)
  const [showBcc, setShowBcc] = useState(c.bcc.length > 0)
  const [showFormat, setShowFormat] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Debounced draft autosave
  useEffect(() => {
    const id = setTimeout(() => saveComposerDraft(c.id), 1200)
    return () => clearTimeout(id)
  }, [c.to, c.cc, c.bcc, c.subject, c.bodyHtml, c.attachments])

  const replyThread = c.replyToThreadId ? threads.find((t) => t.id === c.replyToThreadId) : undefined
  const title = c.subject.trim() || (replyThread ? `Re: ${replyThread.subject}` : 'New Message')

  const header = (
    <div
      className={cx(
        'flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-t-lg px-3',
        'bg-[#f2f6fc] text-ink-1 dark:bg-[#2b2e34]',
        isMobile && 'rounded-none',
      )}
      onClick={() => {
        if (c.minimized) updateComposer(c.id, { minimized: false })
      }}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      {!isMobile && (
        <>
          <IconButton
            size="sm"
            title={c.minimized ? 'Expand' : 'Minimize'}
            onClick={() => updateComposer(c.id, { minimized: !c.minimized, maximized: false })}
          >
            <Minus />
          </IconButton>
          <IconButton
            size="sm"
            title={c.maximized ? 'Exit full screen' : 'Full screen'}
            onClick={() => updateComposer(c.id, { maximized: !c.maximized, minimized: false })}
          >
            {c.maximized ? <Minimize2 /> : <Maximize2 />}
          </IconButton>
        </>
      )}
      <IconButton size="sm" title="Save & close" onClick={() => closeComposer(c.id)}>
        <X />
      </IconButton>
    </div>
  )

  if (c.minimized && !isMobile) {
    return (
      <div
        className="pointer-events-auto w-[260px] rounded-t-lg shadow-[var(--shadow-compose)]"
        style={{ order: index }}
      >
        {header}
      </div>
    )
  }

  const body = (
    <>
      {header}
      <div className="flex min-h-0 flex-1 flex-col px-4">
        <RecipientField
          label={replyThread ? 'To' : 'To'}
          recipients={c.to}
          onChange={(to) => updateComposer(c.id, { to })}
          autoFocus={c.to.length === 0}
          trailing={
            <span className="ml-auto flex gap-2 pr-1 text-sm text-ink-3">
              {!showCc && (
                <button type="button" className="hover:text-ink-1" onClick={() => setShowCc(true)}>
                  Cc
                </button>
              )}
              {!showBcc && (
                <button type="button" className="hover:text-ink-1" onClick={() => setShowBcc(true)}>
                  Bcc
                </button>
              )}
            </span>
          }
        />
        {showCc && <RecipientField label="Cc" recipients={c.cc} onChange={(cc) => updateComposer(c.id, { cc })} />}
        {showBcc && <RecipientField label="Bcc" recipients={c.bcc} onChange={(bcc) => updateComposer(c.id, { bcc })} />}
        {!c.replyToThreadId && (
          <input
            value={c.subject}
            onChange={(e) => updateComposer(c.id, { subject: e.target.value })}
            placeholder="Subject"
            className="border-b border-line bg-transparent py-2 text-sm text-ink-1 outline-none placeholder:text-ink-3"
            aria-label="Subject"
          />
        )}
        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          <BodyEditor
            initialHtml={c.bodyHtml}
            onChange={(bodyHtml) => updateComposer(c.id, { bodyHtml })}
            placeholder=""
            editorRef={editorRef}
            className="min-h-full"
          />
        </div>

        {c.attachments.length > 0 && (
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto border-t border-line py-2">
            {c.attachments.map((a) => (
              <span
                key={a.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-chip px-2 py-1 text-xs text-ink-1"
              >
                <span className="truncate">{a.name}</span>
                <span className="text-ink-3">({formatSize(a.size)})</span>
                <button
                  type="button"
                  title={`Remove ${a.name}`}
                  onClick={() =>
                    updateComposer(c.id, { attachments: c.attachments.filter((x) => x.id !== a.id) })
                  }
                  className="text-ink-3 hover:text-ink-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {showFormat && <FormatToolbar editorRef={editorRef} className="border-t border-line py-1" />}

        <div className="flex shrink-0 items-center gap-1 py-3">
          <button
            type="button"
            onClick={() => sendComposer(c.id)}
            title="Send (⌘Enter)"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover dark:text-[#0e1014]"
          >
            Send
          </button>
          <IconButton title="Formatting options" active={showFormat} onClick={() => setShowFormat(!showFormat)} className="ml-2">
            <CaseSensitive />
          </IconButton>
          <IconButton title="Attach files" onClick={() => fileRef.current?.click()}>
            <Paperclip />
          </IconButton>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (!files.length) return
              updateComposer(c.id, {
                attachments: [
                  ...c.attachments,
                  ...files.map((f) => ({
                    id: uid('att'),
                    name: f.name,
                    size: f.size,
                    kind: kindFromFilename(f.name),
                  })),
                ],
              })
              e.target.value = ''
            }}
          />
          <span className="flex-1" />
          <IconButton title="Discard draft" onClick={() => closeComposer(c.id, { discard: true })}>
            <Trash2 />
          </IconButton>
        </div>
      </div>
    </>
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      sendComposer(c.id)
    }
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeComposer(c.id)
    }
  }

  if (isMobile) {
    return (
      <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col bg-surface" onKeyDown={onKeyDown}>
        {body}
      </div>
    )
  }

  if (c.maximized) {
    return (
      <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-scrim anim-fade" onKeyDown={onKeyDown}>
        <div className="flex h-[88vh] w-[min(900px,92vw)] flex-col rounded-lg bg-surface shadow-[var(--shadow-compose)] anim-pop">
          {body}
        </div>
      </div>
    )
  }

  return (
    <div
      className="pointer-events-auto flex h-[500px] max-h-[calc(100vh-80px)] w-[510px] flex-col rounded-t-lg bg-surface shadow-[var(--shadow-compose)]"
      style={{ order: index }}
      onKeyDown={onKeyDown}
    >
      {body}
    </div>
  )
}

export function ComposeLayer() {
  const composers = useMail((s) => s.composers)
  if (!composers.length) return null
  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-40 flex items-end gap-4 pr-4 md:pr-16">
      {composers.map((c, i) => (
        <ComposeWindow key={c.id} composer={c} index={i} />
      ))}
    </div>
  )
}
