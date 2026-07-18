import { DocumentExportError, exportFailure, exportSuccess } from './errors';
import type { ExportOperationResult } from './errors';

export function sanitizeDownloadFilename(filename: string, fallback: string): string {
  let withoutControlCharacters = '';
  for (const character of filename) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && codePoint > 31 && codePoint !== 127) {
      withoutControlCharacters += character;
    }
  }
  const safe = withoutControlCharacters
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return safe.length > 0 ? safe.slice(0, 160) : fallback;
}

export function downloadBlob(blob: Blob, filename: string): ExportOperationResult<void> {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return exportFailure(
      new DocumentExportError('unsupported-environment', 'Downloads require a browser document.'),
    );
  }

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    const urlToRevoke = objectUrl;
    setTimeout(() => URL.revokeObjectURL(urlToRevoke), 0);
    return exportSuccess(undefined);
  } catch (error) {
    if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    return exportFailure(
      new DocumentExportError(
        'download-failed',
        'The browser could not start the download.',
        error,
      ),
    );
  }
}
