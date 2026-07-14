import {
  BreadcrumbJsonLd,
  FAQPageJsonLd,
  SoftwareApplicationJsonLd,
} from "@/features/landing/json-ld";
import { SiteConfig } from "@/site-config";
import type { Metadata } from "@/lib/metadata";
import {
  PersonaPage,
  type PersonaPageConfig,
} from "../_components/persona-page";

const config: PersonaPageConfig = {
  badge: "For Enterprise & Agencies",
  h1: "Thumbnail Production",
  h1Highlight: "Without the Human Bottleneck",
  subtitle:
    "Your content team shouldn't wait for a designer. AI generates brand-consistent thumbnails in seconds — same style, same quality, zero dependency on human availability.",
  sellingPoints: [
    {
      icon: "Palette",
      title: "Consistent Brand, Every Time",
      description:
        "Save your brand's thumbnail style as Inspirations. Every AI-generated thumbnail matches your visual identity — colors, composition, mood. No brand drift across hundreds of videos.",
    },
    {
      icon: "Clock",
      title: "Zero Wait Time",
      description:
        "No more waiting for designers. No more bottlenecks. Any team member can generate on-brand thumbnails in 60 seconds. Ship content at the speed of your production pipeline.",
    },
    {
      icon: "Shield",
      title: "High Quality, No Dependencies",
      description:
        "AI generates at YouTube's exact 1280x720 resolution. Face consistency across all team members' profiles. Quality doesn't drop when your designer is on vacation.",
    },
  ],
  faq: [
    {
      question: "How does brand consistency work at scale?",
      answer:
        "Save your brand's best thumbnails as Inspirations. The AI analyzes colors, composition, typography style, and mood. Every new thumbnail references these saved styles, ensuring brand consistency across hundreds of videos without manual oversight.",
    },
    {
      question: "Can multiple team members use it?",
      answer:
        "Yes. Create an organization, invite team members with role-based access. Each member can generate thumbnails using shared Person profiles, Inspirations, and brand guidelines. The Ultra plan includes 500 thumbnails/month for teams.",
    },
    {
      question: "What about API access for automation?",
      answer:
        "Yes. Thumbfa.st offers API keys and developer access for integrating thumbnail generation into your existing content pipeline. Automate thumbnail creation as part of your video production workflow.",
    },
    {
      question: "How does this reduce our dependency on designers?",
      answer:
        "Any team member can generate professional thumbnails by describing what they want in plain text. The AI handles design decisions based on your saved brand style references. Designers can focus on creative strategy instead of repetitive production.",
    },
    {
      question: `What is ${SiteConfig.title}?`,
      answer: `${SiteConfig.title} is an AI-powered YouTube thumbnail generator. It generates brand-consistent, professional thumbnails in seconds using text descriptions, face profiles, and style references.`,
    },
    {
      question: "Can we try it before committing?",
      answer:
        "Yes. Start free with 5 thumbnails. No credit card required. The Ultra plan at $49/month includes 500 thumbnails/month and a 14-day free trial.",
    },
  ],
};

export const metadata: Metadata = {
  title: "AI Thumbnail Generator for Enterprise & Agencies | Thumbfa.st",
  description:
    "Brand-consistent YouTube thumbnails without the human bottleneck. AI generates on-brand thumbnails in seconds. No designer dependency. Try free.",
  alternates: { canonical: "/for-enterprise" },
  openGraph: {
    title: "AI Thumbnail Generator for Enterprise | Thumbfa.st",
    description:
      "Brand-consistent thumbnails in seconds. No designer bottleneck. Zero wait time.",
  },
};

export default function Page() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SiteConfig.prodUrl },
          { name: "For Enterprise" },
        ]}
      />
      <FAQPageJsonLd faq={config.faq} />
      <PersonaPage config={config} />
    </>
  );
}
