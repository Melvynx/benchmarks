import { buttonVariants } from "@/components/ui/button";
import { EditorForm } from "@/features/editor/editor-form";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "lucide-react";

type NewThumbnailSearch = {
  inspiration?: string;
  persons?: string;
  editImage?: string;
  editThumbnailId?: string;
  autoGenerate?: boolean;
};

export const Route = createFileRoute("/orgs/$orgSlug/thumbnails/new")({
  validateSearch: (search: Record<string, unknown>): NewThumbnailSearch => ({
    inspiration:
      typeof search.inspiration === "string" ? search.inspiration : undefined,
    persons: typeof search.persons === "string" ? search.persons : undefined,
    editImage:
      typeof search.editImage === "string" ? search.editImage : undefined,
    editThumbnailId:
      typeof search.editThumbnailId === "string"
        ? search.editThumbnailId
        : undefined,
    autoGenerate:
      search.autoGenerate === true || search.autoGenerate === "true"
        ? true
        : undefined,
  }),
  component: NewThumbnailRoute,
});

function NewThumbnailRoute() {
  const { orgSlug } = Route.useParams();
  const search = Route.useSearch();
  const initialPersonIds = search.persons
    ?.split(",")
    .map((personId) => personId.trim())
    .filter(Boolean);

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>New Thumbnail</LayoutTitle>
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
          initialInspirationId={search.inspiration}
          initialPersonIds={initialPersonIds}
          initialEditImage={search.editImage}
          initialEditThumbnailId={search.editThumbnailId}
          autoGenerate={search.autoGenerate}
        />
      </LayoutContent>
    </Layout>
  );
}
