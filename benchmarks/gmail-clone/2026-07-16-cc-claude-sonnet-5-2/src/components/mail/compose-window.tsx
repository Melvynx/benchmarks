import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Maximize2,
  Minimize2,
  Minus,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useMailStore } from '@/store/mail-store'
import type { ComposeDraft } from '@/lib/types'
import { RecipientInput } from './recipient-input'
import { ComposeToolbar } from './compose-toolbar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SnoozeMenu } from './snooze-menu'
import { formatShortDateTime } from '@/lib/format'
import { useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

const MODE_TITLE: Record<ComposeDraft['mode'], string> = {
  new: 'New Message',
  reply: 'Reply',
  'reply-all': 'Reply all',
  forward: 'Forward',
}

export function ComposeWindow({ draft }: { draft: ComposeDraft }) {
  const updateCompose = useMailStore((s) => s.updateCompose)
  const minimizeCompose = useMailStore((s) => s.minimizeCompose)
  const closeCompose = useMailStore((s) => s.closeCompose)
  const discardCompose = useMailStore((s) => s.discardCompose)
  const sendCompose = useMailStore((s) => s.sendCompose)
  const showToast = useMailStore((s) => s.showToast)

  const [fullscreen, setFullscreen] = useState(false)
  const [showCc, setShowCc] = useState(draft.cc.length > 0)
  const [showBcc, setShowBcc] = useState(draft.bcc.length > 0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingSelection = useRef<[number, number] | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (draft.mode !== 'new' && draft.to.length > 0 && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(0, 0)
    }
  }, [draft.id, draft.mode, draft.to.length])

  useEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      const [start, end] = pendingSelection.current
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(start, end)
      pendingSelection.current = null
    }
  }, [draft.bodyText])

  function handleBodyChange(next: string, selection?: [number, number]) {
    if (selection) pendingSelection.current = selection
    updateCompose(draft.id, { bodyText: next })
  }

  function handleSend() {
    if (draft.to.length === 0) {
      showToast('Add at least one recipient before sending')
      return
    }
    sendCompose(draft.id)
  }

  function handleScheduleSend(iso: string) {
    if (draft.to.length === 0) {
      showToast('Add at least one recipient before scheduling')
      return
    }
    const delay = Math.max(0, new Date(iso).getTime() - Date.now())
    updateCompose(draft.id, { scheduledFor: iso })
    minimizeCompose(draft.id, true)
    showToast(`Message scheduled to send ${formatShortDateTime(iso)}`)
    window.setTimeout(() => {
      sendCompose(draft.id)
    }, delay)
  }

  const title = draft.subject.trim() || MODE_TITLE[draft.mode]

  if (draft.minimized) {
    return (
      <div
        className="flex h-11 w-72 shrink-0 items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted px-3 shadow-lg"
      >
        <button
          onClick={() => minimizeCompose(draft.id, false)}
          className="flex min-w-0 flex-1 items-center gap-2 truncate text-left text-[13px] font-medium"
        >
          {draft.scheduledFor && <Clock className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="truncate">{title}</span>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => minimizeCompose(draft.id, false)}
            className="rounded-full p-1.5 hover:bg-surface-hover"
            aria-label="Expand"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            onClick={() => closeCompose(draft.id)}
            className="rounded-full p-1.5 hover:bg-surface-hover"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-t-lg border border-b-0 border-border bg-card shadow-2xl',
        fullscreen || isMobile
          ? 'fixed inset-4 z-50 rounded-lg border-b'
          : 'h-[520px] w-[min(480px,90vw)]',
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between bg-[#404040] px-3 text-white">
        <span className="truncate text-[13px] font-medium">{title}</span>
        <div className="flex items-center gap-0.5">
          {!isMobile && (
            <button
              onClick={() => minimizeCompose(draft.id, true)}
              className="rounded p-1.5 hover:bg-white/10"
              aria-label="Minimize"
            >
              <Minus className="size-4" />
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => setFullscreen((v) => !v)}
              className="rounded p-1.5 hover:bg-white/10"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          )}
          <button
            onClick={() => discardCompose(draft.id)}
            className="rounded p-1.5 hover:bg-white/10"
            aria-label="Discard draft"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={() => closeCompose(draft.id)}
            className="rounded p-1.5 hover:bg-white/10"
            aria-label="Save and close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center border-b border-border px-1">
          <div className="flex-1">
            <RecipientInput label="To" value={draft.to} onChange={(to) => updateCompose(draft.id, { to })} autoFocus />
          </div>
          {!showCc && !showBcc && (
            <div className="flex gap-1 pr-2 text-[13px] text-muted-foreground">
              <button onClick={() => setShowCc(true)} className="hover:text-foreground">
                Cc
              </button>
              <button onClick={() => setShowBcc(true)} className="hover:text-foreground">
                Bcc
              </button>
            </div>
          )}
        </div>
        {showCc && (
          <RecipientInput label="Cc" value={draft.cc} onChange={(cc) => updateCompose(draft.id, { cc })} />
        )}
        {showBcc && (
          <RecipientInput label="Bcc" value={draft.bcc} onChange={(bcc) => updateCompose(draft.id, { bcc })} />
        )}

        <input
          value={draft.subject}
          onChange={(e) => updateCompose(draft.id, { subject: e.target.value })}
          placeholder="Subject"
          className="border-b border-border px-3 py-2 text-[14px] outline-none placeholder:text-muted-foreground"
        />

        <textarea
          ref={textareaRef}
          value={draft.bodyText}
          onChange={(e) => updateCompose(draft.id, { bodyText: e.target.value })}
          placeholder="Compose your message"
          className="min-h-0 flex-1 resize-none px-3 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />

        {draft.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
            {draft.attachments.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
              >
                {a.name}
                <button
                  onClick={() =>
                    updateCompose(draft.id, { attachments: draft.attachments.filter((x) => x.id !== a.id) })
                  }
                  aria-label={`Remove ${a.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <ComposeToolbar
          textareaRef={textareaRef}
          body={draft.bodyText}
          onBodyChange={handleBodyChange}
          onAddAttachment={(attachment) =>
            updateCompose(draft.id, { attachments: [...draft.attachments, attachment] })
          }
        />

        <div className="flex items-center gap-2 border-t border-border px-3 py-2">
          <div className="flex overflow-hidden rounded-full">
            <Button onClick={handleSend} className="rounded-none rounded-l-full pr-3">
              Send
              <Send className="size-3.5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="rounded-none rounded-r-full border-l border-white/20 px-2" aria-label="Schedule send">
                  <ChevronDown className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <SnoozeMenu onSnooze={handleScheduleSend} title="Schedule send" />
              </PopoverContent>
            </Popover>
          </div>
          <button
            onClick={() => discardCompose(draft.id)}
            aria-label="Discard draft"
            className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-surface-hover"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
