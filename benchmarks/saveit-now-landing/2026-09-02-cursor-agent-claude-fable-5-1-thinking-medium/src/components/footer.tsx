const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#workflow" },
      { label: "iOS app", href: "/ios" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Documentation", href: "/docs" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "All tools", href: "/tools" },
      { label: "OG images", href: "/tools/og-images" },
      { label: "Extract metadata", href: "/tools/extract-metadata" },
      { label: "Extract content", href: "/tools/extract-content" },
      { label: "YouTube metadata", href: "/tools/youtube-metadata" },
    ],
  },
  {
    title: "Compare",
    links: [
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
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/posts" },
      { label: "Contact", href: "/contact" },
      {
        label: "X (Twitter)",
        href: "https://twitter.com/saveitnow",
        external: true,
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-10 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <a href="#top" className="inline-flex items-center gap-2.5 text-cream">
              <span className="relative flex size-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-ember-2 via-ember to-rose">
                <span className="absolute inset-[3px] rounded-[6px] border border-white/40" />
                <span className="relative size-2 rounded-full bg-cream" />
              </span>
              <span className="font-display text-[24px] leading-none tracking-tight">
                SaveIt.now
              </span>
            </a>
            <p className="mt-4 max-w-xs text-[14.5px] leading-relaxed text-dune">
              Your home for bookmarks. Save anything once, and the agent
              captures, understands, organizes, and brings it back when you ask.
            </p>
            <a
              href="mailto:hi@saveit.now"
              className="mt-5 inline-block text-[14px] text-sand underline decoration-white/20 underline-offset-4 transition-colors hover:text-cream hover:decoration-ember"
            >
              hi@saveit.now
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h3 className="text-[12px] font-medium tracking-[0.12em] text-sand uppercase">
                  {column.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...("external" in link && link.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="text-[14px] text-dune transition-colors hover:text-cream"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-[13px] text-dune sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} SaveIt.now. All rights reserved.</p>
          <nav aria-label="Legal" className="flex gap-6">
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
