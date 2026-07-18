import { BenefitsSection } from "@/features/landing/benefits-section";
import { CtaSection } from "@/features/landing/cta/cta-section";
import { FeaturesSection } from "@/features/landing/features-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import {
  BreadcrumbJsonLd,
  SoftwareApplicationJsonLd,
} from "@/features/landing/json-ld";
import { SectionDivider } from "@/features/landing/section-divider";
import { StatsDivider } from "@/features/landing/stats-divider";
import { TestimonialsSection } from "@/features/landing/testimonials-section";
import { Pricing } from "@/features/plans/pricing-section";
import { SiteConfig } from "@/site-config";
import type { ToolPageConfig } from "../_data/tool-pages";
import { ToolFaq } from "./tool-faq";
import { ToolHero } from "./tool-hero";

type ToolPageProps = {
  config: ToolPageConfig;
};

export function ToolPage({ config }: ToolPageProps) {
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
