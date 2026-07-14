import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { Form, useForm } from "@/features/form/tanstack-form";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dayjs } from "@/lib/dayjs";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, Coins, Gift, Settings2, Users } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AdminPageHeader,
  AdminSearch,
  AdminStatCard,
  AdminTable,
} from "../_components/admin-shared";
import { AdminReferralsPageSkeleton } from "../_components/admin-skeletons";

export const Route = createFileRoute("/admin/referrals/")({
  validateSearch: z.object({
    q: z.string().optional().default(""),
  }),
  component: AdminReferralsRoute,
  pendingComponent: AdminReferralsPageSkeleton,
});

type ReferralDashboard = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.queries.getReferralDashboard>>
>;
type ReferralSettings = ReferralDashboard["settings"];
type ReferralUser = ReferralDashboard["referrers"][number]["user"];

const referralSettingsSchema = z.object({
  creditsPerReferral: z.coerce.number().int().min(1),
  dailyCreditCap: z.coerce.number().int().min(1),
  monthlyCreditCap: z.coerce.number().int().min(1),
  cookieExpiryDays: z.coerce.number().int().min(1),
  pendingExpiryDays: z.coerce.number().int().min(1),
  burstSignupThreshold: z.coerce.number().int().min(1),
  sameIpSignupThreshold: z.coerce.number().int().min(1),
  requireProductAction: z.boolean(),
});

const referralStatusVariants = new Map<
  string,
  "default" | "secondary" | "destructive" | "outline"
>([
  ["credited", "default"],
  ["rewarded", "default"],
  ["pending", "secondary"],
  ["reversed", "destructive"],
  ["expired", "outline"],
]);

function AdminReferralsRoute() {
  const search = useSearch({ from: "/admin/referrals/" });
  const navigate = useNavigate({ from: "/admin/referrals/" });
  const data = useQuery(api.admin.queries.getReferralDashboard, {
    search: search.q || undefined,
  });

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Referrals"
            description="Track who refers, who converts, and which rewards go out."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              title="Referrers"
              value={data?.stats.referrers ?? "-"}
              description="Users with a referral code"
              icon={Users}
            />
            <AdminStatCard
              title="Referrals"
              value={data?.stats.referrals ?? "-"}
              description={
                data ? `${data.stats.pending} waiting on conversion` : undefined
              }
              icon={Gift}
            />
            <AdminStatCard
              title="Credited"
              value={data?.stats.credited ?? "-"}
              description="Referrals that earned a reward"
              icon={BadgeCheck}
            />
            <AdminStatCard
              title="Credits granted"
              value={data?.stats.creditsGranted ?? "-"}
              description="Free credits given to referrers"
              icon={Coins}
            />
          </div>
          <ReferralSettingsCard settings={data?.settings} />
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Referrers</h2>
                <p className="text-muted-foreground text-sm">
                  Sorted by credits earned, so reward holders surface first.
                </p>
              </div>
              <AdminSearch
                value={search.q}
                placeholder="Search name, email, or code..."
                onChange={(q) =>
                  void navigate({ search: (prev) => ({ ...prev, q }) })
                }
              />
            </div>
            <AdminTable
              headers={[
                "User",
                "Code",
                "Referrals",
                "Pending",
                "Credited",
                "Credits earned",
                "Joined",
              ]}
              empty="No referrers match this search."
              rows={data?.referrers.map((referrer) => [
                <UserCell key="user" user={referrer.user} />,
                <span key="code" className="font-mono text-xs">
                  {referrer.code}
                </span>,
                <span key="referrals" className="text-sm tabular-nums">
                  {referrer.referrals}
                </span>,
                <span
                  key="pending"
                  className="text-muted-foreground text-sm tabular-nums"
                >
                  {referrer.pending}
                </span>,
                <span key="credited" className="text-sm tabular-nums">
                  {referrer.credited}
                </span>,
                referrer.creditsEarned > 0 ? (
                  <Badge key="earned" variant="default">
                    {referrer.creditsEarned}{" "}
                    {referrer.creditsEarned === 1 ? "credit" : "credits"}
                  </Badge>
                ) : (
                  <span
                    key="earned"
                    className="text-muted-foreground text-sm tabular-nums"
                  >
                    0
                  </span>
                ),
                <span key="joined" className="text-muted-foreground text-sm">
                  {dayjs(referrer.createdAt).format("MMM D, YYYY")}
                </span>,
              ])}
            />
          </section>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">Recent referrals</h2>
              <p className="text-muted-foreground text-sm">
                Latest signups attributed to a referral code.
              </p>
            </div>
            <AdminTable
              headers={[
                "Referrer",
                "Referred user",
                "Status",
                "Reward",
                "Date",
              ]}
              empty="No referral activity yet."
              rows={data?.records.map((record) => [
                <UserCell
                  key="referrer"
                  user={record.referrer}
                  fallback={record.referrerCode ?? "Deleted profile"}
                />,
                <UserCell
                  key="referred"
                  user={record.referredUser}
                  fallback="Signup pending"
                />,
                <Badge
                  key="status"
                  variant={
                    referralStatusVariants.get(record.status) ?? "outline"
                  }
                >
                  {record.status}
                </Badge>,
                <span key="reward" className="text-sm tabular-nums">
                  {record.rewardAmount ?? "-"}
                </span>,
                <span key="date" className="text-muted-foreground text-sm">
                  {dayjs(record.createdAt).format("MMM D, YYYY")}
                </span>,
              ])}
            />
          </section>
        </div>
      </LayoutContent>
    </Layout>
  );
}

