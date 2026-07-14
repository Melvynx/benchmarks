import {
  BorderedDialogContent,
  BorderedDialogFooter,
  DialogEscClose,
} from "@/components/bordered-dialog";
import { Loader } from "@/components/nowts/loader";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { FolderOpen, ImageIcon, Plus, Search } from "lucide-react";
import Image from "@/compat/image";
import { useMemo, useState } from "react";
import { useUserImages } from "./user-image.query";

type UserImageGalleryProps = {
  orgSlug: string;
  onSelect: (imageUrl: string) => void;
};

export function UserImageGallery({ orgSlug, onSelect }: UserImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: userImages, isLoading } = useUserImages(orgSlug);

  const filteredImages = useMemo(() => {
    if (!userImages) return [];
    if (!search.trim()) return userImages;
    const q = search.toLowerCase();
    return userImages.filter(
      (img) =>
        img.name.toLowerCase().includes(q) ||
        img.description?.toLowerCase().includes(q),
    );
  }, [userImages, search]);

  const handleClick = (imageUrl: string) => {
    onSelect(imageUrl);
    setOpen(false);
  };

  const imageCount = userImages?.length ?? 0;
  const showingFiltered = search.trim() && filteredImages.length !== imageCount;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <FolderOpen className="size-4" />
          Gallery
        </Button>
      </DialogTrigger>
      <BorderedDialogContent
        maxWidth="sm:max-w-4xl"
        className="bg-clip-padding p-0 pb-10"
      >
        <div className="sr-only">
          <DialogTitle>Image Gallery</DialogTitle>
          <DialogDescription>
            Browse and select images from your gallery
          </DialogDescription>
        </div>
        <Command
          shouldFilter={false}
          className="**:data-[slot=command-input-wrapper]:border-input rounded-none bg-transparent **:data-[slot=command-input]:h-10 **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:h-10 **:data-[slot=command-input-wrapper]:rounded-none **:data-[slot=command-input-wrapper]:border-0 **:data-[slot=command-input-wrapper]:border-b **:data-[slot=command-input-wrapper]:bg-transparent **:data-[slot=command-input-wrapper]:shadow-none"
        >
          <div className="flex items-center">
            <div className="flex-1">
              <CommandInput
                placeholder="Search images..."
                value={search}
                onValueChange={setSearch}
              />
            </div>
            {imageCount > 0 && (
              <span className="text-muted-foreground shrink-0 pr-4 text-xs tabular-nums">
                {showingFiltered
                  ? `${filteredImages.length} of ${imageCount}`
                  : `${imageCount} images`}
              </span>
            )}
          </div>
          <CommandList className="no-scrollbar max-h-[60vh] min-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader className="size-6" />
              </div>
            ) : !userImages || userImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed border-neutral-700">
                  <ImageIcon className="text-muted-foreground size-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-300">
                    No images yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Upload images in the editor to build your gallery
                  </p>
                </div>
              </div>
            ) : (
              <>
                <CommandEmpty className="flex flex-col items-center gap-3 py-20 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-neutral-700">
                    <Search className="text-muted-foreground size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-300">
                      No matches
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Try a different search term
                    </p>
                  </div>
                </CommandEmpty>
                <CommandGroup className="p-0!">
                  <div className="grid grid-cols-3 gap-1.5 p-2 sm:grid-cols-4 lg:grid-cols-5">
                    {filteredImages.map((image) => (
                      <CommandItem
                        key={image.id}
                        value={`${image.id} ${image.name} ${image.description ?? ""}`}
                        onSelect={() => handleClick(image.imageUrl)}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-transparent p-0 transition-all duration-200 select-none data-[selected=true]:border-neutral-500 data-[selected=true]:ring-1 data-[selected=true]:ring-neutral-500/50"
                      >
                        <Image
                          src={image.imageUrl}
                          alt={image.name}
                          fill
                          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
                          <div className="flex size-8 translate-y-1 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-200 group-hover:translate-y-0">
                            <Plus className="size-3.5 text-neutral-800" />
                          </div>
                        </div>
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-1.5 py-1 text-[10px] leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                          {image.name}
                        </span>
                      </CommandItem>
                    ))}
                  </div>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
        <BorderedDialogFooter>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Kbd className="size-5">↵</Kbd>
              <span>Select</span>
            </div>
            <DialogEscClose />
          </div>
          <span />
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}
