import {
  Layout,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { PersonForm } from "@/features/person/person-form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/persons/new")({
  component: NewPersonRoute,
});

function NewPersonRoute() {
  const { orgSlug } = Route.useParams();

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>New Person</LayoutTitle>
        <LayoutDescription>
          Create a new reusable face for your thumbnail generations.
        </LayoutDescription>
      </LayoutHeader>
      <LayoutContent>
        <PersonForm orgSlug={orgSlug} />
      </LayoutContent>
    </Layout>
  );
}
