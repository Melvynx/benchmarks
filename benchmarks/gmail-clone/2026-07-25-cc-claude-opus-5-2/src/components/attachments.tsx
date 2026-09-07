import { useState } from 'react'
import {
  Download,
  File,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Presentation,
} from 'lucide-react'
import type { Attachment, AttachmentKind } from '@/lib/types'
import { cn, formatBytes } from '@/lib/utils'
import { useToast } from '@/store/toast'
import { IconButton } from './ui/bits'
import { Dialog } from './ui/dialog'

const KIND_ICON: Record<AttachmentKind, typeof File> = {
  image: ImageIcon,
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  slide: Presentation,
  zip: FileArchive,
  code: FileCode,
  audio: Music,
  video: Film,
  other: File,
}

const KIND_COLOR: Record<AttachmentKind, string> = {
  image: '#1a73e8',
  pdf: '#d93025',
  doc: '#1a73e8',
  sheet: '#188038',
  slide: '#e37400',
  zip: '#5f6368',
  code: '#9334e6',
  audio: '#c2185b',
  video: '#c5221f',
  other: '#5f6368',
}

export function AttachmentIcon({ kind, className }: { kind: AttachmentKind; className?: string }) {
  const Icon = KIND_ICON[kind]
  return <Icon className={className} style={{ color: KIND_COLOR[kind] }} />
}

/** The small pill shown under a list row. */
export function AttachmentPill({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-[10rem] items-center gap-1 rounded border border-line-soft bg-surface-2 px-1.5 py-px text-[11px] text-ink-2">
      <span className="truncate">{name}</span>
    </span>
  )
}

/** The larger card shown at the bottom of an expanded message. */
export function AttachmentCard({ attachment }: { attachment: Attachment }) {
  const [preview, setPreview] = useState(false)
  const { show } = useToast()

  return (
    <>
      <div
        className={cn(
          'group relative flex w-[13.5rem] shrink-0 overflow-hidden rounded-lg border border-line',
          'bg-surface transition-shadow hover:shadow-row',
        )}
      >
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="min-w-0 flex-1 text-left"
          aria-label={`Preview ${attachment.name}`}
        >
          <span className="flex h-[5.5rem] items-center justify-center overflow-hidden bg-surface-2">
            {attachment.previewImage ? (
              <img
                src={attachment.previewImage}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : attachment.previewText ? (
              <span className="line-clamp-4 w-full px-2 py-1.5 font-mono text-[8px] leading-[1.35] text-ink-3">
                {attachment.previewText.slice(0, 260)}
              </span>
            ) : (
              <AttachmentIcon kind={attachment.kind} className="h-8 w-8 opacity-70" />
            )}
          </span>
          <span className="flex items-center gap-2 border-t border-line px-2.5 py-2">
            <AttachmentIcon kind={attachment.kind} className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink">
                {attachment.name}
              </span>
              <span className="block text-[11px] text-ink-4">{formatBytes(attachment.size)}</span>
            </span>
          </span>
        </button>
        <span className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconButton
            label="Download"
            size="sm"
            className="bg-elevated shadow-pop"
            onClick={() => show(`“${attachment.name}” isn’t a real file — this mailbox is local.`)}
          >
            <Download />
          </IconButton>
        </span>
      </div>

      <AttachmentPreviewDialog
        attachment={attachment}
        open={preview}
        onClose={() => setPreview(false)}
      />
    </>
  )
}

export function AttachmentPreviewDialog({
  attachment,
  open,
  onClose,
}: {
  attachment: Attachment
  open: boolean
  onClose: () => void
}) {
  const { show } = useToast()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <AttachmentIcon kind={attachment.kind} className="h-[18px] w-[18px]" />
          <span className="truncate">{attachment.name}</span>
          <span className="shrink-0 text-[12px] font-normal text-ink-4">
            {formatBytes(attachment.size)}
          </span>
        </span>
      }
      className="max-w-3xl"
      footer={
        <button
          type="button"
          onClick={() => show(`“${attachment.name}” isn’t a real file — this mailbox is local.`)}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-medium text-on-accent hover:bg-accent-hover"
        >
          <Download className="h-[18px] w-[18px]" />
          Download
        </button>
      }
    >
      {attachment.previewImage ? (
        <img
          src={attachment.previewImage}
          alt={attachment.name}
          className="mx-auto max-h-[60vh] w-full rounded-lg object-contain"
        />
      ) : attachment.previewText ? (
        <pre className="max-h-[60vh] overflow-auto scrollbar-thin rounded-lg bg-surface-2 p-4 font-mono text-[12px] leading-[1.6] text-ink-2">
          {attachment.previewText}
        </pre>
      ) : (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <AttachmentIcon kind={attachment.kind} className="h-12 w-12" />
          <p className="text-[13px] text-ink-2">No preview available for this file type.</p>
          <p className="max-w-sm text-[12px] text-ink-4">
            Attachments in this mailbox are seeded metadata — size, type and thumbnails are real,
            the bytes are not.
          </p>
        </div>
      )}
    </Dialog>
  )
}
