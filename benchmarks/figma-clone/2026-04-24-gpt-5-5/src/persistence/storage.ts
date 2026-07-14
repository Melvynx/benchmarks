import type { SerializedEditor } from "../types/nodes";

const STORAGE_KEY = "atelier-vector:v1";

let saveTimer: number | null = null;

export function loadSerializedEditor(): SerializedEditor | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SerializedEditor>;
    if (parsed.version !== 1 || !Array.isArray(parsed.documents) || typeof parsed.activeDocumentId !== "string") return null;
    return parsed as SerializedEditor;
  } catch {
    return null;
  }
}

export function saveSerializedEditor(serialized: SerializedEditor): void {
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    saveTimer = null;
  }, 300);
}

export function downloadText(filename: string, text: string, mime = "application/json"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readFileText(file: File): Promise<string> {
  return await file.text();
}
