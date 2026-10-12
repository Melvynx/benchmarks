import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout, LayoutContent } from "@/features/page/layout";
import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import { dayjs } from "@/lib/dayjs";
import { getInitials } from "@/lib/utils/initials";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { z } from "zod";
import {
  AdminPageHeader,
  AdminSearch,
  AdminTable,
} from "../_components/admin-shared";
import { AdminTableListPageSkeleton } from "../_components/admin-skeletons";

const planOptions = [
  "free",
  ...AUTH_PLANS.filter((plan) => plan.price > 0).map((plan) => plan.name),
];

export const Route = createFileRoute("/admin/organizations/")({
  validateSearch: z.object({
    q: z.string().optional().default(""),
    page: z.number().optional().default(1),
    plan: z.string().optional(),
    sort: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
  component: AdminOrganizationsRoute,
  pendingComponent: () => (
    <AdminTableListPageSkeleton
      filterCount={1}
      headers={["Organization", "Plan", "Credits", "Members", "Created"]}
    />
  ),
});

function AdminOrganizationsRoute() {
  const search = useSearch({ from: "/admin/organizations/" });
  const navigate = useNavigate({ from: "/admin/organizations/" });
  const organizationsData = useQuery(api.admin.queries.listOrganizations, {
    page: search.page,
    pageSize: 20,
    search: search.q || undefined,
    plan: search.plan,
    sort: search.sort,
  });

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Organizations"
            description="Inspect workspaces, plans, credits, and thumbnail usage."
          />
          <div className="flex flex-wrap items-center gap-2">
            <AdminSearch
              value={search.q}
              onChange={(q) =>
                void navigate({ search: (prev) => ({ ...prev, q, page: 1 }) })
              }
            />
            <Select
              value={search.plan ?? "all"}
              onValueChange={(plan) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    plan: plan === "all" ? undefined : plan,
                    page: 1,
                  }),
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {planOptions.map((plan) => (
                  <SelectItem key={plan} value={plan}>
                    {plan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AdminTable
            headers={[
              "Organization",
              "Plan",
              "Members",
              "Generations",
              "Credits",
              "Created",
            ]}
            empty="No organizations found."
            rows={organizationsData?.organizations.map((org) => [
              <Link
                key="org"
                to="/admin/organizations/$orgId"
                params={{ orgId: org.id }}
                className="flex items-center gap-3"
              >
                <Avatar className="size-9 rounded-lg">
                  {org.logo ? <AvatarImage src={org.logo} /> : null}
                  <AvatarFallback className="bg-primary text-primary-foreground rounded-lg text-xs">
                    {getInitials(org.name || "Org")}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {org.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {org.slug || org.id}
                  </span>
                </span>
              </Link>,
              <Badge
                key="plan"
                variant={org.plan === "free" ? "outline" : "default"}
              >
                {org.plan}
              </Badge>,
              <span key="members">{org._count.members.toLocaleString()}</span>,
              <span key="generations">
                {org._count.generations.toLocaleString()}
              </span>,
              <span key="credits">{org.credits.toLocaleString()}</span>,
              <span key="created" className="text-muted-foreground text-sm">
                {org.createdAt
                  ? dayjs(org.createdAt).format("MMM D, YYYY")
                  : "-"}
              </span>,
            ])}
          />
        </div>
      </LayoutContent>
    </Layout>
  );
}
