import { Layout, LayoutContent } from "@/features/page/layout";
import { SiteConfig } from "@/site-config";
import Link from "@/compat/link";

const LINKS = [
  { label: "Blog", href: "/posts" },
  { label: "Changelog", href: "/changelog" },
  { label: "Documentation", href: "/docs" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Dashboard", href: "/orgs" },
];

const FEATURES = [
  { label: "AI Thumbnail Agent", href: "/agents" },
  { label: "Face Consistency", href: "/face-consistency" },
  { label: "Inspiration Library", href: "/inspiration-library" },
  { label: "A/B Testing", href: "/ab-testing" },
  { label: "Anonymize Thumbnails", href: "/anonymize" },
  { label: "Video Management", href: "/video-management" },
  {
    label: "YouTube Thumbnail Generator",
    href: "/youtube-thumbnail-generator",
  },
];

const SOLUTIONS = [
  { label: "For YouTubers", href: "/for-youtubers" },
  { label: "For Thumbnail Designers", href: "/for-thumbnail-designers" },
  { label: "For Enterprise", href: "/for-enterprise" },
];

const TOOLS = [
  { label: "All Tools", href: "/tools" },
  { label: "YouTube Thumbnail Downloader", href: "/tools/youtube-thumbnail" },
  { label: "YouTube Video Card Generator", href: "/tools/youtube-video-card" },
  { label: "Thumbnail Anonymizer", href: "/tools/anonymize" },
];

const LEGAL = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
];

function FooterNavColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/40 text-xs font-semibold tracking-widest uppercase">
        {title}
      </p>
      <nav className="flex flex-col gap-2.5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-border/50 bg-background relative overflow-hidden border-t">
      <Layout className="my-0 pt-16 pb-12">
        <LayoutContent>
          <div className="flex flex-col gap-10">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:gap-10 lg:gap-14">
              <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
                <p className="text-foreground text-base font-semibold tracking-tight">
                  {SiteConfig.title}
                </p>
                <p className="text-muted-foreground max-w-[280px] text-[13px] leading-relaxed">
                  {SiteConfig.description}
                </p>
              </div>

              <FooterNavColumn title="Features" links={FEATURES} />
              <FooterNavColumn title="Solutions" links={SOLUTIONS} />
              <FooterNavColumn title="Links" links={LINKS} />
              <FooterNavColumn title="Tools" links={TOOLS} />
              <FooterNavColumn title="Legal" links={LEGAL} />
            </div>

            <div className="border-border/50 flex flex-col gap-3 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground/70 text-xs">
                © 2026 {SiteConfig.title}
                <span className="text-muted-foreground/50"> · </span>
                <a
                  href={SiteConfig.company.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/70 hover:text-foreground underline-offset-2 transition-colors hover:underline"
                >
                  Codelynx
                </a>
                , LLC
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {LEGAL.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-muted-foreground/70 hover:text-foreground text-xs transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </LayoutContent>
      </Layout>

      <div
        aria-hidden
        className="text-muted-foreground/50 pointer-events-none -mb-[0.12em] overflow-hidden text-center leading-[0.8] font-black tracking-tighter whitespace-nowrap uppercase select-none"
        style={{
          fontSize: "clamp(120px, 18vw, 400px)",
          maskImage:
            "linear-gradient(to bottom, black 20%, transparent 100%), radial-gradient(circle 1.5px, black 100%, transparent 100%)",
          maskSize: "100% 100%, 6px 6px",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 20%, transparent 100%), radial-gradient(circle 1.5px, black 100%, transparent 100%)",
          WebkitMaskSize: "100% 100%, 6px 6px",
          WebkitMaskComposite: "source-in",
        }}
      >
        {SiteConfig.title}
      </div>
    </footer>
  );
}
