import { CmdOrOption } from "@/components/nowts/keyboard-shortcut";
import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useIsClient } from "@/hooks/use-is-client";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFormAutoSave } from "./form-auto-save";
import { LoadingButton } from "./submit-button";

type FormAutoSaveStickyBarProps = {
  actionLabel?: string;
  cancelLabel?: string;
};

// eslint-disable-next-line @typescript-eslint/promise-function-async
export const FormAutoSaveStickyBar = (props: FormAutoSaveStickyBarProps) => {
  const ctx = useFormAutoSave();
  const isClient = useIsClient();
  const onSubmit = ctx.submit;
  const onCancel = ctx.cancel;
  const isLoading = ctx.isLoading;
  const isDirty = ctx.isDirty;

  const isShow = isDirty;

  if (!isClient) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 flex items-center justify-center overflow-hidden py-4"
      style={{
        zIndex: 999,
      }}
    >
      <AnimatePresence>
        {isShow ? (
          <motion.div
            key="save-bar"
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: [1, 1, 0],
              y: [0, -10, 20],
              transition: {
                duration: 0.5,
              },
            }}
            className="bg-card pointer-events-auto flex items-center gap-4 rounded-md border p-1 lg:p-2"
          >
            <Typography variant="small">
              Changes have been made. Save now!
            </Typography>
            {props.cancelLabel && (
              <Button variant="secondary" onClick={onCancel} type="button">
                {props.cancelLabel}
              </Button>
            )}
            <LoadingButton
              size="sm"
              loading={isLoading}
              variant="secondary"
              onClick={onSubmit}
            >
              {props.actionLabel ?? "Save"}{" "}
              <Kbd className="mr-1">
                <CmdOrOption /> + S
              </Kbd>
            </LoadingButton>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  ) as ReactNode;
};
