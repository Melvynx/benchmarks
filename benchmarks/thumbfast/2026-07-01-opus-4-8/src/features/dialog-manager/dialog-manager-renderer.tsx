import { DialogComponent } from "./dialog-component";
import { useDialogStore } from "./dialog-store";

export function DialogManagerRenderer() {
  const activeDialog = useDialogStore((state) => state.activeDialog);

  if (activeDialog) {
    return <DialogComponent dialog={activeDialog} />;
  }

  return null;
}
