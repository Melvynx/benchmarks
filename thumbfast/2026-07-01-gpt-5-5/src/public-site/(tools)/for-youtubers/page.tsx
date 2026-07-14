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
  badge: "For YouTubers",
  h1: "AI Thumbnails for",
  h1Highlight: "YouTube Creators",
  subtitle:
    "You make videos, not thumbnails. Describe your thumbnail in plain text and get a professional result in under 60 seconds. Easy, cheap, and simple.",
  sellingPoints: [
    {
      icon: "Sparkles",
      title: "Dead Simple",
      description:
        "No Photoshop, no Canva templates, no design skills. Describe what you want in a sentence and the AI creates a professional, click-worthy thumbnail instantly.",
    },
    {
      icon: "CreditCard",
      title: "Incredibly Affordable",
      description:
        "Start free with 5 thumbnails. Pro plan is just $19/month for 150 thumbnails, and the price stays the same.",
    },
    {
      icon: "Clock",
      title: "60 Seconds, Not 60 Minutes",
      description:
        "Stop losing momentum to thumbnail design. Generate your thumbnail in seconds so you can spend that time where it matters: creating more videos.",
    },
  ],
  faq: [
    {
      question: "I'm not a designer. Can I really make good thumbnails?",
      answer:
        "Absolutely. Thumbfa.st is built for creators, not designers. Write a simple description like 'shocked face next to a pile of money' and the AI handles composition, colors, and styling. Your face stays consistent across every thumbnail.",
    },
    {
      question: "How much does it cost for a small channel?",
      answer:
        "Start completely free with 5 thumbnails (no credit card). If you publish weekly, the Pro plan at $19/month gives you 150 thumbnails - enough for months of thumbnails with A/B testing variations.",
    },
    {
      question: "Can I keep my face consistent across all my thumbnails?",
      answer:
        "Yes! Upload your face photos once to create a Person profile. Every future thumbnail features your exact likeness, building the brand recognition that turns viewers into subscribers.",
    },
    {
      question: "What if I don't like the result?",
      answer:
        "Generate up to 4 variations per prompt — each variation uses 1 thumbnail. Pick the best one. You can also iterate by describing changes and regenerating until it's perfect.",
    },
    {
      question: `What is ${SiteConfig.title}?`,
      answer: `${SiteConfig.title} is an AI-powered YouTube thumbnail generator built for content creators. Describe your thumbnail, select your saved face and style references, and generate professional thumbnails in seconds.`,
    },
    {
      question: "Can I try it for free?",
      answer:
        "Yes! Sign up for free and get 5 thumbnails to test the full platform. No credit card required.",
    },
  ],
};

export const metadata: Metadata = {
  title:
    "AI Thumbnail Generator for YouTubers - Easy & Affordable | Thumbfa.st",
  description:
    "AI thumbnail generator built for YouTube creators. No design skills needed. Describe your thumbnail, get a professional result in 60 seconds. Start free.",
  alternates: { canonical: "/for-youtubers" },
  openGraph: {
    title: "AI Thumbnail Generator for YouTubers | Thumbfa.st",
    description:
      "No design skills needed. Describe your thumbnail, get a professional result in 60 seconds. Start free.",
  },
};

export default function Page() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SiteConfig.prodUrl },
          { name: "For YouTubers" },
        ]}
      />
      <FAQPageJsonLd faq={config.faq} />
      <PersonaPage config={config} />
    </>
  );
}
