import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "@/compat/navigation";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

const DISMISSED_UNTIL_STORAGE_KEY =
  "thumbfast-signed-in-dialog-dismissed-until";
const STAY_HERE_SUPPRESSION_MS = 10 * 60 * 1000;

function isSignedInDialogDismissed() {
  if (typeof window === "undefined") return false;

  try {
    const rawDismissedUntil = window.localStorage.getItem(
      DISMISSED_UNTIL_STORAGE_KEY,
    );
    if (!rawDismissedUntil) return false;

    const dismissedUntil = Number(rawDismissedUntil);
    if (!Number.isFinite(dismissedUntil)) {
      window.localStorage.removeItem(DISMISSED_UNTIL_STORAGE_KEY);
      return false;
    }

    if (dismissedUntil <= Date.now()) {
      window.localStorage.removeItem(DISMISSED_UNTIL_STORAGE_KEY);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function dismissSignedInDialogForAWhile() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      DISMISSED_UNTIL_STORAGE_KEY,
      String(Date.now() + STAY_HERE_SUPPRESSION_MS),
    );
  } catch {
    // Ignore storage failures so the dialog can still close normally.
  }
}

export const SignedInDialog = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const location = useLocation();
  const hasShownDialog = useRef(false);
  const activeDialogId = useRef<string | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (activeDialogId.current) {
        dialogManager.close(activeDialogId.current);
        activeDialogId.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") {
      if (activeDialogId.current) {
        dialogManager.close(activeDialogId.current);
        activeDialogId.current = undefined;
      }
      return;
    }

    if (
      session?.user &&
      !hasShownDialog.current &&
      !isSignedInDialogDismissed()
    ) {
      hasShownDialog.current = true;
      const dialogRef: { id?: string } = {};

      dialogRef.id = dialogManager.confirm({
        title: "You are signed in!",
        description: "Would you like to go to your dashboard?",
        action: {
          label: "Go to dashboard",
          onClick: () => {
            if (dialogRef.id) {
              dialogManager.close(dialogRef.id);
              activeDialogId.current = undefined;
            }
            router.push("/orgs");
          },
        },
        cancel: {
          label: "Stay here",
          onClick: () => {
            dismissSignedInDialogForAWhile();
            activeDialogId.current = undefined;
          },
        },
      });
      activeDialogId.current = dialogRef.id;
    }
  }, [location.pathname, session, router]);

  return null;
};
