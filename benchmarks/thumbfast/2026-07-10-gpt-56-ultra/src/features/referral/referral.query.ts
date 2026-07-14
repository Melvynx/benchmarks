import { api } from "@convex/_generated/api";
import { useQuery as useConvexQuery } from "convex/react";

export type ReferralMeResponse = {
  code: string;
  link: string;
  stats: {
    total: number;
    pending: number;
    credited: number;
  };
  settings: {
    creditsPerReferral: number;
  };
};

export const referralKeys = {
  all: ["referral"] as const,
  me: (orgSlug: string) => [...referralKeys.all, "me", orgSlug] as const,
};

export async function fetchReferralMe(orgSlug: string) {
  void orgSlug;
  throw new Error("fetchReferralMe has moved to Convex useReferralMe");
}

export function useReferralMe(orgSlug: string) {
  const data = useConvexQuery(
    api.app.getReferralMe,
    orgSlug ? { orgSlug } : "skip",
  );

  return { data, isLoading: orgSlug ? data === undefined : false };
}
