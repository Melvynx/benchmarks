import { Typography } from "@/components/nowts/typography";
import { buttonVariants } from "@/components/ui/button";
import { BaseLayout } from "@/features/layout/base-layout";
import { BlogToolbar } from "@/features/posts/blog-toolbar";
import { PostCard } from "@/features/posts/post-card";
import { PostCardSkeleton } from "@/features/posts/post-card-skeleton";
import { getPosts, getPostsTags } from "@/features/posts/post-manager";
import { createPageHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import Link from "@/compat/link";

export const Route = createFileRoute("/posts/categories/$category")({
  loader: async ({ params }) => {
    const [tags, posts] = await Promise.all([
      getPostsTags(),
      getPosts([params.category]),
    ]);
    return { tags, posts };
  },
  component: PostCategoryRoute,
  pendingComponent: PostCategorySkeleton,
  head: ({ params }) => {
    const category = formatCategoryName(params.category);
    return createPageHead({
      title: `${category} Articles`,
      description: `Read ${category.toLowerCase()} articles from Thumbfa.st.`,
      path: `/posts/categories/${params.category}`,
    });
  },
});

function formatCategoryName(category: string) {
  return category
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PostCategoryRoute() {
  const { category } = Route.useParams();
  const { tags, posts } = Route.useLoaderData();

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
          <BlogToolbar tags={tags} activeCategory={category} />
        </header>

        {posts.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center">
            <FileQuestion className="text-muted-foreground mb-4 size-12" />
            <Typography variant="h3">No posts in this category</Typography>
            <Link className={buttonVariants({ variant: "link" })} href="/posts">
              View all posts
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </BaseLayout>
  );
}

function PostCategorySkeleton() {
  return (
    <BaseLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 lg:py-20">
        <header className="flex flex-col gap-8">
          <div className="bg-muted h-16 w-40 rounded-md md:h-20" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-muted h-8 w-20 rounded-full" />
            ))}
          </div>
        </header>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <PostCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </BaseLayout>
  );
}
