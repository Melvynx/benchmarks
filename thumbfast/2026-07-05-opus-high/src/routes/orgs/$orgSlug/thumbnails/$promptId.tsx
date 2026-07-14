import { TitleUpdateForm } from "@/components/nowts/title-update-form";
import { buttonVariants } from "@/components/ui/button";
import { EditorForm } from "@/features/editor/editor-form";
import type { PromptWithRelations } from "@/features/editor/editor.query";
import { usePrompt } from "@/features/editor/editor.query";
import { useCurrentOrg } from "@/features/organization/current-org-store";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
} from "@/features/page/layout";
import { LoadingState } from "@/features/organization/loading-state";
import { formatScopedTitle } from "@/lib/metadata";
import { usePageMetadata } from "@/lib/use-page-metadata";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Image } from "lucide-react";
import { toast } from "sonner";

type ThumbnailDetailSearch = {
  autoGenerate?: boolean;
};

const updatePromptNameRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; promptId: string; name: string },
  { id: string; name: string }
>("editor:updatePromptName");

export const Route = createFileRoute("/orgs/$orgSlug/thumbnails/$promptId")({
  validateSearch: (search: Record<string, unknown>): ThumbnailDetailSearch => ({
    autoGenerate:
      search.autoGenerate === true || search.autoGenerate === "true"
        ? true
        : undefined,
  }),
  component: PromptDetailRoute,
});

function PromptDetailRoute() {
  const { orgSlug, promptId } = Route.useParams();
  const search = Route.useSearch();
  const { data: prompt, isLoading } = usePrompt(orgSlug, promptId);
  const currentOrg = useCurrentOrg();
  const updatePromptName = useConvexMutation(updatePromptNameRef);
  const title = prompt?.name ?? "Thumbnail";

  usePageMetadata(
    prompt
      ? {
          title: formatScopedTitle([title, currentOrg?.name ?? orgSlug]),
          description: prompt.textPrompt,
          image: getPromptPreviewImage(prompt),
          path: `/orgs/${orgSlug}/thumbnails/${promptId}`,
          noIndex: true,
        }
      : null,
  );

  if (isLoading || !prompt) {
    return <LoadingState label="Loading thumbnail" />;
  }

  const saveTitle = async (name: string) => {
    try {
      await updatePromptName({ orgSlug, promptId, name });
      toast.success("Thumbnail renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename");
    }
  };

  return (
    <Layout size="lg">
      <LayoutHeader>
        <TitleUpdateForm
          key={`${orgSlug}:${promptId}:${title}`}
          title={title}
          onUpdate={saveTitle}
        />
      </LayoutHeader>
      <LayoutActions>
        <Link
          to={`/orgs/${orgSlug}/thumbnails` as never}
          className={buttonVariants({ variant: "outline" })}
        >
          <Image className="mr-2 size-4" />
          All Thumbnails
        </Link>
      </LayoutActions>
      <LayoutContent>
        <EditorForm
          orgSlug={orgSlug}
          initialPrompt={prompt}
          autoGenerate={search.autoGenerate}
        />
      </LayoutContent>
    </Layout>
  );
}

function getPromptPreviewImage(prompt: PromptWithRelations) {
  const generatedThumbnail = prompt.generations
    .flatMap((generation) => generation.thumbnails)
    .find((thumbnail) => thumbnail.imageUrl);
  if (generatedThumbnail?.imageUrl) return generatedThumbnail.imageUrl;

  const userImage = prompt.userImages.at(0);
  return userImage ? userImage.imageUrl : null;
}
