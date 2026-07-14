import { Typography } from "@/components/nowts/typography";
import { BaseLayout } from "@/features/layout/base-layout";
import { getChangelogs } from "@/features/changelog/changelog-manager";
import { ChangelogTimeline } from "@/features/changelog/changelog-timeline";
import { createPageHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";

type ChangelogSearch = {
  entry?: string;
};

export const Route = createFileRoute("/changelog/")({
  validateSearch: (search: Record<string, unknown>): ChangelogSearch => ({
    entry:
      typeof search.entry === "string" && search.entry.length > 0
        ? search.entry
        : undefined,
  }),
  loader: async () => getChangelogs(),
  component: ChangelogIndexRoute,
  head: () =>
    createPageHead({
      title: "Changelog",
      description:
        "Stay up to date with Thumbfa.st features, improvements, and fixes.",
      path: "/changelog",
    }),
});

function ChangelogIndexRoute() {
  const changelogs = Route.useLoaderData();
  const { entry } = Route.useSearch();

  return (
    <BaseLayout>
      <div className="px-6 py-16">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Changelog
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Stay up to date with the latest features, improvements, and bug
            fixes.
          </p>
        </header>

        {changelogs.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-xl border-2 border-dashed p-12">
            <FileQuestion className="text-muted-foreground mb-4 size-16" />
            <Typography variant="h3">No changelog entries yet</Typography>
            <Typography variant="muted" className="mt-2">
              Check back soon for updates.
            </Typography>
          </div>
        ) : (
          <ChangelogTimeline
            changelogs={changelogs}
            selectedSlug={entry}
            className="mx-auto max-w-2xl"
          />
        )}
      </div>
    </BaseLayout>
  );
}
