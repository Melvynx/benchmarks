import type { Person } from "@/features/person/person.query";
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
import { ChevronDown, Trash2, Wand2 } from "lucide-react";
import Link from "@/compat/link";
import { useRouter } from "@/compat/navigation";
import { toast } from "sonner";

type PersonPageActionsProps = {
  person: Pick<Person, "id" | "name">;
  orgSlug: string;
};

export function PersonPageActions({ person, orgSlug }: PersonPageActionsProps) {
  const router = useRouter();
  const deletePerson = useConvexMutation(api.app.deletePerson);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return deletePerson({ orgSlug, personId: person.id });
    },
    onSuccess: async () => {
      toast.success("Person deleted");
      router.push(`/orgs/${orgSlug}/persons`);
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
    <ButtonGroup>
      <Link
        href={`/orgs/${orgSlug}/thumbnails/new?persons=${person.id}`}
        className={buttonVariants()}
      >
        <Wand2 className="mr-2 size-4" />
        Use this person
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="icon">
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
