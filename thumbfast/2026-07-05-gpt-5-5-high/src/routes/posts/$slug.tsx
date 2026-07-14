import { BaseLayout } from "@/features/layout/base-layout";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { calculateReadingTime } from "@/features/posts/calculate-reading-time";
import { PostCard } from "@/features/posts/post-card";
import { getCurrentPost, getPosts } from "@/features/posts/post-manager";
import { formatDate } from "@/lib/format/date";
import { createPageHead } from "@/lib/metadata";
import { SiteConfig } from "@/site-config";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import Image from "@/compat/image";
import type { ReactNode } from "react";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const [post, posts] = await Promise.all([
      getCurrentPost(params.slug),
      getPosts(),
    ]);
    if (!post) throw notFound();
    const relatedPosts = posts
      .filter((p) => p.slug !== params.slug)
      .slice(0, 3);
    return { post, relatedPosts };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return createPageHead({
        title: "Blog",
        description:
          "Read practical thumbnail strategy, AI workflow, and YouTube growth notes from Thumbfa.st.",
        path: "/posts",
      });
    }

    return createPageHead({
      title: loaderData.post.attributes.title,
      description: loaderData.post.attributes.description,
      keywords: loaderData.post.attributes.keywords,
      image: loaderData.post.attributes.coverUrl,
      path: `/posts/${loaderData.post.slug}`,
      type: "article",
    });
  },
  component: PostRoute,
});

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
        {label}
      </span>
      <span className="text-foreground text-sm">{children}</span>
    </div>
  );
}

function PostRoute() {
  const { post, relatedPosts } = Route.useLoaderData();
  const readingTime = calculateReadingTime(post.content);
  const firstTag = post.attributes.tags?.[0];

  return (
    <BaseLayout>
      <article className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16 lg:py-20">
        <nav
          aria-label="Breadcrumb"
          className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
        >
          <Link to="/posts" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          {firstTag ? (
            <>
              <span className="text-muted-foreground/40">/</span>
              <Link
                to="/posts/categories/$category"
                params={{ category: firstTag }}
                className="text-foreground hover:underline"
              >
                {firstTag}
              </Link>
            </>
          ) : null}
        </nav>

        <h1 className="text-center text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl lg:text-6xl">
          {post.attributes.title}
        </h1>

        <div className="relative aspect-video w-full overflow-hidden rounded-xl border">
          <Image
            src={post.attributes.coverUrl}
            alt={post.attributes.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {post.attributes.description ? (
          <p className="text-foreground text-lg leading-relaxed">
            {post.attributes.description}
          </p>
        ) : null}

        <div className="border-border grid grid-cols-1 gap-6 border-y py-6 sm:grid-cols-3">
          <MetaCell label="Date">{formatDate(post.attributes.date)}</MetaCell>
          <MetaCell label="Author">{SiteConfig.team.name}</MetaCell>
          <MetaCell label="Reading time">{readingTime} min read</MetaCell>
        </div>

        <div className="typography">
          <ServerMdx source={post.content} />
        </div>

        {relatedPosts.length > 0 && (
          <section className="border-border mt-8 flex flex-col gap-6 border-t pt-10">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Related Posts
            </h2>
            <div className="flex flex-col gap-3">
              {relatedPosts.map((relatedPost) => (
                <PostCard
                  key={relatedPost.slug}
                  post={relatedPost}
                  variant="compact"
                />
              ))}
            </div>
          </section>
        )}
      </article>
    </BaseLayout>
  );
}
