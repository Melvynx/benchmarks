import type { Person } from "@/features/person/person.query";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { api } from "@convex/_generated/api";
import { useMutation } from "@/hooks/use-async-mutation";
import { useMutation as useConvexMutation } from "convex/react";
import { Camera, MoreVertical, Pencil, Trash2, User } from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { useParams } from "@/compat/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PersonCardProps = {
  person: Person;
  orgSlug?: string;
};

export function PersonCard({ person, orgSlug: orgSlugProp }: PersonCardProps) {
  const params = useParams();
  const orgSlug = orgSlugProp ?? (params.orgSlug as string);
  const deletePerson = useConvexMutation(api.app.deletePerson);
  const detailsHref = `/orgs/${orgSlug}/persons/${person.id}`;
  const photoCount = person.images.length;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return deletePerson({ orgSlug, personId: person.id });
    },
    onSuccess: async () => {
      toast.success("Person deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    dialogManager.confirm({
      title: "Delete person",
      description: `Are you sure you want to delete "${person.name}"? This action cannot be undone.`,
      variant: "destructive",
      action: {
        label: "Delete",
        variant: "destructive",
        onClick: async () => {
          await deleteMutation.mutateAsync();
        },
      },
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group relative overflow-hidden rounded-2xl border",
            "aspect-[2/3] cursor-pointer",
            "transition-shadow duration-200",
            "hover:ring-primary/30 hover:ring-2 hover:shadow-lg",
          )}
        >
          {/* Full-bleed image */}
          <Link href={detailsHref} className="absolute inset-0 block">
            {person.images[0] ? (
              <Image
                src={person.images[0]}
                alt={person.name}
                fill
                className="object-cover object-top"
              />
            ) : (
              <div className="bg-muted flex size-full flex-col items-center justify-center gap-2">
                <User className="text-muted-foreground size-10" />
                <span className="text-muted-foreground text-xs">
                  No photos yet
                </span>
              </div>
            )}
          </Link>

          {/* Gradient fade — allowed for text legibility over photo */}
          {person.images[0] ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
              style={{
                background:
                  "linear-gradient(to top, oklch(0.13 0 0 / 0.92) 0%, oklch(0.13 0 0 / 0.6) 55%, transparent 100%)",
              }}
            />
          ) : null}

          {/* Always-visible bottom info panel */}
          <Link
            href={detailsHref}
            className="absolute inset-x-0 bottom-0 z-10 block p-3"
          >
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "line-clamp-1 text-sm font-semibold leading-tight",
                    person.images[0] ? "text-white" : "text-foreground",
                  )}
                >
                  {person.name}
                </h3>
                {person.description ? (
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-2 text-xs leading-snug",
                      person.images[0]
                        ? "text-white/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {person.description}
                  </p>
                ) : null}
              </div>

              {/* Photo count pill */}
              {photoCount > 0 ? (
                <div className="bg-background/20 text-white/80 flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs backdrop-blur-sm">
                  <Camera className="size-3" />
                  <span>{photoCount}</span>
                </div>
              ) : null}
            </div>
          </Link>

          {/* Three-dot menu — always visible */}
          <div className="absolute top-2 right-2 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-background/60 hover:bg-background/85 size-7 backdrop-blur-sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={detailsHref}>
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>

      {/* Right-click context menu */}
      <ContextMenuContent>
        <ContextMenuItem asChild>
          <Link href={detailsHref}>
            <Pencil className="mr-2 size-4" />
            Edit
          </Link>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
