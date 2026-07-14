import { debounce } from '../utils/debounce';
import { saveActiveDocument } from '../persistence/localStore';
import { editorStore } from './store';

const save = debounce(() => {
  const state = editorStore.getState();
  const docList = saveActiveDocument(state);
  editorStore.setState({ docList });
}, 500);

export function scheduleAutosave(): void {
  save();
}

export function flushAutosave(): void {
  save.flush();
}

/** Persist on tab hide/close so the last edit is never lost. */
export function installAutosaveLifecycle(): void {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAutosave();
  });
  window.addEventListener('beforeunload', () => flushAutosave());
}
