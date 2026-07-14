import { api } from "@convex/_generated/api";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import { getPathParam } from "../../../_shared/params";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../_shared/session";

export default async function updateOrgSlug(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);
  const result = await getRequiredOrgForSession(event, orgSlug);

  if (result.status !== 200) {
    return Response.json({ error: "Not found" }, { status: result.status });
  }

  const body = (await event.req.json()) as { slug?: string };
  const slug = body.slug?.trim().toLowerCase();

  if (!slug) {
    return Response.json({ error: "Slug is required" }, { status: 400 });
  }

  const { org } = await fetchAuthMutationForRequest(
    event.req,
    api.app.updateOrgSlug,
    {
      orgSlug,
      slug,
    },
  );

  return Response.json({ org });
}
