import { CaptureEverywhere } from "./components/capture-everywhere";
import { ClosingCta } from "./components/closing-cta";
import { FAQ } from "./components/faq";
import { Footer } from "./components/footer";
import { IosSection } from "./components/ios-section";
import { LandingHeader } from "./components/landing-header";
import { LandingHero } from "./components/landing-hero";
import { LandingPricing } from "./components/landing-pricing";
import { PromiseSection } from "./components/promise-section";
import { WorkflowSection } from "./components/workflow-section";

export function App() {
  return (
    <div className="landing-page min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-cream focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <LandingHeader />
      <main id="main">
        <LandingHero />
        <WorkflowSection />
        <CaptureEverywhere />
        <PromiseSection />
        <IosSection />
        <LandingPricing />
        <FAQ />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
