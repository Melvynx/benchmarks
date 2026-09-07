import { api } from "@convex/_generated/api";
import { fetchAuthQueryForRequest } from "@/lib/auth-server";
import { getPathParam } from "../../../_shared/params";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../_shared/session";

export default async function orgMembers(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);
  const result = await getRequiredOrgForSession(event, orgSlug);

  if (result.status !== 200) {
    return Response.json({ error: "Not found" }, { status: result.status });
  }

  return Response.json(
    await fetchAuthQueryForRequest(event.req, api.app.listMembers, { orgSlug }),
  );
}
