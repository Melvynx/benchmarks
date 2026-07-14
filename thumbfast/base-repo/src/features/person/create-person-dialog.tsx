import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  BorderedDialogHeader,
  DialogEscClose,
} from "@/components/bordered-dialog";
import { MultiImageUploader } from "@/components/multi-image-uploader";
import { usePersonQualityCheck } from "@/features/person/use-person-quality-check";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { upfetch } from "@/lib/up-fetch";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "@/hooks/use-async-mutation";
import { useAction, useMutation as useConvexMutation } from "convex/react";
import { Loader2, Plus, User } from "lucide-react";
import { useParams } from "@/compat/navigation";
import { useState } from "react";
import { toast } from "sonner";

type CreatePersonDialogProps = {
  trigger?: React.ReactNode;
};

export function CreatePersonDialog({ trigger }: CreatePersonDialogProps) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const createPerson = useConvexMutation(api.app.createPerson);
  const generateDescription = useAction(api.app.generatePersonDescription);
  const generateUploadUrl = useConvexMutation(
    api.app.generatePersonImageUploadUrl,
  );
  const resolveUpload = useConvexMutation(api.app.resolvePersonImageUpload);
  const runQualityCheck = usePersonQualityCheck(orgSlug);

  const handleImagesChange = (next: string[]) => {
    const addedUrl = next.find((url) => !images.includes(url));
    setImages(next);
    if (addedUrl) {
      void runQualityCheck(addedUrl, { onReplace: () => setImages([]) });
    }
  };

  const createMutation = useMutation({
    mutationFn: async ({
      name,
      images,
    }: {
      name: string;
      images: string[];
    }) => {
      const descriptionResult = await generateDescription({
        orgSlug,
        images: images.slice(0, 2),
      });

      return createPerson({
        orgSlug,
        name,
        description: descriptionResult.description,
        images,
      });
    },
    onSuccess: async () => {
      toast.success("Person created");
      setOpen(false);
      setName("");
      setImages([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ orgSlug });
      const result = await upfetch<{ storageId: Id<"_storage"> }>(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      return resolveUpload({ orgSlug, storageId: result.storageId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitting = createMutation.isPending;
  const canSubmit =
    name.trim() && images.length > 0 && !isSubmitting && !isUploading;

  const handleCreate = () => {
    if (!name.trim() || images.length === 0) return;
    createMutation.mutate({ name: name.trim(), images });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isSubmitting) return;
    if (!newOpen) {
      setName("");
      setImages([]);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 size-4" />
            Add Person
          </Button>
        )}
      </DialogTrigger>
      <BorderedDialogContent>
        <BorderedDialogHeader
          title="Create Person"
          description="Upload one clear photo and give this person a name"
        />

        <BorderedDialogBody>
          <div className="relative">
            <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="e.g., John - Tech Expert"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <MultiImageUploader
              images={images}
              onImagesChange={handleImagesChange}
              onUpload={handleUpload}
              maxImages={1}
              isUploading={isUploading}
              disabled={isSubmitting}
              imageSize="sm"
              compact
            />
            <p className="text-muted-foreground text-xs">
              One photo per person works best. Create separate persons for
              multiple faces.
            </p>
          </div>
        </BorderedDialogBody>

        <BorderedDialogFooter>
          {isSubmitting ? (
            <>
              <div className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Creating...</span>
              </div>
            </>
          ) : (
            <>
              <DialogEscClose />
              <Button size="sm" onClick={handleCreate} disabled={!canSubmit}>
                Create
              </Button>
            </>
          )}
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}
