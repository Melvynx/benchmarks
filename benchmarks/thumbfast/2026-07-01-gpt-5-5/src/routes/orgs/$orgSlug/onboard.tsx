import {
  EmptyState,
  LoadingState,
} from "@/features/organization/loading-state";
import { Onboarding } from "@/features/onboarding/onboarding";
import type { Person } from "@/features/person/person.query";
import { useIsClient } from "@/hooks/use-is-client";
import { useSession } from "@/lib/auth-client";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { api } from "@convex/_generated/api";
import { makeFunctionReference } from "convex/server";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery as useConvexQuery } from "convex/react";
import { useEffect } from "react";

type OnboardingStatus = {
  completedAt: number | null;
  questionsAnsweredAt: number | null;
};

type OnboardingSummary = {
  stats: {
    thumbnailCount: number;
  };
};

type InspirationOption = {
  id: string;
  name: string;
  aiDescription: string;
  thumbnailUrls: string[];
};

type OnboardingDebugContext = {
  status: OnboardingStatus;
  summary: OnboardingSummary;
  persons: Person[];
  inspirations: InspirationOption[];
};

type OnboardingSearch = {
  adminDebug?: boolean;
  step?: string;
  style?: string;
};

const ONBOARDING_STEP_BY_SEARCH = new Map([
  ["person", 1],
  ["add-person", 1],
  ["1", 1],
  ["style", 2],
  ["pick-style", 2],
  ["2", 2],
  ["questions", 3],
  ["about-you", 3],
  ["3", 3],
  ["demo", 4],
  ["value", 4],
  ["4", 4],
  ["trial", 5],
  ["pro-trial", 5],
  ["free-trial", 5],
  ["5", 5],
  ["prompt", 6],
  ["6", 6],
]);

const onboardingStatusRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  OnboardingStatus
>("onboarding:status");

const onboardingInspirationsRef = makeFunctionReference<
  "query",
  { orgSlug: string; limit?: number },
  InspirationOption[]
>("inspiration:onboardingOptions");

const onboardingDebugContextRef = makeFunctionReference<
  "query",
  { orgSlug: string; limit?: number },
  OnboardingDebugContext | null
>("admin/queries:getOnboardingDebugContext");

export const Route = createFileRoute("/orgs/$orgSlug/onboard")({
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => {
    const debugValue = String(search.adminDebug ?? "").toLowerCase();
    const adminDebug =
      search.adminDebug === true || debugValue === "true" || debugValue === "1";

    return {
      adminDebug: adminDebug ? true : undefined,
      step: typeof search.step === "string" ? search.step : undefined,
      style: typeof search.style === "string" ? search.style : undefined,
    };
  },
  errorComponent: OnboardingError,
  component: OrgOnboardRoute,
});

function OrgOnboardRoute() {
  const { orgSlug } = Route.useParams();
  const search = Route.useSearch();
  const session = useSession();
  const isClient = useIsClient();
  const debugRequested = Boolean(search.adminDebug);
  const debugAuthPending = debugRequested && (!isClient || session.isPending);
  const canLoadDebugContext =
    debugRequested && !debugAuthPending && Boolean(session.data?.user);
  const useMemberContext = !debugRequested;
  const memberStatus = useConvexQuery(
    onboardingStatusRef,
    useMemberContext ? { orgSlug } : "skip",
  );
  const memberSummary = useConvexQuery(
    api.app.orgSummary,
    useMemberContext ? { orgSlug } : "skip",
  ) as OnboardingSummary | undefined;
  const memberPersons = useConvexQuery(
    api.app.listPersons,
    useMemberContext ? { orgSlug } : "skip",
  ) as Person[] | undefined;
  const memberInspirations = useConvexQuery(
    onboardingInspirationsRef,
    useMemberContext ? { orgSlug, limit: 9 } : "skip",
  ) as InspirationOption[] | undefined;
  const debugContext = useConvexQuery(
    onboardingDebugContextRef,
    canLoadDebugContext ? { orgSlug, limit: 9 } : "skip",
  ) as OnboardingDebugContext | null | undefined;
  const status = debugRequested ? debugContext?.status : memberStatus;
  const summary = debugRequested ? debugContext?.summary : memberSummary;
  const persons = debugRequested ? debugContext?.persons : memberPersons;
  const inspirations = debugRequested
    ? debugContext?.inspirations
    : memberInspirations;
  const initialDebugStep = search.step
    ? ONBOARDING_STEP_BY_SEARCH.get(search.step.toLowerCase())
    : undefined;

  useEffect(() => {
    if (debugRequested) return;
    if (status?.completedAt || (summary?.stats.thumbnailCount ?? 0) > 0) {
      window.location.replace(`/orgs/${orgSlug}`);
    }
  }, [
    debugRequested,
    orgSlug,
    status?.completedAt,
    summary?.stats.thumbnailCount,
  ]);

  if (debugRequested && !debugAuthPending && !session.data?.user) {
    return <AdminDebugAccessRequired />;
  }

  if (debugContext === null) {
    return <LoadingState label="Organization not found" />;
  }

  if (debugAuthPending || !status || !summary || !persons || !inspirations) {
    return <LoadingState label="Loading onboarding" />;
  }

  if (
    !debugRequested &&
    (status.completedAt || summary.stats.thumbnailCount > 0)
  ) {
    return <LoadingState label="Opening workspace" />;
  }

  return (
    <Onboarding
      orgSlug={orgSlug}
      randomInspirations={inspirations}
      existingPerson={persons[0] ?? null}
      questionsAnswered={Boolean(status.questionsAnsweredAt)}
      debugMode={debugRequested}
      initialDebugStep={initialDebugStep}
    />
  );
}

function AdminDebugAccessRequired() {
  return (
    <main className="bg-background min-h-dvh px-4 py-10">
      <EmptyState
        title="Admin access required"
        description="Sign in with a product admin account to preview onboarding screens."
        action={
          <a
            href="/auth/signin"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
          >
            Sign in
          </a>
        }
      />
    </main>
  );
}

function OnboardingError({ error }: ErrorComponentProps) {
  const message = getUserFacingErrorMessage(error);
  const isUnauthorized = message.toLowerCase().includes("unauthorized");

  if (isUnauthorized) {
    return <AdminDebugAccessRequired />;
  }

  return (
    <main className="bg-background min-h-dvh px-4 py-10">
      <EmptyState
        title="Onboarding unavailable"
        description={message}
        action={
          <a
            href="/"
            className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Go home
          </a>
        }
      />
    </main>
  );
}
