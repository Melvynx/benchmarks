export const AGENT_THINKING_STORAGE_KEY = "thumbfast-agent-thinking-mode";

export function readSavedThinkingMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AGENT_THINKING_STORAGE_KEY) === "true";
}

export function writeSavedThinkingMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AGENT_THINKING_STORAGE_KEY, String(enabled));
}
