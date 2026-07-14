import { CustomProviderApiKeysSettings } from "@/features/billing/custom-provider-api-keys-settings";
import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/settings/api-keys")({
  component: ApiKeysRoute,
});

function ApiKeysRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/api-keys",
  });

  return <CustomProviderApiKeysSettings orgSlug={orgSlug} />;
}
