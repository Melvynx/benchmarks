import { api } from "@convex/_generated/api";
import { fetchAuthQueryForRequest } from "@/lib/auth-server";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../../_shared/session";
import { getPathParam } from "../../../../_shared/params";

export default async function personDetail(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);
  const personId = getPathParam(event.req, 4);

  if (!orgSlug || !personId) {
    return Response.json({ message: "Missing person" }, { status: 400 });
  }

  const result = await getRequiredOrgForSession(event, orgSlug);

  if (!result.org) {
    return Response.json(
      {
        message:
          result.status === 401 ? "Unauthorized" : "Organization not found",
      },
      { status: result.status },
    );
  }

  return Response.json(
    await fetchAuthQueryForRequest(event.req, api.app.personDetail, {
      orgSlug,
      personId,
    }),
  );
}
