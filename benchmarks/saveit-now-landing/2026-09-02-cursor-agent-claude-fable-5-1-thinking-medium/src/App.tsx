import { ClosingCta } from "./components/closing-cta";
import { FAQ } from "./components/faq";
import { Footer } from "./components/footer";
import { IosSection } from "./components/ios-section";
import { LandingHeader } from "./components/landing-header";
import { LandingHero } from "./components/landing-hero";
import { LandingPricing } from "./components/landing-pricing";
import { PromiseSection } from "./components/promise-section";
import { WorkflowSection } from "./components/workflow-section";
import { useRevealOnScroll } from "./lib/use-reveal";

export function App() {
  useRevealOnScroll();

  return (
    <div className="relative min-h-screen bg-ink text-cream">
      <a
        href="#workflow"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-full focus:bg-cream focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink"
      >
        Skip to content
      </a>
      <LandingHeader />
      <main>
        <LandingHero />
        <WorkflowSection />
        <PromiseSection />
        <IosSection />
        <LandingPricing />
        <FAQ />
        <ClosingCta />
      </main>
      <Footer />
      <div className="grain" aria-hidden />
    </div>
  );
}
