import { useStore } from '../../state/store';
import type { Document } from '../scene';
import { createEmptyDocument } from '../scene';

const KEY = 'vector.autosave.v1';
const DEBOUNCE_MS = 400;

let timer: ReturnType<typeof setTimeout> | null = null;

export const serializeDoc = (doc: Document): string => JSON.stringify(doc);

export const deserializeDoc = (raw: string): Document => {
  const parsed = JSON.parse(raw) as Partial<Document>;
  const empty = createEmptyDocument();
  // Shallow merge so older saves are resilient.
  return {
    ...empty,
    ...parsed,
    nodes: parsed.nodes ?? {},
    pages: parsed.pages ?? empty.pages,
    pageOrder: parsed.pageOrder ?? empty.pageOrder,
    currentPageId: parsed.currentPageId ?? empty.currentPageId,
    colorStyles: parsed.colorStyles ?? {},
    textStyles: parsed.textStyles ?? {},
    id: parsed.id ?? empty.id,
    name: parsed.name ?? 'Untitled',
  };
};

export const saveNow = (doc: Document): void => {
  try {
    localStorage.setItem(KEY, serializeDoc(doc));
  } catch {
    // Storage full — ignore; user can export manually.
  }
};

export const loadAutosave = (): Document | null => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return deserializeDoc(raw);
  } catch {
    return null;
  }
};

export const setupAutosave = (): (() => void) => {
  const unsub = useStore.subscribe((s, prev) => {
    if (s.doc === prev.doc) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveNow(s.doc);
      timer = null;
    }, DEBOUNCE_MS);
  });
  return unsub;
};

export const AUTOSAVE_KEY = KEY;
