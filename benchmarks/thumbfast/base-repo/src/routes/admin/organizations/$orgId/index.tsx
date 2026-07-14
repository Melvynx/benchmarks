import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
} from "@/components/ui/item";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { dayjs } from "@/lib/dayjs";
import {
  AUTH_PLANS,
  getPlanLimits,
  type OverrideLimits,
  type PlanLimit,
} from "@/lib/auth/stripe/auth-plans";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils/initials";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { makeFunctionReference } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Coins,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  Gift,
  History,
  Mail,
  Receipt,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AdminEmptyState,
  AdminTable,
  StatusBadge,
} from "../../_components/admin-shared";
import {
  AdminGenerationListSkeleton,
  AdminOrgDetailSkeleton,
  AdminPaymentsCardSkeleton,
} from "../../_components/admin-skeletons";
import { AdminGenerationList } from "@/features/admin/admin-generation-list";
import { MetadataView } from "../../_components/metadata-view";

const orgTabs = ["profile", "members", "billing", "activity"] as const;

const onboardingDebugSteps = [
  { key: "person", label: "Add Person" },
  { key: "style", label: "Pick Style" },
  { key: "questions", label: "About You" },
  { key: "demo", label: "Demo" },
  { key: "trial", label: "Pro Trial" },
  { key: "prompt", label: "Prompt" },
] as const;

type AdminPayment = {
  id: string;
  amount: number;
  amountRefunded: number;
  currency: string;
  paid: boolean;
  refunded: boolean;
  status: string;
  createdAt: number;
  receiptUrl: string | null;
};

type RefundPreview = {
  chargeId: string;
  paidCents: number;
  alreadyRefundedCents: number;
  remainingRefundableCents: number;
  usedCredits: number;
  usedValueCents: number;
  refundCents: number;
  currency: string;
  createdAt: number;
};

const listOrganizationPaymentsRef = makeFunctionReference<
  "action",
  { organizationId: string },
  { payments: AdminPayment[]; refundable: RefundPreview | null }
>("admin/actions:listOrganizationPayments");

const setOrganizationSubscriptionPlanRef = makeFunctionReference<
  "action",
  { organizationId: string; plan: string; annual: boolean },
  { subscriptionId: string }
>("admin/actions:setOrganizationSubscriptionPlan");

const cancelOrganizationSubscriptionRef = makeFunctionReference<
  "action",
  { organizationId: string },
  { subscriptionId: string }
>("admin/actions:cancelOrganizationSubscription");

const reactivateOrganizationSubscriptionRef = makeFunctionReference<
  "action",
  { organizationId: string },
  { subscriptionId: string }
>("admin/actions:reactivateOrganizationSubscription");

const processOrganizationRefundRef = makeFunctionReference<
  "action",
  {
    organizationId: string;
    chargeId?: string;
    cancelSubscription?: boolean;
  },
  { refundId: string; refundCents: number; canceledSubscription: boolean }
>("admin/actions:processOrganizationRefund");

const updateOverrideLimitsRef = makeFunctionReference<
  "mutation",
  { organizationId: string; overrideLimits: Record<string, unknown> | null },
  { id: string }
>("admin/mutations:updateOverrideLimits");

export const Route = createFileRoute("/admin/organizations/$orgId/")({
  component: AdminOrganizationDetailRoute,
  pendingComponent: AdminOrganizationDetailPageSkeleton,
});

function AdminOrganizationDetailPageSkeleton() {
  return (
    <Layout size="lg">
      <LayoutContent>
        <AdminOrgDetailSkeleton />
      </LayoutContent>
    </Layout>
  );
}

