import { api } from "@convex/_generated/api";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import { getRequiredSession, type NitroRequestEvent } from "../../_shared/session";

export default async function updateAccountProfile(event: NitroRequestEvent) {
  const session = await getRequiredSession(event);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await event.req.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const { user } = await fetchAuthMutationForRequest(event.req, api.app.updateProfile, { name });

  return Response.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
