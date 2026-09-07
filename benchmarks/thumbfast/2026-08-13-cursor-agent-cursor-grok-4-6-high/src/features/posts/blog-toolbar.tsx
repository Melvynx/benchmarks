import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Rss } from "lucide-react";

type BlogToolbarProps = {
  tags: string[];
  activeCategory?: string;
};

const pillClass = (active: boolean) =>
  cn(
    "inline-flex items-center rounded-full border px-3.5 py-1 text-sm transition-colors",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function BlogToolbar({ tags, activeCategory }: BlogToolbarProps) {
  const isAllActive = !activeCategory;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <nav className="flex flex-wrap items-center gap-2">
        <Link to="/posts" className={pillClass(isAllActive)}>
          All
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag}
            to="/posts/categories/$category"
            params={{ category: tag }}
            className={pillClass(tag === activeCategory)}
          >
            {tag}
          </Link>
        ))}
      </nav>

      <a
        href="/feed.xml"
        aria-label="RSS feed"
        className="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors"
      >
        <Rss className="size-4" />
      </a>
    </div>
  );
}
