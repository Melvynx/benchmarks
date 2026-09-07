import { BookmarkIcon } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "The promise", href: "#promise" },
      { label: "iOS app", href: "/ios" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/posts" },
      { label: "Documentation", href: "/docs" },
      { label: "Changelog", href: "/changelog" },
      { label: "Tools", href: "/tools" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Twitter", href: "https://twitter.com/saveitnow" },
    ],
  },
  {
    title: "Compare",
    links: [
      { label: "vs Pocket", href: "/posts/saveit-vs-pocket-comparison" },
      { label: "vs MyMind", href: "/posts/saveit-vs-mymind-comparison" },
      { label: "vs Raindrop", href: "/posts/saveit-vs-raindrop-comparison" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-coal-deep">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-ember text-coal">
                <BookmarkIcon className="size-4 fill-current" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-ink">
                SaveIt.now
              </span>
            </a>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-haze">
              Your home for bookmarks. Save it once, and your agent keeps it
              findable forever.
            </p>
            <p className="mt-6 font-display text-lg italic text-dusk">
              Save it. That is the whole job.
            </p>
          </div>

          <nav
            className="grid grid-cols-2 gap-10 sm:grid-cols-4"
            aria-label="Footer"
          >
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-dusk">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-haze transition-colors duration-200 hover:text-ink"
                        {...(link.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/[0.07] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-haze">
            © {new Date().getFullYear()} SaveIt.now. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="/privacy"
              className="text-[13px] text-haze transition-colors hover:text-ink"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-[13px] text-haze transition-colors hover:text-ink"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
