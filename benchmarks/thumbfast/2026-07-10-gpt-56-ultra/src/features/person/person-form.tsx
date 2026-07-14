import type { Person } from "@/features/person/person.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upfetch } from "@/lib/up-fetch";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "@/hooks/use-async-mutation";
import { useAction, useMutation as useConvexMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { HelpCircle, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import Image from "@/compat/image";
import { useRouter } from "@/compat/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { showPersonTutorial } from "./person-help-button";
import { usePersonQualityCheck } from "./use-person-quality-check";

type PersonFormProps = {
  person?: Person;
  orgSlug: string;
};

export function PersonForm({ person, orgSlug }: PersonFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(person);
  const createPerson = useConvexMutation(api.app.createPerson);
  const updatePerson = useConvexMutation(api.app.updatePerson);
  const generateDescription = useAction(api.app.generatePersonDescription);
  const generateUploadUrl = useConvexMutation(
    api.app.generatePersonImageUploadUrl,
  );
  const resolveUpload = useConvexMutation(api.app.resolvePersonImageUpload);
  const runQualityCheck = usePersonQualityCheck(orgSlug);

  const [name, setName] = useState(person?.name ?? "");
  const [description, setDescription] = useState(person?.description ?? "");
  const [images, setImages] = useState<string[]>(person?.images ?? []);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const generateDescriptionMutation = useMutation({
    mutationFn: async (imageUrls: string[]) => {
      return generateDescription({ orgSlug, images: imageUrls });
    },
    onSuccess: (data) => {
      setDescription(data.description);
      toast.success("Description generated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: {
      name: string;
      description: string;
      images: string[];
    }) => {
      if (isEditing && person) {
        return updatePerson({
          orgSlug,
          personId: person.id,
          name: values.name,
          description: values.description,
          images: values.images,
        });
      }
      return createPerson({
        orgSlug,
        name: values.name,
        description: values.description,
        images: values.images,
      });
    },
    onSuccess: async () => {
      toast.success(isEditing ? "Person updated" : "Person created");
      router.push(`/orgs/${orgSlug}/persons`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFiles = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    if (images.length >= 1) {
      toast.warning("Only one photo per person", {
        description: "Create separate persons for multiple faces.",
      });
      return;
    }

    if (imageFiles.length > 1) {
      toast.warning("Only the first photo will be used", {
        description: "One photo per person works best.",
      });
    }

    const file = imageFiles[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large (max 2MB)", {
        description: "https://tinypng.com/ to compress the image",
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ orgSlug });
      const result = await upfetch<{ storageId: Id<"_storage"> }>(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const url = await resolveUpload({ orgSlug, storageId: result.storageId });
      setImages([url]);
      void runQualityCheck(url, { onReplace: () => setImages([]) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (images.length === 0) {
      toast.error("At least one image is required");
      return;
    }
    await mutation.mutateAsync({ name, description, images });
  };

  const hasChanges =
    name !== (person?.name ?? "") ||
    description !== (person?.description ?? "") ||
    JSON.stringify(images) !== JSON.stringify(person?.images ?? []);

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent
          className={`flex flex-col gap-6 pt-6 transition-colors ${isDragging ? "bg-accent/50" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Images Grid */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Reference Image ({images.length}/1)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={showPersonTutorial}
              >
                <HelpCircle className="size-3" />
                Tips
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {images.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="group bg-muted relative aspect-square overflow-hidden rounded-lg border"
                >
                  <Image
                    src={url}
                    alt={`Reference ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-5 text-white" />
                  </button>
                </div>
              ))}

              {images.length < 1 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="border-muted-foreground/25 bg-muted/50 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {isUploading ? (
                    <Upload className="size-5 animate-pulse" />
                  ) : (
                    <Plus className="size-5" />
                  )}
                  <span className="text-[10px] font-medium">
                    {isUploading ? "..." : "Add"}
                  </span>
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John - Tech Expert"
              disabled={mutation.isPending}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={
                  images.length === 0 || generateDescriptionMutation.isPending
                }
                onClick={() =>
                  generateDescriptionMutation.mutate(images.slice(0, 2))
                }
              >
                <Sparkles className="size-3" />
                {generateDescriptionMutation.isPending
                  ? "Generating..."
                  : "Generate"}
              </Button>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="30-year-old man with short brown hair, friendly smile, wearing glasses..."
              rows={3}
              disabled={mutation.isPending}
              className="resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-4 border-t pt-4">
            {person?.createdAt && (
              <span className="text-muted-foreground text-sm">
                Created{" "}
                {formatDistanceToNow(new Date(person.createdAt), {
                  addSuffix: true,
                })}
              </span>
            )}

            <div className="ml-auto">
              <Button
                type="submit"
                size="sm"
                disabled={
                  mutation.isPending ||
                  images.length === 0 ||
                  !name.trim() ||
                  (isEditing && !hasChanges)
                }
              >
                {mutation.isPending
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Person"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
