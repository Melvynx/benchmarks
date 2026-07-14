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
import { Skeleton } from "@/components/ui/skeleton";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import {
  updateUserImageName,
  uploadUserImage,
} from "@/features/user-image/user-image-upload";
import { useUserImages } from "@/features/user-image/user-image.query";
import { createFileRoute } from "@tanstack/react-router";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
} from "convex/react";
import { makeFunctionReference } from "convex/server";
import { ImagePlus, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Image from "@/compat/image";
import { useState } from "react";
import { toast } from "sonner";

const generateUploadUrlRef = makeFunctionReference<
  "mutation",
  { orgSlug: string },
  string
>("userImages:generateAnalyzedUploadUrl");
const createUserImageFromUploadRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    storageId: string;
    name?: string;
    contentType?: string;
  },
  { id: string; imageUrl: string; name: string; description: string | null }
>("userImagesNode:createFromUpload");
const renameUserImageRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; id: string; name: string },
  { id: string; name: string }
>("userImages:rename");
const deleteUserImageRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; id: string },
  { success: boolean }
>("userImages:remove");

export const Route = createFileRoute("/orgs/$orgSlug/images")({
  component: ImagesRoute,
});

function ImagesRoute() {
  const { orgSlug } = Route.useParams();
  const { data: images, isLoading } = useUserImages(orgSlug);
  const [isUploading, setIsUploading] = useState(false);
  const generateUploadUrl = useConvexMutation(generateUploadUrlRef);
  const createFromUpload = useConvexAction(createUserImageFromUploadRef);
  const renameUserImage = useConvexMutation(renameUserImageRef);
  const deleteUserImage = useConvexMutation(deleteUserImageRef);

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/webp";
    input.multiple = true;
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      try {
        await Promise.all(
          Array.from(files).map(async (file) =>
            uploadUserImage(
              { orgSlug, file },
              {
                generateUploadUrl: async () => generateUploadUrl({ orgSlug }),
                createFromUpload,
              },
            ),
          ),
        );
        toast.success(`Uploaded ${files.length} image(s)`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload",
        );
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleDelete = (id: string, name: string) => {
    dialogManager.confirm({
      title: "Delete image",
      description: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      variant: "destructive",
      action: {
        label: "Delete",
        variant: "destructive",
        onClick: async () => {
          try {
            await deleteUserImage({ orgSlug, id });
            toast.success("Image deleted");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Failed to delete",
            );
          }
        },
      },
    });
  };

  const handleRename = (id: string, currentName: string) => {
    dialogManager.input({
      title: "Rename image",
      description: "Enter a new name for this image.",
      input: {
        label: "Name",
        defaultValue: currentName,
      },
      action: {
        label: "Rename",
        onClick: async (name) => {
          if (!name) return;
          try {
            await updateUserImageName({ orgSlug, id, name }, renameUserImage);
            toast.success("Image renamed");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Failed to rename",
            );
          }
        },
      },
    });
  };

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Images</LayoutTitle>
      </LayoutHeader>
      <LayoutActions>
        <Button onClick={handleUpload} disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 size-4" />
          )}
          Upload Images
        </Button>
      </LayoutActions>
      <LayoutContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton
                key={item}
                className="aspect-square w-full rounded-2xl"
              />
            ))}
          </div>
        ) : !images || images.length === 0 ? (
          <EmptyImagesState
            onUploadClick={handleUpload}
            isUploading={isUploading}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <ContextMenu key={image.id}>
                <ContextMenuTrigger asChild>
                  <div className="group hover:ring-primary/50 relative aspect-square overflow-hidden rounded-2xl border shadow-md transition-all hover:shadow-xl hover:ring-2">
                    <Image
                      src={image.imageUrl}
                      alt={image.name}
                      fill
                      className="object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                    <div className="absolute top-2 right-2 z-20 opacity-70 transition-opacity group-hover:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="bg-background/65 hover:bg-background/90 size-7 backdrop-blur-sm"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRename(image.id, image.name)}
                          >
                            <Pencil className="mr-2 size-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(image.id, image.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="absolute right-3 bottom-3 left-3 z-10 min-w-0">
                      <h3 className="line-clamp-1 text-sm leading-tight font-semibold text-white drop-shadow-md">
                        {image.name}
                      </h3>
                      {image.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/70">
                          {image.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => handleRename(image.id, image.name)}
                  >
                    <Pencil className="mr-2 size-4" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => handleDelete(image.id, image.name)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}
      </LayoutContent>
    </Layout>
  );
}

function EmptyImagesState({
  onUploadClick,
  isUploading,
}: {
  onUploadClick: () => void;
  isUploading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
      <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
        <ImagePlus className="text-muted-foreground size-6" />
      </div>
      <h3 className="mb-2 font-semibold">No images yet</h3>
      <p className="text-muted-foreground mb-4 text-center text-sm">
        Upload images to use as references in your thumbnail generations.
      </p>
      <Button onClick={onUploadClick} disabled={isUploading}>
        {isUploading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <ImagePlus className="mr-2 size-4" />
        )}
        Upload Images
      </Button>
    </div>
  );
}
