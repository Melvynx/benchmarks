import { createBlankDocument, createDemoDocument } from "./demo-document";
import type { Document, DocumentMeta } from "./types";

const INDEX_KEY = "cursor-grok-46:index";
const DOC_KEY = (id: string) => `cursor-grok-46:doc:${id}`;
const VERSIONS_KEY = (id: string) => `cursor-grok-46:versions:${id}`;
const LAST_KEY = "cursor-grok-46:last";
const MAX_VERSIONS = 12;

export interface VersionSnapshot {
  id: string;
  createdAt: number;
  name: string;
  json: string;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadIndex(): DocumentMeta[] {
  return readJson<DocumentMeta[]>(INDEX_KEY) ?? [];
}

function writeIndex(index: DocumentMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function serializeDocument(doc: Document): string {
  return JSON.stringify(doc);
}

export function parseDocument(raw: string): Document | null {
  try {
    const data = JSON.parse(raw) as Document;
    if (!data || data.schema !== 1 || !data.nodes || !data.pages) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveDocument(doc: Document): void {
  const json = serializeDocument(doc);
  localStorage.setItem(DOC_KEY(doc.id), json);
  localStorage.setItem(LAST_KEY, doc.id);
  const index = loadIndex().filter((d) => d.id !== doc.id);
  index.unshift({ id: doc.id, name: doc.name, updatedAt: Date.now() });
  writeIndex(index.slice(0, 24));
}

export function loadDocument(id: string): Document | null {
  const raw = localStorage.getItem(DOC_KEY(id));
  if (!raw) return null;
  return parseDocument(raw);
}

export function deleteDocument(id: string): void {
  localStorage.removeItem(DOC_KEY(id));
  localStorage.removeItem(VERSIONS_KEY(id));
  writeIndex(loadIndex().filter((d) => d.id !== id));
}

export function loadLastOrDemo(): Document {
  const last = localStorage.getItem(LAST_KEY);
  if (last) {
    const doc = loadDocument(last);
    if (doc) return doc;
  }
  const index = loadIndex();
  const first = index[0];
  if (first) {
    const doc = loadDocument(first.id);
    if (doc) return doc;
  }
  const demo = createDemoDocument();
  saveDocument(demo);
  return demo;
}

export function checkpoint(doc: Document): void {
  const key = VERSIONS_KEY(doc.id);
  const list = readJson<VersionSnapshot[]>(key) ?? [];
  const json = serializeDocument(doc);
  const last = list[0];
  if (last && last.json === json) return;
  list.unshift({
    id: `${doc.id}-${Date.now()}`,
    createdAt: Date.now(),
    name: doc.name,
    json,
  });
  localStorage.setItem(KEY_SAFE(key), JSON.stringify(list.slice(0, MAX_VERSIONS)));
}

function KEY_SAFE(k: string): string {
  return k;
}

export function loadVersions(id: string): VersionSnapshot[] {
  return readJson<VersionSnapshot[]>(VERSIONS_KEY(id)) ?? [];
}

export function restoreVersion(snap: VersionSnapshot): Document | null {
  return parseDocument(snap.json);
}

export function newUntitled(): Document {
  const doc = createBlankDocument();
  saveDocument(doc);
  return doc;
}

export function duplicateDocument(doc: Document): Document {
  const copy: Document = structuredClone(doc);
  copy.id = `${doc.id}-copy-${Date.now().toString(36)}`;
  copy.name = `${doc.name} copy`;
  saveDocument(copy);
  return copy;
}
