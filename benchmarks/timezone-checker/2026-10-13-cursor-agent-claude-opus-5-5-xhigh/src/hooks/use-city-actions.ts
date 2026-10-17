import { useMemo } from "react";
import { withViewTransition } from "@/lib/view-transition";
import { useFocus } from "@/state/focus";
import { usePreferences } from "@/state/preferences";

export function useCityActions() {
  const addCity = usePreferences((state) => state.addCity);
  const removeCity = usePreferences((state) => state.removeCity);
  const setReference = usePreferences((state) => state.setReference);
  const clearFocus = useFocus((state) => state.clear);

  return useMemo(
    () => ({
      add: (id: string) => withViewTransition(() => addCity(id)),
      remove: (id: string) => {
        clearFocus();
        withViewTransition(() => removeCity(id));
      },
      makeReference: (id: string) => {
        clearFocus();
        withViewTransition(() => setReference(id));
      },
    }),
    [addCity, removeCity, setReference, clearFocus],
  );
}
