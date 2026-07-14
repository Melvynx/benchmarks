import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

export type CreditTransaction = {
  id?: string;
  orgId?: string;
  amount: number;
  type: string;
  createdAt: string | Date;
};

export type CreditsResponse = {
  plan: string;
  balance: number;
  transactions: CreditTransaction[];
  maxGenerations: number;
  gptImageAccess: boolean;
  apiKeyMode: "disabled" | "fallback" | "required";
  hasCustomApiKeys: {
    openai: boolean;
    gemini: boolean;
    apiyi: boolean;
  };
};

export const creditKeys = {
  all: ["credits"] as const,
  balance: (orgSlug: string) =>
    [...creditKeys.all, "balance", orgSlug] as const,
};

export async function fetchCredits(orgSlug: string): Promise<CreditsResponse> {
  void orgSlug;
  throw new Error("fetchCredits has moved to Convex useCredits");
}

export function useCredits(orgSlug: string) {
  const data = useQuery(api.app.getCredits, orgSlug ? { orgSlug } : "skip") as
    | CreditsResponse
    | undefined;

  return { data, isLoading: data === undefined };
}
