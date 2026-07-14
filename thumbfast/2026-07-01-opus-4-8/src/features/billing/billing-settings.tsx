import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingButton } from "@/features/form/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AUTH_PLANS,
  CREDIT_PACKS,
  getPlanFeatures,
  type AppAuthPlan,
} from "@/lib/auth/stripe/auth-plans";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { isPlanRequiringCustomApiKeys } from "@/lib/validation/plan-validation";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { FunctionReference } from "convex/server";
import { useAction, useQuery } from "convex/react";
import {
  Check,
  Download,
  ExternalLink,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Star,
  WalletCards,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import type React from "react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";

type BillingView =
  | "credits"
  | "history"
  | "logs"
  | "usage"
  | "plan"
  | "payment";

type CreditTransaction = {
  id: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
};

const CREDIT_HISTORY_PREVIEW_LIMIT = 5;
const CREDIT_LOGS_PAGE_SIZE = 25;

type BillingSummary = {
  subscription: {
    plan?: string;
    status?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    periodEnd?: number;
    cancelAtPeriodEnd?: boolean;
  } | null;
  plan: string;
  limits: { credits: number };
  credits: {
    balance: number;
    transactions: CreditTransaction[];
  };
};

type CreditTransactionsPage = {
  transactions: CreditTransaction[];
  continueCursor: string | null;
  isDone: boolean;
};

type PaymentSummary = {
  invoices: {
    id: string;
    number: string | null;
    status: string | null;
    amountPaid: number;
    amountDue: number;
    currency: string;
    created: number;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
  }[];
  upcomingInvoice: {
    amountDue: number;
    currency: string;
    periodStart: number | null;
    periodEnd: number | null;
  } | null;
};

type BillingApi = {
  billing: {
    getBillingSummary: FunctionReference<
      "query",
      "public",
      { orgSlug: string },
      BillingSummary
    >;
    upgradeOrg: FunctionReference<
      "action",
      "public",
      {
        orgSlug: string;
        plan: string;
        annual: boolean;
        successUrl: string;
        cancelUrl: string;
        offer?: "onboarding_trial";
      },
      { url: string }
    >;
    openStripePortal: FunctionReference<
      "action",
      "public",
      { orgSlug: string; returnUrl: string },
      { url: string }
    >;
    purchaseCredits: FunctionReference<
      "action",
      "public",
      {
        orgSlug: string;
        packId: string;
        successUrl: string;
        cancelUrl: string;
      },
      { url: string }
    >;
    getPaymentSummary: FunctionReference<
      "action",
      "public",
      { orgSlug: string },
      PaymentSummary
    >;
    listCreditTransactions: FunctionReference<
      "query",
      "public",
      {
        orgSlug: string;
        cursor?: string | null;
        limit?: number;
      },
      CreditTransactionsPage
    >;
  };
};

const billingApi = api as unknown as BillingApi;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  trialing: { label: "Trial", color: "bg-blue-500" },
  active: { label: "Active", color: "bg-green-500" },
  lifetime: { label: "Lifetime", color: "bg-green-500" },
  canceled: { label: "Canceled", color: "bg-orange-500" },
  past_due: { label: "Past Due", color: "bg-red-500" },
  unpaid: { label: "Unpaid", color: "bg-red-500" },
  incomplete: { label: "Incomplete", color: "bg-yellow-500" },
};

