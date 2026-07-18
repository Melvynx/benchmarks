import { showPersonImageQualityDialog } from "@/features/person/person-quality-dialog";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback } from "react";
import { toast } from "sonner";

type RunQualityCheckOptions = {
  /** Called when the user decides to replace the uploaded photo. */
  onReplace: () => void;
};

/**
 * Returns a function that runs the 0.1-credit Gemini quality check on a freshly
 * uploaded person photo and shows the "Are the parameters correct?" dialog.
 *
 * The check is advisory: if it fails (e.g. insufficient credits), we surface a
 * toast and keep the uploaded photo rather than blocking person creation.
 */
export function usePersonQualityCheck(orgSlug: string) {
  const checkQuality = useAction(api.personQualityNode.checkPersonImageQuality);

  return useCallback(
    async (imageUrl: string, options: RunQualityCheckOptions) => {
      const toastId = toast.loading("Checking your photo...");
      try {
        const quality = await checkQuality({ orgSlug, imageUrl });
        toast.dismiss(toastId);
        showPersonImageQualityDialog({
          quality,
          onConfirm: () => undefined,
          onReplace: options.onReplace,
        });
      } catch (error) {
        toast.dismiss(toastId);
        toast.error(getUserFacingErrorMessage(error, "Could not check photo"));
      }
    },
    [checkQuality, orgSlug],
  );
}
