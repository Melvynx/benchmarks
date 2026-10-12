const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  key: 'application/x-iwork-keynote',
  fig: 'application/x-figma',
  zip: 'application/zip',
  txt: 'text/plain',
  md: 'text/markdown',
  ics: 'text/calendar',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  json: 'application/json',
};

export function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    const mb = bytes / 1024 / 1024;
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export type FileKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'zip' | 'video' | 'audio' | 'calendar' | 'design' | 'text' | 'file';

export function fileKind(mime: string, name = ''): FileKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('word')) return 'doc';
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') return 'sheet';
  if (mime.includes('presentation') || mime.includes('powerpoint') || mime.includes('keynote')) return 'slides';
  if (mime.includes('zip')) return 'zip';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'text/calendar') return 'calendar';
  if (mime.includes('figma') || name.endsWith('.fig')) return 'design';
  if (mime.startsWith('text/') || mime === 'application/json') return 'text';
  return 'file';
}

export const FILE_KIND_META: Record<FileKind, { icon: string; color: string; label: string }> = {
  image: { icon: 'image', color: '#d93025', label: 'Image' },
  pdf: { icon: 'picture_as_pdf', color: '#d93025', label: 'PDF' },
  doc: { icon: 'description', color: '#1a73e8', label: 'Document' },
  sheet: { icon: 'table_chart', color: '#188038', label: 'Spreadsheet' },
  slides: { icon: 'slideshow', color: '#e8710a', label: 'Presentation' },
  zip: { icon: 'folder_zip', color: '#5f6368', label: 'Archive' },
  video: { icon: 'movie', color: '#a142f4', label: 'Video' },
  audio: { icon: 'audio_file', color: '#12a4af', label: 'Audio' },
  calendar: { icon: 'event', color: '#1a73e8', label: 'Calendar invite' },
  design: { icon: 'draw', color: '#a142f4', label: 'Design file' },
  text: { icon: 'article', color: '#5f6368', label: 'Text' },
  file: { icon: 'draft', color: '#5f6368', label: 'File' },
};
