import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout, LayoutContent } from "@/features/page/layout";
import type { CSSProperties, ReactNode } from "react";

const ADMIN_NAV_GROUPS = [
  { labelWidth: "w-12", items: 5 },
  { labelWidth: "w-24", items: 8 },
] as const;

function AdminPageShell(props: {
  size?: "sm" | "default" | "lg" | "xl";
  children: ReactNode;
}) {
  return (
    <Layout size={props.size ?? "lg"}>
      <LayoutContent>{props.children}</LayoutContent>
    </Layout>
  );
}

export function AdminLayoutSkeleton() {
  return (
    <SidebarProvider
      id="admin-sidebar"
      className="bg-background overflow-x-hidden"
      style={
        {
          "--sidebar": "var(--background)",
        } as CSSProperties
      }
    >
      <AdminSidebarSkeleton />
      <SidebarInset className="bg-background min-w-0 border-0">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="m-auto mt-4 flex w-full max-w-7xl items-center gap-2 px-4">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-lg" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <AdminPageHeaderSkeleton />
          <AdminStatCardsSkeleton count={4} />
          <AdminCardSkeleton lines={4} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminSidebarSkeleton() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-2 px-2">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-4 w-28" />
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        {ADMIN_NAV_GROUPS.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            <SidebarGroupLabel>
              <Skeleton className={`h-3 ${group.labelWidth}`} />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: group.items }).map((_, itemIndex) => (
                  <SidebarMenuItem key={itemIndex}>
                    <div className="flex h-8 items-center gap-2 rounded-md px-2">
                      <Skeleton className="size-4 rounded-sm" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <Skeleton className="mx-2 h-3 w-24" />
        <div className="flex items-center gap-2 px-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AdminPageHeaderSkeleton(props?: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72 max-w-[70vw]" />
      </div>
      {props?.withAction ? (
        <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
      ) : null}
    </div>
  );
}

export function AdminStatCardsSkeleton(props?: {
  count?: number;
  className?: string;
}) {
  const count = props?.count ?? 4;
  return (
    <div
      className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${props?.className ?? ""}`}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-card flex flex-col gap-3 rounded-xl border py-6 shadow-sm"
        >
          <div className="flex items-center justify-between px-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-4 rounded-sm" />
          </div>
          <div className="px-6">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminCardSkeleton(props?: {
  lines?: number;
  hasFooter?: boolean;
  className?: string;
}) {
  const lines = props?.lines ?? 3;
  return (
    <div
      className={`bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm ${props?.className ?? ""}`}
    >
      <div className="flex flex-col gap-1.5 px-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-3 px-6">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={`h-4 rounded-md ${index === lines - 1 ? "w-2/3" : "w-full"}`}
          />
        ))}
      </div>
      {props?.hasFooter !== false ? (
        <div className="border-t pt-6">
          <div className="flex justify-end px-6">
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminTableSkeleton(props: {
  headers: string[];
  rows?: number;
}) {
  const rows = props.rows ?? 6;
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <div className="flex gap-4">
          {props.headers.map((header) => (
            <Skeleton key={header} className="h-4 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
            {props.headers.map((header, cellIndex) => (
              <Skeleton
                key={header}
                className={`h-4 rounded-md ${cellIndex === 0 ? "w-40" : "w-24"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminFiltersRowSkeleton(props?: { filterCount?: number }) {
  const filterCount = props?.filterCount ?? 2;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-10 w-full max-w-sm rounded-md" />
      {Array.from({ length: filterCount }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-36 rounded-md" />
      ))}
    </div>
  );
}

export function AdminTableListPageSkeleton(props: {
  withAction?: boolean;
  filterCount?: number;
  headers: string[];
}) {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton withAction={props.withAction} />
        <AdminFiltersRowSkeleton filterCount={props.filterCount} />
        <AdminTableSkeleton headers={props.headers} />
      </div>
    </AdminPageShell>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton withAction />
        <AdminStatCardsSkeleton count={4} />
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCardSkeleton lines={5} hasFooter={false} />
          <AdminCardSkeleton lines={5} hasFooter={false} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCardSkeleton lines={4} hasFooter={false} />
          <AdminCardSkeleton lines={4} hasFooter={false} />
        </div>
      </div>
    </AdminPageShell>
  );
}

function AdminDetailHeaderSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-20" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
      </div>
    </>
  );
}

