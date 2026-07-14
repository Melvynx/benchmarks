import { CtaSection } from "@/features/landing/cta/cta-section";
import { FAQSection } from "@/features/landing/faq-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import { SectionDivider } from "@/features/landing/section-divider";
import { TestimonialsSection } from "@/features/landing/testimonials-section";
import { Pricing } from "@/features/plans/pricing-section";
import { PersonaHero } from "./persona-hero";
import { PersonaSellingPoints } from "./persona-selling-points";

export type PersonaPageConfig = {
  badge: string;
  h1: string;
  h1Highlight: string;
  subtitle: string;
  sellingPoints: {
    icon: string;
    title: string;
    description: string;
  }[];
  faq: { question: string; answer: string }[];
};

export function PersonaPage({ config }: { config: PersonaPageConfig }) {
  return (
    <>
      <div className="pt-20">
        <PersonaHero
          badge={config.badge}
          h1={config.h1}
          h1Highlight={config.h1Highlight}
          subtitle={config.subtitle}
        />
      </div>

      <PersonaSellingPoints points={config.sellingPoints} />

      <HowItWorksSection />

      <SectionDivider />

      <TestimonialsSection />

      <SectionDivider />

      <div id="pricing">
        <Pricing />
      </div>

      <FAQSection faq={config.faq} />

      <CtaSection />
    </>
  );
}
