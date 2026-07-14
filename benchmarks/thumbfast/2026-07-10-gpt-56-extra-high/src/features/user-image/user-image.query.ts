import { useQuery as useConvexQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";

export type UserImage = {
  id: string;
  orgId: string;
  imageUrl: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export const userImageKeys = {
  all: ["user-images"] as const,
  list: (orgSlug: string) => [...userImageKeys.all, "list", orgSlug] as const,
};

const listUserImagesRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  UserImage[]
>("userImages:list");

export async function fetchUserImages(orgSlug: string): Promise<UserImage[]> {
  void orgSlug;
  throw new Error("fetchUserImages has moved to Convex useUserImages");
}

export function useUserImages(orgSlug: string) {
  const data = useConvexQuery(
    listUserImagesRef,
    orgSlug ? { orgSlug } : "skip",
  ) as UserImage[] | undefined;

  return {
    data,
    isLoading: orgSlug ? data === undefined : false,
  };
}
