import GridBackground from "@/components/nowts/grid-background";
import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/features/layout/footer";
import { LandingHeader } from "@/features/landing/landing-header";
import {
  BreadcrumbJsonLd,
  SoftwareApplicationJsonLd,
} from "@/features/landing/json-ld";
import { SiteConfig } from "@/site-config";
import { ArrowRight, EyeOff, Film, ImageDown, Wrench } from "lucide-react";
import type { Metadata } from "@/lib/metadata";
import Link from "@/compat/link";
import { ToolMarketingSections } from "./_components/tool-marketing-sections";

const TOOLS = [
  {
    title: "YouTube Thumbnail Downloader",
    description:
      "Extract and download YouTube video thumbnails in all available resolutions. Get max resolution, HD, SD and more formats instantly.",
    href: "/tools/youtube-thumbnail",
    icon: ImageDown,
    badge: "Free",
  },
  {
    title: "YouTube Video Card Generator",
    description:
      "Create customizable YouTube video cards with full theme control. Adjust colors, fonts, spacing, and export as PNG.",
    href: "/tools/youtube-video-card",
    icon: Film,
    badge: "Free",
  },
  {
    title: "Thumbnail Anonymizer",
    description:
      "Replace people in thumbnails with wireframe mannequins using AI. Paste a YouTube URL or upload an image. Uses 1 thumbnail.",
    href: "/tools/anonymize",
    icon: EyeOff,
    badge: "1 Thumbnail",
  },
] as const;

export const metadata: Metadata = {
  title: `Free YouTube Tools - ${SiteConfig.title}`,
  description:
    "Free YouTube tools for creators. Download thumbnails, generate video cards, anonymize images, and more.",
  keywords: [
    "free youtube tools",
    "youtube creator tools",
    "youtube thumbnail tools",
    "youtube video card",
    "anonymize thumbnail",
    "free online tools",
  ],
  alternates: { canonical: "/tools" },
  openGraph: {
    title: `Free YouTube Tools - ${SiteConfig.title}`,
    description:
      "Free YouTube tools for creators. Download thumbnails, generate video cards, anonymize images, and more.",
    url: `${SiteConfig.prodUrl}/tools`,
    type: "website",
  },
};

export default function ToolsIndexPage() {
  return (
    <div className="force-light-theme bg-background text-foreground relative flex min-h-full flex-col">
      <SoftwareApplicationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SiteConfig.prodUrl },
          { name: "Free YouTube Tools" },
        ]}
      />
      <LandingHeader />

      <div className="relative flex-1">
        <GridBackground
          color="color-mix(in srgb, var(--muted) 50%, transparent)"
          size={20}
        />

        <div
          className="pointer-events-none absolute -top-40 left-1/4 size-[500px] rounded-full opacity-20 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,0,0,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute right-1/3 -bottom-20 size-[400px] rounded-full opacity-15 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,0,0,0.3) 0%, transparent 70%)",
          }}
        />

        <section className="relative px-4 pt-16 pb-8 sm:pt-24 sm:pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <div className="bg-primary/10 text-primary mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl">
              <Wrench className="size-7" />
            </div>

            <Typography
              variant="h1"
              className="text-foreground text-3xl font-black tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Free YouTube{" "}
              <span className="text-primary decoration-primary/30 underline decoration-4 underline-offset-4 sm:decoration-8">
                Tools
              </span>
            </Typography>

            <Typography
              variant="lead"
              className="text-muted-foreground mx-auto mt-4 max-w-xl text-base sm:mt-6 sm:text-lg"
            >
              A collection of free tools built for YouTube creators. No
              watermarks, no limits.
            </Typography>
          </div>
        </section>

        <section className="relative px-4 pb-20">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="bg-card group flex flex-col gap-4 rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                      <Icon className="size-5" />
                    </div>
                    <Badge variant="secondary" className="text-[11px]">
                      {tool.badge}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Typography
                      variant="h3"
                      className="text-foreground text-base font-semibold tracking-tight"
                    >
                      {tool.title}
                    </Typography>
                    <Typography
                      variant="muted"
                      className="text-muted-foreground text-sm leading-relaxed"
                    >
                      {tool.description}
                    </Typography>
                  </div>

                  <div className="text-primary mt-auto flex items-center gap-1 text-sm font-medium">
                    Try it free
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <ToolMarketingSections />
      </div>

      <Footer />
    </div>
  );
}
