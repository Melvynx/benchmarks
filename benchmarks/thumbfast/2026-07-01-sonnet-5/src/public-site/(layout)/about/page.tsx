import GridBackground from "@/components/nowts/grid-background";
import { Typography } from "@/components/nowts/typography";
import { SectionLayout } from "@/features/landing/section-layout";
import { SiteConfig } from "@/site-config";
import Image from "@/compat/image";
import type { Metadata } from "@/lib/metadata";

export const metadata: Metadata = {
  title: `About ${SiteConfig.title}`,
  description:
    "Learn about Thumbfa.st, our mission to empower YouTubers with AI-powered thumbnail generation, and meet the founder behind the platform.",
  keywords: ["about", "thumbnails", "AI", "YouTube", "founder", "mission"],
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${SiteConfig.title}`,
    description:
      "Learn about Thumbfa.st, our mission to empower YouTubers with AI-powered thumbnail generation, and meet the founder behind the platform.",
    url: `${SiteConfig.prodUrl}/about`,
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="relative">
      <GridBackground
        color="color-mix(in srgb, var(--muted) 50%, transparent)"
        size={20}
      />
      {/* Hero Section */}
      <SectionLayout variant="transparent">
        <div className="mx-auto max-w-2xl text-center">
          <Typography
            variant="p"
            className="text-primary text-base/7 font-semibold"
          >
            About us
          </Typography>
          <Typography
            variant="h1"
            className="text-foreground mt-2 text-5xl font-semibold tracking-tight sm:text-7xl"
          >
            AI-powered thumbnails for YouTube creators
          </Typography>
          <Typography
            variant="p"
            className="text-muted-foreground mt-8 text-lg font-medium text-pretty sm:text-xl/8"
          >
            A platform you can trust, built by a dedicated founder committed to
            helping YouTubers create stunning thumbnails that drive clicks and
            grow their channels.
          </Typography>
        </div>
      </SectionLayout>

      {/* Main Content */}
      <SectionLayout size="lg" variant="transparent">
        <section className="mt-20 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-16">
          <div className="lg:pr-8">
            <Typography
              variant="h2"
              className="text-foreground text-2xl font-semibold tracking-tight text-pretty"
            >
              Our commitment to you
            </Typography>
            <Typography
              variant="p"
              className="text-muted-foreground mt-6 text-base/7"
            >
              Thumbfa.st is built with a long-term vision and unwavering
              commitment to our users. We understand that thumbnails are
              critical to your YouTube success - they're the first thing viewers
              see and can make or break your click-through rate.
            </Typography>
            <Typography
              variant="p"
              className="text-muted-foreground mt-8 text-base/7"
            >
              That's why we leverage cutting-edge AI to generate professional
              thumbnails that capture attention. With continuous model
              improvements and new features, we're here to help you grow your
              channel and stand out in a crowded YouTube landscape.
            </Typography>
          </div>
          <div className="pt-16 lg:row-span-2 lg:-mr-16 xl:mr-auto">
            <div className="-mx-8 grid grid-cols-2 gap-4 sm:-mx-16 sm:grid-cols-4 lg:mx-0 lg:grid-cols-2 xl:gap-8">
              <div className="outline-border aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1">
                <Image
                  alt="YouTuber creating content"
                  src="https://codelynx.mlvcdn.com/images/2025-08-22/IMG_6608.jpeg"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="outline-border -mt-8 aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 lg:-mt-40">
                <Image
                  alt="Creative thumbnail design process"
                  src="https://codelynx.mlvcdn.com/images/2025-08-22/IMG_7415.jpeg"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="outline-border aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1">
                <Image
                  alt="AI-powered thumbnail generation"
                  src="https://codelynx.mlvcdn.com/images/2025-08-22/IMG_9392.jpeg"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="outline-border -mt-8 aspect-square overflow-hidden rounded-xl shadow-xl outline-1 -outline-offset-1 lg:-mt-40">
                <Image
                  alt="YouTube channel growth"
                  src="https://codelynx.mlvcdn.com/images/2025-08-22/IMG_9896 2.jpeg"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>
          <div className="max-lg:mt-16 lg:col-span-1">
            <Typography
              variant="p"
              className="text-muted-foreground text-base/7 font-semibold"
            >
              Our reliability promise
            </Typography>
            <hr className="border-border mt-6 border-t" />
            <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="border-border flex flex-col gap-y-2 border-b border-dotted pb-4">
                <dt className="text-muted-foreground text-sm/6">
                  Weekly Updates
                </dt>
                <dd className="text-foreground order-first text-6xl font-semibold tracking-tight">
                  <span>100</span>%
                </dd>
              </div>
              <div className="border-border flex flex-col gap-y-2 border-b border-dotted pb-4">
                <dt className="text-muted-foreground text-sm/6">
                  Uptime Guarantee
                </dt>
                <dd className="text-foreground order-first text-6xl font-semibold tracking-tight">
                  <span>99.9</span>%
                </dd>
              </div>
              <div className="max-sm:border-border flex flex-col gap-y-2 max-sm:border-b max-sm:border-dotted max-sm:pb-4">
                <dt className="text-muted-foreground text-sm/6">
                  Response Time
                </dt>
                <dd className="text-foreground order-first text-6xl font-semibold tracking-tight">
                  <span>&lt;24</span>h
                </dd>
              </div>
              <div className="flex flex-col gap-y-2">
                <dt className="text-muted-foreground text-sm/6">
                  Years Committed
                </dt>
                <dd className="text-foreground order-first text-6xl font-semibold tracking-tight">
                  <span>10</span>+
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </SectionLayout>
    </div>
  );
}
