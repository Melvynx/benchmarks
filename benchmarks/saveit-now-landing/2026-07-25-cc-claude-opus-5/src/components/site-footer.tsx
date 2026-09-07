import { APP_URL, CONTACT_EMAIL, NAV_SECTIONS } from "../lib/site";

/** Absolute, because this page is served standalone from the main app. */
const app = (path: string) => `${APP_URL}${path}`;

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "iOS app", href: app("/ios") },
      { label: "Extensions", href: app("/extensions") },
      { label: "Documentation", href: app("/docs") },
      { label: "Changelog", href: app("/changelog") },
      { label: "Blog", href: app("/posts") },
    ],
  },
  {
    heading: "Tools",
    links: [
      { label: "All tools", href: app("/tools") },
      { label: "OG images", href: app("/tools/og-images") },
      { label: "Extract metadata", href: app("/tools/extract-metadata") },
      { label: "Extract content", href: app("/tools/extract-content") },
      { label: "YouTube metadata", href: app("/tools/youtube-metadata") },
    ],
  },
  {
    heading: "Compare",
    links: [
      { label: "vs Pocket", href: app("/posts/saveit-vs-pocket-comparison") },
      { label: "vs MyMind", href: app("/posts/saveit-vs-mymind-comparison") },
      {
        label: "vs Raindrop.io",
        href: app("/posts/saveit-vs-raindrop-comparison"),
      },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: app("/about") },
      { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
      { label: "X / Twitter", href: "https://twitter.com/saveitnow" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-lilac/10 bg-ink">
      <div className="mx-auto max-w-[88rem] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <a
              href="#top"
              className="flex items-center gap-2.5 text-glow transition-opacity hover:opacity-80"
            >
              <span aria-hidden="true" className="relative flex size-2.5">
                <span className="absolute inset-0 rounded-full bg-ember blur-[3px]" />
                <span className="absolute inset-0 rounded-full bg-amber" />
              </span>
              <span className="font-display text-[19px]">SaveIt.now</span>
            </a>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted">
              Your home for bookmarks. Save it once, and find it in your own
              words for as long as you keep it.
            </p>

            <nav aria-label="Page sections" className="mt-8">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {NAV_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-[13px] text-faint transition-colors hover:text-cream"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="eyebrow text-faint">{column.heading}</h2>
                <ul className="mt-5 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target={
                          link.href.startsWith("mailto:") ? undefined : "_blank"
                        }
                        rel={
                          link.href.startsWith("mailto:")
                            ? undefined
                            : "noreferrer"
                        }
                        className="text-[14px] text-muted transition-colors hover:text-glow"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-lilac/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-faint">
            © {new Date().getFullYear()} SaveIt.now. All rights reserved.
          </p>
          <nav aria-label="Legal">
            <ul className="flex gap-6">
              <li>
                <a
                  href={app("/privacy")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] text-faint transition-colors hover:text-cream"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href={app("/terms")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] text-faint transition-colors hover:text-cream"
                >
                  Terms
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
