import { links } from "../lib/links";

const columns = [
  {
    title: "Product",
    items: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "iOS app", href: links.ios },
      { label: "Browser extension", href: links.extensions },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Documentation", href: links.docs },
      { label: "Blog", href: "/posts" },
      { label: "All tools", href: "/tools" },
      { label: "Extract metadata", href: "/tools/extract-metadata" },
      { label: "YouTube metadata", href: "/tools/youtube-metadata" },
    ],
  },
  {
    title: "Compare",
    items: [
      { label: "vs Pocket", href: "/posts/saveit-vs-pocket-comparison" },
      { label: "vs MyMind", href: "/posts/saveit-vs-mymind-comparison" },
      { label: "vs Raindrop.io", href: "/posts/saveit-vs-raindrop-comparison" },
      {
        label: "Best bookmark managers",
        href: "/posts/best-bookmark-managers-2024-complete-guide",
      },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      {
        label: "Twitter",
        href: "https://twitter.com/saveitnow",
        external: true,
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.2fr_2fr]">
          <div>
            <a href="/" className="font-display text-2xl text-cream">
              SaveIt<span className="text-ember">.</span>now
            </a>
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-mist">
              Your home for bookmarks. Save it once, and the agent makes sure
              you can find it again.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((column) => (
              <nav
                key={column.title}
                aria-label={column.title}
                className="flex flex-col gap-3"
              >
                <h3 className="text-[13px] font-medium uppercase tracking-[0.14em] text-cream/70">
                  {column.title}
                </h3>
                {column.items.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={"external" in item && item.external ? "_blank" : undefined}
                    rel={
                      "external" in item && item.external
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="text-[14px] text-mist transition-colors hover:text-cream"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-[13px] text-dim md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} SaveIt.now. All rights reserved.
          </p>
          <nav className="flex gap-6" aria-label="Legal">
            <a href="/privacy" className="transition-colors hover:text-cream">
              Privacy policy
            </a>
            <a href="/terms" className="transition-colors hover:text-cream">
              Terms of service
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
