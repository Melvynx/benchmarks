import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  DialogEscClose,
} from "@/components/bordered-dialog";
import Image from "@/compat/image";
import type { UserImageData } from "./editor.schema";

type UserImageDetailDialogProps = {
  image: UserImageData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserImageDetailDialog({
  image,
  open,
  onOpenChange,
}: UserImageDetailDialogProps) {
  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BorderedDialogContent>
        <div className="border-b px-5 py-4">
          <DialogTitle className="text-base">{image.name}</DialogTitle>
          {image.description && (
            <DialogDescription className="text-sm">
              {image.description}
            </DialogDescription>
          )}
        </div>

        <BorderedDialogBody>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-neutral-100 dark:bg-neutral-800">
            <Image
              src={image.imageUrl}
              alt={image.name}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
            />
          </div>
        </BorderedDialogBody>

        <BorderedDialogFooter>
          <DialogEscClose />
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}
