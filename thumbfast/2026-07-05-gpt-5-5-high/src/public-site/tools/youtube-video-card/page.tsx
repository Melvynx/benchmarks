import GridBackground from "@/components/nowts/grid-background";
import { Typography } from "@/components/nowts/typography";
import { Footer } from "@/features/layout/footer";
import { LandingHeader } from "@/features/landing/landing-header";
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/features/landing/json-ld";
import { FAQSection } from "@/features/landing/faq-section";
import { SiteConfig } from "@/site-config";
import { Film } from "lucide-react";
import type { Metadata } from "@/lib/metadata";
import { VideoCardGenerator } from "./_components/video-card-generator";
import { ToolMarketingSections } from "../_components/tool-marketing-sections";

const FAQ = [
  {
    question: "What is a YouTube video card?",
    answer:
      "A YouTube video card is a visual preview image that shows a video's thumbnail, title, channel info, and view count. It's commonly used in presentations, social media posts, and blog articles to reference YouTube content professionally.",
  },
  {
    question: "Can I customize the card design?",
    answer:
      "Yes, you have full control over colors, fonts, spacing, corner radius, and more. Switch between light, dark, or custom themes. Adjust every detail to match your brand or content style.",
  },
  {
    question: "What format is the exported card?",
    answer:
      "Cards are exported as high-quality PNG images. You can download directly or copy to clipboard for quick pasting into documents and presentations.",
  },
  {
    question: "Do I need to sign up to use this tool?",
    answer:
      "No signup required. The video card generator is completely free with no limits, no watermarks, and no account needed.",
  },
  {
    question: "Can I use the generated cards commercially?",
    answer:
      "The generated card image uses publicly available YouTube data (thumbnail, title, channel). You can use the cards in presentations, blog posts, and educational content. For commercial use, ensure you have rights to reference the video content.",
  },
];

export const metadata: Metadata = {
  title: `Free YouTube Video Card Generator - ${SiteConfig.title}`,
  description:
    "Create customizable YouTube video cards for your content. Adjust colors, fonts, spacing, and more. Download as PNG or copy to clipboard. Free, no signup required.",
  keywords: [
    "youtube video card generator",
    "youtube card maker",
    "youtube thumbnail card",
    "b-roll generator",
    "youtube video overlay",
    "youtube card template",
    "free youtube card tool",
    "youtube video card creator",
    "youtube card customizer",
    "video card png",
  ],
  alternates: { canonical: "/tools/youtube-video-card" },
  openGraph: {
    title: `Free YouTube Video Card Generator - ${SiteConfig.title}`,
    description:
      "Create customizable YouTube video cards with full theme control. Download as PNG or copy to clipboard. Free, no signup.",
    url: `${SiteConfig.prodUrl}/tools/youtube-video-card`,
    type: "website",
  },
};

export default function YouTubeVideoCardPage() {
  return (
    <div className="force-light-theme bg-background text-foreground relative flex min-h-full flex-col">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SiteConfig.prodUrl },
          { name: "Tools", url: `${SiteConfig.prodUrl}/tools` },
          { name: "YouTube Video Card Generator" },
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
              <Film className="size-7" />
            </div>

            <Typography
              variant="h1"
              className="text-foreground text-3xl font-black tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              YouTube Video Card{" "}
              <span className="text-primary decoration-primary/30 underline decoration-4 underline-offset-4 sm:decoration-8">
                Generator
              </span>
            </Typography>

            <Typography
              variant="lead"
              className="text-muted-foreground mx-auto mt-4 max-w-xl text-base sm:mt-6 sm:text-lg"
            >
              Create beautiful, customizable YouTube video cards for your
              content. Adjust every detail, then download as PNG or copy to
              clipboard. Free, no signup.
            </Typography>
          </div>
        </section>

        <section className="relative px-4 pb-20">
          <div className="mx-auto max-w-5xl">
            <VideoCardGenerator />
          </div>
        </section>

        <ToolMarketingSections />

        <FAQSection faq={FAQ} />
      </div>

      <Footer />
    </div>
  );
}
