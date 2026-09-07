import { BookmarkIcon } from "lucide-react";

const ITEMS = [
  "Articles",
  "Videos",
  "Papers",
  "Threads",
  "Podcasts",
  "PDFs",
  "Repos",
  "Recipes",
  "Guides",
  "Talks",
];

export const MarqueeStrip = () => {
  return (
    <div
      className="marquee relative overflow-hidden border-y border-white/[0.07] bg-coal-deep py-5"
      aria-label="Save articles, videos, papers, threads, podcasts, PDFs, repos, recipes, guides and talks"
    >
      <div className="marquee-track flex w-max items-center" aria-hidden="true">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center">
            {ITEMS.map((item) => (
              <span
                key={`${copy}-${item}`}
                className="flex items-center gap-8 pr-8 sm:gap-12 sm:pr-12"
              >
                <span className="font-display text-xl italic tracking-tight text-dusk sm:text-2xl">
                  {item}
                </span>
                <BookmarkIcon className="size-3.5 fill-ember/70 text-ember/70" />
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-coal-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-coal-deep to-transparent" />
    </div>
  );
};
