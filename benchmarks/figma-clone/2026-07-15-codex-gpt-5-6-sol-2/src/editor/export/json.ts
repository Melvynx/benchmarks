import type { SceneDocument } from '@/core/model/types';
import { migrateAndValidateSceneDocument } from '@/editor/persistence/schema';

import { downloadBlob, sanitizeDownloadFilename } from './download';
import { DocumentExportError, exportFailure, exportSuccess } from './errors';
import type { ExportOperationResult } from './errors';

const DEFAULT_MAX_JSON_BYTES = 25 * 1024 * 1024;

export interface JsonImportOptions {
  readonly maxBytes?: number;
}

export interface JsonExportOptions {
  readonly pretty?: boolean;
}

export function parseSceneDocumentJson(
  source: string,
  options: JsonImportOptions = {},
): ExportOperationResult<SceneDocument> {
  const maximumBytes = Math.max(1, options.maxBytes ?? DEFAULT_MAX_JSON_BYTES);
  const byteLength = new TextEncoder().encode(source).byteLength;
  if (byteLength > maximumBytes) {
    return exportFailure(
      new DocumentExportError(
        'input-too-large',
        `The JSON file is ${byteLength.toLocaleString()} bytes; the safety limit is ${maximumBytes.toLocaleString()} bytes.`,
      ),
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return exportFailure(
      new DocumentExportError('invalid-json', 'The selected file is not valid JSON.', error),
    );
  }

  const validation = migrateAndValidateSceneDocument(parsed);
  if (!validation.ok) {
    return exportFailure(
      new DocumentExportError(
        'invalid-document',
        `${validation.issue.path}: ${validation.issue.message}`,
      ),
    );
  }
  return exportSuccess(validation.document);
}

export function serializeSceneDocumentJson(
  document: SceneDocument,
  options: JsonExportOptions = {},
): ExportOperationResult<string> {
  const validation = migrateAndValidateSceneDocument(document);
  if (!validation.ok) {
    return exportFailure(
      new DocumentExportError(
        'invalid-document',
        `${validation.issue.path}: ${validation.issue.message}`,
      ),
    );
  }

  try {
    return exportSuccess(JSON.stringify(document, null, (options.pretty ?? true) ? 2 : 0));
  } catch (error) {
    return exportFailure(
      new DocumentExportError('invalid-document', 'The document could not be serialized.', error),
    );
  }
}

export function createSceneDocumentJsonBlob(
  document: SceneDocument,
  options: JsonExportOptions = {},
): ExportOperationResult<Blob> {
  const serialized = serializeSceneDocumentJson(document, options);
  return serialized.ok
    ? exportSuccess(new Blob([serialized.value], { type: 'application/json;charset=utf-8' }))
    : serialized;
}

export function downloadSceneDocumentJson(
  document: SceneDocument,
  filename = `${document.name}.figma-clone.json`,
): ExportOperationResult<void> {
  const blob = createSceneDocumentJsonBlob(document);
  return blob.ok
    ? downloadBlob(blob.value, sanitizeDownloadFilename(filename, 'document.figma-clone.json'))
    : blob;
}
