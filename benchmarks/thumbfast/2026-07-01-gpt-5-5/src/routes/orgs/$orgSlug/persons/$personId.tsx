import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { LoadingState } from "@/features/organization/loading-state";
import { useCurrentOrg } from "@/features/organization/current-org-store";
import { PersonForm } from "@/features/person/person-form";
import { PersonPageActions } from "@/features/person/person-page-actions";
import { usePerson } from "@/features/person/person.query";
import Image from "@/compat/image";
import { formatScopedTitle } from "@/lib/metadata";
import { usePageMetadata } from "@/lib/use-page-metadata";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery as useConvexQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { ImageIcon } from "lucide-react";

type PersonThumbnail = {
  id: string;
  promptId: string;
  imageUrl: string;
  createdAt: string;
};

const personThumbnailsRef = makeFunctionReference<
  "query",
  { orgSlug: string; personId: string },
  PersonThumbnail[]
>("app:personThumbnails");

export const Route = createFileRoute("/orgs/$orgSlug/persons/$personId")({
  component: PersonDetailRoute,
});

function PersonDetailRoute() {
  const { orgSlug, personId } = Route.useParams();
  const { data: person, isLoading } = usePerson(orgSlug, personId);
  const currentOrg = useCurrentOrg();
  const thumbnails = useConvexQuery(personThumbnailsRef, {
    orgSlug,
    personId,
  });

  usePageMetadata(
    person
      ? {
          title: formatScopedTitle([person.name, currentOrg?.name ?? orgSlug]),
          description:
            person.description ||
            `Reusable face profile for thumbnail generations in ${currentOrg?.name ?? orgSlug}.`,
          image: person.images[0],
          path: `/orgs/${orgSlug}/persons/${personId}`,
          noIndex: true,
        }
      : null,
  );

  if (isLoading) {
    return <LoadingState label="Loading person" />;
  }

  if (!person) {
    return (
      <Layout size="lg">
        <LayoutHeader>
          <LayoutTitle>Person not found</LayoutTitle>
        </LayoutHeader>
        <LayoutContent>
          <p className="text-muted-foreground text-sm">
            This person does not exist or you do not have access.
          </p>
          <Link
            to={`/orgs/${orgSlug}/persons` as never}
            className={buttonVariants({
              variant: "outline",
              className: "mt-4",
            })}
          >
            Back to Persons
          </Link>
        </LayoutContent>
      </Layout>
    );
  }

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>{person.name}</LayoutTitle>
      </LayoutHeader>
      <LayoutActions>
        <PersonPageActions person={person} orgSlug={orgSlug} />
      </LayoutActions>
      <LayoutContent className="flex flex-col gap-6">
        <PersonForm person={person} orgSlug={orgSlug} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
                <ImageIcon className="text-primary size-4" />
              </div>
              <CardTitle>Thumbnails with {person.name}</CardTitle>
            </div>
            <CardDescription>
              Thumbnails you created featuring this person
            </CardDescription>
          </CardHeader>
          <CardContent>
            {thumbnails === undefined ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="bg-muted aspect-video animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : thumbnails.some((thumbnail) => thumbnail.imageUrl) ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {thumbnails.map((thumbnail) => (
                  <Link
                    key={thumbnail.id}
                    to={
                      `/orgs/${orgSlug}/thumbnails/${thumbnail.promptId}` as never
                    }
                    className="hover:ring-primary group relative aspect-video overflow-hidden rounded-lg border transition-all hover:ring-2"
                  >
                    <Image
                      src={thumbnail.imageUrl}
                      alt="Generated thumbnail"
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ImageIcon className="text-muted-foreground mb-2 size-8" />
                <p className="text-muted-foreground text-sm">
                  No thumbnails created with this person yet.
                </p>
                <Link
                  to="/orgs/$orgSlug/thumbnails/new"
                  params={{ orgSlug }}
                  search={{ persons: person.id }}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "mt-4",
                  })}
                >
                  Create your first
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}
