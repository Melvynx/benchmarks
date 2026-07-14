import { Typography } from "@/components/nowts/typography";
import { BenefitsSection } from "@/features/landing/benefits-section";
import { CtaSection } from "@/features/landing/cta/cta-section";
import { FeaturesSection } from "@/features/landing/features-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import {
  BreadcrumbJsonLd,
  SoftwareApplicationJsonLd,
} from "@/features/landing/json-ld";
import { SectionDivider } from "@/features/landing/section-divider";
import { SectionLayout } from "@/features/landing/section-layout";
import { StatsDivider } from "@/features/landing/stats-divider";
import { TestimonialsSection } from "@/features/landing/testimonials-section";
import { Pricing } from "@/features/plans/pricing-section";
import { SiteConfig } from "@/site-config";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "@/lib/metadata";
import Image from "@/compat/image";
import { ToolFaq } from "../_components/tool-faq";
import { ToolHero } from "../_components/tool-hero";
import { getToolPageConfig } from "../_data/tool-pages";

const config = getToolPageConfig("anonymize");

const BEFORE_IMAGE =
  "https://codelynx.mlvcdn.com/images/2026-03-11/clipboard_image_1773248532.png";
const AFTER_IMAGE =
  "https://codelynx.mlvcdn.com/images/2026-03-11/clipboard_image_1773248543.png";

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
  alternates: { canonical: `/${config.slug}` },
  openGraph: {
    title: config.title,
    description: config.description,
  },
};

export default function Page() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SiteConfig.prodUrl },
          { name: config.keyword },
        ]}
      />

      <div className="pt-20">
        <ToolHero
          h1={config.h1}
          h1Highlight={config.h1Highlight}
          subtitle={config.subtitle}
        />
      </div>

      <SectionLayout size="lg" className="text-center">
        <Typography variant="h2" className="text-foreground mb-4">
          See It in Action
        </Typography>
        <Typography
          variant="lead"
          className="text-muted-foreground mx-auto mb-12 max-w-2xl"
        >
          Every person is replaced with a dark grey wireframe mannequin. Same
          pose, same position. Background, text, and colors stay untouched.
        </Typography>

        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-center md:gap-8">
          <div className="flex flex-col gap-3">
            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl border shadow-lg">
              <Image
                src={BEFORE_IMAGE}
                alt="Original thumbnail with faces visible"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 448px"
              />
            </div>
            <Typography className="text-muted-foreground text-sm font-medium">
              Before
            </Typography>
          </div>

          <div className="text-primary hidden md:block">
            <ArrowRight className="size-8" />
          </div>
          <div className="text-primary rotate-90 md:hidden">
            <ArrowRight className="size-8" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl border shadow-lg">
              <Image
                src={AFTER_IMAGE}
                alt="Anonymized thumbnail with wireframe mannequins"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 448px"
              />
            </div>
            <Typography className="text-muted-foreground text-sm font-medium">
              After — Faces replaced with wireframe mannequins
            </Typography>
          </div>
        </div>
      </SectionLayout>

      <StatsDivider />

      <BenefitsSection />

      <div id="features">
        <FeaturesSection />
      </div>

      <HowItWorksSection />

      <SectionDivider />

      <TestimonialsSection />

      <SectionDivider />

      <div id="pricing">
        <Pricing />
      </div>

      <ToolFaq faq={config.faq} />

      <CtaSection />
    </>
  );
}
