import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  DialogEscClose,
} from "@/components/bordered-dialog";
import { ExternalLink, User } from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";
import type { Person } from "@/features/person/person.query";

type PersonDetailDialogProps = {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
};

export function PersonDetailDialog({
  person,
  open,
  onOpenChange,
  orgSlug,
}: PersonDetailDialogProps) {
  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BorderedDialogContent>
        <div className="border-b px-5 py-4">
          <DialogTitle className="text-base">{person.name}</DialogTitle>
          <DialogDescription className="text-sm">
            {person.description}
          </DialogDescription>
        </div>

        <BorderedDialogBody>
          {person.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {person.images.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative aspect-square w-full overflow-hidden rounded-lg border bg-neutral-100 dark:bg-neutral-800"
                >
                  <Image
                    src={url}
                    alt={`${person.name} - ${index + 1}`}
                    fill
                    sizes="50vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted flex aspect-video items-center justify-center rounded-lg">
              <User className="text-muted-foreground size-12" />
            </div>
          )}
        </BorderedDialogBody>

        <BorderedDialogFooter>
          <DialogEscClose />
          <Button size="sm" variant="secondary" asChild>
            <Link
              href={`/orgs/${orgSlug}/persons/${person.id}`}
              target="_blank"
            >
              <ExternalLink className="size-3" />
              View Details
            </Link>
          </Button>
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}
