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
  badge: "For Thumbnail Designers",
  h1: "Deliver More Thumbnails,",
  h1Highlight: "Charge More Per Client",
  subtitle:
    "You're a thumbnail designer or minimaker. Use AI to 10x your output speed, A/B test every delivery, and pull inspiration from proven winners. More clients, more revenue.",
  sellingPoints: [
    {
      icon: "Zap",
      title: "10x Faster Delivery",
      description:
        "What used to take 30 minutes per thumbnail now takes 60 seconds. Deliver same-day turnarounds, take on more clients, and stop being the bottleneck in your workflow.",
    },
    {
      icon: "DollarSign",
      title: "Charge More, Deliver Faster",
      description:
        "Offer premium A/B testing packages — deliver 4 variations per video instead of 1. Clients pay more for data-driven thumbnails that provably boost CTR.",
    },
    {
      icon: "Grid3X3",
      title: "A/B Test + Inspiration Library",
      description:
        "Build a library of proven thumbnail styles from top creators. Generate 4 variations per prompt. Deliver data-driven thumbnail packages that justify higher rates.",
    },
  ],
  faq: [
    {
      question: "How can AI help me as a thumbnail designer?",
      answer:
        "AI handles the initial generation — you handle the creative direction. Describe the concept, pick style references from your Inspiration Library, generate 4 variations, then deliver the best to your client. Your expertise + AI speed = more revenue.",
    },
    {
      question: "Can I use the Inspiration Library to match a client's brand?",
      answer:
        "Yes! Save your client's existing thumbnails as Inspirations. The AI analyzes their style, colors, and composition, then applies it to new thumbnails. Consistent brand output with zero guesswork.",
    },
    {
      question: "How do I deliver A/B testing to clients?",
      answer:
        "Generate 4 variations per prompt (4 thumbnails from your plan). Present all 4 to your client as a premium A/B testing package. They pick the winner or test them on YouTube. Charge 2-3x more than a single thumbnail delivery.",
    },
    {
      question: "Does the AI replace my job?",
      answer:
        "No. The AI is a production tool, like Photoshop. Your creative vision, client relationships, and thumbnail strategy are irreplaceable. AI just lets you execute faster and deliver more variations.",
    },
    {
      question: `What is ${SiteConfig.title}?`,
      answer: `${SiteConfig.title} is an AI-powered YouTube thumbnail generator. Describe your thumbnail, select face profiles and style references, and generate professional thumbnails in seconds.`,
    },
    {
      question: "Can I try it for free?",
      answer:
        "Yes! Sign up for free and get 5 thumbnails to test the full platform. No credit card required.",
    },
  ],
};

export const metadata: Metadata = {
  title: "AI Thumbnail Generator for Designers & Minimakers | Thumbfa.st",
  description:
    "Deliver more thumbnails, charge more per client. AI-powered generation with A/B testing and inspiration library. 10x your output as a thumbnail designer.",
  alternates: { canonical: "/for-thumbnail-designers" },
  openGraph: {
    title: "AI Thumbnail Generator for Designers | Thumbfa.st",
    description:
      "10x your output, deliver A/B tested thumbnail packages, and charge premium rates.",
  },
};

export default function Page() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SiteConfig.prodUrl },
          { name: "For Thumbnail Designers" },
        ]}
      />
      <FAQPageJsonLd faq={config.faq} />
      <PersonaPage config={config} />
    </>
  );
}
