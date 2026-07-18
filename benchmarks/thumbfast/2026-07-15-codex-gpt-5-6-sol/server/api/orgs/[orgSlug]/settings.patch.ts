import { api } from "@convex/_generated/api";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import { getPathParam } from "../../../_shared/params";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../_shared/session";

export default async function updateOrgSettings(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);
  const result = await getRequiredOrgForSession(event, orgSlug);

  if (result.status !== 200) {
    return Response.json({ error: "Not found" }, { status: result.status });
  }

  const body = (await event.req.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const { org } = await fetchAuthMutationForRequest(
    event.req,
    api.app.updateOrgName,
    {
      orgSlug,
      name,
    },
  );

  return Response.json({ org });
}
