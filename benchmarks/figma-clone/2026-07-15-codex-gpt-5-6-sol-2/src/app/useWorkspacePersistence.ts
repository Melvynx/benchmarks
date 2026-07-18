import { useEffect } from 'react';

import { DebouncedAutosave } from '@/editor/persistence';

import type { EditorStore } from '@/editor/EditorStore';
import type { DocumentManifestEntry, LocalDocumentRepository } from '@/editor/persistence';

interface WorkspacePersistenceOptions {
  readonly store: EditorStore;
  readonly repository: LocalDocumentRepository;
  readonly initialLoadError: string | null;
  readonly onManifestChange: (documents: readonly DocumentManifestEntry[]) => void;
}

export function useWorkspacePersistence({
  store,
  repository,
  initialLoadError,
  onManifestChange,
}: WorkspacePersistenceOptions) {
  useEffect(() => {
    if (initialLoadError) store.addToast(initialLoadError, 'error');
  }, [initialLoadError, store]);

  useEffect(() => {
    let lastScheduledKey = '';
    const refreshManifest = () => {
      const result = repository.listDocuments();
      if (result.ok) onManifestChange(result.value);
    };
    const autosave = new DebouncedAutosave(repository, {
      delayMs: 450,
      onStatus: (status) => {
        if (status.state === 'saved') {
          store.markSaved();
          refreshManifest();
        } else if (status.state === 'error') {
          store.markSaveError(status.error.message);
          store.addToast(status.error.message, 'error');
        }
      },
    });
    const scheduleIfChanged = () => {
      const document = store.document;
      const key = `${document.id}:${document.revision}`;
      if (key === lastScheduledKey) return;
      lastScheduledKey = key;
      autosave.schedule(document);
    };
    const unsubscribe = store.subscribe(scheduleIfChanged);
    scheduleIfChanged();

    const flush = () => autosave.flush();
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
      autosave.dispose(true);
    };
  }, [onManifestChange, repository, store]);
}
