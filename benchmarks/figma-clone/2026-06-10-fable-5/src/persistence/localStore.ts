import type { DocMeta, EditorState } from '../store/store';
import { pushToast } from '../store/store';
import { serializeDocument, deserializeDocument, type DeserializedDocument } from './serialization';

const INDEX_KEY = 'fable5:index';
const ACTIVE_KEY = 'fable5:active';
const DOC_PREFIX = 'fable5:doc:';

export function readIndex(): DocMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is DocMeta =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as DocMeta).id === 'string' &&
        typeof (m as DocMeta).name === 'string',
    );
  } catch {
    return [];
  }
}

function writeIndex(index: DocMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function getActiveDocId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveDocId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function loadDocumentById(id: string): DeserializedDocument | null {
  const raw = localStorage.getItem(DOC_PREFIX + id);
  if (!raw) return null;
  try {
    return deserializeDocument(raw);
  } catch {
    return null;
  }
}

export function deleteStoredDocument(id: string): DocMeta[] {
  localStorage.removeItem(DOC_PREFIX + id);
  const index = readIndex().filter((m) => m.id !== id);
  writeIndex(index);
  return index;
}

/** Persist the live document + refresh its index entry. Returns the new index. */
export function saveActiveDocument(state: EditorState): DocMeta[] {
  const meta: DocMeta = { id: state.docId, name: state.docName, updatedAt: Date.now() };
  try {
    localStorage.setItem(DOC_PREFIX + state.docId, serializeDocument(state.doc, state.docName, state.viewport));
    const index = readIndex().filter((m) => m.id !== state.docId);
    index.unshift(meta);
    writeIndex(index);
    setActiveDocId(state.docId);
    return index;
  } catch (error) {
    // Most likely QuotaExceededError from large embedded images.
    pushToast('Auto-save failed — storage is full. Export your file to keep it safe.', 'error');
    console.error('Auto-save failed', error);
    return readIndex();
  }
}
