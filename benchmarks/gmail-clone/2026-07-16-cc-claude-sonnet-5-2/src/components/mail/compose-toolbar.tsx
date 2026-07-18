import { useRef, useState } from 'react'
import { Bold, Italic, Link2, List, Paperclip } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Attachment, AttachmentKind } from '@/lib/types'

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  before: string,
  after: string = before,
): { text: string; selectionStart: number; selectionEnd: number } {
  const { selectionStart, selectionEnd } = textarea
  const selected = value.slice(selectionStart, selectionEnd) || 'text'
  const text = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd)
  return {
    text,
    selectionStart: selectionStart + before.length,
    selectionEnd: selectionStart + before.length + selected.length,
  }
}

function prefixLines(
  textarea: HTMLTextAreaElement,
  value: string,
  prefix: string,
): { text: string; selectionStart: number; selectionEnd: number } {
  const { selectionStart, selectionEnd } = textarea
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const lineEndIdx = value.indexOf('\n', selectionEnd)
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
  const block = value.slice(lineStart, lineEnd)
  const prefixed = block
    .split('\n')
    .map((l) => (l.startsWith(prefix) ? l : `${prefix}${l}`))
    .join('\n')
  const text = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
  return { text, selectionStart: lineStart, selectionEnd: lineStart + prefixed.length }
}

const ATTACHMENT_KINDS: { kind: AttachmentKind; name: string; size: string }[] = [
  { kind: 'pdf', name: 'attachment.pdf', size: '212 KB' },
  { kind: 'image', name: 'screenshot.png', size: '1.1 MB' },
  { kind: 'doc', name: 'document.docx', size: '84 KB' },
  { kind: 'sheet', name: 'spreadsheet.xlsx', size: '64 KB' },
]

export function ComposeToolbar({
  textareaRef,
  body,
  onBodyChange,
  onAddAttachment,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  body: string
  onBodyChange: (next: string, selection?: [number, number]) => void
  onAddAttachment: (attachment: Attachment) => void
}) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const attachCounter = useRef(0)

  function applyWrap(before: string, after?: string) {
    const textarea = textareaRef.current
    if (!textarea) return
    const result = wrapSelection(textarea, body, before, after)
    onBodyChange(result.text, [result.selectionStart, result.selectionEnd])
  }

  function applyBullets() {
    const textarea = textareaRef.current
    if (!textarea) return
    const result = prefixLines(textarea, body, '- ')
    onBodyChange(result.text, [result.selectionStart, result.selectionEnd])
  }

  function insertLink() {
    const textarea = textareaRef.current
    if (!textarea || !linkUrl.trim()) return
    const label = linkText.trim() || linkUrl.trim()
    const markdown = `[${label}](${linkUrl.trim()})`
    const { selectionStart, selectionEnd } = textarea
    const text = body.slice(0, selectionStart) + markdown + body.slice(selectionEnd)
    onBodyChange(text, [selectionStart + markdown.length, selectionStart + markdown.length])
    setLinkOpen(false)
    setLinkText('')
    setLinkUrl('')
  }

  function attachDemoFile() {
    attachCounter.current += 1
    const meta = ATTACHMENT_KINDS[attachCounter.current % ATTACHMENT_KINDS.length]
    onAddAttachment({
      id: `${Date.now()}-${attachCounter.current}`,
      name: meta.name.replace(/\./, `-${attachCounter.current}.`),
      kind: meta.kind,
      size: meta.size,
    })
  }

  return (
    <div className="flex items-center gap-0.5 border-t border-border px-2 py-1.5">
      <ToolbarButton label="Bold" icon={Bold} onClick={() => applyWrap('**')} />
      <ToolbarButton label="Italic" icon={Italic} onClick={() => applyWrap('_')} />
      <ToolbarButton label="Bulleted list" icon={List} onClick={applyBullets} />
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <span>
            <ToolbarButton label="Insert link" icon={Link2} onClick={() => setLinkOpen(true)} />
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <p className="mb-2 text-sm font-medium">Insert link</p>
          <div className="flex flex-col gap-2">
            <Input placeholder="Text to display" value={linkText} onChange={(e) => setLinkText(e.target.value)} />
            <Input placeholder="https://" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            <Button size="sm" onClick={insertLink} disabled={!linkUrl.trim()}>
              Insert
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <ToolbarButton label="Attach file" icon={Paperclip} onClick={attachDemoFile} />
    </div>
  )
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: typeof Bold
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-2 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  )
}
