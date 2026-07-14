import { buttonVariants } from "@/components/ui/button";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "@/compat/image";
import { FormattedPromptText } from "@/features/editor/formatted-prompt-text";
import { LoadingState } from "@/features/organization/loading-state";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { dayjs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type Person = {
  id: string;
  name: string;
  description?: string | null;
  images: string[];
};

type Inspiration = {
  id: string;
  name: string;
  thumbnailUrls: string[];
};

type OrgSummary = {
  stats: {
    thumbnailCount: number;
    promptCount: number;
  };
  analytics: {
    days: {
      date: string;
      promptCount: number;
      thumbnailCount: number;
      cumulativeThumbnails: number;
      active: boolean;
    }[];
    activeDays: number;
    promptsLast30Days: number;
    thumbnailsLast30Days: number;
    averageThumbnailsPerPrompt: number;
  };
  recentPrompts: {
    id: string;
    name: string | null;
    textPrompt: string;
    generations: {
      thumbnails: {
        id?: string;
        imageUrl: string | null;
      }[];
    }[];
  }[];
};

const valueChartConfig = {
  cumulativeThumbnails: {
    label: "Saved thumbnails",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function OrgDashboard(props: { orgSlug: string }) {
  const { orgSlug } = props;
  const summary = useQuery(api.app.orgSummary, { orgSlug }) as
    | OrgSummary
    | undefined;
  const onboardingStatus = useQuery(api.onboarding.status, { orgSlug }) as
    | { completedAt: number | null }
    | undefined;
  const personsData = useQuery(api.app.listPersons, { orgSlug }) as
    | Person[]
    | undefined;
  const inspirationsData = useQuery(api.app.listInspirations, { orgSlug }) as
    | { items: Inspiration[] }
    | undefined;
  const persons = personsData?.slice(0, 2);
  const inspirations = inspirationsData?.items.slice(0, 6);
  const shouldShowOnboarding =
    onboardingStatus !== undefined &&
    summary !== undefined &&
    !onboardingStatus.completedAt &&
    summary.stats.thumbnailCount === 0;

  useEffect(() => {
    if (shouldShowOnboarding) {
      window.location.replace(`/orgs/${orgSlug}/onboard`);
    }
  }, [orgSlug, shouldShowOnboarding]);

  if (!summary || !onboardingStatus || !persons || !inspirations) {
    return <OrgDashboardSkeleton />;
  }

  if (shouldShowOnboarding) {
    return <LoadingState label="Opening onboarding" />;
  }

  const recentThumbnails = summary.recentPrompts
    .flatMap((prompt) =>
      prompt.generations.flatMap((generation) =>
        generation.thumbnails.map((thumbnail) => ({ prompt, thumbnail })),
      ),
    )
    .filter((item) => item.thumbnail.imageUrl)
    .slice(0, 20);

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Dashboard</LayoutTitle>
      </LayoutHeader>
      <LayoutActions>
        <Link
          to={`/orgs/${orgSlug}/thumbnails/new` as never}
          className={buttonVariants()}
        >
          <Plus className="mr-1 size-4" />
          Create Thumbnail
        </Link>
      </LayoutActions>
      <LayoutContent className="flex flex-col gap-8">
        <section className="grid gap-4 lg:grid-cols-2">
          <CreationActivityCard analytics={summary.analytics} />
          <ValueDeliveredCard analytics={summary.analytics} />
        </section>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <AcademyLink href="/docs/guides/podcast-thumbnail">
            Podcast Thumbnails
          </AcademyLink>
          <AcademyLink href="/docs/guides/images-guide">
            Add Images to Thumbnails
          </AcademyLink>
          <AcademyLink href="/docs/guides/effective-prompting">
            How to Use Generations
          </AcademyLink>
          <AcademyLink href="/docs/guides/create-thumbnail">
            Create Thumbnails
          </AcademyLink>
        </section>

        <DashboardSection
          title="Persons"
          viewAllHref={`/orgs/${orgSlug}/persons`}
        >
          {persons.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {persons.map((person) => (
                <Link
                  key={person.id}
                  to={`/orgs/${orgSlug}/persons/${person.id}` as never}
                  className="group hover:bg-accent flex gap-3 rounded-lg border p-3 transition-colors"
                >
                  {person.images[0] ? (
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={person.images[0]}
                        alt={person.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-medium">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col justify-center">
                    <p className="truncate font-medium">{person.name}</p>
                    <p className="text-muted-foreground line-clamp-1 text-sm">
                      {person.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyDashboardState
              label="No persons yet"
              actionHref={`/orgs/${orgSlug}/persons`}
              actionLabel="Add Person"
            />
          )}
        </DashboardSection>

        <DashboardSection
          title="Inspirations"
          viewAllHref={`/orgs/${orgSlug}/inspirations?filter=all`}
        >
          {inspirations.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {inspirations.map((inspiration) => (
                <Link
                  key={inspiration.id}
                  to={
                    `/orgs/${orgSlug}/inspirations/${inspiration.id}` as never
                  }
                  className="group relative aspect-video overflow-hidden rounded-md"
                >
                  {inspiration.thumbnailUrls[0] ? (
                    <Image
                      src={inspiration.thumbnailUrls[0]}
                      alt={inspiration.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyDashboardState
              label="No inspirations yet"
              actionHref={`/orgs/${orgSlug}/inspirations`}
              actionLabel="Add Inspiration"
            />
          )}
        </DashboardSection>

        <DashboardSection
          title="Recent Generations"
          viewAllHref={`/orgs/${orgSlug}/thumbnails`}
        >
          {recentThumbnails.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {recentThumbnails.map(({ prompt, thumbnail }) => (
                <Link
                  key={thumbnail.id ?? `${prompt.id}-${thumbnail.imageUrl}`}
                  to={`/orgs/${orgSlug}/thumbnails/${prompt.id}` as never}
                  className="group relative aspect-video min-w-0 overflow-hidden rounded-lg border"
                >
                  <Image
                    src={thumbnail.imageUrl ?? ""}
                    alt={prompt.name ?? "Generated thumbnail"}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs font-medium text-white">
                      {prompt.name ?? (
                        <FormattedPromptText
                          variant="onDark"
                          text={prompt.textPrompt}
                        />
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyDashboardState
              label="No generations yet"
              actionHref={`/orgs/${orgSlug}/thumbnails/new`}
              actionLabel="Create Your First Thumbnail"
              primary
            />
          )}
        </DashboardSection>
      </LayoutContent>
    </Layout>
  );
}

export function OrgDashboardSkeleton() {
  return (
    <Layout aria-label="Loading dashboard" role="status" size="lg">
      <LayoutHeader>
        <LayoutTitle>Dashboard</LayoutTitle>
      </LayoutHeader>
      <LayoutActions>
        <Skeleton className="h-9 w-36 rounded-md" />
      </LayoutActions>
      <LayoutContent className="flex flex-col gap-8">
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              className="flex h-[70px] items-center gap-3 rounded-lg border p-3"
              key={item}
            >
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <Card className="py-0" key={item}>
              <CardHeader className="border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </CardHeader>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </section>

        <DashboardSectionSkeleton
          columnsClassName="grid gap-3 sm:grid-cols-2"
          itemCount={2}
          titleWidth="w-20"
        >
          <PersonCardSkeleton />
        </DashboardSectionSkeleton>

        <DashboardSectionSkeleton
          columnsClassName="grid grid-cols-3 gap-2 sm:grid-cols-6"
          itemCount={6}
          titleWidth="w-28"
        >
          <Skeleton className="aspect-video w-full rounded-md" />
        </DashboardSectionSkeleton>

        <DashboardSectionSkeleton
          columnsClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          itemCount={10}
          titleWidth="w-36"
        >
          <Skeleton className="aspect-video w-full rounded-lg" />
        </DashboardSectionSkeleton>
      </LayoutContent>
    </Layout>
  );
}

function CreationActivityCard(props: { analytics: OrgSummary["analytics"] }) {
  const totalDays = props.analytics.days.length;

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0">
          <CardTitle className="text-sm">Creation activity</CardTitle>
          <CardDescription>Last {totalDays} days</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-lg leading-none font-semibold">
            {props.analytics.activeDays}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">active days</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div
          aria-label={`Creation activity over the last ${totalDays} days`}
          className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-0.5"
        >
          {props.analytics.days.map((day) => {
            const count = day.promptCount;
            const label = `${dayjs.utc(day.date).format("MMM D")}: ${
              day.promptCount > 0 || day.thumbnailCount > 0
                ? `${day.promptCount} prompts, ${day.thumbnailCount} thumbnails`
                : "no creation"
            }`;

            return (
              <div
                aria-label={label}
                className={cn(
                  "h-9 rounded-[3px] transition-colors",
                  count > 0
                    ? "bg-[var(--chart-2)]"
                    : "bg-muted/60 hover:bg-muted",
                )}
                key={day.date}
                style={{ opacity: getActivityOpacity(count) }}
                title={label}
              />
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          {props.analytics.promptsLast30Days.toLocaleString()} prompts ·{" "}
          {props.analytics.thumbnailsLast30Days.toLocaleString()} delivered
        </p>
      </CardContent>
    </Card>
  );
}

function ValueDeliveredCard(props: { analytics: OrgSummary["analytics"] }) {
  const average = props.analytics.averageThumbnailsPerPrompt;

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0">
          <CardTitle className="text-sm">Value delivered</CardTitle>
          <CardDescription>Usable thumbnails</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-lg leading-none font-semibold">
            {props.analytics.thumbnailsLast30Days.toLocaleString()}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">last 30 days</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-2 pt-4 pb-4 sm:px-4">
        <ChartContainer
          config={valueChartConfig}
          className="aspect-auto h-24 w-full"
        >
          <AreaChart
            accessibilityLayer
            data={props.analytics.days}
            margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="2 6" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              hide
              minTickGap={32}
              tickFormatter={(value) =>
                dayjs.utc(String(value)).format("MMM D")
              }
              tickLine={false}
              tickMargin={8}
            />
            <YAxis allowDecimals={false} hide />
            <ChartTooltip
              content={(chartProps) => (
                <ChartTooltipContent
                  {...chartProps}
                  labelFormatter={(value) =>
                    dayjs.utc(String(value)).format("MMM D, YYYY")
                  }
                />
              )}
            />
            <Area
              dataKey="cumulativeThumbnails"
              fill="var(--color-cumulativeThumbnails)"
              fillOpacity={0.18}
              stroke="var(--color-cumulativeThumbnails)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
        <p className="text-muted-foreground px-2 text-xs sm:px-0">
          {average.toFixed(1)} thumbnails per prompt
        </p>
      </CardContent>
    </Card>
  );
}

function getActivityOpacity(count: number) {
  if (count <= 0) return 1;
  if (count === 1) return 0.45;
  if (count <= 3) return 0.65;
  if (count <= 6) return 0.82;
  return 1;
}

function DashboardSectionSkeleton(props: {
  titleWidth: string;
  columnsClassName: string;
  itemCount: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className={`h-6 ${props.titleWidth}`} />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className={props.columnsClassName}>
        {Array.from({ length: props.itemCount }, (_, index) => (
          <div key={index}>{props.children}</div>
        ))}
      </div>
    </section>
  );
}

function PersonCardSkeleton() {
  return (
    <div className="flex h-[82px] gap-3 rounded-lg border p-3">
      <Skeleton className="size-14 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3.5 w-44 max-w-full" />
      </div>
    </div>
  );
}

function AcademyLink(props: { href: string; children: ReactNode }) {
  return (
    <Link
      to={props.href as never}
      className="group hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      <BookOpen className="text-muted-foreground size-5" />
      <span className="text-sm font-medium">{props.children}</span>
    </Link>
  );
}

function DashboardSection(props: {
  title: string;
  viewAllHref: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{props.title}</h2>
        <Link
          to={props.viewAllHref as never}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          View All
          <ArrowRight className="ml-1 size-4" />
        </Link>
      </div>
      {props.children}
    </section>
  );
}

function EmptyDashboardState(props: {
  label: string;
  actionHref: string;
  actionLabel: string;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
      <p className="text-muted-foreground mb-3 text-sm">{props.label}</p>
      <Link
        to={props.actionHref as never}
        className={buttonVariants({
          variant: props.primary ? "default" : "outline",
          size: "sm",
        })}
      >
        <Plus className="mr-1 size-4" />
        {props.actionLabel}
      </Link>
    </div>
  );
}
