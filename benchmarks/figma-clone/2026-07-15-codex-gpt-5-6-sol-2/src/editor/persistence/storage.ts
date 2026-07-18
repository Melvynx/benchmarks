import type { SceneDocument } from '@/core/model/types';

import {
  classifyStorageError,
  PersistenceError,
  persistenceFailure,
  persistenceSuccess,
} from './errors';
import type { PersistenceResult } from './errors';
import { migrateAndValidateSceneDocument } from './schema';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DocumentManifestEntry {
  readonly id: string;
  readonly name: string;
  readonly revision: number;
  readonly updatedAt: string;
}

export interface DocumentManifest {
  readonly schemaVersion: 1;
  readonly documents: readonly DocumentManifestEntry[];
}

export interface SaveDocumentOptions {
  readonly activate?: boolean;
}

const MANIFEST_VERSION = 1 as const;
const DEFAULT_NAMESPACE = 'gpt-5.6.editor';

export class LocalDocumentRepository {
  readonly #storage: StorageLike | null;
  readonly #namespace: string;

  constructor(
    storage: StorageLike | null = getBrowserLocalStorage(),
    namespace = DEFAULT_NAMESPACE,
  ) {
    this.#storage = storage;
    this.#namespace = namespace;
  }

  loadManifest(): PersistenceResult<DocumentManifest> {
    const stored = this.#read(this.#manifestKey());
    if (!stored.ok) return stored;
    if (stored.value === null) return persistenceSuccess(emptyManifest());

    try {
      const parsed: unknown = JSON.parse(stored.value);
      return isDocumentManifest(parsed)
        ? persistenceSuccess(parsed)
        : persistenceFailure(
            new PersistenceError('invalid-data', 'The saved document manifest is malformed.'),
          );
    } catch (error) {
      return persistenceFailure(
        new PersistenceError(
          'invalid-data',
          'The saved document manifest is not valid JSON.',
          error,
        ),
      );
    }
  }

  listDocuments(): PersistenceResult<readonly DocumentManifestEntry[]> {
    const manifest = this.loadManifest();
    return manifest.ok ? persistenceSuccess(manifest.value.documents) : manifest;
  }

  loadDocument(documentId: string): PersistenceResult<SceneDocument | null> {
    const stored = this.#read(this.#documentKey(documentId));
    if (!stored.ok) return persistenceFailure(stored.error);
    if (stored.value === null) return persistenceSuccess(null);

    try {
      const parsed: unknown = JSON.parse(stored.value);
      const validation = migrateAndValidateSceneDocument(parsed);
      if (!validation.ok) {
        const code =
          validation.kind === 'unsupported-version' ? 'unsupported-version' : 'invalid-data';
        return persistenceFailure(
          new PersistenceError(code, `${validation.issue.path}: ${validation.issue.message}`),
        );
      }
      return persistenceSuccess(validation.document);
    } catch (error) {
      return persistenceFailure(
        new PersistenceError(
          'invalid-data',
          `Saved document '${documentId}' is not valid JSON.`,
          error,
        ),
      );
    }
  }

  saveDocument(
    document: SceneDocument,
    options: SaveDocumentOptions = {},
  ): PersistenceResult<void> {
    const validation = migrateAndValidateSceneDocument(document);
    if (!validation.ok) {
      const code =
        validation.kind === 'unsupported-version' ? 'unsupported-version' : 'invalid-data';
      return persistenceFailure(
        new PersistenceError(code, `${validation.issue.path}: ${validation.issue.message}`),
      );
    }

    let serialized: string;
    try {
      serialized = JSON.stringify(document);
    } catch (error) {
      return persistenceFailure(
        new PersistenceError('invalid-data', 'The document could not be serialized.', error),
      );
    }

    const manifestResult = this.loadManifest();
    if (!manifestResult.ok) return manifestResult;
    const entry: DocumentManifestEntry = {
      id: document.id,
      name: document.name,
      revision: document.revision,
      updatedAt: document.updatedAt,
    };
    const documents = manifestResult.value.documents
      .filter((candidate) => candidate.id !== document.id)
      .concat(entry)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const manifest: DocumentManifest = { schemaVersion: MANIFEST_VERSION, documents };

    const existing = this.#read(this.#documentKey(document.id));
    if (!existing.ok) return existing;
    if (existing.value !== serialized) {
      const writeDocument = this.#write(this.#documentKey(document.id), serialized);
      if (!writeDocument.ok) return writeDocument;
    }

    const currentManifest = JSON.stringify(manifestResult.value);
    const nextManifest = JSON.stringify(manifest);
    if (currentManifest !== nextManifest) {
      const writeManifest = this.#write(this.#manifestKey(), nextManifest);
      if (!writeManifest.ok) return writeManifest;
    }
    return (options.activate ?? true)
      ? this.setActiveDocument(document.id)
      : persistenceSuccess(undefined);
  }

