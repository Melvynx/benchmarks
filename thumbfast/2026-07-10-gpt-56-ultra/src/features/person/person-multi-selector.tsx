import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditorStore } from "@/features/editor/editor.store";
import { showImageLimitDialog } from "@/features/editor/show-image-limit-dialog";
import type { Person } from "@/features/person/person.query";
import { Plus, User, X } from "lucide-react";
import Image from "@/compat/image";
import { useParams } from "@/compat/navigation";
import { useState } from "react";
import { CreatePersonDialog } from "./create-person-dialog";
import { PersonDetailDialog } from "./person-detail-dialog";
import { usePersons } from "./person.query";

type PersonMultiSelectorProps = {
  value: string[];
  onChange: (personIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function PersonMultiSelector({
  value,
  onChange,
  disabled = false,
}: PersonMultiSelectorProps) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { data: persons, isLoading } = usePersons(orgSlug);
  const { addPersonId, removePersonId } = useEditorStore();
  const [detailPerson, setDetailPerson] = useState<Person | null>(null);

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const selectedPersons = persons?.filter((p) => value.includes(p.id)) ?? [];
  const availablePersons = persons?.filter((p) => !value.includes(p.id)) ?? [];
  const getDescription = (person: Person) =>
    person.description.trim() || "No description yet";

  const handleAdd = (personId: string) => {
    const added = addPersonId(personId);
    if (added) {
      onChange([...value, personId]);
    } else {
      showImageLimitDialog();
    }
  };

  const handleRemove = (personId: string) => {
    removePersonId(personId);
    onChange(value.filter((id) => id !== personId));
  };

  return (
    <>
      <div className="border-input rounded-xl border border-dashed p-2">
        <div className="flex flex-col gap-1">
          {selectedPersons.map((person) => (
            <div
              key={person.id}
              className="flex items-start gap-3 rounded-lg p-2"
            >
              <button
                type="button"
                onClick={() => setDetailPerson(person)}
                className="shrink-0 cursor-pointer"
              >
                {person.images[0] ? (
                  <Image
                    src={person.images[0]}
                    alt={person.name}
                    width={40}
                    height={40}
                    className="size-10 rounded object-cover transition-opacity hover:opacity-80"
                  />
                ) : (
                  <div className="bg-muted flex size-10 items-center justify-center rounded transition-opacity hover:opacity-80">
                    <User className="text-muted-foreground size-4" />
                  </div>
                )}
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-violet-400">
                  {person.name}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                  {getDescription(person)}
                </span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(person.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0 p-1 transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}

          {!disabled && availablePersons.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors"
                >
                  <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded border">
                    <Plus className="size-3.5 opacity-60" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Add Person</span>
                    <span className="text-muted-foreground text-xs">
                      Select from {availablePersons.length} available
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72" align="start">
                {availablePersons.map((person) => (
                  <DropdownMenuItem
                    key={person.id}
                    className="flex items-start gap-3 p-2"
                    onSelect={() => handleAdd(person.id)}
                  >
                    {person.images[0] ? (
                      <Image
                        src={person.images[0]}
                        alt={person.name}
                        width={40}
                        height={40}
                        className="size-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex size-10 items-center justify-center rounded-md">
                        <User className="text-muted-foreground size-4" />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {person.name}
                      </span>
                      <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                        {getDescription(person)}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!disabled && persons?.length === 0 && (
            <CreatePersonDialog
              trigger={
                <button
                  type="button"
                  className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors"
                >
                  <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded border">
                    <Plus className="size-3.5 opacity-60" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Create Person</span>
                    <span className="text-muted-foreground text-xs">
                      Add reference images for AI
                    </span>
                  </div>
                </button>
              }
            />
          )}
        </div>
      </div>
      <PersonDetailDialog
        person={detailPerson}
        open={detailPerson !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDetailPerson(null);
        }}
        orgSlug={orgSlug}
      />
    </>
  );
}
