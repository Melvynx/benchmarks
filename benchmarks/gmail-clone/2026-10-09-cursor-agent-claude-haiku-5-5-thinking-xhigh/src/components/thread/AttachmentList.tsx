import { useEffect, useState } from 'react';
import { Download, File, FileArchive, FileImage, FileSpreadsheet, FileText, Presentation, X, type LucideIcon } from 'lucide-react';
import type { Attachment, AttachmentKind } from '../../domain/types';
import { attachmentBlob, downloadAttachment } from '../../lib/blobs';
import { formatBytes } from '../../lib/format';
import { IconButton } from '../ui/primitives';

const KIND_ICON: Record<AttachmentKind, LucideIcon> = {
  pdf: FileText,
  image: FileImage,
  sheet: FileSpreadsheet,
  doc: FileText,
  slides: Presentation,
  archive: FileArchive,
  file: File,
};

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
}

export function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) return null;
  return (
    <ul aria-label="Attachments" className="mt-4 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <AttachmentChip
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemove ? () => onRemove(attachment.id) : undefined}
        />
      ))}
    </ul>
  );
}

function AttachmentChip({ attachment, onRemove }: { attachment: Attachment; onRemove?: () => void }) {
  const Icon = KIND_ICON[attachment.kind];
  const previewable = attachment.kind === 'image' && !onRemove;
  return (
    <li className="flex max-w-full flex-col overflow-hidden rounded-xl border border-line bg-surface text-sm sm:max-w-[280px]">
      {previewable && (
        <div className="p-2 pb-0">
          <ImagePreview attachment={attachment} />
        </div>
      )}
      <div className="group flex items-center gap-3 py-2 pl-3 pr-1.5 transition-colors hover:bg-hover">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{attachment.name}</span>
          <span className="block text-xs text-ink-3">{formatBytes(attachment.size)}</span>
        </span>
        {onRemove ? (
          <IconButton label={`Remove ${attachment.name}`} className="size-8" onClick={onRemove}>
            <X className="size-4" />
          </IconButton>
        ) : (
          <IconButton label={`Download ${attachment.name}`} className="size-8" onClick={() => void downloadAttachment(attachment)}>
            <Download className="size-4" />
          </IconButton>
        )}
      </div>
    </li>
  );
}

/** Small preview for image attachments; the blob comes from the in-session registry or a placeholder. */
export function ImagePreview({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    attachmentBlob(attachment).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment]);
  if (!url) return <div className="h-24 w-40 animate-pulse rounded-lg bg-surface-2" />;
  return <img src={url} alt={attachment.name} className="h-24 w-40 rounded-lg object-cover" />;
}
