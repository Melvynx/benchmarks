import type { DesignDocument } from "./types";

const DOCUMENT_PREFIX = "gpt56-figma:document:";
const ACTIVE_KEY = "gpt56-figma:active";
const INDEX_KEY = "gpt56-figma:index";
const VERSIONS_PREFIX = "gpt56-figma:versions:";

function safeParseDocument(value: string | null): DesignDocument | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || !("nodes" in parsed) || !("rootIds" in parsed)) return null;
    return parsed as DesignDocument;
  } catch {
    return null;
  }
}

export class DocumentRepository {
  #saveTimer: number | null = null;
  #lastSerialized = "";

  loadActive(): DesignDocument | null {
    const id = localStorage.getItem(ACTIVE_KEY);
    return id ? safeParseDocument(localStorage.getItem(`${DOCUMENT_PREFIX}${id}`)) : null;
  }

  scheduleSave(document: DesignDocument): void {
    if (this.#saveTimer !== null) window.clearTimeout(this.#saveTimer);
    this.#saveTimer = window.setTimeout(() => this.save(document), 450);
  }

  save(document: DesignDocument): void {
    const serialized = JSON.stringify(document);
    if (serialized === this.#lastSerialized) return;
    localStorage.setItem(`${DOCUMENT_PREFIX}${document.id}`, serialized);
    localStorage.setItem(ACTIVE_KEY, document.id);
    const existing = this.list();
    const updated = [{ id: document.id, name: document.name, updatedAt: document.updatedAt }, ...existing.filter((item) => item.id !== document.id)].slice(0, 12);
    localStorage.setItem(INDEX_KEY, JSON.stringify(updated));
    this.#lastSerialized = serialized;
    if (document.version % 20 === 0) this.#checkpoint(document);
  }

  list(): readonly { id: string; name: string; updatedAt: number }[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((item): item is { id: string; name: string; updatedAt: number } => Boolean(item) && typeof item.id === "string") : [];
    } catch {
      return [];
    }
  }

  load(id: string): DesignDocument | null {
    return safeParseDocument(localStorage.getItem(`${DOCUMENT_PREFIX}${id}`));
  }

  versions(documentId: string): readonly DesignDocument[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(`${VERSIONS_PREFIX}${documentId}`) ?? "[]");
      return Array.isArray(parsed) ? (parsed as DesignDocument[]) : [];
    } catch {
      return [];
    }
  }

  #checkpoint(document: DesignDocument): void {
    const versions = [...this.versions(document.id), document].slice(-15);
    localStorage.setItem(`${VERSIONS_PREFIX}${document.id}`, JSON.stringify(versions));
  }
}
