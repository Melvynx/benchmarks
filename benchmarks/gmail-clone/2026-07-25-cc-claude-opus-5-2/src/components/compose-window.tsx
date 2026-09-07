import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  CalendarClock,
  ChevronDown,
  Maximize2,
  Minimize2,
  Minus,
  Paperclip,
  Pen,
  Trash2,
  X,
} from 'lucide-react'
import type { Attachment, Draft } from '@/lib/types'
import { cn, formatBytes, kindForFile, uid } from '@/lib/utils'
import { useCompose, type ComposeWindow as Win } from '@/store/compose'
import { useSettings } from '@/store/settings'
import { AttachmentIcon } from './attachments'
import { RichTextEditor, FormatToolbar, type EditorHandle } from './rich-text-editor'
import { RecipientField } from './recipient-field'
import { SnoozeMenu } from './snooze-menu'
import { IconButton } from './ui/bits'
import { Menu } from './ui/popover'

function readFile(file: File, as: 'dataUrl' | 'text') {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => resolve('')
    if (as === 'dataUrl') reader.readAsDataURL(file)
    else reader.readAsText(file)
  })
}

interface ComposeWindowProps {
  win: Win
  index: number
  onSend: (draft: Draft, scheduledFor?: string) => void
}

export function ComposeWindow({ win, index, onSend }: ComposeWindowProps) {
  const compose = useCompose()
  const { settings } = useSettings()
  const { draft, state } = win
  const editorRef = useRef<EditorHandle>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scheduleRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const [showCc, setShowCc] = useState(draft.cc.length > 0)
  const [showBcc, setShowBcc] = useState(draft.bcc.length > 0)
  const [showFormat, setShowFormat] = useState(false)
  const [menu, setMenu] = useState<'schedule' | 'more' | null>(null)

  const set = (patch: Partial<Draft>) => compose.update(draft.id, patch)

  useEffect(() => {
    if (state === 'minimized') return
    if (draft.mode === 'new') return
    editorRef.current?.focusStart()
  }, [win.focusToken, state, draft.mode])

  const title =
    draft.subject.trim() ||
    (draft.mode === 'forward' ? 'Forward message' : draft.mode === 'new' ? 'New Message' : 'Reply')

  const attach = async (files: FileList | null) => {
    if (!files?.length) return
    const additions = await Promise.all(
      Array.from(files)
        .slice(0, 8)
        .map(async (file): Promise<Attachment> => {
          const att: Attachment = {
            id: uid('att'),
            name: file.name,
            size: file.size,
            kind: kindForFile(file.name),
          }
          // Real previews for the two cases we can render cheaply.
          if (file.type.startsWith('image/') && file.size < 3_000_000) {
            att.previewImage = await readFile(file, 'dataUrl')
          } else if (file.size < 120_000 && ['code', 'doc', 'sheet'].includes(att.kind)) {
            att.previewText = (await readFile(file, 'text')).slice(0, 4000)
          }
          return att
        }),
    )
    set({ attachments: [...draft.attachments, ...additions] })
  }

  const canSend = draft.to.length > 0 || draft.cc.length > 0 || draft.bcc.length > 0

  if (state === 'minimized') {
    return (
      <div
        style={{ right: `${1 + index * 17}rem` }}
        className="pointer-events-auto fixed bottom-0 z-[60] hidden w-[16rem] rounded-t-lg bg-elevated shadow-compose sm:block"
      >
        <div className="flex h-10 items-center gap-1 rounded-t-lg bg-surface-3 pl-3 pr-1">
          <button
            type="button"
            onClick={() => compose.setState(draft.id, 'normal')}
            className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-ink"
          >
            {title}
          </button>
          <IconButton
            label="Expand"
            size="sm"
            onClick={() => compose.setState(draft.id, 'normal')}
          >
            <Maximize2 />
          </IconButton>
          <IconButton label="Save & close" size="sm" onClick={() => compose.close(draft.id)}>
            <X />
          </IconButton>
        </div>
      </div>
    )
  }

  const full = state === 'full'

  return (
    <div
      /* The dock offset must not apply on phones, where the window is full screen. */
      style={full ? undefined : ({ '--dock': `${1 + index * 1.5}rem` } as CSSProperties)}
      className={cn(
        'pointer-events-auto fixed z-[60] flex flex-col overflow-hidden bg-elevated shadow-compose',
        full
          ? 'inset-2 mx-auto max-w-3xl rounded-2xl sm:inset-y-8'
          : 'inset-x-0 bottom-0 top-0 sm:inset-x-auto sm:right-[var(--dock)] sm:top-auto sm:h-[32rem] sm:w-[32rem] sm:rounded-t-xl',
      )}
    >
      <header
        className={cn(
          'flex h-10 shrink-0 items-center gap-1 bg-surface-3 pl-4 pr-1',
          full && 'rounded-t-2xl',
        )}
        onDoubleClick={() => compose.setState(draft.id, full ? 'normal' : 'full')}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{title}</span>
        <IconButton
          label="Minimize"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => compose.setState(draft.id, 'minimized')}
        >
          <Minus />
        </IconButton>
        <IconButton
          label={full ? 'Exit full screen' : 'Full screen'}
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => compose.setState(draft.id, full ? 'normal' : 'full')}
        >
          {full ? <Minimize2 /> : <Maximize2 />}
        </IconButton>
        <IconButton label="Save & close" size="sm" onClick={() => compose.close(draft.id)}>
          <X />
        </IconButton>
      </header>

      <RecipientField
        label="To"
        value={draft.to}
        onChange={(to) => set({ to })}
        autoFocus={draft.mode === 'new'}
        trailing={
          <span className="flex gap-2 text-[12px] text-ink-3">
            {!showCc && (
              <button type="button" className="hover:text-ink" onClick={() => setShowCc(true)}>
                Cc
              </button>
            )}
            {!showBcc && (
              <button type="button" className="hover:text-ink" onClick={() => setShowBcc(true)}>
                Bcc
              </button>
            )}
          </span>
        }
      />
      {showCc && <RecipientField label="Cc" value={draft.cc} onChange={(cc) => set({ cc })} />}
      {showBcc && <RecipientField label="Bcc" value={draft.bcc} onChange={(bcc) => set({ bcc })} />}

      <input
        value={draft.subject}
        onChange={(e) => set({ subject: e.target.value })}
        placeholder="Subject"
        aria-label="Subject"
        className="shrink-0 border-b border-line-soft bg-transparent px-4 py-2 text-[13px] outline-none placeholder:text-ink-4"
      />

      <RichTextEditor
        ref={editorRef}
        html={draft.bodyHtml}
        onChange={(bodyHtml) => set({ bodyHtml })}
      />

      {draft.attachments.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-line-soft px-4 py-2">
          {draft.attachments.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-2 rounded border border-line bg-surface-2 py-1 pl-2 pr-1 text-[12px]"
            >
              <AttachmentIcon kind={a.kind} className="h-4 w-4" />
              <span className="max-w-[10rem] truncate">{a.name}</span>
              <span className="text-ink-4">{formatBytes(a.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() =>
                  set({ attachments: draft.attachments.filter((x) => x.id !== a.id) })
                }
                className="rounded-full p-0.5 text-ink-3 hover:bg-line hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {showFormat && <FormatToolbar onAfter={() => editorRef.current?.focus()} compact={!full} />}

      <footer className="flex shrink-0 items-center gap-1 px-3 py-2.5">
        <div className="flex items-stretch overflow-hidden rounded-full bg-accent text-on-accent">
          <button
            type="button"
            disabled={!canSend}
            onClick={() => onSend(draft)}
            className="h-9 px-5 text-[14px] font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            Send
          </button>
          <span className="my-2 w-px bg-white/30" />
          <button
            ref={scheduleRef}
            type="button"
            aria-label="More send options"
            disabled={!canSend}
            onClick={() => setMenu(menu === 'schedule' ? null : 'schedule')}
            className="flex w-8 items-center justify-center hover:bg-accent-hover disabled:opacity-50"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <IconButton
          label="Formatting options"
          size="sm"
          active={showFormat}
          onClick={() => setShowFormat((v) => !v)}
        >
          <Pen />
        </IconButton>
        <IconButton label="Attach files" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip />
        </IconButton>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void attach(e.target.files)
            e.target.value = ''
          }}
        />
        <IconButton
          ref={moreRef}
          label="More options"
          size="sm"
          active={menu === 'more'}
          onClick={() => setMenu(menu === 'more' ? null : 'more')}
          className="hidden sm:inline-flex"
        >
          <ChevronDown />
        </IconButton>

        <span className="ml-auto flex items-center gap-1">
          <span className="hidden pr-1 text-[11px] text-ink-4 sm:block">
            {draft.attachments.length > 0 && `${draft.attachments.length} attached · `}
            Draft saved
          </span>
          <IconButton label="Discard draft" size="sm" onClick={() => compose.discard(draft.id)}>
            <Trash2 />
          </IconButton>
        </span>
      </footer>

      <SnoozeMenu
        anchorRef={scheduleRef}
        open={menu === 'schedule'}
        onClose={() => setMenu(null)}
        align="start"
        title="Schedule send"
        verb="Schedule send"
        onPick={(iso) => onSend(draft, iso)}
      />
      <Menu
        anchorRef={moreRef}
        open={menu === 'more'}
        onClose={() => setMenu(null)}
        ariaLabel="Compose options"
        entries={[
          {
            id: 'format',
            label: showFormat ? 'Hide formatting toolbar' : 'Show formatting toolbar',
            icon: <Pen />,
            onSelect: () => setShowFormat((v) => !v),
          },
          {
            id: 'sig',
            label: 'Insert signature',
            disabled: !settings.signature.trim(),
            onSelect: () =>
              set({
                bodyHtml: `${draft.bodyHtml}<p><br></p><p class="sig" style="color:#80868b">--<br>${settings.signature
                  .split('\n')
                  .join('<br>')}</p>`,
              }),
          },
          {
            id: 'schedule',
            label: 'Schedule send',
            icon: <CalendarClock />,
            disabled: !canSend,
            onSelect: () => setMenu('schedule'),
          },
          { type: 'separator', id: 's' },
          {
            id: 'discard',
            label: 'Discard draft',
            icon: <Trash2 />,
            danger: true,
            onSelect: () => compose.discard(draft.id),
          },
        ]}
      />
    </div>
  )
}
