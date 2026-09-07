import { LINKS, SECTIONS } from "../lib/links";
import { Container, GlowRule } from "./ui";

type Column = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

const COLUMNS: Column[] = [
  {
    title: "Product",
    links: [
      { label: "Browser extension", href: LINKS.extensions },
      { label: "iOS app", href: LINKS.ios },
      { label: "Documentation", href: LINKS.docs },
      { label: "Changelog", href: LINKS.changelog },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "All tools", href: LINKS.tools },
      { label: "OG images", href: `${LINKS.tools}/og-images` },
      { label: "Extract metadata", href: `${LINKS.tools}/extract-metadata` },
      { label: "Extract favicons", href: `${LINKS.tools}/extract-favicons` },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Blog", href: LINKS.blog },
      { label: "About", href: LINKS.about },
      { label: "Contact", href: LINKS.contact },
      { label: "Twitter", href: LINKS.twitter },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line bg-ink pb-10 pt-20">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <a
              href="#top"
              className="font-display text-2xl tracking-tight text-cream transition-opacity hover:opacity-80"
            >
              SaveIt<span className="text-ember-400">.</span>now
            </a>
            <p className="mt-4 max-w-xs text-pretty text-[0.9375rem] leading-relaxed text-mist">
              Your home for bookmarks. Save it once, and find it whenever you
              need it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {/* The in-page nav is repeated here so the footer is a real way
                back around the page, not just an outbound link dump. */}
            <nav aria-label="Sections">
              <h2 className="text-[0.8125rem] font-medium text-cream">
                Explore
              </h2>
              <ul className="mt-4 space-y-3">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-[0.875rem] text-haze transition-colors hover:text-cream"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-[0.8125rem] font-medium text-cream">
                  {column.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[0.875rem] text-haze transition-colors hover:text-cream"
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

        <GlowRule className="mt-16" />

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8125rem] text-haze">
            © {year} SaveIt.now. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex gap-6">
            <a
              href={LINKS.privacy}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[0.8125rem] text-haze transition-colors hover:text-cream"
            >
              Privacy
            </a>
            <a
              href={LINKS.terms}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[0.8125rem] text-haze transition-colors hover:text-cream"
            >
              Terms
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
