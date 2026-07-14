import { api } from "@convex/_generated/api";
import { fetchAuthQueryForRequest } from "@/lib/auth-server";
import { getRequiredSession, type NitroRequestEvent } from "../../_shared/session";

export default async function accountProfile(event: NitroRequestEvent) {
  const session = await getRequiredSession(event);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = await fetchAuthQueryForRequest(event.req, api.app.getProfile, {});

  return Response.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
