import { FileArchive, FileImage, FileSpreadsheet, FileText, Presentation } from 'lucide-react'
import type { Attachment } from '@/lib/types'
import { useMailStore } from '@/store/mail-store'

const ICONS: Record<Attachment['kind'], typeof FileText> = {
  pdf: FileText,
  image: FileImage,
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  zip: FileArchive,
}

const COLORS: Record<Attachment['kind'], string> = {
  pdf: '#d93025',
  image: '#1e8e3e',
  doc: '#0b57d0',
  sheet: '#1e8e3e',
  slides: '#e37400',
  zip: '#5f6368',
}

export function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const showToast = useMailStore((s) => s.showToast)
  const Icon = ICONS[attachment.kind]

  return (
    <button
      onClick={() => showToast(`"${attachment.name}" preview isn't available in this demo`)}
      className="flex w-56 items-center gap-2.5 rounded-lg border border-border-strong px-3 py-2 text-left transition-colors hover:bg-surface-hover"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${COLORS[attachment.kind]}1a` }}
      >
        <Icon className="size-4" style={{ color: COLORS[attachment.kind] }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">{attachment.name}</span>
        <span className="block text-[11px] text-muted-foreground">{attachment.size}</span>
      </span>
    </button>
  )
}