function AdminTabsSkeleton(props: { count: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: props.count }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-9 rounded-md ${index === 0 ? "w-20" : "w-28"}`}
        />
      ))}
    </div>
  );
}

function AdminMetadataSidebarSkeleton() {
  return (
    <aside className="border-border/80 flex flex-col gap-5 border-b pb-6 lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 lg:pr-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
          {index < 2 ? <div className="bg-border h-px w-full" /> : null}
        </div>
      ))}
    </aside>
  );
}

function AdminProfileCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="border-b px-6 py-4">
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminUserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <AdminDetailHeaderSkeleton />
      <AdminTabsSkeleton count={4} />
      <div className="flex flex-col gap-8 lg:flex-row">
        <AdminMetadataSidebarSkeleton />
        <div className="min-w-0 flex-1">
          <AdminProfileCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function AdminOrgDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <AdminDetailHeaderSkeleton />
      <AdminTabsSkeleton count={4} />
      <div className="flex flex-col gap-8 lg:flex-row-reverse">
        <AdminMetadataSidebarSkeleton />
        <div className="min-w-0 flex-1 space-y-4">
          <AdminProfileCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function AdminOrgBillingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCardSkeleton lines={4} hasFooter={false} />
        <AdminCardSkeleton lines={2} hasFooter={false} />
      </div>
      <AdminCardSkeleton lines={3} />
      <AdminCardSkeleton lines={6} hasFooter={false} />
      <AdminPaymentsCardSkeleton />
    </div>
  );
}

export function AdminPaymentsCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className="space-y-4 px-6 py-6">
        <div className="rounded-md border p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <AdminTableSkeleton
          headers={["Charge", "Amount", "Refunded", "Status", "Created"]}
          rows={4}
        />
      </div>
    </div>
  );
}

export function AdminActivityListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-card flex gap-4 rounded-md border p-4">
            <Skeleton className="size-16 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminFeedbackDetailContentSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="mt-4 h-24 w-full rounded-md" />
      </div>
      <aside className="space-y-4 rounded-md border p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </aside>
    </div>
  );
}

export function AdminFeedbackDetailSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <Skeleton className="h-9 w-36 rounded-md" />
        <AdminFeedbackDetailContentSkeleton />
      </div>
    </AdminPageShell>
  );
}

export function AdminGenerationListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-card flex flex-col gap-4 rounded-xl border p-4 sm:flex-row"
        >
          <Skeleton className="aspect-video w-32 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminGenerationGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton key={index} className="aspect-video w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function AdminGenerationsPageSkeleton() {
  return (
    <AdminPageShell size="xl">
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton withAction />
        <AdminFiltersRowSkeleton filterCount={2} />
        <AdminStatCardsSkeleton
          count={4}
          className="md:grid-cols-2 lg:grid-cols-4"
        />
        <AdminGenerationListSkeleton />
      </div>
    </AdminPageShell>
  );
}

export function AdminErrorListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-card flex flex-col gap-3 rounded-md border p-4"
        >
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function AdminErrorsPageSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <AdminStatCardsSkeleton count={3} className="md:grid-cols-3" />
        <AdminFiltersRowSkeleton filterCount={0} />
        <AdminErrorListSkeleton />
      </div>
    </AdminPageShell>
  );
}

export function AdminLogsListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="bg-card flex gap-4 rounded-md border p-4">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminLogsPageSkeleton() {
  return (
    <AdminPageShell size="xl">
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <AdminFiltersRowSkeleton filterCount={2} />
        <AdminLogsListSkeleton />
      </div>
    </AdminPageShell>
  );
}

export function AdminInspirationGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-video rounded-lg" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function AdminInspirationsPageSkeleton() {
  return (
    <AdminPageShell size="xl">
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <AdminFiltersRowSkeleton filterCount={1} />
        <AdminInspirationGridSkeleton />
      </div>
    </AdminPageShell>
  );
}

export function AdminFeedbackPageSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <AdminStatCardsSkeleton count={3} className="md:grid-cols-3" />
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCardSkeleton lines={4} hasFooter={false} />
          <AdminCardSkeleton lines={4} hasFooter={false} />
        </div>
        <AdminFiltersRowSkeleton filterCount={2} />
        <AdminTableSkeleton
          headers={[
            "Feedback",
            "Rating",
            "Status",
            "User",
            "Created",
            "Actions",
          ]}
        />
      </div>
    </AdminPageShell>
  );
}

export function AdminReferralsPageSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <AdminStatCardsSkeleton count={4} />
        <AdminCardSkeleton lines={4} hasFooter={false} />
        <AdminTableSkeleton
          headers={[
            "User",
            "Code",
            "Referrals",
            "Pending",
            "Credited",
            "Credits earned",
            "Joined",
          ]}
        />
        <AdminTableSkeleton
          headers={["Referrer", "Referred user", "Status", "Reward", "Date"]}
        />
      </div>
    </AdminPageShell>
  );
}

export function AdminFeatureFlagsPageSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton withAction />
        <AdminCardSkeleton lines={2} hasFooter={false} />
        <AdminCardSkeleton lines={3} hasFooter={false} />
        <AdminTableSkeleton
          headers={["Flag", "Status", "Updated", "Actions"]}
        />
      </div>
    </AdminPageShell>
  );
}

export function AdminFunnelPageSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <AdminStatCardsSkeleton count={4} />
        <AdminCardSkeleton lines={6} hasFooter={false} />
      </div>
    </AdminPageShell>
  );
}

export function AdminMigrationsPageSkeleton() {
  return AdminFunnelPageSkeleton();
}

export function AdminLeadsPageSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <AdminStatCardsSkeleton count={3} className="md:grid-cols-3" />
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCardSkeleton lines={4} hasFooter={false} />
          <AdminCardSkeleton lines={4} hasFooter={false} />
        </div>
        <AdminFiltersRowSkeleton filterCount={1} />
        <AdminTableSkeleton
          headers={["Lead", "Source", "Status", "Created", "Actions"]}
        />
      </div>
    </AdminPageShell>
  );
}

export function AdminOrgGenerationsPageSkeleton() {
  return (
    <AdminPageShell>
      <div className="flex flex-col gap-6">
        <AdminPageHeaderSkeleton />
        <Skeleton className="h-9 w-44 rounded-md" />
        <AdminTableSkeleton
          headers={["Prompt", "Model", "Status", "Credits", "Created", "Error"]}
        />
      </div>
    </AdminPageShell>
  );
}
