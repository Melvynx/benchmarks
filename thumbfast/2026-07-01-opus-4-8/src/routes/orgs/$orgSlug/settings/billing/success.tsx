import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useAction } from "convex/react";
import type { FunctionReference } from "convex/server";
import { CheckCircle, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

type SuccessSearch = {
  session_id?: string;
};

type CheckoutSessionSummary = {
  type: string;
  credits: number | null;
};

type BillingSuccessApi = {
  billing: {
    getCheckoutSessionSummary: FunctionReference<
      "action",
      "public",
      { orgSlug: string; sessionId?: string },
      CheckoutSessionSummary
    >;
  };
};

const billingSuccessApi = api as unknown as BillingSuccessApi;

export const Route = createFileRoute("/orgs/$orgSlug/settings/billing/success")(
  {
    validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
      session_id:
        typeof search.session_id === "string" ? search.session_id : undefined,
    }),
    component: BillingSuccessRoute,
  },
);

function BillingSuccessRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/billing/success",
  });
  const { session_id: sessionId } = Route.useSearch();
  const getCheckoutSessionSummary = useAction(
    billingSuccessApi.billing.getCheckoutSessionSummary,
  );
  const [summary, setSummary] = useState<CheckoutSessionSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCheckoutSessionSummary({ orgSlug, sessionId }).then((result) => {
      if (!cancelled) setSummary(result);
    });
    return () => {
      cancelled = true;
    };
  }, [getCheckoutSessionSummary, orgSlug, sessionId]);

  const creditsAmount =
    summary?.type === "credit_purchase" ? summary.credits : null;

  if (creditsAmount) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <ImageIcon className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-3xl text-green-600">
              +{creditsAmount} thumbnails
            </CardTitle>
            <CardDescription className="text-lg">
              added to your balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="bg-muted rounded-lg p-4">
                <Typography variant="large" className="mb-2">
                  Did you know?
                </Typography>
                <Typography variant="muted">
                  That's {creditsAmount} thumbnails ready to generate. A
                  designer would charge you around $
                  {Math.round(creditsAmount * 12)} USD for this.
                </Typography>
              </div>
              <div className="flex justify-center gap-4">
                <Button asChild>
                  <Link to="/orgs/$orgSlug/thumbnails/new" params={{ orgSlug }}>
                    Start Creating
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    to="/orgs/$orgSlug/settings/billing"
                    params={{ orgSlug }}
                  >
                    View Balance
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Subscription Successful!</CardTitle>
          <CardDescription>
            Thank you for upgrading your subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-4 pt-4">
            <Button asChild>
              <Link to="/orgs/$orgSlug/settings/billing" params={{ orgSlug }}>
                Manage Subscription
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/orgs/$orgSlug" params={{ orgSlug }}>
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
