import { api } from "@convex/_generated/api";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../../_shared/session";
import { getPathParam } from "../../../../_shared/params";
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().max(100),
});

export default async function updatePromptName(event: NitroRequestEvent) {
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

  const parsed = BodySchema.safeParse(await event.req.json());
  if (!parsed.success) {
    return Response.json({ message: "Invalid prompt name" }, { status: 400 });
  }

  return Response.json(
    await fetchAuthMutationForRequest(event.req, api.app.updatePromptName, {
      orgSlug,
      promptId,
      name: parsed.data.name,
    }),
  );
}
