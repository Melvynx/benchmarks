import type { SceneDocument } from '@/core/model/types';

import type { PersistenceError, PersistenceResult } from './errors';
import type { LocalDocumentRepository } from './storage';

export type AutosaveStatus =
  | { readonly state: 'scheduled'; readonly documentId: string }
  | { readonly state: 'saved'; readonly documentId: string; readonly revision: number }
  | { readonly state: 'error'; readonly documentId: string; readonly error: PersistenceError }
  | { readonly state: 'idle' };

export interface DebouncedAutosaveOptions {
  readonly delayMs?: number;
  readonly onStatus?: (status: AutosaveStatus) => void;
}

export class DebouncedAutosave {
  readonly #repository: LocalDocumentRepository;
  readonly #delayMs: number;
  readonly #onStatus: ((status: AutosaveStatus) => void) | undefined;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #pending: SceneDocument | null = null;

  constructor(repository: LocalDocumentRepository, options: DebouncedAutosaveOptions = {}) {
    this.#repository = repository;
    this.#delayMs = Math.max(0, options.delayMs ?? 500);
    this.#onStatus = options.onStatus;
  }

  schedule(document: SceneDocument): void {
    this.#pending = document;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.flush();
    }, this.#delayMs);
    this.#onStatus?.({ state: 'scheduled', documentId: document.id });
  }

  flush(): PersistenceResult<void> | null {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    const document = this.#pending;
    this.#pending = null;
    if (document === null) {
      this.#onStatus?.({ state: 'idle' });
      return null;
    }

    const result = this.#repository.saveDocument(document);
    this.#onStatus?.(
      result.ok
        ? { state: 'saved', documentId: document.id, revision: document.revision }
        : { state: 'error', documentId: document.id, error: result.error },
    );
    return result;
  }

  cancel(): void {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
    this.#pending = null;
    this.#onStatus?.({ state: 'idle' });
  }

  dispose(flushPending = true): PersistenceResult<void> | null {
    return flushPending ? this.flush() : (this.cancel(), null);
  }
}
