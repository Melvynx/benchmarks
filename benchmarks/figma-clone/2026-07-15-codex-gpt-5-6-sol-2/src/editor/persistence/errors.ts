export type PersistenceErrorCode =
  | 'storage-unavailable'
  | 'quota-exceeded'
  | 'read-failed'
  | 'write-failed'
  | 'remove-failed'
  | 'invalid-data'
  | 'unsupported-version';

export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  readonly causeValue: unknown;

  constructor(code: PersistenceErrorCode, message: string, causeValue: unknown = null) {
    super(message);
    this.name = 'PersistenceError';
    this.code = code;
    this.causeValue = causeValue;
  }
}

export type PersistenceResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: PersistenceError };

export function persistenceSuccess<Value>(value: Value): PersistenceResult<Value> {
  return { ok: true, value };
}

export function persistenceFailure<Value>(error: PersistenceError): PersistenceResult<Value> {
  return { ok: false, error };
}

export function classifyStorageError(
  error: unknown,
  fallbackCode: Exclude<PersistenceErrorCode, 'quota-exceeded'>,
  message: string,
): PersistenceError {
  if (isQuotaExceededError(error)) {
    return new PersistenceError(
      'quota-exceeded',
      'Browser storage is full. Export the document before clearing space or removing older documents.',
      error,
    );
  }
  return new PersistenceError(fallbackCode, message, error);
}

function isQuotaExceededError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }
  if (typeof error !== 'object' || error === null) return false;
  if (!('name' in error) || typeof error.name !== 'string') return false;
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}
