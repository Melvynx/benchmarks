import GridBackground from "@/components/nowts/grid-background";
import { Typography } from "@/components/nowts/typography";
import { Footer } from "@/features/layout/footer";
import { LandingHeader } from "@/features/landing/landing-header";
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/features/landing/json-ld";
import { FAQSection } from "@/features/landing/faq-section";
import { SiteConfig } from "@/site-config";
import { ImageDown } from "lucide-react";
import type { Metadata } from "@/lib/metadata";
import { YouTubeThumbnailExtractor } from "./_components/youtube-thumbnail-extractor";
import { ToolMarketingSections } from "../_components/tool-marketing-sections";

const FAQ = [
  {
    question: "How do I download a YouTube thumbnail?",
    answer:
      "Paste any YouTube video URL into the input field and click Extract. All available thumbnail resolutions will appear instantly. Click Download on any size to save it.",
  },
  {
    question: "What resolutions are available?",
    answer:
      "YouTube provides thumbnails in multiple sizes: Max Resolution (1280x720), Standard (640x480), High Quality (480x360), Medium Quality (320x180), and Default (120x90). Not all videos have max resolution available.",
  },
  {
    question: "Is this tool really free?",
    answer:
      "Yes, completely free with no limits. No signup required, no watermarks added. The thumbnails are fetched directly from YouTube's servers.",
  },
  {
    question: "What YouTube URL formats are supported?",
    answer:
      "We support all standard YouTube URL formats: youtube.com/watch, youtu.be short links, youtube.com/embed, YouTube Shorts, and live stream URLs.",
  },
  {
    question: "Can I use downloaded thumbnails commercially?",
    answer:
      "Thumbnails are the intellectual property of the video creator. You may download them for reference, inspiration, or with the creator's permission. Always respect copyright.",
  },
];

export const metadata: Metadata = {
  title: `Free YouTube Thumbnail Downloader - ${SiteConfig.title}`,
  description:
    "Extract and download YouTube video thumbnails in all available resolutions. Get max resolution, HD, SD and more formats instantly. Free, no signup required.",
  keywords: [
    "youtube thumbnail downloader",
    "extract youtube thumbnail",
    "youtube thumbnail grabber",
    "download youtube thumbnail",
    "youtube video thumbnail",
    "youtube thumbnail extractor",
    "free thumbnail downloader",
  ],
  alternates: { canonical: "/tools/youtube-thumbnail" },
  openGraph: {
    title: `Free YouTube Thumbnail Downloader - ${SiteConfig.title}`,
    description:
      "Extract and download YouTube video thumbnails in all available resolutions. Free, no signup required.",
    url: `${SiteConfig.prodUrl}/tools/youtube-thumbnail`,
    type: "website",
  },
};

export default function YouTubeThumbnailPage() {
  return (
    <div className="force-light-theme bg-background text-foreground relative flex min-h-full flex-col">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SiteConfig.prodUrl },
          { name: "Tools", url: `${SiteConfig.prodUrl}/tools` },
          { name: "YouTube Thumbnail Downloader" },
        ]}
      />
      <FAQPageJsonLd faq={FAQ} />
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
              <ImageDown className="size-7" />
            </div>

            <Typography
              variant="h1"
              className="text-foreground text-3xl font-black tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              YouTube Thumbnail{" "}
              <span className="text-primary decoration-primary/30 underline decoration-4 underline-offset-4 sm:decoration-8">
                Downloader
              </span>
            </Typography>

            <Typography
              variant="lead"
              className="text-muted-foreground mx-auto mt-4 max-w-xl text-base sm:mt-6 sm:text-lg"
            >
              Extract and download any YouTube video thumbnail in every
              available resolution. Paste a URL, get your images. Free, no
              signup.
            </Typography>
          </div>
        </section>

        <section className="relative px-4 pb-20">
          <div className="mx-auto max-w-5xl">
            <YouTubeThumbnailExtractor />
          </div>
        </section>

        <ToolMarketingSections />

        <FAQSection faq={FAQ} />
      </div>

      <Footer />
    </div>
  );
}