const usageChartConfig = {
  tokens: {
    label: "Tokens Used",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function BillingSettings({
  orgSlug,
  view = "credits",
}: {
  orgSlug: string;
  view?: BillingView;
}) {
  const location = useLocation();
  const summary = useQuery(billingApi.billing.getBillingSummary, { orgSlug });
  const openStripePortal = useAction(billingApi.billing.openStripePortal);
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const result = await openStripePortal({
        orgSlug,
        returnUrl: location.pathname,
      });
      window.location.assign(result.url);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Billing portal failed"));
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="h2">Thumbnails</Typography>
          <Typography variant="muted">
            Manage your thumbnail generation balance
          </Typography>
        </div>
        <LoadingButton
          variant="outline"
          onClick={() => void openPortal()}
          loading={portalLoading}
        >
          <ExternalLink className="size-4" />
          Manage Billing
        </LoadingButton>
      </div>

      <Tabs value={view}>
        <TabsList>
          <TabsTrigger value="credits" asChild>
            <Link to="/orgs/$orgSlug/settings/billing" params={{ orgSlug }}>
              Thumbnails
            </Link>
          </TabsTrigger>
          <TabsTrigger value="history" asChild>
            <Link
              to="/orgs/$orgSlug/settings/billing/history"
              params={{ orgSlug }}
            >
              History
            </Link>
          </TabsTrigger>
          <TabsTrigger value="logs" asChild>
            <Link
              to="/orgs/$orgSlug/settings/billing/logs"
              params={{ orgSlug }}
            >
              Logs
            </Link>
          </TabsTrigger>
          <TabsTrigger value="usage" asChild>
            <Link
              to="/orgs/$orgSlug/settings/billing/usage"
              params={{ orgSlug }}
            >
              Usage
            </Link>
          </TabsTrigger>
          <TabsTrigger value="plan" asChild>
            <Link
              to="/orgs/$orgSlug/settings/billing/plan"
              params={{ orgSlug }}
            >
              Plans
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {!summary ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      ) : view === "usage" ? (
        <UsageTab summary={summary} />
      ) : view === "plan" ? (
        <PlanTab orgSlug={orgSlug} summary={summary} />
      ) : view === "payment" ? (
        <PaymentTab
          orgSlug={orgSlug}
          hasCustomer={Boolean(summary.subscription?.stripeCustomerId)}
        />
      ) : view === "history" ? (
        <CreditHistoryTab orgSlug={orgSlug} summary={summary} />
      ) : view === "logs" ? (
        <CreditLogsTab orgSlug={orgSlug} />
      ) : (
        <CreditsTab orgSlug={orgSlug} summary={summary} />
      )}
    </div>
  );
}

function CreditHistoryTab({
  orgSlug,
  summary,
}: {
  orgSlug: string;
  summary: BillingSummary;
}) {
  const transactions = summary.credits.transactions.slice(
    0,
    CREDIT_HISTORY_PREVIEW_LIMIT,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent credits</CardTitle>
        <CardDescription>
          Last {CREDIT_HISTORY_PREVIEW_LIMIT} credit changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-sm">
                  No credit history yet.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="capitalize">{transaction.type}</TableCell>
                  <TableCell
                    className={
                      transaction.amount > 0 ? "text-emerald-500" : "text-red-500"
                    }
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount}
                  </TableCell>
                  <TableCell>{transaction.reason}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex justify-end">
          <Link
            to="/orgs/$orgSlug/settings/billing/logs"
            params={{ orgSlug }}
            className={buttonVariants({ variant: "outline" })}
          >
            View all logs
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CreditsTab({
  orgSlug,
  summary,
}: {
  orgSlug: string;
  summary: BillingSummary;
}) {
  const isPowerUser = isPlanRequiringCustomApiKeys(summary.plan);
  const hasPaidSubscription = Boolean(
    summary.subscription?.status &&
    ["active", "trialing", "lifetime"].includes(summary.subscription.status) &&
    summary.plan !== "free",
  );

  if (isPowerUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Power User Plan
          </CardTitle>
          <CardDescription>
            Your lifetime plan uses your own API keys for all generations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            to="/orgs/$orgSlug/settings/api-keys"
            params={{ orgSlug }}
            className={buttonVariants({ variant: "default" })}
          >
            Manage API Keys
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!hasPaidSubscription) {
    return (
      <div className="flex flex-col gap-6">
        <CreditsBalanceCard summary={summary} />
        <SubscriptionUpsellCard orgSlug={orgSlug} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <CreditsBalanceCard summary={summary} />
      <BuyCreditsCard orgSlug={orgSlug} />
    </div>
  );
}

function CreditLogsTab({ orgSlug }: { orgSlug: string }) {
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const logs = useQuery(billingApi.billing.listCreditTransactions, {
    orgSlug,
    cursor: cursorStack.at(-1) ?? null,
    limit: CREDIT_LOGS_PAGE_SIZE,
  });

  if (!logs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit logs</CardTitle>
          <CardDescription>Loading all credit history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-52" />
        </CardContent>
      </Card>
    );
  }

  const canGoPrevious = cursorStack.length > 0;
  const canGoNext = Boolean(logs.continueCursor) && logs.isDone === false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit logs</CardTitle>
        <CardDescription>
          Full history of credit additions and deductions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground text-sm"
                >
                  No credit logs to show.
                </TableCell>
              </TableRow>
            ) : (
              logs.transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="capitalize">{transaction.type}</TableCell>
                  <TableCell
                    className={
                      transaction.amount > 0 ? "text-emerald-500" : "text-red-500"
                    }
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount}
                  </TableCell>
                  <TableCell>{transaction.reason}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void setCursorStack((stack) => stack.slice(0, -1))}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextCursor = logs.continueCursor;
              if (!nextCursor) return;
              setCursorStack((stack) => [...stack, nextCursor]);
            }}
            disabled={!canGoNext}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreditsBalanceCard({ summary }: { summary: BillingSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="size-5" />
          Thumbnail Balance
        </CardTitle>
        <CardDescription>
          Available thumbnails for AI generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold">
          {Math.round(summary.credits.balance * 10) / 10}
        </div>
        <p className="text-muted-foreground text-sm">
          Thumbnails remaining in your organization balance.
        </p>
      </CardContent>
    </Card>
  );
}

