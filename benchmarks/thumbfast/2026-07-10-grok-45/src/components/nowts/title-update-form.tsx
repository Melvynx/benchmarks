import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Pencil, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

type TitleUpdateFormProps = {
  title: string;
  onUpdate: (title: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
};

export function TitleUpdateForm({
  title: initialTitle,
  onUpdate,
  className,
  inputClassName,
}: TitleUpdateFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(initialTitle);
  const [_isPending, startTransition] = useTransition();

  const [optimisticTitle, updateOptimisticTitle] = useOptimistic(
    initialTitle,
    (_state, newTitle: string) => newTitle,
  );

  const handleSave = () => {
    if (editedTitle.trim() === "") {
      return;
    }

    setIsEditing(false);
    startTransition(async () => {
      updateOptimisticTitle(editedTitle);
      await onUpdate(editedTitle);
    });
  };

  const handleCancel = () => {
    setEditedTitle(optimisticTitle);
    setIsEditing(false);
  };

  const titleStyles = cn("text-2xl font-bold rounded-md py-1", className);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          style={
            {
              fieldSizing: "content",
            } as React.CSSProperties
          }
          className={cn(
            "rounded-md bg-transparent outline",
            titleStyles,
            inputClassName,
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleSave();
            }
            if (e.key === "Escape") {
              handleCancel();
            }
          }}
        />
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => void handleSave()}>
            <Check className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCancel}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex items-center gap-2">
      <h1
        className={cn(titleStyles, "cursor-pointer")}
        onDoubleClick={() => setIsEditing(true)}
      >
        {optimisticTitle}
      </h1>
      <Button
        size="icon"
        variant="ghost"
        className="opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  );
}
