import { TitleUpdateForm } from "@/components/nowts/title-update-form";
import { DrawingInspirationPage } from "@/features/drawing/drawing-inspiration-page";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InspirationDetailDialog,
  InspirationSourceVideoCard,
} from "@/features/inspiration/inspiration-detail-dialog";
import type { InspirationListItem } from "@/features/inspiration/inspiration.query";
import { useInspiration } from "@/features/inspiration/inspiration.query";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
} from "@/features/page/layout";
import { useCurrentOrg } from "@/features/organization/current-org-store";
import { LoadingState } from "@/features/organization/loading-state";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { formatDate } from "@/lib/format/date";
import { formatScopedTitle } from "@/lib/metadata";
import { usePageMetadata } from "@/lib/use-page-metadata";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  Calendar,
  Edit3,
  ExternalLink,
  ImageIcon,
  Pencil,
  User,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const updateInspirationNameRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; inspirationId: string; name: string },
  { id: string; name: string }
>("inspiration:updateName");

export const Route = createFileRoute(
  "/orgs/$orgSlug/inspirations/$inspirationId",
)({
  validateSearch: (search: Record<string, unknown>): { mode?: "drawing" } => ({
    mode: search.mode === "drawing" ? "drawing" : undefined,
  }),
  component: InspirationDetailRoute,
});

function InspirationDetailRoute() {
  const { orgSlug, inspirationId } = Route.useParams();
  const search = Route.useSearch();
  if (search.mode === "drawing") {
    return (
      <DrawingInspirationPage orgSlug={orgSlug} inspirationId={inspirationId} />
    );
  }

  return (
    <InspirationDetailContent orgSlug={orgSlug} inspirationId={inspirationId} />
  );
}

function InspirationDetailContent({
  orgSlug,
  inspirationId,
}: {
  orgSlug: string;
  inspirationId: string;
}) {
  const currentOrg = useCurrentOrg();
  const { data: inspiration, isLoading } = useInspiration(
    orgSlug,
    inspirationId,
  );
  const updateInspirationName = useConvexMutation(updateInspirationNameRef);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localInspiration, setLocalInspiration] =
    useState<InspirationListItem | null>(null);
  const activeInspiration =
    localInspiration?.id === inspirationId ? localInspiration : inspiration;
  const firstThumbnail = activeInspiration?.thumbnailUrls[0];

  usePageMetadata(
    activeInspiration
      ? {
          title: formatScopedTitle([
            activeInspiration.name,
            currentOrg?.name ?? orgSlug,
          ]),
          description: activeInspiration.aiDescription,
          image: firstThumbnail,
          path: `/orgs/${orgSlug}/inspirations/${inspirationId}`,
          noIndex: true,
        }
      : null,
  );

  if (isLoading || !activeInspiration) {
    return <LoadingState label="Loading inspiration" />;
  }

  const saveTitle = async (name: string) => {
    try {
      await updateInspirationName({ orgSlug, inspirationId, name });
      setLocalInspiration({ ...activeInspiration, name });
      toast.success("Inspiration renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename");
    }
  };

  return (
    <Layout size="lg">
      <LayoutHeader>
        <TitleUpdateForm
          key={`${orgSlug}:${inspirationId}:${activeInspiration.name}`}
          title={activeInspiration.name}
          onUpdate={saveTitle}
        />
      </LayoutHeader>
      <LayoutActions>
        {activeInspiration.isDrawing ? (
          <Link
            href={`/orgs/${orgSlug}/inspirations/${activeInspiration.id}?mode=drawing`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Edit3 className="mr-2 size-4" />
            Edit Drawing
          </Link>
        ) : null}
        <Link
          href={`/orgs/${orgSlug}/thumbnails/new?inspiration=${activeInspiration.id}`}
          className={buttonVariants()}
        >
          Use this inspiration
        </Link>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Pencil className="mr-2 size-4" />
          Edit Reference
        </Button>
      </LayoutActions>

      <LayoutContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2 border-b pb-4">
          {activeInspiration.category ? (
            <Badge variant="secondary">{activeInspiration.category}</Badge>
          ) : null}
          {activeInspiration.isDrawing ? (
            <Badge variant="secondary" className="gap-1">
              <Edit3 size={12} />
              Drawing
            </Badge>
          ) : null}
          <Badge variant="outline" className="gap-1">
            <Calendar size={12} />
            {formatDate(new Date(activeInspiration.createdAt))}
          </Badge>
          <Badge
            variant={activeInspiration.hasPlaceholder ? "secondary" : "outline"}
            className="gap-1"
          >
            {activeInspiration.hasPlaceholder ? (
              <UserX size={12} />
            ) : (
              <User size={12} />
            )}
            {activeInspiration.hasPlaceholder ? "Anonymized" : "Original"}
          </Badge>
          {activeInspiration.youtubeUrl ? (
            <Link
              href={activeInspiration.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Badge variant="outline" className="gap-1" asChild>
                <span>
                  <ExternalLink size={12} />
                  YouTube Source
                </span>
              </Badge>
            </Link>
          ) : null}
        </div>

        {firstThumbnail ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
            <Image
              src={firstThumbnail}
              alt={activeInspiration.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-lg border">
            <ImageIcon className="text-muted-foreground size-12" />
          </div>
        )}

        <InspirationSourceVideoCard inspiration={activeInspiration} />

        {activeInspiration.aiDescription ? (
          <header className="flex flex-col gap-2 border-b pb-6">
            <h2 className="text-sm font-medium">AI Description</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {activeInspiration.aiDescription}
            </p>
          </header>
        ) : null}

        {activeInspiration.thumbnailUrls.length > 1 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {activeInspiration.thumbnailUrls.slice(1).map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="bg-muted relative aspect-video overflow-hidden rounded-lg border"
              >
                <Image
                  src={url}
                  alt={`Thumbnail ${index + 2}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Your Thumbnails</CardTitle>
            <CardDescription>
              Thumbnails you created using this inspiration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground text-sm">
                Create a thumbnail with this inspiration to see it here.
              </p>
              <Link
                href={`/orgs/${orgSlug}/thumbnails/new?inspiration=${activeInspiration.id}`}
                className={buttonVariants({
                  variant: "secondary",
                  size: "sm",
                  className: "mt-4",
                })}
              >
                Create your first
              </Link>
            </div>
          </CardContent>
        </Card>
      </LayoutContent>

      <InspirationDetailDialog
        inspiration={activeInspiration}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentOrgId={currentOrg?.id ?? ""}
        orgSlug={orgSlug}
        onImagesUpdated={(thumbnailUrls) => {
          setLocalInspiration({ ...activeInspiration, thumbnailUrls });
        }}
        onInspirationCopied={(newInspiration) => {
          setLocalInspiration(newInspiration);
        }}
        onInspirationAnonymized={(updatedInspiration) => {
          setLocalInspiration(updatedInspiration);
        }}
      />
    </Layout>
  );
}