function SubscriptionUpsellCard({ orgSlug }: { orgSlug: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Need more thumbnails?</CardTitle>
        <CardDescription>
          Upgrade to Pro or Ultra to get monthly thumbnail credits and custom
          API key fallback.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          to="/orgs/$orgSlug/settings/billing/plan"
          params={{ orgSlug }}
          className={buttonVariants({ variant: "default" })}
        >
          View Plans
        </Link>
      </CardContent>
    </Card>
  );
}

function BuyCreditsCard({ orgSlug }: { orgSlug: string }) {
  const purchaseCredits = useAction(billingApi.billing.purchaseCredits);
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  const purchase = async (packId: string) => {
    setLoadingPackId(packId);
    try {
      const result = await purchaseCredits({
        orgSlug,
        packId,
        successUrl: `/orgs/${orgSlug}/settings/billing/success`,
        cancelUrl: `/orgs/${orgSlug}/settings/billing`,
      });
      window.location.assign(result.url);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Purchase failed"));
    } finally {
      setLoadingPackId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy Thumbnails</CardTitle>
        <CardDescription>
          Purchase additional thumbnails for generation
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {CREDIT_PACKS.map((pack, index) => {
          const isBestValue = index === CREDIT_PACKS.length - 1;
          return (
            <div
              key={pack.id}
              className={cn(
                "relative flex flex-col gap-2 rounded-lg border p-4",
                isBestValue && "border-foreground",
              )}
            >
              {isBestValue ? (
                <div className="bg-foreground text-background absolute -top-2.5 left-3 rounded-full px-2 py-0.5 text-xs font-medium">
                  Best Value
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <Typography variant="large" className="font-semibold">
                  {pack.credits} thumbnails
                </Typography>
                <Typography variant="h3" className="font-bold">
                  ${pack.price.toFixed(2)}
                </Typography>
              </div>
              <div className="flex items-center justify-between">
                <Typography variant="muted" className="text-xs">
                  ${pack.pricePerCredit.toFixed(3)}/thumbnail
                </Typography>
                <Button
                  size="sm"
                  variant={isBestValue ? "default" : "outline"}
                  onClick={() => void purchase(pack.id)}
                  disabled={loadingPackId !== null}
                >
                  {loadingPackId === pack.id ? "Opening..." : "Buy"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PlanTab({
  orgSlug,
  summary,
}: {
  orgSlug: string;
  summary: BillingSummary;
}) {
  const currentPlanName = summary.plan;
  const isPowerUser = currentPlanName === "poweruser";
  const currentPlan =
    AUTH_PLANS.find((plan) => plan.name === currentPlanName) ?? AUTH_PLANS[0];
  const currentPrice = currentPlan.price;
  const recurringPlans = AUTH_PLANS.filter(
    (plan) => !plan.isHidden && !plan.isLifetime,
  );
  const lifetimePlan = AUTH_PLANS.find(
    (plan) => !plan.isHidden && plan.isLifetime,
  );
  const statusConfig = summary.subscription?.status
    ? STATUS_CONFIG[summary.subscription.status]
    : null;
  const hasActiveSubscription = Boolean(
    summary.subscription?.status &&
    ["active", "trialing", "lifetime"].includes(summary.subscription.status),
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 lg:flex-row">
        <CardHeader className="h-full flex-1 items-start">
          <div className="flex items-center gap-2">
            <CardTitle className="capitalize">{currentPlan.name}</CardTitle>
            {statusConfig ? (
              <Badge variant="outline" className="gap-1.5">
                <span
                  className={cn("size-1.5 rounded-full", statusConfig.color)}
                  aria-hidden="true"
                />
                {statusConfig.label}
              </Badge>
            ) : null}
          </div>
          <Button disabled>Current plan</Button>
        </CardHeader>
        <CardContent className="flex-2">
          <ul className="flex flex-col gap-2">
            {getFullPlanFeatures(currentPlan).map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="text-primary size-4 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recurringPlans.length > 0 ? (
        <div className="flex flex-col gap-5">
          <div>
            <Typography variant="h3" className="font-semibold">
              Available Plans
            </Typography>
            <Typography variant="muted" className="mt-1">
              {isPowerUser
                ? "Your lifetime plan is locked, but you can still compare every plan."
                : "Compare every plan and manage upgrades or downgrades."}
            </Typography>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black p-4 text-white shadow-sm md:p-6">
            <div className="mx-auto grid max-w-sm items-center gap-0 lg:max-w-none lg:grid-cols-3">
              {recurringPlans.map((plan) => {
                const isCurrentPlan = plan.name === currentPlanName;
                const label = isCurrentPlan
                  ? "Current plan"
                  : isPowerUser
                    ? "Plan locked"
                    : plan.price > currentPrice
                      ? "Upgrade"
                      : plan.price < currentPrice
                        ? "Downgrade"
                        : "Change Plan";

                return (
                  <SimplePricingCard
                    key={plan.name}
                    plan={plan}
                    isCurrent={isCurrentPlan}
                    action={
                      <PlanCardAction
                        orgSlug={orgSlug}
                        label={label}
                        planName={plan.name}
                        hasActiveSubscription={hasActiveSubscription}
                        disabled={isCurrentPlan || isPowerUser}
                        className={
                          plan.isPopular
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                        }
                        variant={plan.isPopular ? "default" : "outline"}
                      />
                    }
                  />
                );
              })}
            </div>

            {lifetimePlan ? (
              <LifetimePlanStrip
                plan={lifetimePlan}
                action={
                  <PlanCardAction
                    orgSlug={orgSlug}
                    label={
                      lifetimePlan.name === currentPlanName
                        ? "Current plan"
                        : isPowerUser
                          ? "Plan locked"
                          : "Buy Lifetime"
                    }
                    planName={lifetimePlan.name}
                    hasActiveSubscription={hasActiveSubscription}
                    isLifetime={lifetimePlan.isLifetime}
                    disabled={
                      lifetimePlan.name === currentPlanName || isPowerUser
                    }
                    className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                    variant="outline"
                  />
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getFullPlanFeatures(plan: AppAuthPlan) {
  const features = getPlanFeatures(plan).filter(Boolean);
  if (plan.isLifetime) {
    features.push("Unlimited thumbnails with your own API key");
  } else if (plan.name !== "free") {
    features.push(
      "Unlimited thumbnails with your API key after credits run out",
    );
  }
  return features;
}

function SimplePricingCard({
  plan,
  isCurrent = false,
  action,
}: {
  plan: AppAuthPlan;
  isCurrent?: boolean;
  action: React.ReactNode;
}) {
  const isPopular = Boolean(plan.isPopular);

  return (
    <div
      className={cn(
        "relative flex min-h-[520px] flex-col border p-7 md:p-8",
        isPopular
          ? "z-10 rounded-2xl border-white/20 bg-white py-10 text-black shadow-2xl lg:-mx-1"
          : "rounded-xl border-white/10 bg-white/5 text-white",
        isCurrent && !isPopular && "border-primary/70",
      )}
    >
      {isPopular ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="bg-primary flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
            <Star className="size-3 fill-current" />
            Most Popular
          </div>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold capitalize">{plan.name}</h3>
          <p
            className={cn(
              "mt-1 text-sm",
              isPopular ? "text-black/60" : "text-white/50",
            )}
          >
            {plan.description}
          </p>
        </div>
        {isCurrent ? (
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              isPopular
                ? "border-black/10 text-black"
                : "border-white/15 text-white",
            )}
          >
            Current
          </Badge>
        ) : null}
      </div>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold">${plan.price}</span>
        {plan.price > 0 ? (
          <span className={isPopular ? "text-black/40" : "text-white/40"}>
            /month
          </span>
        ) : null}
      </div>

      <ul className="mt-8 flex-1 space-y-3">
        {getFullPlanFeatures(plan).map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <Check className="text-primary mt-0.5 size-4 shrink-0" />
            <span className={isPopular ? "text-black/70" : "text-white/70"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8">{action}</div>
    </div>
  );
}

function LifetimePlanStrip({
  plan,
  action,
}: {
  plan: AppAuthPlan;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-5 rounded-xl border border-white/10 bg-white/5 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <KeyRound className="size-4 text-white/50" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-base font-semibold">Poweruser</h3>
            <span className="text-sm text-white/35">Lifetime access</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            {plan.description}
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-white/65 sm:grid-cols-2">
            {getFullPlanFeatures(plan)
              .slice(0, 4)
              .map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="text-primary size-4 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">${plan.price}</span>
          <span className="text-sm text-white/40">one-time</span>
        </div>
        <div className="w-full sm:w-44">{action}</div>
      </div>
    </div>
  );
}

function PlanCardAction({
  orgSlug,
  label,
  planName,
  hasActiveSubscription,
  isLifetime = false,
  disabled = false,
  className,
  variant = "default",
}: {
  orgSlug: string;
  label: string;
  planName: string;
  hasActiveSubscription: boolean;
  isLifetime?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const location = useLocation();
  const upgradeOrg = useAction(billingApi.billing.upgradeOrg);
  const openStripePortal = useAction(billingApi.billing.openStripePortal);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result =
        hasActiveSubscription && !isLifetime
          ? await openStripePortal({
              orgSlug,
              returnUrl: location.pathname,
            })
          : await upgradeOrg({
              orgSlug,
              plan: planName,
              annual: false,
              successUrl: `/orgs/${orgSlug}/settings/billing/success`,
              cancelUrl: location.pathname,
            });
      window.location.assign(result.url);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Unable to manage plan"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className={cn("w-full", className)}
      variant={variant}
      onClick={() => void handleClick()}
      disabled={disabled || isLoading}
    >
      {isLoading ? "Opening..." : label}
    </Button>
  );
}

function UsageTab({ summary }: { summary: BillingSummary }) {
  const periodStart = new Date();
  periodStart.setUTCDate(periodStart.getUTCDate() - 29);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date();
  periodEnd.setUTCHours(23, 59, 59, 999);
  const subscriptionPeriodEnd = summary.subscription?.periodEnd
    ? new Date(summary.subscription.periodEnd)
    : null;
  const monthlyCredits =
    summary.plan === "free" ? null : summary.limits.credits;
  const usedCredits =
    monthlyCredits === null
      ? 0
      : Math.max(0, monthlyCredits - summary.credits.balance);
  const progress =
    monthlyCredits && monthlyCredits > 0
      ? Math.min(100, Math.round((usedCredits / monthlyCredits) * 100))
      : 0;
  const usageByDay = new Map<string, number>();

  for (let index = 0; index < 30; index += 1) {
    const date = new Date(periodStart);
    date.setUTCDate(periodStart.getUTCDate() + index);
    usageByDay.set(date.toISOString().slice(0, 10), 0);
  }

  for (const transaction of summary.credits.transactions) {
    if (transaction.amount >= 0) continue;
    const date = new Date(transaction.createdAt).toISOString().slice(0, 10);
    if (!usageByDay.has(date)) continue;
    usageByDay.set(
      date,
      (usageByDay.get(date) ?? 0) + Math.abs(transaction.amount),
    );
  }
  const usageData = Array.from(usageByDay.entries()).map(([date, tokens]) => ({
    date,
    tokens,
  }));
  const totalTokensUsed = usageData.reduce(
    (total, day) => total + day.tokens,
    0,
  );
  const formattedPeriod = `${periodStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${periodEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Credits policy</CardTitle>
          <CardDescription>
            How your current plan uses monthly and purchased thumbnails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Plan" value={summary.plan} />
            <Metric
              label="Monthly thumbnails"
              value={monthlyCredits ?? "None"}
            />
            <Metric
              label="Renews"
              value={
                subscriptionPeriodEnd
                  ? subscriptionPeriodEnd.toLocaleDateString()
                  : "No renewal"
              }
            />
          </div>
          {monthlyCredits ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{usedCredits} used</span>
                <span>{monthlyCredits} included</span>
              </div>
              <Progress value={progress} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-6">
            <CardTitle>Token Usage</CardTitle>
            <CardDescription>Billing period: {formattedPeriod}</CardDescription>
          </div>
          <div className="flex">
            <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
              <Typography variant="muted" className="text-xs">
                Tokens Used
              </Typography>
              <Typography variant="h2" className="font-bold">
                {totalTokensUsed.toLocaleString()}
              </Typography>
              <Typography
                variant="small"
                className="text-muted-foreground pt-1"
              >
                Balance: {summary.credits.balance.toLocaleString()}
              </Typography>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={usageChartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <BarChart
              accessibilityLayer
              data={usageData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) =>
                  new Date(String(value)).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <ChartTooltip
                content={(props) => <ChartTooltipContent {...props} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="tokens"
                fill="var(--color-tokens)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}

function PaymentTab({
  orgSlug,
  hasCustomer,
}: {
  orgSlug: string;
  hasCustomer: boolean;
}) {
  const getPaymentSummary = useAction(billingApi.billing.getPaymentSummary);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      setPaymentSummary(await getPaymentSummary({ orgSlug }));
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Payment history failed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasCustomer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            Payment history appears after you start a paid plan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!paymentSummary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            View your invoices and payment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void loadPayments()} disabled={isLoading}>
            <WalletCards className="size-4" />
            {isLoading ? "Loading..." : "Load payment history"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {paymentSummary.upcomingInvoice ? (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Invoice</CardTitle>
            <CardDescription>
              Next billing date:{" "}
              {paymentSummary.upcomingInvoice.periodEnd
                ? new Date(
                    paymentSummary.upcomingInvoice.periodEnd,
                  ).toLocaleDateString()
                : "Pending"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Typography variant="h3">
              {formatCurrency(
                paymentSummary.upcomingInvoice.amountDue,
                paymentSummary.upcomingInvoice.currency,
              )}
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Your recent invoices and receipts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentSummary.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.number ?? invoice.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {invoice.status ?? "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.created).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      invoice.amountPaid || invoice.amountDue,
                      invoice.currency,
                    )}
                  </TableCell>
                  <TableCell>
                    {invoice.invoicePdf ? (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="size-4" />
                        </a>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(amount: number, currency?: string | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
