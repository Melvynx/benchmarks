import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRectangleNode, createSceneDocument } from '@/core/model/factories';
import { createSeedDocument } from '@/editor/seedDocument';

import { DebouncedAutosave } from './autosave';
import { migrateAndValidateSceneDocument } from './schema';
import { LocalDocumentRepository } from './storage';
import type { StorageLike } from './storage';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  writeCount = 0;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writeCount += 1;
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function createValidDocument() {
  const rectangle = createRectangleNode({ id: 'rectangle:test', name: 'Validated rectangle' });
  return createSceneDocument({
    id: 'document:test',
    name: 'Validation test',
    nodes: { [rectangle.id]: rectangle },
    rootIds: [rectangle.id],
    revision: 3,
    createdAt: '2026-07-15T10:00:00.000Z',
    updatedAt: '2026-07-15T10:01:00.000Z',
  });
}

describe('scene document validation', () => {
  it('accepts a structurally consistent current document', () => {
    const result = migrateAndValidateSceneDocument(createValidDocument());
    expect(result.ok).toBe(true);
  });

  it('accepts the complete built-in editor document', () => {
    expect(migrateAndValidateSceneDocument(createSeedDocument()).ok).toBe(true);
  });

  it('blocks future schemas instead of silently coercing them', () => {
    const result = migrateAndValidateSceneDocument({
      ...createValidDocument(),
      schemaVersion: 99,
    });
    expect(result).toMatchObject({ ok: false, kind: 'unsupported-version' });
  });

  it('rejects dangling root references', () => {
    const result = migrateAndValidateSceneDocument({
      ...createValidDocument(),
      rootIds: ['missing-node'],
    });
    expect(result).toMatchObject({
      ok: false,
      kind: 'invalid-data',
      issue: { path: '$.rootIds[0]' },
    });
  });
});

describe('local document persistence', () => {
  let storage: MemoryStorage;
  let repository: LocalDocumentRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new LocalDocumentRepository(storage, 'test.editor');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maintains a manifest, active id and validated document payload', () => {
    const document = createValidDocument();
    expect(repository.saveDocument(document).ok).toBe(true);
    const writesAfterFirstSave = storage.writeCount;
    expect(repository.saveDocument(document).ok).toBe(true);
    expect(storage.writeCount).toBe(writesAfterFirstSave);
    expect(repository.getActiveDocumentId()).toEqual({ ok: true, value: document.id });
    expect(repository.loadDocument(document.id)).toEqual({ ok: true, value: document });
    expect(repository.loadManifest()).toMatchObject({
      ok: true,
      value: { documents: [{ id: document.id, revision: document.revision }] },
    });
  });

  it('debounces revisions and persists only the newest pending document', () => {
    const statuses: string[] = [];
    const autosave = new DebouncedAutosave(repository, {
      delayMs: 250,
      onStatus: (status) => statuses.push(status.state),
    });
    const document = createValidDocument();
    autosave.schedule(document);
    autosave.schedule({
      ...document,
      revision: 4,
      updatedAt: '2026-07-15T10:02:00.000Z',
    });
    vi.advanceTimersByTime(250);

    const loaded = repository.loadDocument(document.id);
    expect(loaded.ok && loaded.value?.revision).toBe(4);
    expect(statuses).toEqual(['scheduled', 'scheduled', 'saved']);
  });

  it('classifies quota failures for a recoverable UI error', () => {
    const quotaStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        const error = new Error('The storage quota was exceeded.');
        error.name = 'QuotaExceededError';
        throw error;
      },
      removeItem: () => undefined,
    };
    const result = new LocalDocumentRepository(quotaStorage).saveDocument(createValidDocument());
    expect(result).toMatchObject({ ok: false, error: { code: 'quota-exceeded' } });
  });
});
