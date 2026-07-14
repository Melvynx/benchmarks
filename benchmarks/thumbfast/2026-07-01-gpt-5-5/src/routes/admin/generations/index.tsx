import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Layout, LayoutContent } from "@/features/page/layout";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Hash,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  ScrollText,
  XCircle,
} from "lucide-react";
import { z } from "zod";
import {
  AdminPageHeader,
  AdminPagination,
  AdminSearch,
} from "../_components/admin-shared";
import { OrganizationFilterSelect } from "../_components/organization-filter-select";
import {
  AdminGenerationGridSkeleton,
  AdminGenerationListSkeleton,
  AdminGenerationsPageSkeleton,
} from "../_components/admin-skeletons";
import {
  AdminGenerationList,
  EmptyGenerations,
  GENERATION_VIEWS,
  type GenerationListData,
  type GenerationView,
} from "@/features/admin/admin-generation-list";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
] as const;

export const Route = createFileRoute("/admin/generations/")({
  validateSearch: z.object({
    search: z.string().optional().default(""),
    organization: z.string().optional().default(""),
    status: z.string().optional(),
    page: z.number().optional().default(1),
    view: z.enum(GENERATION_VIEWS).optional().default("list"),
  }),
  component: AdminGenerationsRoute,
  pendingComponent: AdminGenerationsPageSkeleton,
});

function AdminGenerationsRoute() {
  const search = useSearch({ from: "/admin/generations/" });
  const navigate = useNavigate({ from: "/admin/generations/" });
  const generationData = useQuery(api.admin.queries.listGenerations, {
    search: search.search || undefined,
    organizationSearch: search.organization || undefined,
    status: search.status,
    page: search.page,
    pageSize: 20,
  });
  const generations = generationData?.items;
  const summary = generationData?.summary;
  const total = generationData?.total ?? 0;
  const totalPages = generationData?.totalPages ?? 1;
  const page = generationData?.page ?? search.page;

  return (
    <Layout size="xl">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Generations"
            description="Browse every generation job with the prompt, model, status, and outputs."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/generations/logs">
                    <ScrollText className="size-4" />
                    API logs
                  </Link>
                </Button>
              </div>
            }
          />

          <GenerationSummary
            summary={summary}
            visibleCount={generations?.length}
          />

          <div className="flex flex-wrap items-center gap-3">
            <AdminSearch
              value={search.search}
              placeholder="Search prompt, model, user, or id..."
              onChange={(value) =>
                void navigate({
                  search: (prev) => ({ ...prev, search: value, page: 1 }),
                })
              }
            />
            <OrganizationFilterSelect
              value={search.organization}
              onChange={(value) =>
                void navigate({
                  search: (prev) => ({ ...prev, organization: value, page: 1 }),
                })
              }
            />
            <div className="flex flex-wrap items-center gap-1 rounded-lg border p-1">
              {STATUS_FILTERS.map((filter) => {
                const isActive =
                  (search.status ?? "") === filter.value ||
                  (!search.status && filter.value === "");
                return (
                  <Button
                    key={filter.label}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() =>
                      void navigate({
                        search: (prev) => ({
                          ...prev,
                          status: filter.value || undefined,
                          page: 1,
                        }),
                      })
                    }
                  >
                    {filter.label}
                  </Button>
                );
              })}
            </div>
            <ToggleGroup
              type="single"
              value={search.view}
              onValueChange={(value) => {
                if (!value) return;
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    view: value as GenerationView,
                  }),
                });
              }}
              className="rounded-lg border p-1"
            >
              <ToggleGroupItem
                value="list"
                aria-label="List view"
                className="size-8 p-0"
              >
                <List className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="grid"
                aria-label="Grid view"
                className="size-8 p-0"
              >
                <LayoutGrid className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {generations === undefined ? (
            search.view === "grid" ? (
              <AdminGenerationGridSkeleton />
            ) : (
              <AdminGenerationListSkeleton />
            )
          ) : generations.length === 0 ? (
            <EmptyGenerations />
          ) : (
            <>
              <AdminGenerationList
                generations={generations}
                view={search.view}
              />
              <AdminPagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={20}
                onPageChange={(nextPage) =>
                  void navigate({
                    search: (prev) => ({ ...prev, page: nextPage }),
                  })
                }
              />
            </>
          )}
        </div>
      </LayoutContent>
    </Layout>
  );
}

function GenerationSummary(props: {
  summary: GenerationListData["summary"] | undefined;
  visibleCount: number | undefined;
}) {
  const summary = props.summary;
  const items = [
    { label: "Matching", value: summary?.total, icon: Hash },
    { label: "Succeeded", value: summary?.succeeded, icon: CheckCircle2 },
    { label: "Failed", value: summary?.failed, icon: XCircle },
    { label: "In flight", value: summary?.inFlight, icon: Loader2 },
  ];

  return (
    <div className="rounded-lg border">
      <div className="bg-border grid gap-px sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-card flex items-center gap-3 p-3"
            >
              <Icon className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0">
                <div className="text-lg font-semibold">{item.value ?? "-"}</div>
                <div className="text-muted-foreground text-xs">
                  {item.label}
                </div>
              </div>
            </div>
          );
        })}
        <div className="bg-card flex items-center gap-3 p-3">
          <ImageIcon className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0">
            <div className="text-lg font-semibold">
              {props.visibleCount ?? "-"}
            </div>
            <div className="text-muted-foreground text-xs">This page</div>
          </div>
        </div>
      </div>
    </div>
  );
}