function UserCell(props: { user: ReferralUser; fallback?: string }) {
  if (!props.user) {
    return (
      <span className="text-muted-foreground text-sm">
        {props.fallback ?? "Unknown user"}
      </span>
    );
  }

  const user = props.user;
  return (
    <Link
      to="/admin/users/$userId"
      params={{ userId: user.id }}
      className="flex items-center gap-3"
    >
      <Avatar className="size-8">
        {user.image ? <AvatarImage src={user.image} /> : null}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {(user.name || user.email).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {user.name || user.email}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {user.email}
        </span>
      </span>
    </Link>
  );
}

function ReferralSettingsCard(props: { settings?: ReferralSettings }) {
  const settings = props.settings;
  const items: { label: string; value: ReactNode }[] = settings
    ? [
        {
          label: "Credits per referral",
          value: `${settings.creditsPerReferral} ${
            settings.creditsPerReferral === 1 ? "credit" : "credits"
          }`,
        },
        { label: "Daily cap", value: `${settings.dailyCreditCap} credits` },
        {
          label: "Monthly cap",
          value: `${settings.monthlyCreditCap} credits`,
        },
        {
          label: "Cookie lifetime",
          value: `${settings.cookieExpiryDays} days`,
        },
        {
          label: "Pending expiry",
          value: `${settings.pendingExpiryDays} days`,
        },
        {
          label: "Burst signup threshold",
          value: `${settings.burstSignupThreshold} signups`,
        },
        {
          label: "Same-IP threshold",
          value: `${settings.sameIpSignupThreshold} signups`,
        },
        {
          label: "Product action required",
          value: (
            <Badge
              variant={settings.requireProductAction ? "default" : "outline"}
            >
              {settings.requireProductAction ? "On" : "Off"}
            </Badge>
          ),
        },
      ]
    : [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Reward settings</CardTitle>
          <CardDescription>
            {settings?.updatedAt
              ? `Updated ${dayjs(settings.updatedAt).format("MMM D, YYYY HH:mm")}`
              : "Using default values."}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!settings}
          onClick={() => settings && openReferralSettingsDialog(settings)}
        >
          <Settings2 className="size-4" />
          Edit settings
        </Button>
      </CardHeader>
      <CardContent>
        {settings ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            {items.map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-xs">{item.label}</dt>
                <dd className="text-sm font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const referralSettingsFields = [
  { name: "creditsPerReferral", label: "Credits per referral" },
  { name: "dailyCreditCap", label: "Daily cap (credits)" },
  { name: "monthlyCreditCap", label: "Monthly cap (credits)" },
  { name: "cookieExpiryDays", label: "Cookie lifetime (days)" },
  { name: "pendingExpiryDays", label: "Pending expiry (days)" },
  { name: "burstSignupThreshold", label: "Burst signup threshold" },
  { name: "sameIpSignupThreshold", label: "Same-IP signup threshold" },
] as const;

function ReferralSettingsForm(props: { settings: ReferralSettings }) {
  const updateSettings = useMutation(
    api.admin.mutations.updateReferralSettings,
  );
  const form = useForm({
    schema: referralSettingsSchema,
    defaultValues: {
      creditsPerReferral: props.settings.creditsPerReferral,
      dailyCreditCap: props.settings.dailyCreditCap,
      monthlyCreditCap: props.settings.monthlyCreditCap,
      cookieExpiryDays: props.settings.cookieExpiryDays,
      pendingExpiryDays: props.settings.pendingExpiryDays,
      burstSignupThreshold: props.settings.burstSignupThreshold,
      sameIpSignupThreshold: props.settings.sameIpSignupThreshold,
      requireProductAction: props.settings.requireProductAction,
    },
    onSubmit: async (values) => {
      const parsed = referralSettingsSchema.parse(values);
      await updateSettings(parsed);
      toast.success("Referral settings updated");
      dialogManager.closeAll();
    },
  });

  return (
    <Form form={form} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {referralSettingsFields.map((config) => (
          <form.AppField key={config.name} name={config.name}>
            {(field) => (
              <field.Field>
                <field.Label>{config.label}</field.Label>
                <field.Content>
                  <field.Input type="number" min={1} />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
        ))}
      </div>
      <form.AppField name="requireProductAction">
        {(field) => (
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="min-w-0">
              <field.Label>Require product action</field.Label>
              <p className="text-muted-foreground text-sm">
                Only reward a referral after the referred user generates a
                thumbnail.
              </p>
            </div>
            <field.Switch />
          </div>
        )}
      </form.AppField>
      <form.SubmitButton className="w-full">Save settings</form.SubmitButton>
    </Form>
  );
}

function openReferralSettingsDialog(settings: ReferralSettings) {
  dialogManager.custom({
    title: "Referral settings",
    description: "Reward amounts and anti-abuse limits for the program.",
    size: "lg",
    children: <ReferralSettingsForm settings={settings} />,
  });
}
