import { Skeleton } from "@/components/ui/skeleton";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { CreatePersonDialog } from "@/features/person/create-person-dialog";
import { PersonCard } from "@/features/person/person-card";
import { PersonHelpButton } from "@/features/person/person-help-button";
import { usePersons } from "@/features/person/person.query";
import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";

export const Route = createFileRoute("/orgs/$orgSlug/persons/")({
  component: PersonsRoute,
});

function PersonsRoute() {
  const { orgSlug } = Route.useParams();
  const { data: persons, isLoading } = usePersons(orgSlug);

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Persons</LayoutTitle>
        <LayoutDescription>
          Create and manage reusable faces for your thumbnail generations.
        </LayoutDescription>
      </LayoutHeader>
      <LayoutActions>
        <PersonHelpButton />
        <CreatePersonDialog />
      </LayoutActions>
      <LayoutContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton
                key={item}
                className="aspect-[2/3] w-full rounded-2xl"
              />
            ))}
          </div>
        ) : !persons || persons.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {persons.map((person) => (
              <PersonCard key={person.id} person={person} orgSlug={orgSlug} />
            ))}
          </div>
        )}
      </LayoutContent>
    </Layout>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
      <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
        <User className="text-muted-foreground size-6" />
      </div>
      <h3 className="mb-2 font-semibold">No persons yet</h3>
      <p className="text-muted-foreground mb-4 text-center text-sm">
        Create your first person to use in thumbnail generation.
      </p>
      <CreatePersonDialog />
    </div>
  );
}
