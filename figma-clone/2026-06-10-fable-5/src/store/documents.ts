import { buildSeedDocument } from '../app/seedDocument';
import {
  deleteStoredDocument,
  getActiveDocId,
  loadDocumentById,
  readIndex,
  saveActiveDocument,
} from '../persistence/localStore';
import { serializeDocument, deserializeDocument } from '../persistence/serialization';
import { emptyDocument } from '../scene/types';
import { downloadText, readFileAsText } from '../utils/download';
import { newId } from '../utils/id';
import { flushAutosave, scheduleAutosave } from './autosave';
import { loadDocument } from './docEdit';
import { editorStore, pushToast } from './store';
import { zoomToFit } from './viewport';

function persistNow(): void {
  const docList = saveActiveDocument(editorStore.getState());
  editorStore.setState({ docList });
}

/** Boot: restore the active document, or create the seeded welcome file. */
export function bootDocuments(): void {
  const index = readIndex();
  editorStore.setState({ docList: index });
  const activeId = getActiveDocId();
  const stored = activeId ? loadDocumentById(activeId) : null;

  if (stored && activeId) {
    loadDocument(stored.doc, { docId: activeId, docName: stored.name });
    if (stored.viewport) editorStore.setState({ viewport: stored.viewport });
    else zoomToFit();
    return;
  }

  loadDocument(buildSeedDocument(), { docId: newId(), docName: 'Welcome' });
  zoomToFit();
  persistNow();
}

export function newDocument(): void {
  flushAutosave();
  persistNow();
  const count = editorStore.getState().docList.length;
  loadDocument(emptyDocument(), { docId: newId(), docName: `Untitled ${count + 1}` });
  editorStore.setState({ viewport: { panX: 320, panY: 200, zoom: 1 } });
  persistNow();
}

export function switchDocument(docId: string): void {
  const state = editorStore.getState();
  if (docId === state.docId) return;
  flushAutosave();
  persistNow();
  const stored = loadDocumentById(docId);
  if (!stored) {
    pushToast('Could not open that file', 'error');
    return;
  }
  loadDocument(stored.doc, { docId, docName: stored.name });
  if (stored.viewport) editorStore.setState({ viewport: stored.viewport });
  else zoomToFit();
  persistNow();
}

export function renameActiveDocument(name: string): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  editorStore.setState({ docName: trimmed });
  scheduleAutosave();
}

export function deleteDocument(docId: string): void {
  const state = editorStore.getState();
  const docList = deleteStoredDocument(docId);
  editorStore.setState({ docList });
  if (docId !== state.docId) return;
  const next = docList[0];
  if (next) {
    const stored = loadDocumentById(next.id);
    if (stored) {
      loadDocument(stored.doc, { docId: next.id, docName: stored.name });
      if (stored.viewport) editorStore.setState({ viewport: stored.viewport });
      return;
    }
  }
  loadDocument(buildSeedDocument(), { docId: newId(), docName: 'Welcome' });
  zoomToFit();
  persistNow();
}

export function duplicateActiveDocument(): void {
  flushAutosave();
  const state = editorStore.getState();
  loadDocument(structuredClone(state.doc), { docId: newId(), docName: `${state.docName} copy` });
  persistNow();
  pushToast('Duplicated file');
}

export function exportActiveDocumentJson(): void {
  const state = editorStore.getState();
  downloadText(
    serializeDocument(state.doc, state.docName, state.viewport),
    `${state.docName.replace(/[^\w\- ]+/g, '')}.fable5.json`,
  );
}

export async function importDocumentFromFile(file: File): Promise<void> {
  try {
    const text = await readFileAsText(file);
    const parsed = deserializeDocument(text);
    flushAutosave();
    persistNow();
    loadDocument(parsed.doc, { docId: newId(), docName: parsed.name });
    if (parsed.viewport) editorStore.setState({ viewport: parsed.viewport });
    else zoomToFit();
    persistNow();
    pushToast(`Imported “${parsed.name}”`);
  } catch {
    pushToast('That file is not a valid document', 'error');
  }
}
