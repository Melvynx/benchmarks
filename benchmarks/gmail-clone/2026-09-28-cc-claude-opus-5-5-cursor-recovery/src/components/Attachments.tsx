import { FileText, Image as ImageIcon, FileSpreadsheet, Presentation, FileArchive, File, Download, X, FileType2 } from 'lucide-react'
import type { Attachment, AttachmentKind } from '../types'
import { formatSize } from '../lib/format'
import { useUI } from '../store/ui'
import { useMail } from '../store/mail'
import { cx, IconButton } from './ui'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'

export const KIND_META: Record<AttachmentKind, { icon: typeof File; color: string; label: string }> = {
  pdf: { icon: FileType2, color: '#d93025', label: 'PDF' },
  image: { icon: ImageIcon, color: '#d93025', label: 'Image' },
  doc: { icon: FileText, color: '#1a73e8', label: 'Document' },
  sheet: { icon: FileSpreadsheet, color: '#188038', label: 'Spreadsheet' },
  slides: { icon: Presentation, color: '#e37400', label: 'Presentation' },
  zip: { icon: FileArchive, color: '#5f6368', label: 'Archive' },
  other: { icon: File, color: '#5f6368', label: 'File' },
}

export function AttachmentChip({ a, onClick }: { a: Attachment; onClick?: (e: React.MouseEvent) => void }) {
  const meta = KIND_META[a.kind]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 max-w-[200px] items-center gap-2 rounded-full border border-line-strong/70 bg-surface px-3 text-[13px] text-ink hover:bg-hover"
      title={a.name}
    >
      <Icon size={16} style={{ color: meta.color }} className="shrink-0" />
      <span className="truncate">{a.name}</span>
    </button>
  )
}

export function Thumb({ a, large }: { a: Attachment; large?: boolean }) {
  const hue = a.hue ?? 210
  if (a.dataUrl && a.kind === 'image') return <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
  if (a.kind === 'image') {
    return (
      <svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`g${a.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 70% 72%)`} />
            <stop offset="1" stopColor={`hsl(${(hue + 40) % 360} 60% 45%)`} />
          </linearGradient>
        </defs>
        <rect width="160" height="110" fill={`url(#g${a.id})`} />
        <circle cx="120" cy="30" r="12" fill={`hsl(${(hue + 180) % 360} 90% 85%)`} opacity=".9" />
        <path d="M0 90 L40 55 L70 80 L105 45 L160 95 L160 110 L0 110Z" fill={`hsl(${(hue + 20) % 360} 45% 28%)`} opacity=".85" />
        <path d="M0 100 L30 80 L60 95 L90 75 L160 105 L160 110 L0 110Z" fill={`hsl(${(hue + 10) % 360} 40% 20%)`} />
      </svg>
    )
  }
  const meta = KIND_META[a.kind]
  const lines = large ? 18 : 6
  return (
    <div className="flex h-full w-full flex-col gap-[5px] bg-white p-3" aria-hidden>
      <div className="mb-1 h-2 w-2/3 rounded-sm" style={{ background: meta.color, opacity: 0.85 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-[3px] rounded-sm bg-neutral-300" style={{ width: `${60 + ((i * 37 + (a.hue ?? 3)) % 40)}%` }} />
      ))}
    </div>
  )
}

export function AttachmentCard({ a, onOpen }: { a: Attachment; onOpen: () => void }) {
  const meta = KIND_META[a.kind]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-[122px] w-[172px] flex-col overflow-hidden rounded-lg border border-line text-left hover:shadow-md"
    >
      <div className="min-h-0 flex-1 overflow-hidden bg-surface-2">
        <Thumb a={a} />
      </div>
      <div className="flex h-9 items-center gap-2 border-t border-line bg-surface px-2">
        <Icon size={16} style={{ color: meta.color }} className="shrink-0" />
        <span className="truncate text-[12px] font-medium">{a.name}</span>
      </div>
      <div className="absolute inset-0 hidden flex-col justify-end bg-black/55 p-2 text-white group-hover:flex">
        <div className="truncate text-[12px] font-medium">{a.name}</div>
        <div className="text-[11px] opacity-80">{formatSize(a.size)}</div>
      </div>
    </button>
  )
}

export function downloadAttachment(a: Attachment) {
  const href = a.dataUrl ?? URL.createObjectURL(new Blob([`Demo attachment: ${a.name}\nSize: ${formatSize(a.size)}\n`], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = href
  link.download = a.dataUrl ? a.name : `${a.name}.txt`
  link.click()
  if (!a.dataUrl) setTimeout(() => URL.revokeObjectURL(href), 1000)
}

export function AttachmentPreview() {
  const preview = useUI((s) => s.preview)
  const setPreview = useUI((s) => s.setPreview)
  const thread = useMail((s) => (preview ? s.threads[preview.threadId] : undefined))
  const msg = thread?.messages.find((m) => m.id === preview?.messageId)
  const a = msg?.attachments.find((x) => x.id === preview?.attachmentId)
  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setPreview(null)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [preview, setPreview])
  if (!preview || !a || !msg) return null
  const meta = KIND_META[a.kind]
  const Icon = meta.icon
  return createPortal(
    <div className="animate-fade fixed inset-0 z-[95] flex flex-col bg-black/85 text-white" onClick={() => setPreview(null)}>
      <div className="flex h-16 shrink-0 items-center gap-3 px-4" onClick={(e) => e.stopPropagation()}>
        <IconButton label="Close" onClick={() => setPreview(null)} className="text-white hover:bg-white/10">
          <X size={22} />
        </IconButton>
        <Icon size={20} style={{ color: meta.color }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px]">{a.name}</div>
          <div className="text-xs opacity-70">
            {meta.label} · {formatSize(a.size)} · from {msg.from.name}
          </div>
        </div>
        <IconButton label="Download" onClick={() => downloadAttachment(a)} className="text-white hover:bg-white/10">
          <Download size={20} />
        </IconButton>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6" >
        <div
          onClick={(e) => e.stopPropagation()}
          className={cx('animate-pop overflow-hidden rounded shadow-2xl', a.kind === 'image' ? 'aspect-[16/11] w-full max-w-4xl' : 'aspect-[8.5/11] h-full max-h-[80vh]')}
        >
          <Thumb a={a} large />
        </div>
      </div>
    </div>,
    document.body,
  )
}
