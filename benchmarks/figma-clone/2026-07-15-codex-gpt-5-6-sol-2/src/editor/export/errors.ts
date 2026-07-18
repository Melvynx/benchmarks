export type ExportErrorCode =
  | 'invalid-document'
  | 'invalid-json'
  | 'input-too-large'
  | 'empty-selection'
  | 'unsupported-environment'
  | 'rasterization-failed'
  | 'download-failed';

export class DocumentExportError extends Error {
  readonly code: ExportErrorCode;
  readonly causeValue: unknown;

  constructor(code: ExportErrorCode, message: string, causeValue: unknown = null) {
    super(message);
    this.name = 'DocumentExportError';
    this.code = code;
    this.causeValue = causeValue;
  }
}

export type ExportOperationResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: DocumentExportError };

export function exportSuccess<Value>(value: Value): ExportOperationResult<Value> {
  return { ok: true, value };
}

export function exportFailure<Value>(error: DocumentExportError): ExportOperationResult<Value> {
  return { ok: false, error };
}
