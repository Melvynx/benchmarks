import { Typography } from "@/components/nowts/typography";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type KeyboardEvent, useState } from "react";
import { LoadingButton } from "../form/submit-button";
import { handleDialogAction, useDialogStore } from "./dialog-store";
import type { Dialog } from "./dialog-types";

const borderedContentClass =
  "gap-0 overflow-hidden rounded-xl border-none p-0 pb-10 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800";

function DialogFooterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground absolute inset-x-0 bottom-0 z-20 flex h-10 items-center justify-between rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium dark:border-t-neutral-700 dark:bg-neutral-800">
      {children}
    </div>
  );
}

function EscHint({
  label = "Close",
  onClick,
}: {
  label?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground h-auto gap-1.5 px-1.5 py-1 text-xs font-medium"
      onClick={onClick}
    >
      <Kbd className="size-5 text-[10px]">Esc</Kbd>
      <span>{label}</span>
    </Button>
  );
}

function isInteractiveEnterTarget(target: EventTarget | null) {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "a,button,input,select,textarea,[contenteditable='true'],[role='button'],[role='link']",
    ),
  );
}

export function DialogComponent(props: { dialog: Dialog }) {
  const { dialog } = props;
  const [confirmText, setConfirmText] = useState("");
  const [inputValue, setInputValue] = useState(
    dialog.type === "input" ? (dialog.input.defaultValue ?? "") : "",
  );

  const sizeClass = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-4xl",
  }[dialog.size ?? "md"];

  if (dialog.type === "custom") {
    const handleClose = () => {
      useDialogStore.getState().removeDialog(dialog.id);
    };

    return (
      <AlertDialog open={true} onOpenChange={handleClose}>
        <AlertDialogContent
          className={cn(borderedContentClass, sizeClass)}
          overlayProps={{
            onClick: () => {
              handleClose();
            },
          }}
        >
          {(dialog.title || dialog.description) && (
            <AlertDialogHeader className="border-b px-5 py-4">
              {dialog.title && (
                <AlertDialogTitle className="text-base">
                  {dialog.title}
                </AlertDialogTitle>
              )}
              {dialog.description && (
                <AlertDialogDescription className="text-sm">
                  {dialog.description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
          )}
          <div className="flex flex-col gap-4 p-5">{dialog.children}</div>
          <DialogFooterBar>
            <EscHint onClick={handleClose} />
            <span />
          </DialogFooterBar>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const isConfirmDisabled =
    dialog.type === "confirm" && dialog.confirmText
      ? confirmText !== dialog.confirmText
      : false;

  const handleAction = async () => {
    await handleDialogAction(dialog.id, async () =>
      dialog.action.onClick?.(dialog.type === "input" ? inputValue : undefined),
    );
  };

  const handleCancel = async () => {
    if (dialog.loading) return;

    try {
      await dialog.cancel?.onClick?.();
    } finally {
      useDialogStore.getState().removeDialog(dialog.id);
    }
  };

  const handleContentKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (dialog.loading || isConfirmDisabled) return;
    if (isInteractiveEnterTarget(event.target)) return;

    event.preventDefault();
    void handleAction();
  };

  return (
    <AlertDialog open={true} onOpenChange={handleCancel}>
      <AlertDialogContent
        className={cn(borderedContentClass, sizeClass)}
        onKeyDown={handleContentKeyDown}
        overlayProps={{
          onClick: () => {
            void handleCancel();
          },
        }}
      >
        <AlertDialogHeader
          className={cn("px-5 py-4", {
            "border-b":
              (dialog.type === "confirm" && dialog.confirmText) ||
              dialog.type === "input",
            "flex flex-col items-center gap-2": dialog.style === "centered",
          })}
        >
          {dialog.icon && (
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <dialog.icon className="size-6" />
            </div>
          )}
          <AlertDialogTitle className="text-base">
            {dialog.title ?? ""}
          </AlertDialogTitle>
          {typeof dialog.description === "string" ? (
            <AlertDialogDescription className="text-sm">
              {dialog.description}
            </AlertDialogDescription>
          ) : (
            dialog.description
          )}
        </AlertDialogHeader>

        {((dialog.type === "confirm" && dialog.confirmText) ||
          dialog.type === "input") && (
          <div className="flex flex-col gap-4 p-5">
            {dialog.type === "confirm" && dialog.confirmText && (
              <div className="space-y-2">
                <Typography>
                  Type{" "}
                  <Typography variant="code">{dialog.confirmText}</Typography>{" "}
                  to confirm this action.
                </Typography>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      if (!dialog.loading && !isConfirmDisabled) {
                        void handleAction();
                      }
                    }
                  }}
                />
              </div>
            )}

            {dialog.type === "input" && (
              <div>
                <Label>{dialog.input.label}</Label>
                <Input
                  value={inputValue}
                  placeholder={dialog.input.placeholder}
                  onChange={(e) => setInputValue(e.target.value)}
                  ref={(ref) => ref?.focus()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!dialog.loading && !isConfirmDisabled) {
                        void handleAction();
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooterBar>
          <EscHint
            label={String(dialog.cancel?.label ?? "Cancel")}
            onClick={handleCancel}
          />
          <div className="flex items-center gap-2">
            <LoadingButton
              size="sm"
              autoFocus
              loading={dialog.loading}
              disabled={dialog.loading || isConfirmDisabled}
              onClick={handleAction}
              variant={dialog.action.variant ?? "default"}
            >
              <Kbd
                aria-hidden="true"
                className="bg-white/20 text-[10px] text-inherit ring-1 ring-current/15"
              >
                Enter
              </Kbd>
              <span>{dialog.action.label ?? "OK"}</span>
            </LoadingButton>
          </div>
        </DialogFooterBar>
      </AlertDialogContent>
    </AlertDialog>
  );
}
