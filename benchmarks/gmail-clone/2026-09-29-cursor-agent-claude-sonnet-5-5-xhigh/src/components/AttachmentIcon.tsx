import { CalendarDays, File, FileArchive, FileCode, FileImage, FileSpreadsheet, FileText, Music, Presentation, Video } from 'lucide-react';
import type { AttachmentKind } from '../lib/types';

export const KIND_COLOR: Record<AttachmentKind, string> = {
  pdf: '#d93025',
  image: '#a142f4',
  doc: '#1a73e8',
  sheet: '#188038',
  slides: '#e37400',
  zip: '#5f6368',
  calendar: '#1a73e8',
  code: '#007b83',
  audio: '#c2185b',
  video: '#c2185b',
  other: '#5f6368',
};

export function AttachmentIcon({ kind, size = 18 }: { kind: AttachmentKind; size?: number }) {
  const props = { size, color: KIND_COLOR[kind], strokeWidth: 2 };
  switch (kind) {
    case 'pdf':
      return <FileText {...props} />;
    case 'image':
      return <FileImage {...props} />;
    case 'doc':
      return <FileText {...props} />;
    case 'sheet':
      return <FileSpreadsheet {...props} />;
    case 'slides':
      return <Presentation {...props} />;
    case 'zip':
      return <FileArchive {...props} />;
    case 'calendar':
      return <CalendarDays {...props} />;
    case 'code':
      return <FileCode {...props} />;
    case 'audio':
      return <Music {...props} />;
    case 'video':
      return <Video {...props} />;
    default:
      return <File {...props} />;
  }
}
