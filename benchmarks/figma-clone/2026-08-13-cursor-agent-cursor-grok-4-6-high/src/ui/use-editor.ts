import { useSyncExternalStore } from "react";
import { getState, subscribe, type EditorState } from "../core/store";

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(getState()),
  );
}

export function useEditorState(): EditorState {
  return useSyncExternalStore(subscribe, getState, getState);
}
