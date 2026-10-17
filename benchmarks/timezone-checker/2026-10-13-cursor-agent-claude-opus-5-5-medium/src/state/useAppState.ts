import { useEffect, useMemo, useReducer } from "react";
import type { Mode } from "../lib/schedule";
import { loadState, reducer, saveState, type Settings } from "./appState";

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => saveState(state), [state]);

  const actions = useMemo(
    () => ({
      addCity: (id: string) => dispatch({ type: "addCity", id }),
      removeCity: (id: string) => dispatch({ type: "removeCity", id }),
      promoteCity: (id: string) => dispatch({ type: "promoteCity", id }),
      setMode: (mode: Mode) => dispatch({ type: "setMode", mode }),
      updateSettings: (patch: Partial<Settings>) => dispatch({ type: "updateSettings", patch }),
      reset: () => dispatch({ type: "reset" }),
    }),
    [],
  );

  return { state, actions };
}

export type AppActions = ReturnType<typeof useAppState>["actions"];