function AdminOrganizationDetailRoute() {
  const { orgId } = Route.useParams();
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(orgTabs).withDefault("profile").withOptions({
      clearOnDefault: true,
    }),
  );
  const org = useQuery(api.admin.queries.getOrganizationById, {
    organizationId: orgId,
  });

  if (org === null) {
    return (
      <Layout size="lg">
        <LayoutContent>
          <AdminEmptyState title="Organization not found" />
        </LayoutContent>
      </Layout>
    );
  }

  if (org === undefined) {
    return (
      <Layout size="lg">
        <LayoutContent>
          <AdminOrgDetailSkeleton />
        </LayoutContent>
      </Layout>
    );
  }

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <Link
            to="/admin/organizations"
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Organizations
          </Link>

          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-14 rounded-lg">
              {org.logo ? <AvatarImage src={org.logo} alt={org.name} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground rounded-lg font-semibold">
                {getInitials(org.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold">{org.name}</h1>
                <Badge variant={org.subscription?.plan ? "default" : "outline"}>
                  {org.subscription?.plan ?? "free"}
                </Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
                <Users className="size-4 shrink-0" />
                {org._count.members.toLocaleString()}{" "}
                {org._count.members === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
          <Tabs
            value={tab}
            onValueChange={(value) => void setTab(value as typeof tab)}
          >
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <div className="mt-6 flex flex-col gap-8 lg:flex-row-reverse">
              <OrganizationMetadata org={org} />
              <div className="min-w-0 flex-1">
                <TabsContent value="profile" className="mt-0">
                  <OrganizationProfile org={org} />
                </TabsContent>
                <TabsContent value="members" className="mt-0">
                  <OrganizationMembers org={org} />
                </TabsContent>
                <TabsContent value="billing" className="mt-0">
                  <OrganizationBilling org={org} />
                </TabsContent>
                <TabsContent value="activity" className="mt-0">
                  <OrganizationActivity org={org} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </LayoutContent>
    </Layout>
  );
}

type OrganizationDetail = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.queries.getOrganizationById>>
>;

function OrganizationMetadata({ org }: { org: OrganizationDetail }) {
  return (
    <aside className="border-border/80 flex flex-col gap-5 border-b pb-6 lg:w-60 lg:shrink-0 lg:border-r-0 lg:border-b-0 lg:border-l lg:pr-0 lg:pl-6">
      <MetadataItem label="Org ID">
        <div className="mt-1 flex min-w-0 items-center gap-1">
          <code className="truncate font-mono text-sm">
            {org.id.slice(0, 8)}...{org.id.slice(-6)}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label="Copy organization ID"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(org.id);
                toast.success("Organization ID copied");
              } catch {
                toast.error("Unable to copy organization ID");
              }
            }}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      </MetadataItem>
      <Separator />
      <MetadataItem label="Slug">
        <p className="mt-1 text-sm break-words">{org.slug || "Not set"}</p>
      </MetadataItem>
      <Separator />
      <MetadataItem label="Metadata">
        <MetadataView value={org.metadata} />
      </MetadataItem>
      <Separator />
      <MetadataItem label="Stripe customer">
        {org.stripeCustomerId ? (
          <a
            href={`https://dashboard.stripe.com/customers/${org.stripeCustomerId}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground mt-1 block font-mono text-sm break-words underline-offset-2 hover:underline"
          >
            {org.stripeCustomerId}
          </a>
        ) : (
          <p className="mt-1 font-mono text-sm break-words">Not set</p>
        )}
      </MetadataItem>
      <Separator />
      <MetadataItem label="Created">
        <p className="mt-1 text-sm font-medium">
          {org.createdAt ? dayjs(org.createdAt).format("MMMM D, YYYY") : "-"}
        </p>
      </MetadataItem>
    </aside>
  );
}

function OrganizationProfile({ org }: { org: OrganizationDetail }) {
  const updateOrganization = useMutation(
    api.admin.mutations.updateOrganization,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Info label="Name" value={org.name} />
          <Info label="Slug" value={org.slug || "-"} />
          <Info
            label="Created"
            value={org.createdAt ? dayjs(org.createdAt).format("LL") : "-"}
          />
          <Info label="Stripe Customer" value={org.stripeCustomerId ?? "-"} />
          <Info label="Members" value={String(org._count.members)} />
          <Info label="Thumbnails" value={String(org._count.thumbnails)} />
          <div className="md:col-span-3">
            <Button
              variant="outline"
              onClick={() =>
                dialogManager.input({
                  title: "Rename organization",
                  input: { label: "Name", defaultValue: org.name },
                  action: {
                    label: "Save",
                    onClick: async (name) => {
                      if (!name?.trim()) return;
                      await updateOrganization({
                        organizationId: org.id,
                        data: { name: name.trim() },
                      });
                      toast.success("Organization updated");
                    },
                  },
                })
              }
            >
              Rename organization
            </Button>
          </div>
        </CardContent>
      </Card>
      <OrganizationOnboardingDebug org={org} />
    </div>
  );
}

function OrganizationOnboardingDebug({ org }: { org: OrganizationDetail }) {
  if (!org.slug) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboarding debug</CardTitle>
          <CardDescription>
            Set an organization slug before opening onboarding preview links.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStepHref = (step: (typeof onboardingDebugSteps)[number]["key"]) =>
    `/orgs/${org.slug}/onboard?adminDebug=1&step=${step}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Onboarding debug</CardTitle>
        <CardDescription>
          Open any onboarding screen for this organization without resetting
          completion state.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {onboardingDebugSteps.map((step) => (
          <Button
            key={step.key}
            asChild
            variant={step.key === "trial" ? "default" : "outline"}
            size="sm"
          >
            <a href={getStepHref(step.key)}>
              {step.label}
              {step.key === "trial" ? (
                <ExternalLink className="size-3.5" />
              ) : null}
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

const MEMBER_ROLE_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  owner: {
    label: "Owner",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  admin: {
    label: "Admin",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  member: {
    label: "Member",
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

function OrganizationMembers({ org }: { org: OrganizationDetail }) {
  const updateRole = useMutation(
    api.admin.mutations.updateOrganizationMemberRole,
  );
  const removeMember = useMutation(
    api.admin.mutations.removeOrganizationMember,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="text-muted-foreground size-4" />
            Members
            <span className="text-muted-foreground text-sm font-normal">
              ({org.members.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {org.members.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No members found.
            </p>
          ) : (
            <ItemGroup className="divide-border/60 divide-y">
              {org.members.map((member) => {
                const name =
                  member.user?.name || member.user?.email || member.userId;
                const roleBadge =
                  MEMBER_ROLE_BADGE[member.role] ?? MEMBER_ROLE_BADGE.member;
                return (
                  <Item key={member.id} size="sm" className="px-0">
                    <ItemMedia>
                      <Avatar className="size-9">
                        <AvatarImage
                          src={member.user?.image ?? undefined}
                          alt={name}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent className="min-w-0 gap-0.5">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: member.userId }}
                        className="w-fit max-w-full truncate text-sm font-medium underline-offset-2 hover:underline"
                      >
                        {name}
                      </Link>
                      <span className="text-muted-foreground truncate text-xs">
                        {member.user?.email ?? member.userId}
                      </span>
                    </ItemContent>
                    <ItemActions className="gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "hidden text-[11px] sm:inline-flex",
                          roleBadge.className,
                        )}
                      >
                        {roleBadge.label}
                      </Badge>
                      <span className="text-muted-foreground hidden text-xs lg:inline">
                        {member.createdAt
                          ? dayjs(member.createdAt).format("MMM D, YYYY")
                          : "-"}
                      </span>
                      <Select
                        value={member.role}
                        onValueChange={(role) =>
                          void updateRole({
                            organizationId: org.id,
                            memberId: member.id,
                            role: role as "member" | "admin" | "owner",
                          }).then(() => toast.success("Role updated"))
                        }
                      >
                        <SelectTrigger size="sm" className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-8"
                        aria-label="Remove member"
                        onClick={() =>
                          dialogManager.confirm({
                            title: "Remove member",
                            description:
                              "This removes the member from the organization.",
                            action: {
                              label: "Remove",
                              variant: "destructive",
                              onClick: async () => {
                                await removeMember({
                                  organizationId: org.id,
                                  memberId: member.id,
                                });
                                toast.success("Member removed");
                              },
                            },
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="text-muted-foreground size-4" />
            Pending invitations
            <span className="text-muted-foreground text-sm font-normal">
              ({org.invitations.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {org.invitations.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No invitations found.
            </p>
          ) : (
            <ItemGroup className="divide-border/60 divide-y">
              {org.invitations.map((invitation) => (
                <Item key={invitation.id} size="sm" className="px-0">
                  <ItemMedia>
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">
                        {getInitials(invitation.email)}
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {invitation.email}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Expires{" "}
                      {invitation.expiresAt
                        ? dayjs(invitation.expiresAt).format("MMM D, YYYY")
                        : "-"}
                    </span>
                  </ItemContent>
                  <ItemActions className="gap-3">
                    <Badge variant="outline" className="text-[11px]">
                      {invitation.role}
                    </Badge>
                    <StatusBadge value={invitation.status} />
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationBilling({ org }: { org: OrganizationDetail }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <OrganizationSubscriptionSummary org={org} />
        <OrganizationCredits org={org} />
      </div>
      <OrganizationGrantPlan org={org} />
      <OrganizationPlanControls org={org} />
      <OrganizationCreditHistory org={org} />
      <OrganizationOverrideLimits org={org} />
      <OrganizationPayments org={org} />
    </div>
  );
}

function OrganizationSubscriptionSummary({
  org,
}: {
  org: OrganizationDetail;
}) {
  const plan = org.subscription?.plan ?? "free";
  const status = org.subscription?.status ?? null;
  const isLifetime = status === "lifetime";
  const isManualGrant = Boolean(status) && !org.subscription?.stripeSubscriptionId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="text-muted-foreground size-4" />
          Subscription
        </CardTitle>
        <CardDescription>
          Current plan, status, and Stripe references.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold capitalize">{plan}</span>
          {isLifetime ? (
            <Badge className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              <Crown className="size-3" />
              Lifetime
            </Badge>
          ) : status ? (
            <StatusBadge value={status} />
          ) : (
            <Badge variant="outline">No subscription</Badge>
          )}
          {isManualGrant ? (
            <Badge variant="outline" className="text-[11px]">
              Manual grant
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Info
            label="Stripe subscription"
            value={org.subscription?.stripeSubscriptionId ?? "-"}
          />
          <Info
            label={isLifetime ? "Granted" : "Period end"}
            value={
              org.subscription?.periodEnd
                ? dayjs(org.subscription.periodEnd).format("LL")
                : org.subscription?.periodStart
                  ? dayjs(org.subscription.periodStart).format("LL")
                  : "-"
            }
          />
        </div>
        {org.stripeCustomerId || org.subscription?.stripeSubscriptionId ? (
          <div className="flex flex-wrap gap-2">
            {org.stripeCustomerId ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://dashboard.stripe.com/customers/${org.stripeCustomerId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Stripe customer
                </a>
              </Button>
            ) : null}
            {org.subscription?.stripeSubscriptionId ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://dashboard.stripe.com/subscriptions/${org.subscription.stripeSubscriptionId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Stripe subscription
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OrganizationCredits({ org }: { org: OrganizationDetail }) {
  const updateCredits = useMutation(api.admin.mutations.updateCredits);

  const openAdjustDialog = () =>
    dialogManager.input({
      title: "Set credit balance",
      description:
        "Sets the absolute credit balance and records an admin adjustment.",
      icon: Coins,
      input: {
        label: "Credit balance",
        defaultValue: String(org.credits),
        placeholder: "0",
      },
      action: {
        label: "Save balance",
        onClick: async (value) => {
          const balance = Number(value);
          if (!Number.isFinite(balance)) {
            toast.error("Enter a valid number");
            return;
          }
          await updateCredits({
            organizationId: org.id,
            balance,
            reason: "Admin balance update",
          });
          toast.success("Credits updated");
        },
      },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="text-muted-foreground size-4" />
          Credits
        </CardTitle>
        <CardDescription>
          Convex credit balance available to this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {org.credits.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">credits</span>
        </div>
        <Button variant="outline" size="sm" onClick={openAdjustDialog}>
          Adjust balance
        </Button>
      </CardContent>
    </Card>
  );
}

const GRANTABLE_PLANS = AUTH_PLANS.filter((plan) => plan.name !== "free");

function OrganizationGrantPlan({ org }: { org: OrganizationDetail }) {
  const grantPlan = useMutation(api.admin.mutations.grantOrganizationPlan);
  const hasStripeSubscription = Boolean(org.subscription?.stripeSubscriptionId);
  const currentPlan = org.subscription?.plan ?? "free";
  const [selectedPlan, setSelectedPlan] = useState(
    () => GRANTABLE_PLANS[0]?.name ?? "pro",
  );
  const [lifetime, setLifetime] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const runGrant = (plan: string, asLifetime: boolean) => {
    const isRevoke = plan === "free";
    dialogManager.confirm({
      title: isRevoke ? "Revoke plan" : `Grant ${plan} plan`,
      icon: isRevoke ? undefined : Gift,
      variant: isRevoke ? "destructive" : "default",
      description: isRevoke
        ? "Removes the manual grant and returns this organization to the free plan."
        : `Sets this organization to the ${plan} plan with ${
            asLifetime ? "lifetime" : "recurring (30 day)"
          } access. This bypasses Stripe and updates the subscription directly.`,
      action: {
        label: isRevoke ? "Revoke plan" : "Grant plan",
        variant: isRevoke ? "destructive" : "default",
        onClick: async () => {
          setIsSaving(true);
          try {
            await grantPlan({
              organizationId: org.id,
              plan,
              lifetime: asLifetime,
            });
            toast.success(isRevoke ? "Plan revoked" : `Granted ${plan} plan`);
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Grant failed",
            );
          } finally {
            setIsSaving(false);
          }
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="text-muted-foreground size-4" />
          Grant plan
        </CardTitle>
        <CardDescription>
          Assign a plan directly without Stripe checkout, for comps, lifetime
          deals, and support exceptions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasStripeSubscription ? (
          <div className="bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-md border p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              This organization is on a Stripe subscription. Use the plan
              management controls below to change or cancel it.
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="grid gap-1.5">
                <Label
                  htmlFor="grant-plan"
                  className="text-muted-foreground text-xs font-medium"
                >
                  Plan
                </Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger id="grant-plan" className="w-full sm:w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRANTABLE_PLANS.map((plan) => (
                      <SelectItem
                        key={plan.name}
                        value={plan.name}
                        className="capitalize"
                      >
                        {plan.name} · ${plan.price}
                        {plan.isLifetime ? " one-time" : "/mo"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  id="grant-lifetime"
                  checked={lifetime}
                  onCheckedChange={setLifetime}
                />
                <Label
                  htmlFor="grant-lifetime"
                  className="flex items-center gap-1.5 text-sm"
                >
                  <Crown className="size-3.5" />
                  Lifetime access
                </Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isSaving}
                onClick={() => runGrant(selectedPlan, lifetime)}
              >
                Grant plan
              </Button>
              {currentPlan !== "free" ? (
                <Button
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => runGrant("free", false)}
                >
                  Revoke to free
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const CREDIT_TYPE_LABELS = new Map<string, string>([
  ["admin_adjustment", "Admin adjustment"],
  ["refund", "Refund"],
  ["subscription_grant", "Subscription grant"],
  ["subscription_renewal", "Subscription renewal"],
  ["signup_grant", "Signup bonus"],
  ["trial_grant", "Trial grant"],
  ["referral", "Referral"],
  ["purchase", "Credit purchase"],
  ["generation", "Generation"],
]);

function CreditAmount({ amount }: { amount: number }) {
  if (amount === 0) {
    return <span className="text-muted-foreground tabular-nums">0</span>;
  }
  const positive = amount > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        positive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive",
      )}
    >
      {positive ? (
        <ArrowUpRight className="size-3.5" />
      ) : (
        <ArrowDownRight className="size-3.5" />
      )}
      {positive ? "+" : ""}
      {amount.toLocaleString()}
    </span>
  );
}

function OrganizationCreditHistory({ org }: { org: OrganizationDetail }) {
  const transactions = useQuery(
    api.admin.queries.listOrganizationCreditTransactions,
    { organizationId: org.id, limit: 50 },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="text-muted-foreground size-4" />
          Credit history
        </CardTitle>
        <CardDescription>
          Recent credit transactions for this organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminTable
          headers={["Date", "Type", "Reason", "Amount"]}
          empty="No credit transactions yet."
          rows={transactions?.map((transaction) => [
            <span
              key="date"
              className="text-muted-foreground text-sm whitespace-nowrap"
            >
              {dayjs(transaction.createdAt).format("MMM D, YYYY HH:mm")}
            </span>,
            <Badge key="type" variant="outline" className="text-[11px]">
              {CREDIT_TYPE_LABELS.get(transaction.type) ?? transaction.type}
            </Badge>,
            <span key="reason" className="text-sm">
              {transaction.reason}
            </span>,
            <CreditAmount key="amount" amount={transaction.amount} />,
          ])}
        />
      </CardContent>
    </Card>
  );
}

function OrganizationPlanControls({ org }: { org: OrganizationDetail }) {
  const updatePlan = useAction(setOrganizationSubscriptionPlanRef);
  const cancelSubscription = useAction(cancelOrganizationSubscriptionRef);
  const reactivateSubscription = useAction(
    reactivateOrganizationSubscriptionRef,
  );
  const [selectedPlanKey, setSelectedPlanKey] = useState(() =>
    getCurrentPlanKey(org),
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const hasStripeSubscription = Boolean(org.subscription?.stripeSubscriptionId);
  const isCancelable = ["active", "trialing", "past_due"].includes(
    org.subscription?.status ?? "",
  );

  useEffect(() => {
    setSelectedPlanKey(getCurrentPlanKey(org));
  }, [org]);

  const planOptions = useMemo(
    () =>
      AUTH_PLANS.flatMap((plan) => {
        if (plan.name === "free") return [];
        const options = [
          {
            value: plan.name,
            label: `${plan.name} - $${plan.price}/month`,
          },
        ];
        if (plan.yearlyPrice) {
          options.push({
            value: `${plan.name}-yearly`,
            label: `${plan.name} yearly - $${plan.yearlyPrice}/year`,
          });
        }
        return options;
      }),
    [],
  );

  const runPlanUpdate = async () => {
    const annual = selectedPlanKey.endsWith("-yearly");
    const plan = selectedPlanKey.replace("-yearly", "");
    setIsUpdating(true);
    try {
      await updatePlan({ organizationId: org.id, plan, annual });
      toast.success("Subscription updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Subscription update failed",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const runSubscriptionAction = (
    type: "cancel" | "reactivate",
    action: () => Promise<unknown>,
  ) => {
    dialogManager.confirm({
      title:
        type === "cancel"
          ? "Cancel subscription at period end"
          : "Reactivate subscription",
      description:
        type === "cancel"
          ? "Stripe will keep the subscription active until the current period ends."
          : "Stripe will remove the scheduled cancellation.",
      action: {
        label: type === "cancel" ? "Cancel subscription" : "Reactivate",
        variant: type === "cancel" ? "destructive" : "default",
        onClick: async () => {
          setIsUpdating(true);
          try {
            await action();
            toast.success(
              type === "cancel"
                ? "Subscription cancellation scheduled"
                : "Subscription reactivated",
            );
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Subscription action failed",
            );
          } finally {
            setIsUpdating(false);
          }
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="text-muted-foreground size-4" />
          Stripe plan management
        </CardTitle>
        <CardDescription>
          Create or update the Stripe subscription with real billing and
          proration.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="grid gap-1.5">
          <Label
            htmlFor="stripe-plan"
            className="text-muted-foreground text-xs font-medium"
          >
            Target plan
          </Label>
          <Select value={selectedPlanKey} onValueChange={setSelectedPlanKey}>
            <SelectTrigger id="stripe-plan" className="w-full md:w-80">
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {planOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => void runPlanUpdate()}
          disabled={isUpdating || selectedPlanKey === getCurrentPlanKey(org)}
        >
          {hasStripeSubscription ? "Update plan" : "Create subscription"}
        </Button>
        {hasStripeSubscription && isCancelable ? (
          org.subscription?.cancelAtPeriodEnd ? (
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() =>
                runSubscriptionAction("reactivate", async () =>
                  reactivateSubscription({ organizationId: org.id }),
                )
              }
            >
              Reactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() =>
                runSubscriptionAction("cancel", async () =>
                  cancelSubscription({ organizationId: org.id }),
                )
              }
            >
              Cancel at period end
            </Button>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

function OrganizationOverrideLimits({ org }: { org: OrganizationDetail }) {
  const updateOverrideLimits = useMutation(updateOverrideLimitsRef);
  const plan = org.subscription?.plan ?? "free";
  const currentOverrides =
    (org.subscription?.overrideLimits as OverrideLimits | null | undefined) ??
    null;
  const baseLimits = useMemo(() => getPlanLimits(plan), [plan]);
  const effectiveLimits = useMemo(
    () => getPlanLimits(plan, currentOverrides),
    [currentOverrides, plan],
  );
  const limitKeys = useMemo(
    () => Object.keys(baseLimits) as (keyof PlanLimit)[],
    [baseLimits],
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    stringifyLimits(effectiveLimits),
  );

  useEffect(() => {
    setValues(stringifyLimits(effectiveLimits));
  }, [effectiveLimits]);

  const saveOverrides = async () => {
    const nextOverrides: Record<string, unknown> = {};

    for (const key of limitKeys) {
      const rawValue = values[key];
      const baseValue = baseLimits[key];
      const nextValue =
        typeof baseValue === "boolean" ? rawValue === "true" : Number(rawValue);

      if (typeof baseValue === "number" && !Number.isFinite(nextValue)) {
        toast.error(`${String(key)} must be a number`);
        return;
      }

      if (nextValue !== baseValue) {
        nextOverrides[key] = nextValue;
      }
    }

    await updateOverrideLimits({
      organizationId: org.id,
      overrideLimits:
        Object.keys(nextOverrides).length > 0 ? nextOverrides : null,
    });
    toast.success("Override limits updated");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="text-muted-foreground size-4" />
          Override limits
        </CardTitle>
        <CardDescription>
          Per-organization plan overrides for support exceptions. Only values
          that differ from the plan are stored.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {limitKeys.map((key) => {
            const baseValue = baseLimits[key];
            return (
              <label key={key} className="grid gap-1 text-sm">
                <span className="text-muted-foreground text-xs font-medium">
                  {String(key)}
                </span>
                {typeof baseValue === "boolean" ? (
                  <Select
                    value={values[key]}
                    onValueChange={(value) =>
                      setValues((current) => ({
                        ...current,
                        [key]: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">true</SelectItem>
                      <SelectItem value="false">false</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    inputMode="numeric"
                    value={values[key]}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                )}
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void saveOverrides()}>Save overrides</Button>
          <Button
            variant="outline"
            onClick={() => setValues(stringifyLimits(baseLimits))}
          >
            Reset to plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OrganizationPayments({ org }: { org: OrganizationDetail }) {
  const listPayments = useAction(listOrganizationPaymentsRef);
  const processRefund = useAction(processOrganizationRefundRef);
  const [data, setData] = useState<{
    payments: AdminPayment[];
    refundable: RefundPreview | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const result = await listPayments({ organizationId: org.id });
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payments failed");
      setData({ payments: [], refundable: null });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
    // The action identity is stable enough for this admin-only refresh flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id]);

  const runRefund = (cancelSubscription: boolean) => {
    const refundable = data?.refundable;
    if (!refundable) return;

    dialogManager.confirm({
      title: cancelSubscription
        ? "Refund and cancel subscription"
        : "Refund latest charge",
      description: `Refund ${formatMoney(refundable.refundCents, refundable.currency)} after accounting for ${refundable.usedCredits} used credits.`,
      action: {
        label: cancelSubscription ? "Refund and cancel" : "Refund",
        variant: "destructive",
        onClick: async () => {
          setIsProcessing(true);
          try {
            await processRefund({
              organizationId: org.id,
              chargeId: refundable.chargeId,
              cancelSubscription,
            });
            toast.success("Refund processed");
            await loadPayments();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Refund failed",
            );
          } finally {
            setIsProcessing(false);
          }
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="text-muted-foreground size-4" />
            Payments and refunds
          </CardTitle>
          <CardDescription>
            Stripe charge history, refundable amount, and the refund workflow.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadPayments()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <AdminPaymentsCardSkeleton />
        ) : (
          <>
            {data?.refundable ? (
              <div className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">
                    Refundable{" "}
                    {formatMoney(
                      data.refundable.refundCents,
                      data.refundable.currency,
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Paid{" "}
                    {formatMoney(
                      data.refundable.paidCents,
                      data.refundable.currency,
                    )}
                    , used credits value{" "}
                    {formatMoney(
                      data.refundable.usedValueCents,
                      data.refundable.currency,
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={isProcessing || data.refundable.refundCents <= 0}
                    onClick={() => runRefund(false)}
                  >
                    Refund latest charge
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isProcessing || data.refundable.refundCents <= 0}
                    onClick={() => runRefund(true)}
                  >
                    Refund and cancel
                  </Button>
                </div>
              </div>
            ) : null}
            <AdminTable
              headers={["Charge", "Amount", "Refunded", "Status", "Created"]}
              empty="No Stripe payments found."
              rows={(data?.payments ?? []).map((payment) => [
                payment.receiptUrl ? (
                  <a
                    key="charge"
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  >
                    {payment.id}
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span key="charge" className="text-sm font-medium">
                    {payment.id}
                  </span>
                ),
                <span key="amount">
                  {formatMoney(payment.amount, payment.currency)}
                </span>,
                <span key="refunded">
                  {formatMoney(payment.amountRefunded, payment.currency)}
                </span>,
                <StatusBadge key="status" value={payment.status} />,
                <span key="created" className="text-muted-foreground text-sm">
                  {dayjs(payment.createdAt).format("MMM D, YYYY HH:mm")}
                </span>,
              ])}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OrganizationActivity({ org }: { org: OrganizationDetail }) {
  const generationData = useQuery(api.admin.queries.listGenerations, {
    organizationSearch: org.id,
    page: 1,
    pageSize: 20,
  });
  const generations = generationData?.items;
  const summary = generationData?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p className="font-medium">Recent generation activity</p>
          <p className="text-muted-foreground mt-1">
            {summary
              ? `${summary.total} jobs • ${summary.inFlight} in progress • ${summary.succeeded} succeeded • ${summary.failed} failed`
              : "Loading recent generation jobs..."}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/generations" search={{ organization: org.id }}>
            View all generations
          </Link>
        </Button>
      </div>
      {generations === undefined ? (
        <AdminGenerationListSkeleton />
      ) : generations.length === 0 ? (
        <AdminEmptyState
          title="No generations found."
          description="There are no recent generation jobs for this organization."
        />
      ) : (
        <AdminGenerationList generations={generations} view="list" />
      )}
    </div>
  );
}

function getCurrentPlanKey(org: OrganizationDetail) {
  const subscription = org.subscription;
  if (!subscription?.plan || subscription.plan === "free") return "pro";

  const periodStart = subscription.periodStart;
  const periodEnd = subscription.periodEnd;
  if (periodStart && periodEnd) {
    const months =
      (new Date(periodEnd).getFullYear() -
        new Date(periodStart).getFullYear()) *
        12 +
      (new Date(periodEnd).getMonth() - new Date(periodStart).getMonth());
    if (months >= 11) return `${subscription.plan}-yearly`;
  }

  return subscription.plan;
}

function stringifyLimits(limits: PlanLimit) {
  return Object.fromEntries(
    Object.entries(limits).map(([key, value]) => [key, String(value)]),
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function Info(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs font-medium">
        {props.label}
      </div>
      <div className="mt-1 text-sm break-words">{props.value}</div>
    </div>
  );
}

function MetadataItem(props: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs tracking-wider uppercase">
        {props.label}
      </p>
      {props.children}
    </div>
  );
}
