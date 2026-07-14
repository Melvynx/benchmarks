import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

export type Person = {
  id: string;
  orgId: string;
  name: string;
  description: string;
  images: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export const personKeys = {
  all: ["persons"] as const,
  list: (orgSlug: string) => [...personKeys.all, "list", orgSlug] as const,
  detail: (orgSlug: string, personId: string) =>
    [...personKeys.all, "detail", orgSlug, personId] as const,
};

export function usePersons(orgSlug: string) {
  const data = useQuery(api.app.listPersons, orgSlug ? { orgSlug } : "skip") as
    | Person[]
    | undefined;

  return { data, isLoading: data === undefined };
}

export function usePerson(orgSlug: string, personId: string) {
  const data = useQuery(
    api.app.personDetail,
    orgSlug && personId ? { orgSlug, personId } : "skip",
  ) as Person | undefined;

  return { data, isLoading: data === undefined };
}
