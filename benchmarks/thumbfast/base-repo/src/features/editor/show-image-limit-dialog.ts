import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { MAX_TOTAL_IMAGES } from "./editor.constants";
import { getEditorStore } from "./editor.store";

export function showImageLimitDialog() {
  const state = getEditorStore();
  const breakdown = state.getImageCountBreakdown();

  const parts: string[] = [];
  if (breakdown.personImages > 0) {
    parts.push(`${breakdown.personImages} from persons`);
  }
  if (breakdown.inspirationImages > 0) {
    parts.push(`${breakdown.inspirationImages} from inspirations`);
  }
  if (breakdown.userImages > 0) {
    parts.push(`${breakdown.userImages} uploaded`);
  }
  if (breakdown.editingImage > 0) {
    parts.push(`1 editing image`);
  }

  const breakdownText =
    parts.length > 0
      ? `Current usage: ${parts.join(", ")} (${breakdown.total} total).`
      : "";

  dialogManager.confirm({
    title: "Image limit reached",
    description: `You can use a maximum of ${MAX_TOTAL_IMAGES} images per generation. ${breakdownText} Remove some images to add more.`,
    action: {
      label: "OK",
    },
  });
}
