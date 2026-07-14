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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ItemGroup } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { getAspectRatioClass } from "@/lib/ai/aspect-ratio";
import {
  type PromptListItem,  useInfinitePrompts,
} from "@/features/editor/editor.query";
import { FormattedPromptText } from "@/features/editor/formatted-prompt-text";
import { promptMentionsToDisplayLabels } from "@/lib/prompt-mentions";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { makeFunctionReference } from "convex/server";
import { useMutation } from "@/hooks/use-async-mutation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import {
  ImageIcon,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Image from "@/compat/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const updatePromptNameRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; promptId: string; name: string },
  { id: string; name: string }
>("editor:updatePromptName");
const deletePromptRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; promptId: string },
  { id: string }
>("editor:deletePrompt");

export const Route = createFileRoute("/orgs/$orgSlug/thumbnails/")({
  component: ThumbnailsRoute,
});

function ThumbnailsRoute() {
  const { orgSlug } = Route.useParams();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfinitePrompts(orgSlug, debouncedSearch || undefined);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const prompts = data.pages.flatMap((page) => page.items);

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Thumbnails</LayoutTitle>
      </LayoutHeader>
      <LayoutActions>
        <Button asChild>
          <Link to={`/orgs/${orgSlug}/thumbnails/new` as never}>
            <Plus className="mr-2 size-4" />
            New Thumbnail
          </Link>
        </Button>
      </LayoutActions>
      <LayoutContent className="flex flex-col gap-6">
        <InputGroup className="max-w-sm">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search thumbnails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-md" />
            ))}
          </div>
        ) : prompts.length === 0 ? (
          debouncedSearch ? (
            <EmptySearchState search={debouncedSearch} />
          ) : (
            <EmptyState orgSlug={orgSlug} />
          )
        ) : (
          <>
            <ItemGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prompts.map((prompt) => (
                <ThumbnailCard
                  key={prompt.id}
                  prompt={prompt}
                  orgSlug={orgSlug}
                />
              ))}
            </ItemGroup>

            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage ? (
                <Loader2 className="text-muted-foreground size-6 animate-spin" />
              ) : null}
            </div>
          </>
        )}
      </LayoutContent>
    </Layout>
  );
}

function ThumbnailCard({
  prompt,
  orgSlug,
}: {
  prompt: PromptListItem;
  orgSlug: string;
}) {
  const updatePromptName = useConvexMutation(updatePromptNameRef);
  const deletePrompt = useConvexMutation(deletePromptRef);
  const generation = prompt.generations.at(0);
  const latestThumbnail = generation?.thumbnails.at(0)?.imageUrl;
  const totalGenerations = prompt._count.generations;
  const person = generation?.personImageUrls.at(0);
  const inspiration = generation?.inspirationUrls.at(0);

  const renameMutation = useMutation({
    mutationFn: async (name: string) =>
      updatePromptName({ orgSlug, promptId: prompt.id, name }),
    onSuccess: async () => {
      toast.success("Thumbnail renamed");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deletePrompt({ orgSlug, promptId: prompt.id }),
    onSuccess: async () => {
      toast.success("Thumbnail deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleRename = () => {
    dialogManager.input({
      title: "Rename thumbnail",
      input: {
        label: "Name",
        defaultValue:
          prompt.name ??
          promptMentionsToDisplayLabels(prompt.textPrompt).slice(0, 40),
        placeholder: "Enter new name",
      },
      action: {
        label: "Save",
        onClick: async (value) => {
          if (value) await renameMutation.mutateAsync(value);
        },
      },
    });
  };

  const handleDelete = () => {
    dialogManager.confirm({
      title: "Delete thumbnail",
      description:
        "Are you sure you want to delete this thumbnail and all its generations? This action cannot be undone.",
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
          className={`group ring-primary/50 relative ${getAspectRatioClass(generation?.aspectRatio)} overflow-hidden rounded-2xl shadow-md transition-all hover:shadow-xl hover:ring-2`}
        >
          <Link
            to={`/orgs/${orgSlug}/thumbnails/${prompt.id}` as never}
            className="block size-full"
          >
            {latestThumbnail ? (
              <Image
                src={latestThumbnail}
                alt="Thumbnail"
                fill
                className="object-cover"
              />
            ) : (
              <div className="bg-muted flex size-full items-center justify-center">
                <ImageIcon className="text-muted-foreground size-12" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {(person || inspiration) && (
              <div className="absolute top-0 left-0 flex gap-1.5 p-2.5">
                {[person, inspiration].filter(Boolean).map((imageUrl) => (
                  <div
                    key={imageUrl}
                    className="overflow-hidden rounded-lg bg-white/15 p-1 shadow-lg backdrop-blur-md"
                  >
                    <div className="relative size-10 overflow-hidden rounded-md">
                      <Image
                        src={imageUrl as string}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="absolute right-2.5 bottom-2.5 left-2.5 min-w-0">
              <div className="flex items-end justify-between gap-2">
                <h3 className="line-clamp-1 min-w-0 text-sm font-medium text-white drop-shadow-md">
                  {prompt.name ?? (
                    <FormattedPromptText
                      variant="onDark"
                      text={prompt.textPrompt}
                    />
                  )}
                </h3>
                <span className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                  {totalGenerations}
                </span>
              </div>
            </div>
          </Link>

          <div className="absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-7"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRename}>
                  <Pencil className="mr-2 size-4" />
                  Rename
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
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRename}>
          <Pencil className="mr-2 size-4" />
          Rename
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

function EmptyState({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
      <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
        <ImageIcon className="text-muted-foreground size-6" />
      </div>
      <h3 className="mb-2 font-semibold">No thumbnails yet</h3>
      <p className="text-muted-foreground mb-4 text-center text-sm">
        Create your first AI-generated thumbnail to get started.
      </p>
      <Button asChild>
        <Link to={`/orgs/${orgSlug}/thumbnails/new` as never}>
          <Plus className="mr-2 size-4" />
          New Thumbnail
        </Link>
      </Button>
    </div>
  );
}

function EmptySearchState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
      <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
        <Search className="text-muted-foreground size-6" />
      </div>
      <h3 className="mb-2 font-semibold">No results found</h3>
      <p className="text-muted-foreground text-center text-sm">
        No thumbnails match &quot;{search}&quot;
      </p>
    </div>
  );
}
