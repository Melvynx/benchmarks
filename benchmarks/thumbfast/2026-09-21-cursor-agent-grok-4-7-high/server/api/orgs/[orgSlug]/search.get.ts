import { api } from "@convex/_generated/api";
import { fetchAuthQueryForRequest } from "@/lib/auth-server";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../_shared/session";
import { getPathParam } from "../../../_shared/params";

function matchesQuery(values: (string | null | undefined)[], query: string) {
  if (!query) return true;
  return values.some((value) => value?.toLowerCase().includes(query));
}

export default async function search(event: NitroRequestEvent) {
  const url = new URL(event.req.url);
  const orgSlug = getPathParam(event.req, 2);
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 5), 20);

  if (!orgSlug) {
    return Response.json(
      { message: "Missing organization slug" },
      { status: 400 },
    );
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

  const [persons, inspirations, userImages] = await Promise.all([
    fetchAuthQueryForRequest(event.req, api.app.listPersons, { orgSlug }),
    fetchAuthQueryForRequest(event.req, api.app.listInspirations, { orgSlug }),
    fetchAuthQueryForRequest(event.req, api.app.listUserImages, { orgSlug }),
  ]);

  return Response.json({
    persons: persons
      .filter((person) =>
        matchesQuery([person.name, person.description], query),
      )
      .slice(0, limit),
    inspirations: inspirations.items
      .filter((inspiration) =>
        matchesQuery(
          [inspiration.name, inspiration.aiDescription, inspiration.category],
          query,
        ),
      )
      .slice(0, limit),
    userImages: userImages
      .filter((image) => matchesQuery([image.name, image.description], query))
      .slice(0, limit),
  });
}
