import { useSyncExternalStore } from "react";
import type { Engine } from "../engine";

export function useEngineVersion(engine: Engine): number {
  return useSyncExternalStore(engine.subscribe, engine.getVersion);
}
