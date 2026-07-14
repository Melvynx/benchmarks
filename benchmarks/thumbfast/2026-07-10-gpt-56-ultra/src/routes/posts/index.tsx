import { Typography } from "@/components/nowts/typography";
import { BaseLayout } from "@/features/layout/base-layout";
import { BlogToolbar } from "@/features/posts/blog-toolbar";
import { PostCard } from "@/features/posts/post-card";
import { PostCardSkeleton } from "@/features/posts/post-card-skeleton";
import { getPosts, getPostsTags } from "@/features/posts/post-manager";
import { createPageHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";

export const Route = createFileRoute("/posts/")({
  loader: async () => {
    const [posts, tags] = await Promise.all([getPosts(), getPostsTags()]);
    return { posts, tags };
  },
  component: PostsIndexRoute,
  pendingComponent: PostsIndexSkeleton,
  head: () =>
    createPageHead({
      title: "Blog",
      description:
        "Read practical thumbnail strategy, AI workflow, and YouTube growth notes from Thumbfa.st.",
      path: "/posts",
    }),
});

function PostsIndexRoute() {
  const { posts, tags } = Route.useLoaderData();
  const featured = posts.slice(0, 2);
  const rest = posts.slice(2);

  return (
    <BaseLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 lg:py-20">
        <header className="flex flex-col gap-8">
          <Typography
            variant="h1"
            className="text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl"
          >
            Blog
          </Typography>
          <BlogToolbar tags={tags} />
        </header>

        {posts.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center">
            <FileQuestion className="text-muted-foreground mb-4 size-12" />
            <Typography variant="h3">No posts yet</Typography>
            <Typography variant="muted" className="mt-2">
              Check back soon for our first articles.
            </Typography>
          </div>
        ) : (
          <>
            <section className="grid gap-6 md:grid-cols-2">
              {featured.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </section>

            {rest.length > 0 && (
              <section className="flex flex-col gap-6">
                <Typography
                  variant="h2"
                  className="text-2xl font-semibold tracking-tight md:text-3xl"
                >
                  More Articles
                </Typography>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </BaseLayout>
  );
}

function PostsIndexSkeleton() {
  return (
    <BaseLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 lg:py-20">
        <header className="flex flex-col gap-8">
          <div className="bg-muted h-16 w-40 rounded-md md:h-20" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="bg-muted h-8 w-20 rounded-full" />
              ))}
            </div>
            <div className="bg-muted size-9 rounded-md" />
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <PostCardSkeleton key={index} />
          ))}
        </section>
      </div>
    </BaseLayout>
  );
}
