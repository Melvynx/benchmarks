import GridBackground from "@/components/nowts/grid-background";
import { Typography } from "@/components/nowts/typography";
import { Footer } from "@/features/layout/footer";
import { LandingHeader } from "@/features/landing/landing-header";
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/features/landing/json-ld";
import { FAQSection } from "@/features/landing/faq-section";
import { SiteConfig } from "@/site-config";
import { EyeOff } from "lucide-react";
import type { Metadata } from "@/lib/metadata";
import { AnonymizeTool } from "./_components/anonymize-tool";
import { ToolMarketingSections } from "../_components/tool-marketing-sections";

const FAQ = [
  {
    question: "What does the anonymize tool do?",
    answer:
      "It replaces every person in your image with a dark grey 3D wireframe mannequin — same pose, same position, same size. The background, text, colors, and all other elements remain untouched.",
  },
  {
    question: "Why would I anonymize a thumbnail?",
    answer:
      "Anonymized thumbnails let you reuse layouts and compositions from existing YouTube thumbnails as style references without triggering AI content policy restrictions. They're also useful for privacy-friendly previews.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Each anonymization uses 1 thumbnail from your plan. Free accounts start with 5 thumbnails - no credit card required. Paid plans include 150-500 thumbnails per month.",
  },
  {
    question: "What input formats are supported?",
    answer:
      "You can paste any YouTube URL (youtube.com, youtu.be, Shorts, embeds, live) to anonymize the video's thumbnail, or upload your own image (JPEG, PNG, WebP — max 5MB).",
  },
  {
    question: "How long does anonymization take?",
    answer:
      "Typically under 30 seconds. The AI processes the image, replaces all people with wireframe mannequins, and returns the result ready for download.",
  },
  {
    question: "Is the original image stored?",
    answer:
      "Both the source and anonymized images are uploaded to our secure storage. The anonymized version is available for immediate download.",
  },
];

export const metadata: Metadata = {
  title: `Anonymize YouTube Thumbnails - ${SiteConfig.title}`,
  description:
    "Anonymize YouTube thumbnails and images by replacing people with wireframe mannequins. Upload an image or paste a YouTube URL. Free to start.",
  keywords: [
    "anonymize thumbnail",
    "anonymize youtube thumbnail",
    "remove faces thumbnail",
    "thumbnail anonymizer",
    "wireframe mannequin thumbnail",
    "privacy friendly thumbnail",
    "anonymize image free",
  ],
  alternates: { canonical: "/tools/anonymize" },
  openGraph: {
    title: `Anonymize YouTube Thumbnails - ${SiteConfig.title}`,
    description:
      "Replace people in thumbnails with wireframe mannequins. Create privacy-friendly anonymized inspiration images.",
    url: `${SiteConfig.prodUrl}/tools/anonymize`,
    type: "website",
  },
};

export default function AnonymizeToolPage() {
  return (
    <div className="force-light-theme bg-background text-foreground relative flex min-h-full flex-col">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SiteConfig.prodUrl },
          { name: "Tools", url: `${SiteConfig.prodUrl}/tools` },
          { name: "Thumbnail Anonymizer" },
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
              <EyeOff className="size-7" />
            </div>

            <Typography
              variant="h1"
              className="text-foreground text-3xl font-black tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Anonymize{" "}
              <span className="text-primary decoration-primary/30 underline decoration-4 underline-offset-4 sm:decoration-8">
                Thumbnails
              </span>
            </Typography>

            <Typography
              variant="lead"
              className="text-muted-foreground mx-auto mt-4 max-w-xl text-base sm:mt-6 sm:text-lg"
            >
              Replace people in any thumbnail with wireframe mannequins. Paste a
              YouTube URL or upload an image. Uses 1 thumbnail per
              anonymization.
            </Typography>
          </div>
        </section>

        <section className="relative px-4 pb-20">
          <div className="mx-auto max-w-5xl">
            <AnonymizeTool />
          </div>
        </section>

        <ToolMarketingSections />

        <FAQSection faq={FAQ} />
      </div>

      <Footer />
    </div>
  );
}
