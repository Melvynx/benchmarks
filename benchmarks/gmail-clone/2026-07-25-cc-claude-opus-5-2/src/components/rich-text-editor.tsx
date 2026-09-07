import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from './ui/bits'

export interface EditorHandle {
  focus: () => void
  /** Places the caret at the very start — where a reply should begin. */
  focusStart: () => void
}

interface RichTextEditorProps {
  html: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export const RichTextEditor = forwardRef<EditorHandle, RichTextEditorProps>(
  function RichTextEditor({ html, onChange, placeholder = 'Compose email', className }, ref) {
    const elRef = useRef<HTMLDivElement>(null)
    const initial = useRef(html)

    useEffect(() => {
      if (elRef.current) elRef.current.innerHTML = initial.current
    }, [])

    useImperativeHandle(ref, () => ({
      focus: () => elRef.current?.focus(),
      focusStart: () => {
        const el = elRef.current
        if (!el) return
        el.focus()
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(el, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
      },
    }))

    return (
      <div
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onPaste={(e) => {
          // Keep pasted content plain so the body stays predictable.
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
        }}
        className={cn(
          'compose-editor mail-body min-h-[9rem] w-full flex-1 overflow-y-auto scrollbar-thin outline-none',
          'px-4 py-3 text-[14px] leading-[1.6] text-ink',
          className,
        )}
      />
    )
  },
)

const COMMANDS = [
  { id: 'undo', icon: Undo2, label: 'Undo', cmd: 'undo' },
  { id: 'redo', icon: Redo2, label: 'Redo', cmd: 'redo' },
  { id: 'bold', icon: Bold, label: 'Bold', cmd: 'bold', shortcut: '⌘B' },
  { id: 'italic', icon: Italic, label: 'Italic', cmd: 'italic', shortcut: '⌘I' },
  { id: 'underline', icon: Underline, label: 'Underline', cmd: 'underline', shortcut: '⌘U' },
  { id: 'strike', icon: Strikethrough, label: 'Strikethrough', cmd: 'strikeThrough' },
  { id: 'ul', icon: List, label: 'Bulleted list', cmd: 'insertUnorderedList' },
  { id: 'ol', icon: ListOrdered, label: 'Numbered list', cmd: 'insertOrderedList' },
  { id: 'quote', icon: Quote, label: 'Quote', cmd: 'formatBlock', value: 'blockquote' },
  { id: 'clear', icon: RemoveFormatting, label: 'Remove formatting', cmd: 'removeFormat' },
] as const

export function FormatToolbar({
  onAfter,
  compact,
}: {
  /** Called after a command runs so the editor can be refocused. */
  onAfter: () => void
  compact?: boolean
}) {
  const [, force] = useState(0)

  const run = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    force((n) => n + 1)
    onAfter()
  }

  const active = (cmd: string) => {
    try {
      return document.queryCommandState(cmd)
    } catch {
      return false
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-t border-line-soft px-2 py-1">
      {COMMANDS.map((c) => {
        if (compact && ['strike', 'clear', 'redo'].includes(c.id)) return null
        const Icon = c.icon
        return (
          <IconButton
            key={c.id}
            label={c.label}
            shortcut={'shortcut' in c ? c.shortcut : undefined}
            size="sm"
            active={active(c.cmd)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(c.cmd, 'value' in c ? c.value : undefined)}
          >
            <Icon />
          </IconButton>
        )
      })}
      <IconButton
        label="Insert link"
        size="sm"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const url = window.prompt('Link URL', 'https://')
          if (url) run('createLink', url)
        }}
      >
        <Link2 />
      </IconButton>
    </div>
  )
}
