import { api } from "@convex/_generated/api";
import { fetchAuthQueryForRequest } from "@/lib/auth-server";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../../_shared/session";
import { getPathParam } from "../../../../_shared/params";

export default async function promptDetail(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);
  const promptId = getPathParam(event.req, 4);

  if (!orgSlug || !promptId) {
    return Response.json({ message: "Missing route parameters" }, { status: 400 });
  }

  const result = await getRequiredOrgForSession(event, orgSlug);
  if (!result.org) {
    return Response.json(
      { message: result.status === 401 ? "Unauthorized" : "Organization not found" },
      { status: result.status },
    );
  }

  const data = await fetchAuthQueryForRequest(event.req, api.app.thumbnailDetail, {
    orgSlug,
    promptId,
  });

  return Response.json(data.prompt);
}