  deleteDocument(documentId: string): PersistenceResult<void> {
    const manifestResult = this.loadManifest();
    if (!manifestResult.ok) return manifestResult;
    const manifest: DocumentManifest = {
      schemaVersion: MANIFEST_VERSION,
      documents: manifestResult.value.documents.filter((entry) => entry.id !== documentId),
    };
    const writeManifest = this.#write(this.#manifestKey(), JSON.stringify(manifest));
    if (!writeManifest.ok) return writeManifest;

    const remove = this.#remove(this.#documentKey(documentId));
    if (!remove.ok) return remove;
    const active = this.getActiveDocumentId();
    if (!active.ok) return active;
    return active.value === documentId
      ? this.setActiveDocument(null)
      : persistenceSuccess(undefined);
  }

  getActiveDocumentId(): PersistenceResult<string | null> {
    return this.#read(this.#activeDocumentKey());
  }

  setActiveDocument(documentId: string | null): PersistenceResult<void> {
    if (documentId === null) return this.#remove(this.#activeDocumentKey());
    const active = this.#read(this.#activeDocumentKey());
    if (!active.ok) return persistenceFailure(active.error);
    return active.value === documentId
      ? persistenceSuccess(undefined)
      : this.#write(this.#activeDocumentKey(), documentId);
  }

  loadActiveDocument(): PersistenceResult<SceneDocument | null> {
    const active = this.getActiveDocumentId();
    if (!active.ok) return persistenceFailure(active.error);
    return active.value === null ? persistenceSuccess(null) : this.loadDocument(active.value);
  }

  #manifestKey(): string {
    return `${this.#namespace}.manifest.v1`;
  }

  #activeDocumentKey(): string {
    return `${this.#namespace}.active-document.v1`;
  }

  #documentKey(documentId: string): string {
    return `${this.#namespace}.document.v1.${encodeURIComponent(documentId)}`;
  }

  #read(key: string): PersistenceResult<string | null> {
    if (!this.#storage) {
      return persistenceFailure(
        new PersistenceError(
          'storage-unavailable',
          'localStorage is not available in this environment.',
        ),
      );
    }
    try {
      return persistenceSuccess(this.#storage.getItem(key));
    } catch (error) {
      return persistenceFailure(
        classifyStorageError(error, 'read-failed', 'Could not read browser storage.'),
      );
    }
  }

  #write(key: string, value: string): PersistenceResult<void> {
    if (!this.#storage) {
      return persistenceFailure(
        new PersistenceError(
          'storage-unavailable',
          'localStorage is not available in this environment.',
        ),
      );
    }
    try {
      this.#storage.setItem(key, value);
      return persistenceSuccess(undefined);
    } catch (error) {
      return persistenceFailure(
        classifyStorageError(error, 'write-failed', 'Could not write browser storage.'),
      );
    }
  }

  #remove(key: string): PersistenceResult<void> {
    if (!this.#storage) {
      return persistenceFailure(
        new PersistenceError(
          'storage-unavailable',
          'localStorage is not available in this environment.',
        ),
      );
    }
    try {
      this.#storage.removeItem(key);
      return persistenceSuccess(undefined);
    } catch (error) {
      return persistenceFailure(
        classifyStorageError(error, 'remove-failed', 'Could not update browser storage.'),
      );
    }
  }
}

export function getBrowserLocalStorage(): StorageLike | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function emptyManifest(): DocumentManifest {
  return { schemaVersion: MANIFEST_VERSION, documents: [] };
}

function isDocumentManifest(value: unknown): value is DocumentManifest {
  return (
    isRecord(value) &&
    value.schemaVersion === MANIFEST_VERSION &&
    Array.isArray(value.documents) &&
    value.documents.every(isDocumentManifestEntry)
  );
}

function isDocumentManifestEntry(value: unknown): value is DocumentManifestEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.revision === 'number' &&
    Number.isInteger(value.revision) &&
    value.revision >= 0 &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
