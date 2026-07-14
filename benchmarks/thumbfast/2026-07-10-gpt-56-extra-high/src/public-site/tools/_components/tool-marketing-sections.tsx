import { BenefitsSection } from "@/features/landing/benefits-section";
import { CtaSection } from "@/features/landing/cta/cta-section";
import { FeaturesSection } from "@/features/landing/features-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import { SectionDivider } from "@/features/landing/section-divider";
import { TestimonialsSection } from "@/features/landing/testimonials-section";

export function ToolMarketingSections() {
  return (
    <>
      <SectionDivider />

      <BenefitsSection />

      <div id="features">
        <FeaturesSection />
      </div>

      <HowItWorksSection />

      <SectionDivider />

      <TestimonialsSection />

      <SectionDivider />

      <CtaSection />
    </>
  );
}
