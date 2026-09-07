const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/posts", label: "Blog" },
      { href: "/docs", label: "Documentation" },
      { href: "/changelog", label: "Changelog" },
      { href: "/ios", label: "iOS app" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/tools", label: "All tools" },
      { href: "/tools/og-images", label: "OG Images" },
      { href: "/tools/extract-metadata", label: "Extract Metadata" },
      { href: "/tools/extract-content", label: "Extract Content" },
      { href: "/tools/extract-favicons", label: "Extract Favicons" },
      { href: "/tools/youtube-metadata", label: "YouTube Metadata" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      {
        href: "https://twitter.com/saveitnow",
        label: "Twitter",
        external: true,
      },
    ],
  },
  {
    title: "Compare",
    links: [
      { href: "/posts/saveit-vs-pocket-comparison", label: "vs Pocket" },
      { href: "/posts/saveit-vs-mymind-comparison", label: "vs MyMind" },
      { href: "/posts/saveit-vs-raindrop-comparison", label: "vs Raindrop.io" },
      {
        href: "/posts/best-bookmark-managers-2024-complete-guide",
        label: "Best bookmark managers",
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-ink pb-10">
      <div className="mx-auto max-w-6xl px-6 pt-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_2fr]">
          <div className="flex flex-col gap-4">
            <a href="/" className="font-display text-2xl tracking-tight text-cream">
              SaveIt<span className="text-ember">.now</span>
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-cream/50">
              Your home for bookmarks. Save once, and an agent captures,
              organizes, and rediscovers it for you.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-4">
                <h4 className="text-[13px] font-medium tracking-wide text-cream/80 uppercase">
                  {column.title}
                </h4>
                <nav
                  className="flex flex-col gap-2.5"
                  aria-label={column.title}
                >
                  {column.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-sm text-cream/45 transition-colors hover:text-cream"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-cream/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-cream/40">
            © {new Date().getFullYear()} SaveIt.now. All rights reserved.
          </p>
          <nav className="flex gap-6" aria-label="Legal">
            <a
              href="/privacy"
              className="text-sm text-cream/40 transition-colors hover:text-cream"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-sm text-cream/40 transition-colors hover:text-cream"
            >
              Terms of Service
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
