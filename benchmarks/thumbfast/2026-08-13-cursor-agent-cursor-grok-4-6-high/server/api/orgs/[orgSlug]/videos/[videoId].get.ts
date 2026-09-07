import { fetchAuthQueryForRequest } from "@/lib/auth-server";
import { makeFunctionReference } from "convex/server";
import { getPathParam } from "../../../../_shared/params";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../../_shared/session";

const videoDetailRef = makeFunctionReference<
  "query",
  { orgSlug: string; videoId: string },
  unknown
>("video:detail");

export default async function videoDetail(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);
  const videoId = getPathParam(event.req, 4);

  if (!orgSlug || !videoId) {
    return Response.json({ message: "Missing video" }, { status: 400 });
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
    await fetchAuthQueryForRequest(event.req, videoDetailRef, {
      orgSlug,
      videoId,
    }),
  );
}
