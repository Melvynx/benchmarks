import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BaseLayout } from "@/features/layout/base-layout";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { getCurrentChangelog } from "@/features/changelog/changelog-manager";
import { formatDate } from "@/lib/format/date";
import { createPageHead } from "@/lib/metadata";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";

export const Route = createFileRoute("/changelog/$slug")({
  loader: async ({ params }) => {
    const changelog = await getCurrentChangelog(params.slug);
    if (!changelog) throw notFound();
    return changelog;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return createPageHead({
        title: "Changelog",
        description:
          "Stay up to date with Thumbfa.st features, improvements, and fixes.",
        path: "/changelog",
      });
    }

    const title =
      loaderData.attributes.title ?? formatDate(loaderData.attributes.date);

    return createPageHead({
      title,
      description: `Release notes and product updates for ${title}.`,
      image: loaderData.attributes.image,
      path: `/changelog/${loaderData.slug}`,
      type: "article",
    });
  },
  component: ChangelogDetailRoute,
});

function ChangelogDetailRoute() {
  const changelog = Route.useLoaderData();
  const title =
    changelog.attributes.title ?? formatDate(changelog.attributes.date);

  return (
    <BaseLayout>
      <article
        className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16 lg:py-20"
        data-changelog-detail
      >
        <Link
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "w-fit",
          })}
          href="/changelog"
        >
          <ArrowLeft className="size-4" />
          Back to changelog
        </Link>

        {changelog.attributes.image && (
          <div className="relative aspect-video min-h-44 overflow-hidden rounded-xl border">
            <Image
              src={changelog.attributes.image}
              alt={title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <header className="flex flex-col gap-5 border-b pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="size-3" />
              {formatDate(changelog.attributes.date)}
            </Badge>
            {changelog.attributes.version && (
              <Badge variant="outline" className="gap-1">
                <Tag className="size-3" />v{changelog.attributes.version}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
            {title}
          </h1>
        </header>

        <div className="typography">
          <ServerMdx source={changelog.content} />
        </div>
      </article>
    </BaseLayout>
  );
}
